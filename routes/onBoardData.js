const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin');
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

// Route to update onboarding data
router.post('/add', extractRegisterNumber, async (req, res) => {
  const { registerNumber } = req;
  const { currentBacklogs, historyOfArrears, github, linkedin, resume } = req.body;

  if (!registerNumber) {
    return res.status(400).json({ message: 'Register number is required' });
  }

  if (!currentBacklogs || !historyOfArrears || !github || !linkedin || !resume) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Reference to the document where the Register Number matches
    const userDoc = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

    if (userDoc.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the document
    const userRef = userDoc.docs[0].ref;
    await userRef.update({
      'History of Arrears': historyOfArrears,
      'Github': github,
      'LinkedIn': linkedin,
      'Resume': resume,
      'Current Backlogs': currentBacklogs, // This field wasn't mentioned, but assuming you want to include it
    });

    res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating onboarding data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
