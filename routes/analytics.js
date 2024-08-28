const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Firestore initialization

// Define valid fields for validation
const validFields = ['Resume', 'LinkedIn', 'Github', 'History of Arrears', 'Current Backlogs'];

router.get('/missing-fields', async (req, res) => {
  const { field } = req.query;

  // Validate the field
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  try {
    // Query Firestore for documents where the specified field has 'N/A' or 'NIL'
    const querySnapshot = await db.collection('Users_details')
      .where(field, 'in', ['N/A', 'NIL'])
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'No missing fields found' });
    }

    // Extract and format the results
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Send the response
    res.status(200).json(results);
  } catch (error) {
    console.error('Error retrieving missing fields data:', error);
    res.status(500).json({ error: 'Error retrieving missing fields data' });
  }
});

module.exports = router;
