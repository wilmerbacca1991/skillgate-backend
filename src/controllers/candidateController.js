const Assessment = require('../models/Assessment');
const Attempt = require('../models/Attempt');
const FeedbackReport = require('../models/FeedbackReport');
const Job = require('../models/Job');

const getCandidateMe = async (req, res) => {
  return res.status(200).json({
    profile: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      profileImageUrl: req.user.profileImageUrl || ''
    }
  });
};

const getCandidateAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({ assignedCandidates: req.user._id })
      .sort({ createdAt: -1 })
      .populate('challenges.challenge', 'title difficulty language');

    return res.status(200).json({ assessments });
  } catch {
    return res.status(500).json({ message: 'Failed to load candidate assessments' });
  }
};

const getOpenJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .populate('company', 'name')
      .select('title description requirements status company createdAt');

    return res.status(200).json({ jobs });
  } catch {
    return res.status(500).json({ message: 'Failed to load jobs' });
  }
};

const createCandidateSubmission = async (req, res) => {
  try {
    const { assessmentId, answers = [] } = req.body;

    if (!assessmentId) {
      return res.status(400).json({ message: 'assessmentId is required' });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const isAssigned = (assessment.assignedCandidates || []).some(
      (candidateId) => String(candidateId) === String(req.user._id)
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this assessment' });
    }

    const maxScore = assessment.challenges.reduce((sum, item) => sum + item.points, 0);

    const attempt = await Attempt.findOneAndUpdate(
      { assessment: assessment._id, candidate: req.user._id },
      {
        assessment: assessment._id,
        candidate: req.user._id,
        status: 'submitted',
        startedAt: new Date(),
        submittedAt: new Date(),
        answers,
        maxScore,
        totalScoreEarned: Number(req.body.totalScoreEarned || 0)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      message: 'Submission recorded',
      submission: attempt
    });
  } catch {
    return res.status(500).json({ message: 'Failed to record submission' });
  }
};

const getCandidateFeedbackBySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const attempt = await Attempt.findById(submissionId).select('candidate answers assessment');
    if (!attempt) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (String(attempt.candidate) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const reports = await FeedbackReport.find({ attempt: attempt._id })
      .sort({ createdAt: -1 })
      .select('challenge reportType content promptVersion modelProvider modelName metadata createdAt');

    return res.status(200).json({
      submissionId: attempt._id,
      feedbackReports: reports
    });
  } catch {
    return res.status(500).json({ message: 'Failed to load submission feedback' });
  }
};

module.exports = {
  getCandidateMe,
  getOpenJobs,
  getCandidateAssessments,
  createCandidateSubmission,
  getCandidateFeedbackBySubmission
};
