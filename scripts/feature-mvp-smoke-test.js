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

  assert.ok(data.accessToken, 'Login should return access token');
  assert.ok(data.user?._id || data.user?.id, 'Login should return user id');

  return {
    token: data.accessToken,
    user: data.user
  };
};

const run = async () => {
  const recruiter = await login(RECRUITER_EMAIL, RECRUITER_PASSWORD);
  const candidate = await login(CANDIDATE_EMAIL, CANDIDATE_PASSWORD);

  const recruiterChallenges = await apiRequest({
    path: '/api/challenges',
    token: recruiter.token
  });
  assert.ok(recruiterChallenges.challenges?.length > 0, 'Recruiter must have at least one challenge');

  const challengeId = recruiterChallenges.challenges[0]._id;
  const candidateId = candidate.user.id || candidate.user._id;

  const createdAssessment = await apiRequest({
    path: '/api/assessments',
    method: 'POST',
    token: recruiter.token,
    body: {
      title: `MVP Smoke Assessment ${Date.now()}`,
      description: 'Assessment created by smoke test',
      durationMinutes: 20,
      passingScore: 60,
      assignedCandidates: [candidateId],
      challenges: [{ challenge: challengeId, points: 100, order: 1 }]
    }
  });

  assert.ok(createdAssessment.assessment?._id, 'Assessment creation should return id');

  const assessmentId = createdAssessment.assessment._id;

  await apiRequest({
    path: `/api/assessments/${assessmentId}/start`,
    method: 'POST',
    token: candidate.token
  });

  const firstHint = await apiRequest({
    path: `/api/assessments/${assessmentId}/challenges/${challengeId}/hint`,
    method: 'POST',
    token: candidate.token,
    body: { submittedOutput: 'draft output' }
  });

  assert.ok(firstHint.hint, 'Hint endpoint should return hint text');
  assert.ok(Number(firstHint.hintCount) >= 1, 'Hint count should increase');

  const hintLimit = Number(firstHint.hintLimit || 3);
  let gotLimitError = false;

  for (let i = 2; i <= hintLimit + 1; i += 1) {
    try {
      await apiRequest({
        path: `/api/assessments/${assessmentId}/challenges/${challengeId}/hint`,
        method: 'POST',
        token: candidate.token,
        body: { submittedOutput: `draft output ${i}` }
      });
    } catch (error) {
      if (error.status === 429) {
        gotLimitError = true;
        break;
      }
      throw error;
    }
  }

  assert.ok(gotLimitError, 'Hint endpoint should enforce limit and return 429');

  const scheduledInterview = await apiRequest({
    path: '/api/interviews',
    method: 'POST',
    token: recruiter.token,
    body: {
      candidateId,
      assessmentId,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 45,
      timezone: 'UTC',
      notes: 'Smoke test interview'
    }
  });

  assert.ok(scheduledInterview.interview?._id, 'Interview should be created');

  const myInterviews = await apiRequest({
    path: '/api/interviews/mine',
    token: recruiter.token
  });
  assert.ok(
    myInterviews.interviews?.some((item) => item._id === scheduledInterview.interview._id),
    'Recruiter interviews should include newly scheduled interview'
  );

  const myNotifications = await apiRequest({
    path: '/api/notifications/mine',
    token: candidate.token
  });

  assert.ok(Array.isArray(myNotifications.notifications), 'Notifications response must contain array');
  const latestNotification = myNotifications.notifications[0];
  assert.ok(latestNotification?._id, 'Expected at least one notification to mark as read');

  await apiRequest({
    path: `/api/notifications/${latestNotification._id}/read`,
    method: 'PATCH',
    token: candidate.token
  });

  await apiRequest({
    path: '/api/notifications/mine/read-all',
    method: 'PATCH',
    token: candidate.token
  });

  await apiRequest({
    path: `/api/interviews/${scheduledInterview.interview._id}/status`,
    method: 'PATCH',
    token: recruiter.token,
    body: { status: 'completed' }
  });

  console.log('FEATURE_MVP_TEST_PASS');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
