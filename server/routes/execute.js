const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

// Judge0 language IDs
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  typescript: 74
};

// POST /api/execute
router.post('/', auth, async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ message: 'Code and language are required' });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return res.status(400).json({ message: 'Unsupported language' });
  }

  try {
    // Step 1 — Submit code to Judge0, get a token back
    const submitRes = await axios.post(
      'https://ce.judge0.com/submissions?base64_encoded=false&wait=false',
      {
        source_code: code,
        language_id: languageId,
        stdin: ''
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const token = submitRes.data.token;

    // Step 2 — Poll until execution is complete
    let result = null;
    let attempts = 0;

    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await axios.get(
        `https://ce.judge0.com/submissions/${token}?base64_encoded=false`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const status = statusRes.data.status.id;

      // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4+=Error
      if (status > 2) {
        result = statusRes.data;
        break;
      }

      attempts++;
    }

    if (!result) {
      return res.status(408).json({ message: 'Execution timed out' });
    }

    // Return cleaned result
    res.json({
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      status: result.status.description,
      time: result.time,
      memory: result.memory
    });

  } catch (error) {
    console.error('Judge0 error:', error.message);
    res.status(500).json({ message: 'Execution service unavailable' });
  }
});

module.exports = router;