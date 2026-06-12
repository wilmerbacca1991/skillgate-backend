const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Attempt = require('../models/Attempt');
const Assessment = require('../models/Assessment');
const Application = require('../models/Application');
const FeedbackReport = require('../models/FeedbackReport');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const User = require('../models/User');

const removeCandidateProfileImage = (profileImageUrl) => {
  if (!profileImageUrl || typeof profileImageUrl !== 'string') {
    return;
  }

  if (!profileImageUrl.startsWith('/uploads/profiles/')) {
    return;
  }

  const filePath = path.join(
    __dirname,
    '..',
    '..',
    profileImageUrl.replace(/^\//, '').replace(/\//g, path.sep)
  );

  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore file cleanup failures.
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const assessmentFilter =
      req.user.role === 'admin' ? {} : { createdBy: req.user._id };

    const ownedAssessments = await Assessment.find(assessmentFilter).select('_id');
    const ownedAssessmentIds = ownedAssessments.map((item) => item._id);

    const attemptFilter =
      req.user.role === 'admin'
        ? {}
        : { assessment: { $in: ownedAssessmentIds } };

    const totalAssessments = ownedAssessmentIds.length;
    const totalAttempts = await Attempt.countDocuments(attemptFilter);
    const submittedAttempts = await Attempt.countDocuments({
      ...attemptFilter,
      status: 'submitted'
    });

    const interviewFilter =
      req.user.role === 'admin' ? {} : { recruiter: req.user._id };

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const upcomingInterviews = await Interview.countDocuments({
      ...interviewFilter,
      status: 'scheduled',
      scheduledAt: { $gte: now }
    });

    const scheduledThisWeek = await Interview.countDocuments({
      ...interviewFilter,
      status: 'scheduled',
      scheduledAt: { $gte: startOfWeek, $lt: endOfWeek }
    });

    const completionRate = totalAttempts > 0
      ? Math.round((submittedAttempts / totalAttempts) * 100)
      : 0;

    res.status(200).json({
      metrics: {
        totalAssessments,
        totalAttempts,
        submittedAttempts,
        completionRate,
        upcomingInterviews,
        scheduledThisWeek
      },
      message: 'Recruiter dashboard summary loaded successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load recruiter dashboard summary' });
  }
};

const getCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: 'candidate' })
      .select('_id firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ candidates });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load candidates' });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID' });
    }

    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.role !== 'candidate') {
      return res.status(400).json({ message: 'Only candidate accounts can be deleted from this list' });
    }

    removeCandidateProfileImage(candidate.profileImageUrl);

    const [attemptResult, feedbackResult, interviewResult, applicationResult, notificationResult] = await Promise.all([
      Attempt.deleteMany({ candidate: candidate._id }),
      FeedbackReport.deleteMany({ candidate: candidate._id }),
      Interview.deleteMany({ candidate: candidate._id }),
      Application.deleteMany({ candidate: candidate._id }),
      Notification.deleteMany({ user: candidate._id })
    ]);

    const assessmentResult = await Assessment.updateMany(
      { assignedCandidates: candidate._id },
      { $pull: { assignedCandidates: candidate._id } }
    );

    await User.deleteOne({ _id: candidate._id });

    return res.status(200).json({
      message: 'Candidate deleted successfully',
      deletedCandidateId: candidate._id,
      removedCounts: {
        attempts: attemptResult.deletedCount || 0,
        feedbackReports: feedbackResult.deletedCount || 0,
        interviews: interviewResult.deletedCount || 0,
        applications: applicationResult.deletedCount || 0,
        notifications: notificationResult.deletedCount || 0,
        assessmentsUpdated: assessmentResult.modifiedCount || 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete candidate and related data' });
  }
};

const getAssessmentAttempts = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId).select('createdBy');
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (
      req.user.role !== 'admin' &&
      String(assessment.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Forbidden: this assessment is not owned by you' });
    }

    const attempts = await Attempt.find({ assessment: assessmentId })
      .sort({ submittedAt: -1, updatedAt: -1 })
      .populate('candidate', 'firstName lastName email role')
      .populate('answers.challenge', 'title difficulty language');

    res.status(200).json({ attempts });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load assessment attempts' });
  }
};

module.exports = {
  getDashboardSummary,
  getCandidates,
  deleteCandidate,
  getAssessmentAttempts
};