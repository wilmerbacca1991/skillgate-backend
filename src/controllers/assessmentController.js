const Assessment = require('..//models/Assessment');
const Attempt = require('..//models/Attempt');
const Challenge = require('..//models/Challenge');
const FeedbackReport = require('..//models/FeedbackReport');
const { gradeOutputAgainstTestCases } = require('..//services/gradingService');
const { generateAiFeedback, generateAiHint, getAiMetadata } = require('..//services/aiFeedbackService');
const { writeAuditLog } = require('..//services/auditLogService');

const AI_HINT_LIMIT = Number(process.env.AI_HINT_LIMIT || 3);

const createFeedbackReport = async ({
attemptId,
challengeId,
candidateId,
reportType,
content,
metadata
}) => {
try {
const aiMetadata = getAiMetadata();

await FeedbackReport.create({
attempt: attemptId,
challenge: challengeId,
candidate: candidateId,
reportType,
content,
promptVersion: aiMetadata.promptVersion,
modelProvider: aiMetadata.provider,
modelName: aiMetadata.model,
metadata
});
} catch {
// Never block assessment flow because report persistence failed.
}
};

const isAssignedCandidate = (assessment, userId) => {
return (assessment.assignedCandidates || []).some(
(candidateId) => String(candidateId) === String(userId)
);
};

const getAssessments = async (req, res) => {
try {
let filter = {};

if (req.user.role === 'candidate') {
filter = { assignedCandidates: req.user._id };
} else if (req.user.role === 'recruiter') {
filter = { createdBy: req.user._id };
}

const assessments = await Assessment.find(filter)
.sort({ createdAt: -1 })
.populate('challenges.challenge', 'title difficulty language');

res.status(200).json({ assessments });
} catch (error) {
res.status(500).json({ message: 'Failed to fetch assessments' });
}
};

const createAssessment = async (req, res) => {
try {
const payload = {
...req.body,
assignedCandidates: Array.isArray(req.body.assignedCandidates)
? req.body.assignedCandidates
: [],
createdBy: req.user._id
};

const assessment = await Assessment.create(payload);

await writeAuditLog({
req,
action: 'assessment.create',
resourceType: 'assessment',
resourceId: assessment._id,
details: { title: assessment.title }
});

res.status(201).json({
message: 'Assessment created successfully',
assessment
});
} catch (error) {
console.error('createAssessment error:', error);
res.status(500).json({
message: 'Failed to create assessment',
error: process.env.NODE_ENV === 'production' ? undefined : error.message
});
}
};

const deleteAssessment = async (req, res) => {
try {
const { assessmentId } = req.params;

const assessment = await Assessment.findById(assessmentId).select('createdBy title');
if (!assessment) {
return res.status(404).json({ message: 'Assessment not found' });
}

if (
req.user.role !== 'admin' &&
String(assessment.createdBy) !== String(req.user._id)
) {
return res.status(403).json({ message: 'Forbidden: this assessment is not owned by you' });
}

await Promise.all([
Attempt.deleteMany({ assessment: assessment._id }),
Assessment.findByIdAndDelete(assessment._id)
]);

await writeAuditLog({
req,
action: 'assessment.delete',
resourceType: 'assessment',
resourceId: assessment._id,
details: { title: assessment.title }
});

return res.status(200).json({ message: 'Assessment deleted permanently' });
} catch (error) {
console.error('deleteAssessment error:', error);
return res.status(500).json({ message: 'Failed to delete assessment' });
}
};

const startAssessment = async (req, res) => {
try {
const { assessmentId } = req.params;

const assessment = await Assessment.findById(assessmentId);
if (!assessment) {
return res.status(404).json({ message: 'Assessment not found' });
}

if (!isAssignedCandidate(assessment, req.user._id)) {
return res.status(403).json({ message: 'You are not assigned to this assessment' });
}

let attempt = await Attempt.findOne({
assessment: assessmentId,
candidate: req.user._id
});

if (!attempt) {
const maxScore = assessment.challenges.reduce((sum, item) => sum + item.points, 0);

attempt = await Attempt.create({
assessment: assessmentId,
candidate: req.user._id,
startedAt: new Date(),
maxScore
});
}

if (attempt.status !== 'in_progress') {
return res.status(400).json({ message: 'Attempt is already completed or expired' });
}

res.status(200).json({
message: 'Assessment started',
attemptId: attempt._id,
startedAt: attempt.startedAt
});
} catch (error) {
res.status(500).json({ message: 'Failed to start assessment' });
}
};

