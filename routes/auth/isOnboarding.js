const express = require('express');
const router = express.Router();
const {db} = require('../config/firebaseAdmin')
const extractRegisterNumber = require('../middlewares/extractRegisterNumber')

router.get('/isOnboarding', extractRegisterNumber ,async (req, res) => {
    const { registerNumber } = req;
  
    if (!registerNumber) {
      return res.status(400).json({ message: 'Register number is required' });
    }
  
    try {
      const collectionRef = db.collection('isOnboarding');
      const snapshot = await collectionRef.where('Register Number', '==', registerNumber).get();
  
      if (snapshot.empty) {
        res.status(200).json({ exists: false });
      } else {
        res.status(200).json({ exists: true });
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
module.exports = router;