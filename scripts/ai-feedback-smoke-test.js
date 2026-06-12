const assert = require('assert');

delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_MODEL;

const { generateAiFeedback } = require('../src/services/aiFeedbackService');

(async () => {
  const feedback = await generateAiFeedback({
    challengeTitle: 'Add Two Numbers',
    challengeDescription: 'Return the sum of two integers',
    submittedOutput: '2',
    grading: {
      passedTests: 0,
      totalTests: 1,
      percentage: 0
    }
  });

  assert.strictEqual(typeof feedback, 'string');
  assert.ok(feedback.length > 0);
  assert.ok(feedback.includes('Add Two Numbers'));
  assert.ok(
    feedback.toLowerCase().includes('did not match') ||
      feedback.toLowerCase().includes('did not submit') ||
      feedback.toLowerCase().includes('next step')
  );

  console.log('AI_FEEDBACK_TEST_PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});