// Import required modules
const express = require('express');
const { db ,admin} = require('./config/firebaseAdmin'); // Import Firestore from your firebase config
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');
const router = express.Router();
const axios = require('axios');

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

  // Route to get all the active tests for that register number
  const getCurrentTimestamp = () => {
    return admin.firestore.Timestamp.now();
  };
  router.get('/getActiveTests', async (req, res) => {
    try {  
      const testsRef = db.collection('Tests');
      const currentTimestamp = getCurrentTimestamp();
  
      // Query for documents where dueTime is greater than the current time and the completionStats does not have a completion for the given registerNumber
      const querySnapshot = await testsRef
        .where('dueTime', '>', currentTimestamp) // Check if the test is not expired // Check if the registerNumber is incomplete (not yet completed)
        .get();
  
      if (querySnapshot.empty) {
        return res.status(200).json({ message: 'No active tests found for the provided register number.' });
      }
  
      // Prepare the result
      const tests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      return res.json({ tests });
    } catch (error) {
      console.error('Error retrieving active tests:', error);
      return res.status(500).json({ error: 'Failed to retrieve active tests. Please try again later.' });
    }
  });
  

  router.get('/getTest/:testId', async (req, res) => {
    const { testId } = req.params;
  
    try {
      // Retrieve the test document from the 'Tests' collection
      const testDoc = await db.collection('Tests').doc(testId).get();
  
      if (!testDoc.exists) {
        return res.status(404).json({ error: 'Test not found' });
      }
  
      const testData = testDoc.data();
  
      // Retrieve data from the 'Test_problems' collection for each problemId
      const problemIds = testData.problemIds || [];
      const problemDataPromises = problemIds.map(problemId => 
        db.collection('Test_problems').doc(problemId).get()
      );
  
      const problemDocs = await Promise.all(problemDataPromises);
  
      // Map problem data, ignoring any problemIds that do not exist in 'Test_problems'
      const problemData = problemDocs.reduce((acc, doc) => {
        if (doc.exists) {
          acc[doc.id] = doc.data();
        }
        return acc;
      }, {});
  
      // Combine test data with problem data
      const responseData = {
        testData: {
          ...testData,
          problems: problemData, // Adds the retrieved problem data
        },
      };
  
      res.json(responseData);
    } catch (error) {
      console.error('Error retrieving test data:', error);
      res.status(500).json({ error: 'Error retrieving test data' });
    }
  });
  

  router.get('/testProblem/:problemId', async (req, res) => {
    const { problemId } = req.params; // Get document ID from URL parameter
  
    try {
      const docRef = db.collection('Test_problems').doc(problemId); // Reference to the document
      const docSnapshot = await docRef.get();
  
      if (!docSnapshot.exists) {
        return res.status(404).json({ message: 'Problem not found' });
      }
  
      const problemData = docSnapshot.data();
      res.status(200).json({ problemData });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch problem data', error });
    }
  });


  const languageVersions = {
    python: '3.10.0',
    c: '10.2.0',
    java: '15.0.2'
  };
  
  // POST /compile route
  router.post('/compile', async (req, res) => {
    const { code, language, input, output } = req.body;
  
    // Check if the language is supported
    if (!languageVersions[language]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }
  
    // Get the fixed version for the selected language
    const version = languageVersions[language];
  
    try {
      // Prepare the payload for the Piston API request
      const compilePayload = {
        language: language,
        version: version,  // Fixed version for the language
        files: [
          {
            name: `solution.${language}`,  // File name based on the language (e.g., solution.py, solution.java)
            content: code,  // Code from the frontend (student's solution)
          }
        ],
        stdin: input,  // Input for the current test case
        compile_timeout: 10000,  // Compilation timeout in ms
        run_timeout: 3000,  // Execution timeout in ms
        compile_memory_limit: -1,  // No memory limit for compilation
        run_memory_limit: -1,  // No memory limit for execution
      };
  
      try {
        // Send the compile request to the Piston API
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', compilePayload);
  
        // Get the output from the response
        const actualOutput = response.data.run.output;
  
        // Trim both expected and actual output to remove any trailing spaces before comparison
        const trimmedExpectedOutput = output.trim();
        const trimmedActualOutput = actualOutput.trim();
  
        // Return result after comparing the outputs
        return res.json({
          input: input,  // Test case input
          expectedOutput: trimmedExpectedOutput,  // Expected output (trimmed)
          result: trimmedExpectedOutput === trimmedActualOutput ? 'Pass' : 'Fail',  // Compare the trimmed output
          output: trimmedActualOutput,  // Actual output (trimmed)
        });
      } catch (error) {
        console.error('Error during compilation for input:', input, error);
        return res.json({
          input: input,
          expectedOutput: output,
          result: 'Error',
          output: 'Error executing the test case',
        });
      }
    } catch (error) {
      console.error('Error during compilation:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  

  router.post('/submission', async (req, res) => {
    let { testId, registerNumber, score, problemId } = req.body;

    try {
      // Decode testId if it’s encoded
      testId = decodeURIComponent(testId);

      // Reference to the test document
      const testRef = db.collection('Tests').doc(testId);
  
      // Get the current timestamp to mark when the problem was completed
      const completedTime = admin.firestore.Timestamp.now();
  
      // Fetch the test document from the collection
      const testDoc = await testRef.get();
  
      if (!testDoc.exists) {
        return res.status(404).json({ error: 'Test not found' });
      }
  
      // Get the current completion status
      const testData = testDoc.data();
      const completionStatus = testData.completionStatus || {};
  
      // Create a new submission entry
      const newSubmission = {
        score: score,
        completedTime: completedTime,
        problemIds: problemId,
      };
  
      // Check if the register number already exists in completionStatus
      if (completionStatus[registerNumber]) {
        // If register number exists, add the new submission
        completionStatus[registerNumber].push(newSubmission);
      } else {
        // If register number doesn't exist, create a new array for the register number
        completionStatus[registerNumber] = [newSubmission];
      }
  
      // Update the document with the new completion status
      await testRef.update({ completionStatus });
  
      // Send a success response
      res.json({ message: 'Submission recorded successfully' });
    } catch (error) {
      console.error('Error recording submission:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

module.exports = router;
