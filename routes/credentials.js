const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin');
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

// Route to add credentials data
router.post('/add', extractRegisterNumber, async (req, res) => {
  const { registerNumber } = req;
  const { clientId, clientSecret } = req.body;

  if (!registerNumber) {
    return res.status(400).json({ message: 'Register number is required' });
  }

  if (!clientId || !clientSecret) {
    return res.status(400).json({ message: 'Client ID and Client Secret are required' });
  }

  try {
    // Add a new document with an auto-generated ID
    const docRef = await db.collection('userCredentials').add({
      registerNumber, // Include registerNumber if needed for reference
      clientId,
      clientSecret
    });

    res.status(200).json({ message: 'Credentials added successfully', id: docRef.id });
  } catch (error) {
    console.error('Error adding credentials data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/update', extractRegisterNumber, async (req, res) => {
  const { registerNumber } = req; // Extracted from middleware
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Query the userCredentials collection using registerNumber
    const userQuery = await db.collection('userCredentials')
      .where('registerNumber', '==', registerNumber)
      .get();

    if (userQuery.empty) {
      return res.status(404).json({ message: 'Register number not found' });
    }

    // Assuming there is only one document with the given registerNumber
    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    // Update the document with the new credentials
    await db.collection('userCredentials').doc(userId).update({
      clientId,
      clientSecret,
    });

    res.status(200).json({ message: 'Credentials updated successfully' });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
module.exports = router;
