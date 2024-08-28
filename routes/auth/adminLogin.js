const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

router.post('/adminLogin', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the Firestore collection for the matching username and password
    const adminSnapshot = await db.collection('adminCredentials')
                                  .where('UserName', '==', username)
                                  .where('Password', '==', password)
                                  .limit(1)
                                  .get();

    if (!adminSnapshot.empty) {
      // User authenticated successfully
      res.status(200).json({ message: 'Login successful' });
    } else {
      // User not found or incorrect password
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying Firestore:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
const documentId = 'cEwmXlJI7Q0a33mY9FeT';

// Route to check current password
router.post('/check-password', async (req, res) => {
  const { currentPassword } = req.body;

  try {
    const adminDoc = await db.collection('adminCredentials').doc(documentId).get();

    if (!adminDoc.exists) {
      return res.status(404).json({ success: false, message: 'Admin document not found' });
    }

    const adminData = adminDoc.data();

    if (adminData.Password === currentPassword) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Incorrect password' });
    }
  } catch (error) {
    console.error('Error checking password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update password
router.post('/update-password', async (req, res) => {
  const { newPassword } = req.body;

  try {
    const adminRef = db.collection('adminCredentials').doc(documentId);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return res.status(404).json({ success: false, message: 'Admin document not found' });
    }

    await adminRef.update({ Password: newPassword });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
