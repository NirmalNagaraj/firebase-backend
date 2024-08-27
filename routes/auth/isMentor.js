const express = require('express');
const router = express.Router();
const {db} = require('../config/firebaseAdmin')
const extractRegisterNumber = require('../middlewares/extractRegisterNumber'); // Adjust path as needed

module.exports = () => {

  // Route to check whether the registerNumber has isMentor field set to true.
  router.get('/check/isMentor', extractRegisterNumber, async (req, res) => {
    const { registerNumber } = req;

    try {
      // Query to find the document by registerNumber
      const usersRef = db.collection('Users_details');
      const snapshot = await usersRef.where('Register Number', '==', registerNumber).get();

      if (snapshot.empty) {
        return res.status(404).json({ error: 'Register number not found' });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const isMentor = userData.isMentor == 1;

      res.status(200).json({ isMentor });
    } catch (error) {
      console.error('Error checking isMentor field:', error);
      res.status(500).json({ error: 'Failed to check isMentor field' });
    }
  });

  // Route to update isMentor field
  router.post('/update/isMentor', async (req, res) => {
    const { registerNumber, action } = req.body;

    try {
      // Determine the value of `isMentor` based on the action
      const isMentor = action === 'add' ? 1 : 0;

      // Query to find the document by registerNumber
      const usersRef = db.collection('Users_details');
      const snapshot = await usersRef.where('Register Number', '==', registerNumber).get();

      if (snapshot.empty) {
        return res.status(404).json({ error: 'Register number not found' });
      }

      const userDoc = snapshot.docs[0].ref; // Get a reference to the document
      await userDoc.update({ isMentor });

      res.status(200).json({ message: `isMentor field updated successfully to ${isMentor}` });
    } catch (error) {
      console.error('Error updating isMentor field:', error);
      res.status(500).json({ error: 'Failed to update isMentor field' });
    }
  });

  return router;
};
