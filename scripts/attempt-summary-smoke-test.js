const assert = require('assert');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_CANDIDATE_EMAIL || 'jamie.candidate@test.com';
const TEST_PASSWORD = process.env.TEST_CANDIDATE_PASSWORD || 'Password123!';

const parseJson = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed with status ' + response.status);
  }
  return data;
};

const run = async () => {
  const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });

  const loginData = await parseJson(loginResponse);
  assert.ok(loginData.accessToken, 'Missing access token from login');

  const token = loginData.accessToken;

  const assessmentsResponse = await fetch(`${API_BASE_URL}/api/assessments`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const assessmentsData = await parseJson(assessmentsResponse);
  assert.ok(Array.isArray(assessmentsData.assessments), 'Assessments must be an array');
  assert.ok(assessmentsData.assessments.length > 0, 'No assessments found for candidate');

  const assessmentId = assessmentsData.assessments[0]._id;
  assert.ok(assessmentId, 'Assessment id missing');

  const fetchAttempt = async () => {
    const attemptResponse = await fetch(
      `${API_BASE_URL}/api/assessments/${assessmentId}/attempt`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return parseJson(attemptResponse);
  };

  let attemptData;

  try {
    attemptData = await fetchAttempt();
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('attempt not found')) {
      const startResponse = await fetch(`${API_BASE_URL}/api/assessments/${assessmentId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await parseJson(startResponse);
      attemptData = await fetchAttempt();
    } else {
      throw error;
    }
  }

  assert.ok(attemptData.attempt, 'Missing attempt object');
  assert.ok(attemptData.attempt.assessment, 'Missing populated assessment');
  assert.ok(Array.isArray(attemptData.attempt.answers), 'Answers should be an array');

  console.log('ATTEMPT_SUMMARY_TEST_PASS');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});