const submitChallengeAnswer = async (req, res) => {
try {
const { assessmentId, challengeId } = req.params;
const { submittedOutput } = req.body;

const assessment = await Assessment.findById(assessmentId);
if (!assessment) {
return res.status(404).json({ message: 'Assessment not found' });
}

if (!isAssignedCandidate(assessment, req.user._id)) {
return res.status(403).json({ message: 'You are not assigned to this assessment' });
}

const attempt = await Attempt.findOne({
assessment: assessmentId,
candidate: req.user._id
});

if (!attempt) {
return res.status(404).json({ message: 'Attempt not found. Start assessment first.' });
}

if (attempt.status !== 'in_progress') {
return res.status(400).json({ message: 'Attempt is not in progress' });
}

const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
const allowedMs = assessment.durationMinutes * 60 * 1000;

if (elapsedMs > allowedMs) {
attempt.status = 'expired';
await attempt.save();
return res.status(400).json({ message: 'Assessment time has expired' });
}

const challenge = await Challenge.findById(challengeId);
if (!challenge) {
return res.status(404).json({ message: 'Challenge not found' });
}

const assessmentItem = assessment.challenges.find(
(item) => String(item.challenge) === String(challengeId)
);

if (!assessmentItem) {
return res.status(400).json({ message: 'Challenge does not belong to this assessment' });
}

const grading = gradeOutputAgainstTestCases(challenge.testCases, submittedOutput);
const scoreEarned = Math.round((grading.percentage / 100) * assessmentItem.points);
const aiFeedback = await generateAiFeedback({
challengeTitle: challenge.title,
challengeDescription: challenge.description,
submittedOutput,
grading
});

const existingAnswerIndex = attempt.answers.findIndex(
(a) => String(a.challenge) === String(challengeId)
);

const existingAnswer = existingAnswerIndex >= 0 ? attempt.answers[existingAnswerIndex] : null;

const answerPayload = {
challenge: challenge._id,
submittedOutput,
passedTests: grading.passedTests,
totalTests: grading.totalTests,
scoreEarned,
feedback: grading.feedback,
aiFeedback,
hintCount: existingAnswer?.hintCount || 0,
hints: existingAnswer?.hints || []
};

if (existingAnswerIndex >= 0) {
attempt.answers[existingAnswerIndex] = answerPayload;
} else {
attempt.answers.push(answerPayload);
}

attempt.totalScoreEarned = attempt.answers.reduce((sum, ans) => sum + ans.scoreEarned, 0);
await attempt.save();

await createFeedbackReport({
attemptId: attempt._id,
challengeId: challenge._id,
candidateId: req.user._id,
reportType: 'feedback',
content: aiFeedback,
metadata: {
passedTests: grading.passedTests,
totalTests: grading.totalTests,
scoreEarned
}
});

res.status(200).json({
message: 'Answer submitted and graded',
result: answerPayload,
grading: {
percentage: grading.percentage,
passedPublic: grading.passedPublic,
publicTotal: grading.publicTotal,
passedHidden: grading.passedHidden,
hiddenTotal: grading.hiddenTotal,
publicFailures: grading.publicFailures,
hiddenFailedCount: grading.hiddenFailedCount
},
totalScoreEarned: attempt.totalScoreEarned,
aiFeedback
});
} catch (error) {
res.status(500).json({ message: 'Failed to submit challenge answer' });
}
};

