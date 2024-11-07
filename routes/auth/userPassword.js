const express = require('express');
const router = express.Router();
const {db} = require('../config/firebaseAdmin')
const extractRegisterNumber = require('../middlewares/extractRegisterNumber');

router.post('/check-password', extractRegisterNumber, async (req, res) => {
    const { currentPassword } = req.body;
    const { registerNumber } = req;
  
    try {
      // Query the Users_Password collection for the document with the matching RegisterNumber
      const querySnapshot = await db.collection('Users_Credentials')
                                    .where('RegisterNumber', '==', registerNumber)
                                    .limit(1)
                                    .get();
  
      if (querySnapshot.empty) {
        res.json({ success: false });
      } else {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
  
        // Check if the provided password matches the stored password
        if (userData.Password === currentPassword) {
          res.json({ success: true });
        } else {
          res.json({ success: false });
        }
      }
    } catch (error) {
      console.error('Error checking password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Route to update password
  router.post('/update-password', extractRegisterNumber, async (req, res) => {
    const { newPassword } = req.body;
    const { registerNumber } = req;
  
    try {
      // Query the Users_Password collection for the document with the matching RegisterNumber
      const querySnapshot = await db.collection('Users_Credentials')
                                    .where('RegisterNumber', '==', registerNumber)
                                    .limit(1)
                                    .get();
  
      if (querySnapshot.empty) {
        res.status(404).json({ error: 'User not found' });
      } else {
        const userDoc = querySnapshot.docs[0];
  
        // Update the password field in the document
        await userDoc.ref.update({ Password: newPassword });
        res.json({ success: true });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  module.exports = router;