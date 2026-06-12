const Challenge = require('../models/Challenge');
const Assessment = require('../models/Assessment');

const createChallenge = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user._id,
    };

    const challenge = await Challenge.create(payload);

    return res.status(201).json({
      message: 'Challenge created successfully',
      challenge,
    });
  } catch (error) {
    console.error('createChallenge error:', error);
    return res.status(500).json({
      message: 'Failed to create challenge',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
};

const updateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (req.user.role !== 'admin' && String(challenge.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: this challenge is not owned by you' });
    }

    const payload = {
      title: req.body.title,
      description: req.body.description,
      difficulty: req.body.difficulty,
      language: req.body.language,
      starterCode: req.body.starterCode,
      tags: req.body.tags,
      testCases: req.body.testCases,
    };

    const updatedChallenge = await Challenge.findByIdAndUpdate(req.params.challengeId, payload, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: 'Challenge updated successfully',
      challenge: updatedChallenge,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update challenge' });
  }
};

const deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (req.user.role !== 'admin' && String(challenge.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: this challenge is not owned by you' });
    }

    await Challenge.findByIdAndDelete(req.params.challengeId);

    return res.status(200).json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete challenge' });
  }
};

const getAllChallenges = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const challenges = await Challenge.find().sort({ createdAt: -1 });
      return res.status(200).json({ challenges });
    }

    if (req.user.role === 'recruiter') {
      // Recruiters should be able to access the shared challenge library,
      // not only challenges authored by their own account.
      const challenges = await Challenge.find().sort({ createdAt: -1 });
      return res.status(200).json({ challenges });
    }

    const assignedAssessments = await Assessment.find({
      assignedCandidates: req.user._id,
    }).select('challenges.challenge');

    const challengeIds = Array.from(
      new Set(
        assignedAssessments.flatMap((assessment) =>
          (assessment.challenges || []).map((item) => String(item.challenge))
        )
      )
    );

    if (!challengeIds.length) {
      return res.status(200).json({ challenges: [] });
    }

    const challenges = await Challenge.find({ _id: { $in: challengeIds } }).sort({ createdAt: -1 });
    return res.status(200).json({ challenges });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch challenges' });
  }
};

const getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (req.user.role === 'admin') {
      return res.status(200).json({ challenge });
    }

    if (req.user.role === 'recruiter') {
      // Recruiters can read shared library challenges regardless of owner.
      return res.status(200).json({ challenge });
    }

    const candidateHasAccess = await Assessment.exists({
      assignedCandidates: req.user._id,
      'challenges.challenge': challenge._id,
    });

    if (!candidateHasAccess) {
      return res.status(403).json({ message: 'Forbidden: challenge not assigned to you' });
    }

    return res.status(200).json({ challenge });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch challenge' });
  }
};

module.exports = {
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getAllChallenges,
  getChallengeById,
};