const requestChallengeHint = async (req, res) => {
try {
const { assessmentId, challengeId } = req.params;
const { submittedOutput } = req.body || {};

const assessment = await Assessment.findById(assessmentId);
if (!assessment) {
return res.status(404).json({ message: 'Assessment not found' });
}

if (!isAssignedCandidate(assessment, req.user._id)) {
return res.status(403).json({ message: 'You are not assigned to this assessment' });
}

const challenge = await Challenge.findById(challengeId);
if (!challenge) {
return res.status(404).json({ message: 'Challenge not found' });
}

const assessmentItem = assessment.challenges.find(
(item) => String(item.challenge) === String(challengeId)
);

if (!assessmentItem) {
return res.status(400).json({ message: 'Challenge does not belong to this assessment' });
}

const attempt = await Attempt.findOne({
assessment: assessmentId,
candidate: req.user._id
});

if (!attempt) {
return res.status(404).json({ message: 'Attempt not found. Start assessment first.' });
}

if (attempt.status !== 'in_progress') {
return res.status(400).json({ message: 'Attempt is not in progress' });
}

const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
const allowedMs = assessment.durationMinutes * 60 * 1000;

if (elapsedMs > allowedMs) {
attempt.status = 'expired';
await attempt.save();
return res.status(400).json({ message: 'Assessment time has expired' });
}

let answerIndex = attempt.answers.findIndex(
(item) => String(item.challenge) === String(challengeId)
);

if (answerIndex < 0) {
attempt.answers.push({
challenge: challenge._id,
submittedOutput: '',
passedTests: 0,
totalTests: 0,
scoreEarned: 0,
feedback: '',
aiFeedback: '',
hintCount: 0,
hints: []
});
answerIndex = attempt.answers.length - 1;
}

const answerEntry = attempt.answers[answerIndex];
const currentHintCount = Number(answerEntry.hintCount || 0);

if (currentHintCount >= AI_HINT_LIMIT) {
return res.status(429).json({
message: `Hint limit reached (${AI_HINT_LIMIT}) for this challenge.`
});
}

const hint = await generateAiHint({
challengeTitle: challenge.title,
challengeDescription: challenge.description,
testCases: challenge.testCases,
hintNumber: currentHintCount + 1,
submittedOutput: submittedOutput || answerEntry.submittedOutput
});

answerEntry.hintCount = currentHintCount + 1;
answerEntry.hints = [...(answerEntry.hints || []), hint].slice(-AI_HINT_LIMIT);

await attempt.save();

await createFeedbackReport({
attemptId: attempt._id,
challengeId: challenge._id,
candidateId: req.user._id,
reportType: 'hint',
content: hint,
metadata: {
hintCount: answerEntry.hintCount,
hintLimit: AI_HINT_LIMIT
}
});

return res.status(200).json({
message: 'Hint generated successfully',
hint,
hintCount: answerEntry.hintCount,
hintLimit: AI_HINT_LIMIT,
remainingHints: Math.max(AI_HINT_LIMIT - answerEntry.hintCount, 0)
});
} catch (error) {
return res.status(500).json({ message: 'Failed to generate hint' });
}
};

const finalizeAssessment = async (req, res) => {
try {
const { assessmentId } = req.params;

const assessment = await Assessment.findById(assessmentId);
if (!assessment) {
return res.status(404).json({ message: 'Assessment not found' });
}

if (!isAssignedCandidate(assessment, req.user._id)) {
return res.status(403).json({ message: 'You are not assigned to this assessment' });
}

const attempt = await Attempt.findOne({
assessment: assessmentId,
candidate: req.user._id
});

if (!attempt) {
return res.status(404).json({ message: 'Attempt not found' });
}

if (attempt.status !== 'in_progress') {
return res.status(400).json({ message: 'Attempt is already finalized' });
}

attempt.status = 'submitted';
attempt.submittedAt = new Date();
attempt.totalScoreEarned = attempt.answers.reduce((sum, ans) => sum + ans.scoreEarned, 0);

await attempt.save();

await writeAuditLog({
req,
action: 'assessment.finalize',
resourceType: 'attempt',
resourceId: attempt._id,
details: {
assessmentId,
totalScoreEarned: attempt.totalScoreEarned,
maxScore: attempt.maxScore
}
});

res.status(200).json({
message: 'Assessment submitted successfully',
totalScoreEarned: attempt.totalScoreEarned,
maxScore: attempt.maxScore
});
} catch (error) {
res.status(500).json({ message: 'Failed to finalize assessment' });
}
};

const getMyAssessmentAttempt = async (req, res) => {
try {
const { assessmentId } = req.params;

let candidateId = req.user._id;
if (req.user.role === 'admin') {
if (!req.query.candidateId) {
return res.status(400).json({ message: 'candidateId query parameter is required for admin' });
}
candidateId = req.query.candidateId;
}

const attempt = await Attempt.findOne({
assessment: assessmentId,
candidate: candidateId
})
.populate('assessment', 'title durationMinutes passingScore')
.populate('answers.challenge', 'title difficulty language');

if (!attempt) {
return res.status(404).json({ message: 'Attempt not found' });
}

if (req.user.role === 'candidate' && String(attempt.candidate) !== String(req.user._id)) {
return res.status(403).json({ message: 'Forbidden' });
}

return res.status(200).json({ attempt });
} catch (error) {
return res.status(500).json({ message: 'Failed to fetch attempt summary' });
}
};

module.exports = {
getAssessments,
createAssessment,
deleteAssessment,
startAssessment,
submitChallengeAnswer,
requestChallengeHint,
finalizeAssessment,
getMyAssessmentAttempt
};
