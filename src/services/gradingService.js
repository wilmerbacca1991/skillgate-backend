const normalize = (value) => String(value ?? '').trim().replace(/\r\n/g, '\n');

const splitOutputLines = (submittedOutput) => {
  const normalized = normalize(submittedOutput);
  if (!normalized) return [];
  return normalized.split('\n').map((line) => line.trim());
};

const gradeOutputAgainstTestCases = (testCases, submittedOutput) => {
  const outputLines = splitOutputLines(submittedOutput);

  let passed = 0;
  let passedPublic = 0;
  let passedHidden = 0;

  const details = testCases.map((testCase, index) => {
    const expected = normalize(testCase.expectedOutput);
    const actual = outputLines[index] ?? '';
    const isPass = actual === expected;
    const isHidden = Boolean(testCase.isHidden);

    if (isPass) {
      passed += 1;
      if (isHidden) passedHidden += 1;
      else passedPublic += 1;
    }

    return {
      index,
      input: testCase.input,
      expected,
      actual,
      pass: isPass,
      isHidden,
    };
  });

  const total = testCases.length;
  const publicTotal = details.filter((item) => !item.isHidden).length;
  const hiddenTotal = total - publicTotal;
  const publicFailed = details.filter((item) => !item.isHidden && !item.pass);
  const hiddenFailedCount = details.filter((item) => item.isHidden && !item.pass).length;

  const percentage = total === 0 ? 0 : Math.round((passed / total) * 100);
  const firstFailed = details.find((item) => !item.pass) || null;

  let feedback = 'No test cases configured.';
  if (total > 0) {
    if (passed === total) {
      feedback = 'Perfect. Passed all ' + total + ' test cases.';
    } else {
      const summaryParts = [
        'Passed ' + passed + ' of ' + total + ' tests.',
        'Public: ' + passedPublic + '/' + publicTotal + '.',
        'Hidden: ' + passedHidden + '/' + hiddenTotal + '.'
      ];
      feedback = summaryParts.join(' ');
      if (publicFailed.length > 0) {
        const firstPublicFail = publicFailed[0];
        const received = firstPublicFail.actual || '(empty)';
        feedback +=
          ' First public mismatch at test ' +
          (firstPublicFail.index + 1) +
          ': expected "' +
          firstPublicFail.expected +
          '" but received "' +
          received +
          '".';
      } else if (hiddenFailedCount > 0) {
        feedback +=
          ' Public cases look good. At least one hidden case is still failing.';
      }
    }
  }

  return {
    passedTests: passed,
    totalTests: total,
    passedPublic,
    publicTotal,
    passedHidden,
    hiddenTotal,
    percentage,
    feedback,
    firstFailed,
    details,
    publicFailures: publicFailed.slice(0, 3).map((item) => ({
      index: item.index,
      input: item.input,
      expected: item.expected,
      actual: item.actual,
    })),
    hiddenFailedCount,
  };
};

const buildAiFeedback = ({ challengeTitle, grading, submittedOutput }) => {
  const title = challengeTitle || 'this challenge';
  const normalizedOutput = normalize(submittedOutput);
  const feedbackLines = [];

  if (!normalizedOutput) {
    feedbackLines.push(`You did not submit any output for ${title}.`);
  }

  if (grading.percentage === 100) {
    feedbackLines.push(`Perfect match. Your answer passed every test case for ${title}.`);
  } else if (grading.percentage >= 70) {
    feedbackLines.push(
      `You are close on ${title}. One or two lines still differ from expected output.`
    );
  } else if (grading.percentage > 0) {
    feedbackLines.push(
      `Your answer partially matches ${title}, but several outputs are still incorrect.`
    );
  } else {
    feedbackLines.push(`The submission for ${title} did not match expected outputs.`);
  }

  if (grading.firstFailed) {
    feedbackLines.push(
      `First failed test: expected "${grading.firstFailed.expected}", received "${grading.firstFailed.actual || '(empty)'}".`
    );
  }

  feedbackLines.push(
    'Next step: fix the first failing case, re-run, then continue one failing case at a time.'
  );

  return feedbackLines.join(' ');
};

module.exports = {
  gradeOutputAgainstTestCases,
  buildAiFeedback,
};
