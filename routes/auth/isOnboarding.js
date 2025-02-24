const express = require('express');
const router = express.Router();
const {db} = require('../config/firebaseAdmin')
const extractRegisterNumber = require('../middlewares/extractRegisterNumber')

router.get('/isOnboarding', extractRegisterNumber, async (req, res) => {
    const { registerNumber } = req;

    if (!registerNumber) {
        return res.status(400).json({ message: 'Register number is required' });
    }

    // Check if registerNumber starts with '711721'
    const isFinalYear = registerNumber.startsWith('711721');

    try {
        const collectionRef = db.collection('isOnboarding');
        const snapshot = await collectionRef.where('Register Number', '==', registerNumber).get();

        if (snapshot.empty) {
            res.status(200).json({ exists: false, isFinalYear });
        } else {
            res.status(200).json({ exists: true, isFinalYear });
        }
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

  
  router.get('/check-register-number',extractRegisterNumber, async (req, res) => {
    const { registerNumber } = req;
    const usersCollection = db.collection('Users_details');
  
    try {
      const snapshot = await usersCollection.where('Register Number', '==', registerNumber).get();
  
      if (snapshot.empty) {
        // RegisterNumber not found
        return res.json({ exists: false });
      }
  
      // RegisterNumber found
      return res.json({ exists: true });
    } catch (error) {
      console.error('Error checking RegisterNumber: ', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
module.exports = router;