const OpenAI = require('openai');

const AI_PROVIDER = String(process.env.AI_PROVIDER || 'openai').toLowerCase();

const buildFallbackFeedback = ({ challengeTitle, grading, submittedOutput }) => {
  const title = challengeTitle || 'this challenge';
  const normalizedOutput = String(submittedOutput || '').trim();
  const feedbackLines = [];

  if (!normalizedOutput) {
    feedbackLines.push('You did not submit any output for ' + title + '.');
  }

  if (grading.percentage === 100) {
    feedbackLines.push('Great work. Your answer passed every test case for ' + title + '.');
  } else if (grading.percentage >= 70) {
    feedbackLines.push('You are close on ' + title + '. Check edge cases and exact output formatting.');
  } else if (grading.percentage > 0) {
    feedbackLines.push('Your answer partially matches expected output for ' + title + '.');
  } else {
    feedbackLines.push('Your output did not match expected output for ' + title + '.');
  }

  feedbackLines.push('Next step: compare exact output text line by line and fix the first mismatch.');
  return feedbackLines.join(' ');
};

const buildFallbackHint = ({ challengeTitle, challengeDescription, testCases, hintNumber }) => {
  const title = challengeTitle || 'this challenge';
  const publicCase = (testCases || []).find((item) => !item.isHidden);
  const lines = [
    `Hint ${hintNumber}: Focus on the input-to-output transformation for ${title}.`,
    `Start by writing down the exact steps in plain language before coding.`
  ];

  if (challengeDescription) {
    lines.push(`Re-read the core requirement: ${String(challengeDescription).slice(0, 180)}.`);
  }

  if (publicCase) {
    lines.push(
      `Check your logic with this visible example: input "${publicCase.input}" should produce "${publicCase.expectedOutput}".`
    );
  }

  lines.push('Do not jump to edge cases until the first visible example works exactly.');
  return lines.join(' ');
};

const callOpenAi = async ({ promptLines }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return '';
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: promptLines.join('\n')
  });

  return (response.output_text || '').trim();
};

const callHuggingFace = async ({ promptLines }) => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

  if (!apiKey) {
    return '';
  }

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an interview coding coach.' },
        { role: 'user', content: promptLines.join('\n') }
      ],
      max_tokens: 240,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    return '';
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  return String(text || '').trim();
};

const generateAiText = async ({ promptLines }) => {
  try {
    if (AI_PROVIDER === 'huggingface') {
      const text = await callHuggingFace({ promptLines });
      if (text) {
        return text;
      }
    }

    const openAiText = await callOpenAi({ promptLines });
    if (openAiText) {
      return openAiText;
    }

    if (AI_PROVIDER !== 'huggingface') {
      const huggingFaceText = await callHuggingFace({ promptLines });
      if (huggingFaceText) {
        return huggingFaceText;
      }
    }

    return '';
  } catch {
    return '';
  }
};

const generateAiFeedback = async ({
  challengeTitle,
  challengeDescription,
  submittedOutput,
  grading
}) => {
  try {
    const promptLines = [
      'Write concise, practical feedback for a candidate.',
      'Keep it to 3 to 5 sentences.',
      'Tone: supportive, direct, actionable.',
      '',
      'Challenge title: ' + (challengeTitle || 'Unknown'),
      'Challenge description: ' + (challengeDescription || 'No description'),
      'Submitted output: ' + String(submittedOutput || ''),
      'Passed tests: ' + String(grading.passedTests),
      'Total tests: ' + String(grading.totalTests),
      'Percentage: ' + String(grading.percentage),
      '',
      'Requirements:',
      '1. Explain what likely went right or wrong.',
      '2. Give one concrete debugging step.',
      '3. Mention one improvement for interview performance.'
    ];

    const text = await generateAiText({ promptLines });
    if (text) {
      return text;
    }

    return buildFallbackFeedback({ challengeTitle, grading, submittedOutput });
  } catch (error) {
    return buildFallbackFeedback({ challengeTitle, grading, submittedOutput });
  }
};

const generateAiHint = async ({
  challengeTitle,
  challengeDescription,
  testCases,
  hintNumber,
  submittedOutput,
}) => {
  try {
    const visibleCases = (testCases || [])
      .filter((item) => !item.isHidden)
      .slice(0, 2)
      .map((item) => `Input: ${item.input} -> Expected: ${item.expectedOutput}`)
      .join('\n');

    const promptLines = [
      'Give exactly one short hint (2-3 sentences) without revealing the final solution.',
      'Never provide full code or exact final answer.',
      '',
      `Challenge title: ${challengeTitle || 'Unknown'}`,
      `Challenge description: ${challengeDescription || 'No description'}`,
      `Hint number requested: ${hintNumber}`,
      `Current submitted output: ${String(submittedOutput || '(none)')}`,
      'Visible test examples:',
      visibleCases || 'No public examples provided',
      '',
      'Focus on next step debugging guidance only.'
    ];

    const text = await generateAiText({ promptLines });
    if (text) {
      return text;
    }

    return buildFallbackHint({ challengeTitle, challengeDescription, testCases, hintNumber });
  } catch (error) {
    return buildFallbackHint({ challengeTitle, challengeDescription, testCases, hintNumber });
  }
};

const getAiMetadata = () => {
  if (AI_PROVIDER === 'huggingface') {
    return {
      provider: 'huggingface',
      model: process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      promptVersion: 'v1'
    };
  }

  return {
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    promptVersion: 'v1'
  };
};

module.exports = {
  generateAiFeedback,
  generateAiHint,
  getAiMetadata
};