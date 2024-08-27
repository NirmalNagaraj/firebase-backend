const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Assuming you have a firebaseConfig.js file exporting the Firestore instance
const getUserCredentials = require('./middlewares/getCredentials')
module.exports = () => {
  router.post('/compile', getUserCredentials, async (req, res) => {
    try {
      const { script, stdin, language, versionIndex, registerNumber, problemId, expectedOutput } = req.body;
      const { clientId, clientSecret } = req; // Retrieve clientId and clientSecret from the middleware
  
      const response = await axios.post('https://api.jdoodle.com/v1/execute', {
        clientId,
        clientSecret,
        script,
        stdin,
        language,
        versionIndex,
        compileOnly: false,
      });
  
      const compiledOutput = response.data.output.trim();
      const isSuccessful = compiledOutput === expectedOutput.trim();
  
      if (isSuccessful) {
        // Check if the problem entry already exists
        const existingEntry = await db.collection('Problems_details')
          .where('RegisterNumber', '==', registerNumber)
          .where('ProblemId', '==', problemId)
          .get();
  
        if (existingEntry.empty) {
          // Add entry if it doesn't exist
          await db.collection('Problems_details').add({
            CompletedBy: new Date(), // Current timestamp
            ProblemId: problemId,
            RegisterNumber: registerNumber
          });
        }
      }
  
      res.status(200).json({
        ...response.data,
        isSuccessful
      });
    } catch (error) {
      console.error('Error compiling code:', error);
      res.status(500).json({ error: 'Error compiling code' });
    }
  });
  

  router.get('/get-question/:id', async (req, res) => {
    const problemId = req.params.id;

    try {
      const problemDoc = await db.collection('Problems').doc(problemId).get();

      if (!problemDoc.exists) {
        return res.status(404).json({ message: 'Problem not found' });
      }

      res.json({ id: problemDoc.id, ...problemDoc.data() }); // Send the problem data back as JSON
    } catch (error) {
      console.error('Error fetching problem from Firestore:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  // Route to check if problem and register number exist in Problems_details
  router.get('/check/completion', async (req, res) => {
    const { registerNumber, problemId } = req.query;

    try {
      const snapshot = await db.collection('Problems_details')
        .where('RegisterNumber', '==', registerNumber)
        .where('ProblemId', '==', problemId)
        .get();

      const exists = !snapshot.empty;
      res.status(200).json({ exists });
    } catch (error) {
      console.error('Error checking completion status:', error);
      res.status(500).json({ error: 'Error checking completion status' });
    }
  });
  router.get('/check/isCredentials', async (req, res) => {
    const { registerNumber } = req.query;

    try {
        // Query Firestore to check if credentials exist for the given register number
        const snapshot = await db.collection('userCredentials')
            .where('registerNumber', '==', registerNumber)
            .get();

        // Check if the snapshot contains any documents
        const credentialsExist = !snapshot.empty;

        // Send the result back to the client
        res.status(200).json({ exists: credentialsExist });
    } catch (error) {
        console.error('Error checking credentials:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  return router;
};
