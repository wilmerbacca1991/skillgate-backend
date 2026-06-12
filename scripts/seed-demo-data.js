require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Challenge = require('../src/models/Challenge');
const Assessment = require('../src/models/Assessment');
const Attempt = require('../src/models/Attempt');

const MONGODB_URI = process.env.MONGODB_URI;

const seed = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in .env');
  }

  await mongoose.connect(MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Challenge.deleteMany({}),
    Assessment.deleteMany({}),
    Attempt.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const recruiter = await User.create({
    firstName: 'Mia',
    lastName: 'Recruiter',
    email: 'mia.recruiter@test.com',
    password: passwordHash,
    role: 'recruiter',
    profileCompleted: true
  });

  const candidate = await User.create({
    firstName: 'Jamie',
    lastName: 'Candidate',
    email: 'jamie.candidate@test.com',
    password: passwordHash,
    role: 'candidate',
    profileCompleted: true
  });

  const libraryChallenges = [
    {
      title: 'Junior · Arrays · Two Sum Index Match',
      description:
        'Task: Given an array of numbers and a target sum, return the two indices of numbers that add up to the target. Return the answer as [index1,index2].',
      difficulty: 'easy',
      language: 'javascript',
      starterCode:
        'function solve(nums, target) {\n  // return [index1, index2]\n  return [];\n}',
      tags: ['junior', 'arrays', 'hashmap', 'subject:array-search'],
      testCases: [
        { input: '[2,7,11,15];9', expectedOutput: '[0,1]', isHidden: false },
        { input: '[3,2,4];6', expectedOutput: '[1,2]', isHidden: false },
        { input: '[3,3];6', expectedOutput: '[0,1]', isHidden: true }
      ]
    },
    {
      title: 'Junior · Strings · Valid Parentheses Checker',
      description:
        'Task: Given a string containing only (), {}, and [], return true if every opening bracket is closed in the correct order, otherwise return false.',
      difficulty: 'easy',
      language: 'javascript',
      starterCode: 'function solve(s) {\n  // return true or false\n  return false;\n}',
      tags: ['junior', 'strings', 'stack', 'subject:syntax-validation'],
      testCases: [
        { input: '()[]{}', expectedOutput: 'true', isHidden: false },
        { input: '(]', expectedOutput: 'false', isHidden: false },
        { input: '([{}])', expectedOutput: 'true', isHidden: true }
      ]
    },
    {
      title: 'Intermediate · Strings · Longest Unique Substring',
      description:
        'Task: Given a string, return the length of the longest contiguous substring that contains no repeated characters.',
      difficulty: 'medium',
      language: 'javascript',
      starterCode: 'function solve(s) {\n  return 0;\n}',
      tags: ['intermediate', 'strings', 'sliding-window', 'subject:window-optimization'],
      testCases: [
        { input: 'abcabcbb', expectedOutput: '3', isHidden: false },
        { input: 'bbbbb', expectedOutput: '1', isHidden: false },
        { input: 'pwwkew', expectedOutput: '3', isHidden: true }
      ]
    },
    {
      title: 'Intermediate · Data Processing · Top-K Frequent Values',
      description:
        'Task: Given an array of numbers and an integer k, return the k values that appear most frequently.',
      difficulty: 'medium',
      language: 'javascript',
      starterCode: 'function solve(nums, k) {\n  return [];\n}',
      tags: ['intermediate', 'heap', 'hashmap', 'subject:frequency-analysis'],
      testCases: [
        { input: '[1,1,1,2,2,3];2', expectedOutput: '[1,2]', isHidden: false },
        { input: '[1];1', expectedOutput: '[1]', isHidden: false },
        { input: '[4,4,4,6,6,7,7,7];1', expectedOutput: '[4]', isHidden: true }
      ]
    },
    {
      title: 'Intermediate · Scheduling · Merge Overlapping Intervals',
      description:
        'Task: Given a list of intervals [start,end], merge all overlapping intervals and return the minimal list of non-overlapping intervals.',
      difficulty: 'medium',
      language: 'javascript',
      starterCode: 'function solve(intervals) {\n  return [];\n}',
      tags: ['intermediate', 'sorting', 'intervals', 'subject:scheduling'],
      testCases: [
        {
          input: '[[1,3],[2,6],[8,10],[15,18]]',
          expectedOutput: '[[1,6],[8,10],[15,18]]',
          isHidden: false
        },
        {
          input: '[[1,4],[4,5]]',
          expectedOutput: '[[1,5]]',
          isHidden: false
        },
        {
          input: '[[1,4],[0,2],[3,5]]',
          expectedOutput: '[[0,5]]',
          isHidden: true
        }
      ]
    },
    {
      title: 'Intermediate · Trees · Lowest Common Ancestor in BST',
      description:
        'Task: Given a binary search tree and two node values p and q, return the value of their lowest common ancestor (the deepest shared parent).',
      difficulty: 'medium',
      language: 'javascript',
      starterCode: 'function solve(root, p, q) {\n  return null;\n}',
      tags: ['intermediate', 'trees', 'bst', 'subject:tree-navigation'],
      testCases: [
        { input: '[6,2,8,0,4,7,9,null,null,3,5];2;8', expectedOutput: '6', isHidden: false },
        { input: '[6,2,8,0,4,7,9,null,null,3,5];2;4', expectedOutput: '2', isHidden: false },
        { input: '[2,1];2;1', expectedOutput: '2', isHidden: true }
      ]
    },
    {
      title: 'Senior · Arrays · Trapping Rain Water',
      description:
        'Task: Given an elevation map represented by an array of bar heights, return the total units of rainwater that can be trapped.',
      difficulty: 'hard',
      language: 'javascript',
      starterCode: 'function solve(height) {\n  return 0;\n}',
      tags: ['senior', 'two-pointers', 'arrays', 'subject:space-time-tradeoff'],
      testCases: [
        { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6', isHidden: false },
        { input: '[4,2,0,3,2,5]', expectedOutput: '9', isHidden: false },
        { input: '[2,0,2]', expectedOutput: '2', isHidden: true }
      ]
    },
    {
      title: 'Senior · System Design · LRU Cache Engine',
      description:
        'Task: Implement an LRU cache class with O(1) get and put. get(key) returns the value or -1 if missing; put(key,value) inserts or updates and evicts least-recently-used entries when capacity is exceeded.',
      difficulty: 'hard',
      language: 'javascript',
      starterCode: 'class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}',
      tags: ['senior', 'design', 'linked-list', 'hashmap', 'subject:cache-invalidation'],
      testCases: [
        {
          input: 'capacity=2;put(1,1),put(2,2),get(1),put(3,3),get(2),put(4,4),get(1),get(3),get(4)',
          expectedOutput: '[1,-1,-1,3,4]',
          isHidden: false
        },
        {
          input: 'capacity=1;put(2,1),get(2),put(3,2),get(2),get(3)',
          expectedOutput: '[1,-1,2]',
          isHidden: true
        }
      ]
    },
    {
      title: 'Senior · Platform · Binary Tree Serializer',
      description:
        'Task: Implement serialize(root) and deserialize(data) so a binary tree can be converted to text and rebuilt with the same structure and values.',
      difficulty: 'hard',
      language: 'javascript',
      starterCode:
        'function serialize(root) { return ""; }\nfunction deserialize(data) { return null; }',
      tags: ['senior', 'trees', 'bfs', 'design', 'subject:data-serialization'],
      testCases: [
        {
          input: '[1,2,3,null,null,4,5]',
          expectedOutput: '[1,2,3,null,null,4,5]',
          isHidden: false
        },
        {
          input: '[]',
          expectedOutput: '[]',
          isHidden: true
        }
      ]
    },
    {
      title: 'Senior · Backend Infrastructure · Token Bucket Rate Limiter',
      description:
        'Task: Implement a token bucket rate limiter. allowRequest(timestampMs) should return true when a token is available and false otherwise, with tokens refilling over time at the configured rate.',
      difficulty: 'hard',
      language: 'javascript',
      starterCode:
        'class TokenBucket {\n  constructor(capacity, refillPerSecond) {}\n  allowRequest(timestampMs) { return false; }\n}',
      tags: ['senior', 'system-design', 'rate-limiting', 'subject:traffic-control'],
      testCases: [
        {
          input: 'capacity=3;refill=1;requests=[0,0,0,0,1000,1000,2000]',
          expectedOutput: '[true,true,true,false,true,false,true]',
          isHidden: false
        },
        {
          input: 'capacity=2;refill=2;requests=[0,0,400,500,1000]',
          expectedOutput: '[true,true,false,true,true]',
          isHidden: true
        }
      ]
    }
  ];

  const challengeDocs = await Challenge.insertMany(
    libraryChallenges.map((challenge) => ({
      ...challenge,
      createdBy: recruiter._id
    }))
  );

  const juniorAssessment = await Assessment.create({
    title: 'Junior Developer Screen',
    description: 'Core problem-solving and data structure basics for junior candidates.',
    durationMinutes: 45,
    passingScore: 65,
    challenges: [
      { challenge: challengeDocs[0]._id, points: 35, order: 1 },
      { challenge: challengeDocs[1]._id, points: 35, order: 2 },
      { challenge: challengeDocs[2]._id, points: 30, order: 3 }
    ],
    assignedCandidates: [candidate._id],
    createdBy: recruiter._id
  });

  await Assessment.create({
    title: 'Intermediate Developer Screen',
    description: 'Algorithmic depth and real-world coding tasks for intermediate candidates.',
    durationMinutes: 70,
    passingScore: 70,
    challenges: [
      { challenge: challengeDocs[3]._id, points: 30, order: 1 },
      { challenge: challengeDocs[4]._id, points: 35, order: 2 },
      { challenge: challengeDocs[5]._id, points: 35, order: 3 }
    ],
    assignedCandidates: [candidate._id],
    createdBy: recruiter._id
  });

  await Assessment.create({
    title: 'Senior Developer Deep Dive',
    description: 'Advanced algorithmic and system-thinking interview problems for senior candidates.',
    durationMinutes: 100,
    passingScore: 75,
    challenges: [
      { challenge: challengeDocs[6]._id, points: 20, order: 1 },
      { challenge: challengeDocs[7]._id, points: 25, order: 2 },
      { challenge: challengeDocs[8]._id, points: 25, order: 3 },
      { challenge: challengeDocs[9]._id, points: 30, order: 4 }
    ],
    assignedCandidates: [candidate._id],
    createdBy: recruiter._id
  });

  await Attempt.create({
    assessment: juniorAssessment._id,
    candidate: candidate._id,
    status: 'submitted',
    startedAt: new Date(),
    submittedAt: new Date(),
    answers: [
      {
        challenge: challengeDocs[0]._id,
        submittedOutput: '[0,1]',
        passedTests: 3,
        totalTests: 3,
        scoreEarned: 100,
        feedback: 'Great work. You solved the problem using an efficient hash map approach.',
        aiFeedback:
          'Strong junior-level solution. Next, practice edge-case handling and time/space trade-offs for medium-level interviews.'
      }
    ],
    totalScoreEarned: 100,
    maxScore: 100
  });

  console.log('Seed complete.');
  console.log('Recruiter login: mia.recruiter@test.com / Password123!');
  console.log('Candidate login: jamie.candidate@test.com / Password123!');
  console.log('Challenges seeded:', challengeDocs.length);
  console.log('Sample assessment id:', juniorAssessment._id.toString());
  console.log('Sample challenge id:', challengeDocs[0]._id.toString());

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});