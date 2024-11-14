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


  //-----------V2------------

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
router.put('/updateTestQuestion/:id', async (req, res) => {
  const { id } = req.params; // Get the document ID from URL parameters
  const {
    problemName,
    problemDescription,
    testCases,
    hint,
    difficulty,
    topic
  } = req.body;

  try {
    // Get the reference to the specific document in the Firestore collection
    const testProblemRef = db.collection('Test_problems').doc(id);

    // Update the document with the provided data
    await testProblemRef.update({
      problemName,
      problemDescription,
      testCases,
      hint,
      difficulty,
      topic,
      updatedAt: new Date() // Optionally include an updated timestamp
    });

    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Test problem updated successfully!',
    });
  } catch (error) {
    console.error('Error updating test problem:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test problem',
    });
  }
});



router.get('/practice', async (req, res) => {
  try {
    // Fetch data from Test_problems collection
    const testProblemsSnapshot = await db.collection('Test_problems').get();

    // Handle case if Test_problems collection is empty
    const testProblems = testProblemsSnapshot.empty
      ? []
      : testProblemsSnapshot.docs.map((doc) => {
          const { problemName, difficulty, topic } = doc.data();
          return {
            id: doc.id,
            problemName,
            difficulty,
            topic,
          };
        });

    // Fetch data from Problems collection
    const problemsSnapshot = await db.collection('Problems').get();

    // Handle case if Problems collection is empty
    const problems = problemsSnapshot.empty
      ? []
      : problemsSnapshot.docs.map((doc) => {
          const { problemName, difficulty } = doc.data();
          return {
            id: doc.id,
            problemName,
            difficulty,
            topic: 'Input/Output Functions', // Set topic for Problems collection
          };
        });

    // Combine both sets of problems into a single array
    const allProblems = [...testProblems, ...problems];

    // Check if any problems were found
    if (allProblems.length === 0) {
      return res.status(404).json({ error: 'No problems found' });
    }

    // Send combined problems data as response
    res.status(200).json(allProblems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
