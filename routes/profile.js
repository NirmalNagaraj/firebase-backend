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
        currentBacklogs: data["Current Backlogs"],
        imageUrl: data.imageUrl
      };
  
      res.status(200).json({ arrearDetails });
    } catch (error) {
      console.error('Error fetching arrear details:', error);
      res.status(500).json({ error: 'Failed to fetch arrear details' });
    }
  });

  router.post('/profile-image', extractRegisterNumber, async (req, res) => {
    const { imageUrl } = req.body;
    const registerNumber = req.registerNumber;
    
    if (!registerNumber || !imageUrl) {
      return res.status(400).json({ error: 'registerNumber and imageUrl are required' });
    }
  
    try {
      // Query Firestore for the document with the specified registerNumber
      const usersRef = db.collection('Users_details');
      const querySnapshot = await usersRef.where('Register Number', '==', registerNumber).get();
  
      if (querySnapshot.empty) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update the first document found with the new imageUrl
      const userDoc = querySnapshot.docs[0];
      await userDoc.ref.update({ imageUrl });
  
      res.status(200).json({ message: 'Profile image updated successfully' });
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
router.get('/checkGenderField',extractRegisterNumber , async (req, res) => {
  try {
    const { registerNumber } = req; // Extract Register Number from request body

    if (!registerNumber) {
      return res.status(400).json({ error: 'Register Number is required' });
    }

    // Query the Users_details collection to find the document with the given Register Number
    const usersCollection = db.collection('Users_details');
    const querySnapshot = await usersCollection.where('Register Number', '==', registerNumber).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: `No document found with Register Number: ${registerNumber}` });
    }

    // Since Register Number is unique, we expect only one document
    const doc = querySnapshot.docs[0];
    const data = doc.data();

    // Check if the 'gender' field is empty or not
    const isEmpty = data.gender === undefined || data.gender === '';

    res.status(200).json({
      registerNumber,
      gender: isEmpty ? 'empty' : data.gender,
      isEmpty
    });
  } catch (error) {
    console.error('Error checking gender field:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/updateGender', extractRegisterNumber, async (req, res) => {
  try {
    const { gender } = req.body;
    const { registerNumber } = req; // Extracted by the middleware

    // Validate inputs
    if (!gender || (gender.toLowerCase() !== 'male' && gender.toLowerCase() !== 'female')) {
      return res.status(400).json({ message: 'Invalid gender provided. Please specify "male" or "female".' });
    }

    if (!registerNumber) {
      return res.status(400).json({ message: 'Register number not found in the request.' });
    }

    // Locate the document in the Users_details collection
    const usersCollection = db.collection('Users_details');
    const querySnapshot = await usersCollection.where('Register Number', '==', registerNumber).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: `User with Register Number "${registerNumber}" not found.` });
    }

    // Update the gender field in the matched document
    const docRef = querySnapshot.docs[0].ref;
    await docRef.update({ gender: gender.toLowerCase() });

    res.status(200).json({ message: 'Gender updated successfully.' });
  } catch (error) {
    console.error('Error updating gender:', error);
    res.status(500).json({ message: 'Failed to update gender.', error: error.message });
  }
});
router.get('/getRegisternumber', extractRegisterNumber , async(req , res)=>{
  const {registerNumber} = req;
  res.status(200).json({
    registerNumber
  })
})
  return router;
};
