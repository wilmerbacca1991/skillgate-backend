const assert = require('assert');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const RECRUITER_EMAIL = process.env.TEST_RECRUITER_EMAIL || 'mia.recruiter@test.com';
const RECRUITER_PASSWORD = process.env.TEST_RECRUITER_PASSWORD || 'Password123!';

const CANDIDATE_EMAIL = process.env.TEST_CANDIDATE_EMAIL || 'jamie.candidate@test.com';
const CANDIDATE_PASSWORD = process.env.TEST_CANDIDATE_PASSWORD || 'Password123!';

const parseJson = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
};

const apiRequest = async ({ path, method = 'GET', token, body }) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  return parseJson(response);
};

const login = async (email, password) => {
  const data = await apiRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { email, password }
  });

  return {
    token: data.accessToken,
    user: data.user
  };
};

const run = async () => {
  const recruiter = await login(RECRUITER_EMAIL, RECRUITER_PASSWORD);
  const candidate = await login(CANDIDATE_EMAIL, CANDIDATE_PASSWORD);

  const challengeList = await apiRequest({ path: '/api/challenges', token: recruiter.token });
  assert.ok(challengeList.challenges.length > 0, 'Expected at least one challenge');

  const assessment = await apiRequest({
    path: '/api/assessments',
    method: 'POST',
    token: recruiter.token,
    body: {
      title: `Architecture Boundary Assessment ${Date.now()}`,
      description: 'Assessment for architecture boundary test',
      durationMinutes: 20,
      passingScore: 70,
      assignedCandidates: [candidate.user.id || candidate.user._id],
      challenges: [{ challenge: challengeList.challenges[0]._id, points: 100, order: 1 }]
    }
  });

  const createdJob = await apiRequest({
    path: '/api/recruiter/jobs',
    method: 'POST',
    token: recruiter.token,
    body: {
      title: `Full Stack Engineer ${Date.now()}`,
      description: 'Architecture smoke role',
      requirements: ['javascript', 'react', 'node']
    }
  });

  assert.ok(createdJob.job?._id, 'Recruiter job creation failed');

  const openJobs = await apiRequest({
    path: '/api/candidate/jobs',
    token: candidate.token
  });
  assert.ok(openJobs.jobs?.length > 0, 'Candidate should see at least one open job');

  const matchingJob = openJobs.jobs.find((job) => job._id === createdJob.job._id);
  assert.ok(matchingJob, 'Candidate should see recruiter-created job');

  await apiRequest({
    path: '/api/candidate/applications',
    method: 'POST',
    token: candidate.token,
    body: { jobId: createdJob.job._id }
  });

  const recruiterApplications = await apiRequest({
    path: '/api/recruiter/applications',
    token: recruiter.token
  });

  const application = recruiterApplications.applications.find(
    (item) => String(item.job?._id || item.job) === String(createdJob.job._id)
  );

  assert.ok(application?._id, 'Recruiter should see application for created job');

  await apiRequest({
    path: '/api/recruiter/assessments/assign',
    method: 'POST',
    token: recruiter.token,
    body: {
      applicationId: application._id,
      assessmentId: assessment.assessment._id
    }
  });

  const candidateAssessments = await apiRequest({
    path: '/api/candidate/assessments',
    token: candidate.token
  });

  const hasAssignedAssessment = candidateAssessments.assessments.some(
    (item) => String(item._id) === String(assessment.assessment._id)
  );

  assert.ok(hasAssignedAssessment, 'Candidate should see assigned assessment');

  const analytics = await apiRequest({
    path: '/api/recruiter/analytics',
    token: recruiter.token
  });

  assert.ok(analytics.metrics, 'Recruiter analytics endpoint should return metrics');

  console.log('ARCHITECTURE_BOUNDARY_TEST_PASS');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
