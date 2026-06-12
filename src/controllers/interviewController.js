const Assessment = require('../models/Assessment');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const Notification = require('../models/Notification');
const User = require('../models/User');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { writeAuditLog } = require('../services/auditLogService');
const { createNotificationOnce } = require('../services/notificationService');
const { sendInterviewScheduledEmail } = require('../services/emailService');

const makeRoomId = () =>
  `sg-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;

const getWebAppBaseUrl = () =>
  String(
    process.env.WEB_APP_URL ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_APP_URL ||
      'http://localhost:5173'
  ).replace(/\/$/, '');

const buildRoomLink = (roomId) => `${getWebAppBaseUrl()}/interview-room?roomId=${encodeURIComponent(roomId)}`;

const normalizeRoomId = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

const resolveRoomIdInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const linkMatch = raw.match(/[?&]roomId=([^&#]+)/i);
  const candidate = linkMatch?.[1] ? decodeURIComponent(linkMatch[1]) : raw;
  return normalizeRoomId(candidate);
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const splitCandidateName = (value) => {
  const normalized = normalizeName(value);
  const parts = normalized.split(' ').filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Manual', lastName: 'Candidate' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Candidate' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const buildManualCandidate = async ({ candidateName, candidateEmail }) => {
  const email = normalizeEmail(candidateEmail);
  if (!isEmail(email)) {
    return null;
  }

  const existing = await User.findOne({ email }).select('_id role firstName lastName email');
  if (existing) {
    if (existing.role !== 'candidate') {
      const error = new Error('candidateEmail already belongs to a non-candidate user');
      error.status = 400;
      throw error;
    }

    return existing;
  }

  const { firstName, lastName } = splitCandidateName(candidateName || email.split('@')[0]);

  return User.create({
    firstName,
    lastName,
    email,
    password: crypto.randomBytes(24).toString('base64url'),
    role: 'candidate',
    profileCompleted: false,
  });
};

const isEmail = (value) => /.+@.+\..+/.test(String(value || '').trim());

const assignRoomDetails = (interview) => {
  if (!interview.roomId) {
    interview.roomId = makeRoomId();
  }

  if (!interview.meetingLink) {
    interview.meetingLink = buildRoomLink(interview.roomId);
  }
};

const createInterview = async (req, res) => {
  try {
    const {
      candidateId,
      candidateName,
      assessmentId,
      scheduledAt,
      durationMinutes,
      timezone,
      roomId,
      meetingLink,
      candidateEmail,
      notes,
    } = req.body;

    let candidate = null;

    if (candidateId) {
      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return res.status(400).json({ message: 'candidateId must be a valid ID' });
      }

      candidate = await User.findById(candidateId).select('_id role firstName lastName email');
      if (!candidate || candidate.role !== 'candidate') {
        return res.status(400).json({ message: 'candidateId must reference a valid candidate user' });
      }
    } else {
      candidate = await buildManualCandidate({ candidateName, candidateEmail });
      if (!candidate) {
        return res.status(400).json({
          message: 'Either candidateId or candidateName and candidateEmail must be provided'
        });
      }
    }

    let assessment = null;
    if (assessmentId) {
      if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        return res.status(400).json({ message: 'assessmentId must be a valid ID' });
      }

      assessment = await Assessment.findById(assessmentId).select('_id title createdBy assignedCandidates');
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (req.user.role !== 'admin' && String(assessment.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Forbidden: this assessment is not owned by you' });
      }
    }

    let resolvedRoomId = normalizeRoomId(roomId) || makeRoomId();
    const existingRoom = await Interview.findOne({ roomId: resolvedRoomId }).select('_id');
    if (existingRoom) {
      return res.status(409).json({
        message: 'Room ID already exists. Generate a new one and try again.'
      });
    }

    const resolvedMeetingLink = meetingLink || buildRoomLink(resolvedRoomId);

    const interview = await Interview.create({
      assessment: assessment?._id,
      recruiter: req.user._id,
      candidate: candidate._id,
      scheduledAt,
      durationMinutes: Number(durationMinutes) || 60,
      timezone: timezone || 'UTC',
      meetingLink: resolvedMeetingLink,
      roomId: resolvedRoomId,
      notes: notes || '',
    });

    try {
      await createNotificationOnce({
        user: candidate._id,
        type: 'interview_scheduled',
        title: 'Interview scheduled',
        message: `Your interview is scheduled for ${new Date(interview.scheduledAt).toLocaleString()}. Room ID: ${interview.roomId}. Join link: ${interview.meetingLink}`,
        relatedInterview: interview._id
      });
    } catch (notificationError) {
      console.error('Interview schedule notification failed:', notificationError.message);
    }

    const recipientEmail = isEmail(candidateEmail)
      ? normalizeEmail(candidateEmail)
      : normalizeEmail(candidate.email);

    let emailDelivery = { sent: false, reason: 'no-recipient' };

    if (recipientEmail) {
      try {
        emailDelivery = await sendInterviewScheduledEmail({
          to: recipientEmail,
          candidateName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
          recruiterName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
          scheduledAt: interview.scheduledAt,
          timezone: interview.timezone,
          durationMinutes: interview.durationMinutes,
          roomId: interview.roomId,
          meetingLink: interview.meetingLink,
          assessmentTitle: assessment?.title || '',
          notes: interview.notes
        });
      } catch (emailError) {
        console.error('Interview schedule email failed:', emailError.message);
        emailDelivery = { sent: false, reason: 'send-failed' };
      }
    }

    const populated = await Interview.findById(interview._id)
      .populate('candidate', 'firstName lastName email')
      .populate('recruiter', 'firstName lastName email')
      .populate('assessment', 'title');

    try {
      await writeAuditLog({
        req,
        action: 'interview.schedule',
        resourceType: 'interview',
        resourceId: interview._id,
        details: {
          candidateId: candidate._id,
          candidateEmail: candidate.email,
          assessmentId: assessment?._id || null,
          scheduledAt: interview.scheduledAt
        }
      });
    } catch (auditError) {
      console.error('Interview schedule audit log failed:', auditError.message);
    }

    return res.status(201).json({
      message: 'Interview scheduled successfully',
      interview: populated,
      emailDelivery,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to schedule interview'
    });
  }
};

const getMyInterviews = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'candidate') {
      filter = { candidate: req.user._id };
    } else if (req.user.role === 'recruiter') {
      filter = { recruiter: req.user._id };
    }

    if (req.user.role !== 'admin') {
      filter.status = { $ne: 'cancelled' };
    }

    const interviews = await Interview.find(filter)
      .sort({ scheduledAt: 1 })
      .populate('candidate', 'firstName lastName email')
      .populate('recruiter', 'firstName lastName email')
      .populate('assessment', 'title durationMinutes');

    return res.status(200).json({ interviews });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load interviews' });
  }
};

const updateInterviewStatus = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { status } = req.body;

    const interview = await Interview.findById(interviewId).select(
      '_id recruiter candidate status cancelledAt completedAt'
    );

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (req.user.role !== 'admin' && String(interview.recruiter) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: this interview is not owned by you' });
    }

    interview.status = status;

    if (status === 'cancelled') {
      interview.cancelledAt = new Date();
    }

    if (status === 'completed') {
      interview.completedAt = new Date();
    }

    await interview.save();

    const notificationType = status === 'cancelled' ? 'interview_cancelled' : 'interview_updated';

    if (interview.candidate) {
      await createNotificationOnce({
        user: interview.candidate,
        type: notificationType,
        title: status === 'cancelled' ? 'Interview cancelled' : 'Interview updated',
        message:
          status === 'cancelled'
            ? 'A recruiter cancelled your interview.'
            : `Your interview status is now ${status}.`,
        relatedInterview: interview._id
      });
    }

    const populated = await Interview.findById(interview._id)
      .populate('candidate', 'firstName lastName email')
      .populate('recruiter', 'firstName lastName email')
      .populate('assessment', 'title');

    await writeAuditLog({
      req,
      action: 'interview.status.update',
      resourceType: 'interview',
      resourceId: interview._id,
      details: { status }
    });

    return res.status(200).json({
      message: 'Interview status updated',
      interview: populated,
    });
  } catch (error) {
    console.error('updateInterviewStatus error:', error);
    return res.status(500).json({ message: 'Failed to update interview status' });
  }
};

const deleteInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId).select(
      '_id recruiter candidate status roomId'
    );

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed interviews can be deleted' });
    }

    const isOwner =
      String(interview.recruiter) === String(req.user._id) ||
      String(interview.candidate) === String(req.user._id);

    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Forbidden: you are not part of this interview' });
    }

    await Promise.all([
      Notification.deleteMany({ relatedInterview: interview._id }),
      InterviewSession.deleteOne({ interview: interview._id }),
      Interview.deleteOne({ _id: interview._id })
    ]);

    await writeAuditLog({
      req,
      action: 'interview.delete',
      resourceType: 'interview',
      resourceId: interview._id,
      details: { roomId: interview.roomId, status: interview.status }
    });

    return res.status(200).json({ message: 'Interview deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete interview' });
  }
};

const generateInterviewRoom = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId)
      .populate('candidate', '_id firstName lastName email')
      .populate('recruiter', '_id firstName lastName email')
      .populate('assessment', 'title');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (req.user.role !== 'admin' && String(interview.recruiter._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: this interview is not owned by you' });
    }

    assignRoomDetails(interview);
    await interview.save();

    await createNotificationOnce({
      user: interview.candidate._id,
      type: 'interview_updated',
      title: 'Interview room ready',
      message: `Your live interview room is ready. Room ID: ${interview.roomId}. Join link: ${interview.meetingLink}`,
      relatedInterview: interview._id
    });

    await writeAuditLog({
      req,
      action: 'interview.room.generate',
      resourceType: 'interview',
      resourceId: interview._id,
      details: {
        roomId: interview.roomId,
        meetingLink: interview.meetingLink
      }
    });

    return res.status(200).json({
      message: 'Interview room generated successfully',
      roomId: interview.roomId,
      meetingLink: interview.meetingLink,
      interview
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate interview room' });
  }
};

const getInterviewByRoomId = async (req, res) => {
  try {
    const resolvedRoomId = resolveRoomIdInput(req.params.roomId);

    if (!resolvedRoomId) {
      return res.status(400).json({ message: 'Invalid room id' });
    }

    const interview = await Interview.findOne({ roomId: resolvedRoomId })
      .populate('candidate', '_id firstName lastName email')
      .populate('recruiter', '_id firstName lastName email')
      .populate('assessment', 'title');

    if (!interview) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isCandidate = String(interview.candidate._id) === String(req.user._id);
    const isRecruiter = String(interview.recruiter._id) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCandidate && !isRecruiter && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: you are not part of this interview room' });
    }

    return res.status(200).json({
      roomId: resolvedRoomId,
      meetingLink: interview.meetingLink,
      interview
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to resolve interview room' });
  }
};

module.exports = {
  createInterview,
  getMyInterviews,
  updateInterviewStatus,
  deleteInterview,
  generateInterviewRoom,
  getInterviewByRoomId,
};
