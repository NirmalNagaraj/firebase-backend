const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Firestore instance
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

module.exports = () => {
  // Route to get user details
  router.get('/', extractRegisterNumber, async (req, res) => {
    const registerNumber = req.registerNumber;

    try {
      const usersSnapshot = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

      if (usersSnapshot.empty) {
        console.log('No user found'); // Debugging line
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = usersSnapshot.docs[0].data();
      res.json(userData);
    } catch (err) {
      console.error('Error fetching user details:', err); // Debugging line
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Route to update user profile
  router.post('/update-profile', extractRegisterNumber, async (req, res) => {
    const { cgpa, historyOfArrears, currentBacklogs, skillset, otherDomain, resumeLink, githubLink, linkedinLink } = req.body;
    const registerNumber = req.registerNumber;

    console.log(`Updating profile for registerNumber: ${registerNumber}`); // Debugging line

    try {
      const usersSnapshot = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

      if (usersSnapshot.empty) {
        console.log('No user found'); // Debugging line
        return res.status(404).json({ message: 'User not found' });
      }

      const userDocRef = usersSnapshot.docs[0].ref;
      await userDocRef.update({
        CGPA: cgpa,
        "History Of Arrears": historyOfArrears,
        "Current Backlogs": currentBacklogs,
        "Skill Set": skillset,
        "Other Interested Domain": otherDomain,
        Resume: resumeLink,
        Github: githubLink,
        Linkedin: linkedinLink,
      });
      
      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error); // Debugging line
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  router.get('/get-arrear-details',extractRegisterNumber , async (req, res) => {
    const registerNumber = req.registerNumber;
  
    if (!registerNumber) {
      return res.status(400).json({ error: 'Register number is required' });
    }
  
    try {
      const usersRef = db.collection('Users_details');
      const snapshot = await usersRef.where('Register Number', '==', registerNumber).get();
  
      if (snapshot.empty) {
        return res.status(404).json({ error: 'No user found with the provided register number' });
      }
  
      // Assuming that there's only one document per register number
      const doc = snapshot.docs[0];
      const data = doc.data();
  
      // Extract only specific fields
      const arrearDetails = {
        historyOfArrears: data["History of Arrears"],
        currentBacklogs: data["Current Backlogs"]
      };
  
      res.status(200).json({ arrearDetails });
    } catch (error) {
      console.error('Error fetching arrear details:', error);
      res.status(500).json({ error: 'Failed to fetch arrear details' });
    }
  });

  return router;
};
