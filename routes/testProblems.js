// Import required modules
const express = require('express');
const { db ,admin} = require('./config/firebaseAdmin'); // Import Firestore from your firebase config
const router = express.Router();

// Route to retrieve all document IDs and problem names from the Test_problems collection
router.get('/getProblems', async (req, res) => {
  try {
    const problemsCollection = db.collection('Test_problems');
    const snapshot = await problemsCollection.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No problems found' });
    }

    // Collect document IDs and problemName fields
    const problems = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.problemName) {  // Ensure problemName exists
        problems.push({
          id: doc.id,
          problemName: data.problemName,
          topic: data.topic,
          difficulty : data.difficulty
        });
      }
    });

    // Send the collected data as JSON
    return res.json({ problems });

  } catch (error) {
    console.error('Error retrieving documents:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getAllTestData', async (req, res) => {
    try {
      const testCollection = db.collection('Tests');
      const snapshot = await testCollection.get();
  
      if (snapshot.empty) {
        return res.status(404).json({ message: 'No data found in the Test collection' });
      }
  
      // Collect each document's ID and data
      const testData = [];
      snapshot.forEach(doc => {
        testData.push({
          id: doc.id,
          ...doc.data() // Spread operator to include all fields in the document
        });
      });
  
      // Send the collected data as JSON
      return res.json({ testData });
  
    } catch (error) {
      console.error('Error retrieving documents:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  router.get('/getTestDocumentIds', async (req, res) => {
    try {
      const testsCollection = db.collection('Tests');
      const snapshot = await testsCollection.get();
  
      if (snapshot.empty) {
        return res.status(404).json({ message: 'No documents found in the Tests collection' });
      }
  
      // Collect document IDs only
      const documentIds = snapshot.docs.map(doc => doc.id);
  
      // Send the collected document IDs as JSON
      return res.json({ documentIds });
  
    } catch (error) {
      console.error('Error retrieving document IDs:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  router.post('/addTestQuestion', async (req, res) => {
    try {
      // Destructure required fields from request body
      const { testId, problemIds, numberOfProblems, dueTime } = req.body;
  
      // Check if 'id' is provided, as it's required to create the document
      if (!testId) {
        return res.status(400).json({ error: 'Document ID is required to create a test entry.' });
      }
  
      // Convert dueTime to Firestore Timestamp format
      const dueDateTime = new Date(dueTime);
      const dueTimestamp = admin.firestore.Timestamp.fromDate(dueDateTime);
  
      // Generate created_at timestamp for current time
      const createdAt = admin.firestore.Timestamp.now();
  
      // Initialize completionStatus as an empty map (or empty object in JavaScript)
      const completionStatus = {};
  
      // Structure the data to be saved in Firestore
      const testData = {
        problemIds: problemIds,
        completionStatus: completionStatus,
        created_at: createdAt,
        numberOfProblems: numberOfProblems,
        dueTime: dueTimestamp,
      };
  
      // Use the provided 'id' to create or update the document
      const testDocRef = db.collection('Tests').doc(testId);
      await testDocRef.set(testData);
  
      // Send a success response with the document ID
      return res.status(200).json({ message: 'Test data added or updated successfully', documentId: testId });
  
    } catch (error) {
      console.error('Error adding test data:', error);
      return res.status(500).json({ error: 'Failed to add or update test data in Firestore' });
    }
  });


module.exports = router;
