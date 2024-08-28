const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const extractRegisterNumber = require('../middlewares/extractRegisterNumber');

router.get('/checkRegisterNumber', extractRegisterNumber, async (req, res) => {
  const registerNumber = req.registerNumber;

  if (!registerNumber) {
    return res.status(400).json({ error: 'Register number is required' });
  }

  try {
    const userSnapshot = await db.collection('userCredentials')
                                 .where('registerNumber', '==', registerNumber)
                                 .limit(1)
                                 .get();

    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      return res.status(200).json({ exists: true, id: userDoc.id });
    } else {
      // Send 200 OK with exists: false if the register number is not found
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking register number:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
