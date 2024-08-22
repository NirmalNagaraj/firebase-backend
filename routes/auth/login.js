const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseAdmin'); // Import Firestore instance
require('dotenv').config();

const router = express.Router();

// Route to authenticate user and generate JWT
router.post('/login', async (req, res) => {
  const { registernumber, password } = req.body;
  const user = await authenticateUser(registernumber, password);

  if (user) {
    const accessToken = jwt.sign({ registerNumber: user.RegisterNumber }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: accessToken });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Function to authenticate user
async function authenticateUser(registernumber, password) {
  try {
    // Query the collection to find the document where RegisterNumber matches
    const usersCollection = db.collection('Users_Password');
    const querySnapshot = await usersCollection.where('RegisterNumber', '==', registernumber).get();

    if (querySnapshot.empty) {
      console.log('No matching documents found.'); // Debugging line
      return null; // No user found
    }

    // Iterate through query results (should be at most one document)
    let user = null;
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      console.log('Retrieved user data:', userData); // Debugging line
      if (userData.Password === password) {
        user = { RegisterNumber: registernumber }; // Return user if password matches
      } else {
        console.log('Incorrect password'); // Debugging line
      }
    });

    return user;
  } catch (err) {
    console.error('Error querying Firestore:', err);
    return null;
  }
}

module.exports = router;