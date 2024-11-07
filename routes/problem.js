const express = require('express');
const router = express.Router();
const {db} = require('./config/firebaseAdmin');
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

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

  // Route to get all documents from Test_Problems collection
router.get('/testProblems', async (req, res) => {
  try {
    const testProblemsCollection = db.collection('Test_problems');
    const snapshot = await testProblemsCollection.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No documents found' });
    }

    const testProblems = [];
    snapshot.forEach(doc => {
      testProblems.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(testProblems);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
});


router.post('/addTestQuestion', extractRegisterNumber, async (req, res) => {
  try {
    const { problemName, problemDescription, testCases, hint, difficulty ,topic} = req.body;
    const {registerNumber} = req;
    // Structure the data as expected
    const newTestProblem = {
      problemName: problemName || '',
      problemDescription: problemDescription || '',
      testCases: testCases || [],
      hint: hint || '',
      addedBy: registerNumber || '',
      difficulty: difficulty || 'Easy',
      topic:topic ||''
    };

    // Add the document to Firestore with an auto-generated ID
    const docRef = await db.collection('Test_problems').add(newTestProblem);

    res.status(201).json({ message: 'Test question added successfully', id: docRef.id });
  } catch (error) {
    console.error('Error adding test question:', error);
    res.status(500).json({ message: 'Error adding test question', error: error.message });
  }
});

module.exports = router;
