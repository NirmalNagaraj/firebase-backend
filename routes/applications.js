const express = require('express');
const { db, admin } = require('./config/firebaseAdmin'); // Adjust the path if necessary
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

const router = express.Router();

// Route to retrieve application tracking data by register number
router.get('/applications', extractRegisterNumber, async (req, res) => {
  const registerNumber = req.registerNumber; // Get the register number from the request parameters

  try {
    const docRef = db.collection('Applications_Tracking').doc(registerNumber);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'No application found for this register number.' });
    }

    // Send the document data as a response
    res.status(200).json({ registerNumber: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error retrieving application:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/applications/add-status', extractRegisterNumber, async (req, res) => {
  const { companyName, status } = req.body;
  const registerNumber = req.registerNumber; // Correctly get registerNumber directly

  // Validate inputs
  if (!registerNumber || !companyName || typeof status !== 'boolean') {
    return res.status(400).json({ message: 'Invalid input data. Please provide registerNumber, companyName, and status.' });
  }

  try {
    // Reference to Applications_Tracking collection
    const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);

    // Update Applications_Tracking
    await applicationsTrackingRef.set({
      Status: {
        [companyName]: status // Set company name as key and status as value
      }
    }, { merge: true }); // Use merge to keep existing data intact

    // Reference to Company_Applications collection
    const companyApplicationsRef = db.collection('Company_Applications').doc(companyName);

    // Update Company_Applications based on status
    if (status) {
      // If status is true, add registerNumber to willing array
      await companyApplicationsRef.set({
        willing: admin.firestore.FieldValue.arrayUnion(registerNumber)
      }, { merge: true }); // Merge to keep existing data
    } else {
      // If status is false, add registerNumber to notWilling array
      await companyApplicationsRef.set({
        notWilling: admin.firestore.FieldValue.arrayUnion(registerNumber)
      }, { merge: true }); // Merge to keep existing data
    }

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'An error occurred while updating the status' });
  }
});

// New route to get all document IDs and names from Applications_Tracking
router.get('/getNames', async (req, res) => {
  try {
    const snapshot = await db.collection('Applications_Tracking').get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No applications found.' });
    }

    const applications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      applications.push({ registerNumber: doc.id, name: data.name });
    });

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error retrieving application names:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
