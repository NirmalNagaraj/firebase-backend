const express = require('express');
const router = express.Router();
const { db } = require('./firebaseAdmin'); // Firestore initialization

// The Firestore document ID in the 'cgpaConfig' collection
const documentId = 'a2kGfkjwUEHTnocSoCte';

// Route to get the CGPA edit configuration
router.get('/allow-cgpa-edit', async (req, res) => {
  try {
    const configDoc = await db.collection('cgpaConfig').doc(documentId).get();

    if (!configDoc.exists) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json(configDoc.data());
  } catch (err) {
    console.error('Error querying Firestore:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update the CGPA edit configuration
router.put('/allow-cgpa-edit', async (req, res) => {
  const { isAllow } = req.body;

  try {
    await db.collection('cgpaConfig').doc(documentId).update({ isAllow });
    res.status(200).json({ message: 'Configuration updated successfully' });
  } catch (err) {
    console.error('Error updating Firestore:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to check if CGPA is editable
router.get('/check-cgpa-editable', async (req, res) => {
  try {
    const configDoc = await db.collection('cgpaConfig').doc(documentId).get();

    if (!configDoc.exists) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const isAllow = configDoc.data().isAllow;
    res.json({ isAllow });
  } catch (error) {
    console.error('Error checking CGPA edit permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
