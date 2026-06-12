const assert = require('assert');
const { gradeOutputAgainstTestCases } = require('../src/services/gradingService');

const testCases = [
  { input: '1 2', expectedOutput: '3', isHidden: false },
  { input: '2 2', expectedOutput: '4', isHidden: true }
];

const result = gradeOutputAgainstTestCases(testCases, '3');

assert.strictEqual(result.passedTests, 1);
assert.strictEqual(result.totalTests, 2);
assert.strictEqual(result.passedPublic, 1);
assert.strictEqual(result.publicTotal, 1);
assert.strictEqual(result.passedHidden, 0);
assert.strictEqual(result.hiddenTotal, 1);
assert.strictEqual(result.percentage, 50);
assert.ok(result.feedback.includes('Passed 1 of 2 tests.'));
assert.ok(result.feedback.includes('Public: 1/1.'));
assert.ok(result.feedback.includes('Hidden: 0/1.'));
assert.ok(result.feedback.includes('Public cases look good. At least one hidden case is still failing.'));

console.log('GRADING_TEST_PASS');