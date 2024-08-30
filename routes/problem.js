const express = require('express');
const router = express.Router();
const {db} = require('./config/firebaseAdmin')

router.post('/add', async (req, res) => {
    const {
      problemName,
      problemDescription,
      sampleInput,
      sampleOutput,
      link,
      hint,
      input1,
      input2,
      output1,
      output2,
      explanation1, // New field for explanation of input1
      explanation2,  // New field for explanation of input2
      constraints
    } = req.body;

    try {
      // Add a new document with auto-generated ID
      const docRef = await db.collection('Problems').add({
        problemName,
      problemDescription,
      sampleInput,
      sampleOutput,
      link,
      hint,
      input1,
      input2,
      output1,
      output2,
      explanation1, // New field for explanation of input1
      explanation2,  // New field for explanation of input2
      constraints
      });

      res.status(201).json({ message: 'Problem added successfully', id: docRef.id });
    } catch (error) {
      console.error('Error inserting problem:', error);
      res.status(500).json({ error: 'Failed to add problem' });
    }
  });

  router.get('/all', async (req, res) => {
    try {
      const snapshot = await db.collection('Problems').get();

      if (snapshot.empty) {
        return res.status(404).json({ message: 'No problems found' });
      }

      const problems = [];
      snapshot.forEach(doc => {
        problems.push({ id: doc.id, ...doc.data() });
      });

      res.status(200).json(problems);
    } catch (error) {
      console.error('Error fetching problems:', error);
      res.status(500).json({ error: 'Failed to fetch problems' });
    }
  });

module.exports = router;
