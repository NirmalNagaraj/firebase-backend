const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); 

router.get('/filter', async (req, res) => {
  try {
    const {
      tenthPercentage,
      diplomaOr12thPercentage,
      cgpa,
      historyOfArrears,
      currentBacklogs
    } = req.body;

    let query = db.collection('Users_details');

    // Apply filters based on the provided criteria
    if (tenthPercentage && !isNaN(tenthPercentage)) {
      query = query.where('10 Percent', '>=', parseFloat(tenthPercentage).toString());
    }

    if (diplomaOr12thPercentage && !isNaN(diplomaOr12thPercentage)) {
      query = query.where('Diploma / 12th Percentage', '>=', parseFloat(diplomaOr12thPercentage).toString());
    }

    if (cgpa && !isNaN(cgpa)) {
      query = query.where('CGPA', '>=', parseFloat(cgpa).toString());
    }

    if (historyOfArrears && historyOfArrears !== 'N/A') {
      query = query.where('History of Arrears', '<=', historyOfArrears);
    }

    if (currentBacklogs && currentBacklogs !== 'N/A') {
      query = query.where('Current Backlogs', '<=', currentBacklogs);
    }

    // Execute the query
    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'No matching documents found' });
    }

    // Extract and format the results
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Send the response
    res.status(200).json(results);
  } catch (error) {
    console.error('Error filtering data:', error);
    res.status(500).json({ error: 'Error filtering data' });
  }
});

module.exports = router;
