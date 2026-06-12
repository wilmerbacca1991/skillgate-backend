const Application = require('../models/Application');
const Job = require('../models/Job');

const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    const job = await Job.findById(jobId).select('_id status');
    if (!job || job.status !== 'open') {
      return res.status(404).json({ message: 'Open job not found' });
    }

    const existing = await Application.findOne({ job: job._id, candidate: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You already applied to this job' });
    }

    const application = await Application.create({
      job: job._id,
      candidate: req.user._id,
      stage: 'applied'
    });

    return res.status(201).json({ message: 'Application submitted', application });
  } catch {
    return res.status(500).json({ message: 'Failed to apply to job' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .sort({ createdAt: -1 })
      .populate('job', 'title status')
      .populate('assessment', 'title');

    return res.status(200).json({ applications });
  } catch {
    return res.status(500).json({ message: 'Failed to load applications' });
  }
};

module.exports = {
  applyToJob,
  getMyApplications
};
