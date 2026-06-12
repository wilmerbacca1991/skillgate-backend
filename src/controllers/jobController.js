const Application = require('../models/Application');
const Assessment = require('../models/Assessment');
const Company = require('../models/Company');
const Job = require('../models/Job');
const { writeAuditLog } = require('../services/auditLogService');
const { createNotificationOnce } = require('../services/notificationService');

const ensureRecruiterCompany = async (recruiterId) => {
  let company = await Company.findOne({ createdBy: recruiterId });

  if (!company) {
    company = await Company.create({
      name: 'Recruiter Company',
      createdBy: recruiterId
    });
  }

  return company;
};

const createRecruiterJob = async (req, res) => {
  try {
    const { title, description = '', requirements = [], status = 'open' } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    const company = await ensureRecruiterCompany(req.user._id);

    const job = await Job.create({
      company: company._id,
      title,
      description,
      requirements: Array.isArray(requirements) ? requirements : [],
      status,
      createdBy: req.user._id
    });

    await writeAuditLog({
      req,
      action: 'recruiter.job.create',
      resourceType: 'job',
      resourceId: job._id,
      details: { title: job.title, status: job.status }
    });

    return res.status(201).json({ message: 'Job created successfully', job });
  } catch {
    return res.status(500).json({ message: 'Failed to create job' });
  }
};

const getRecruiterApplications = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).select('_id');
    const jobIds = jobs.map((job) => job._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .sort({ createdAt: -1 })
      .populate('job', 'title status')
      .populate('candidate', 'firstName lastName email')
      .populate('assessment', 'title');

    return res.status(200).json({ applications });
  } catch {
    return res.status(500).json({ message: 'Failed to load applications' });
  }
};

const assignAssessmentToApplication = async (req, res) => {
  try {
    const { applicationId, assessmentId } = req.body;

    if (!applicationId || !assessmentId) {
      return res.status(400).json({ message: 'applicationId and assessmentId are required' });
    }

    const application = await Application.findById(applicationId)
      .populate('candidate', '_id firstName lastName');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const job = await Job.findById(application.job).select('createdBy');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user.role !== 'admin' && String(job.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: application is not owned by you' });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const alreadyAssigned = (assessment.assignedCandidates || []).some(
      (candidateId) => String(candidateId) === String(application.candidate._id)
    );

    if (!alreadyAssigned) {
      assessment.assignedCandidates.push(application.candidate._id);
      await assessment.save();
    }

    application.assessment = assessment._id;
    application.stage = 'assessment';
    await application.save();

    await createNotificationOnce({
      user: application.candidate._id,
      type: 'general',
      title: 'Assessment assigned',
      message: `You have been assigned assessment ${assessment.title}.`
    });

    await writeAuditLog({
      req,
      action: 'recruiter.application.assign_assessment',
      resourceType: 'application',
      resourceId: application._id,
      details: { assessmentId: assessment._id }
    });

    return res.status(200).json({
      message: 'Assessment assigned to application',
      application
    });
  } catch {
    return res.status(500).json({ message: 'Failed to assign assessment' });
  }
};

module.exports = {
  createRecruiterJob,
  getRecruiterApplications,
  assignAssessmentToApplication
};
