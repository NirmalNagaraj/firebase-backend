const express = require('express');
const router = express.Router();
const {db} = require('../routes/config/firebaseAdmin'); // Your firebase setup file

// Utility function to compare dates
const isFutureDate = (date) => {
  const today = new Date();
  return new Date(date) >= today;
};

// Route to get all non-expired company names
router.get('/get-company-name', async (req, res) => {
  try {
    // Fetch current date to filter companies that are not expired
    const today = new Date();
    
    // Query the db 'Company' collection
    const companySnapshot = await db.collection('Company').where('date', '>=', today).get();

    if (companySnapshot.empty) {
      return res.status(404).json({ message: 'No companies found' });
    }

    // Extract company names from the documents
    const companyNames = companySnapshot.docs.map(doc => doc.data().name);

    res.json({ companyNames });
  } catch (error) {
    console.error('Error retrieving company names:', error);
    res.status(500).json({ error: 'Failed to retrieve company names' });
  }
});

router.post('/get-company-willing-data', async (req, res) => {
    const { company, fields } = req.body;
  
    try {
      // Step 1: Retrieve willingData from Company_Applications
      const companyDoc = await db.collection('Company_Applications').doc(company).get();
  
      if (!companyDoc.exists) {
        return res.status(404).json({ message: 'Company not found' });
      }
  
      const willingData = companyDoc.data().willing || [];
  
      // Step 2: Fetch user details from Users_details for each register number in willingData
      const userDetailsPromises = willingData.map(async (registerNumber) => {
        const userQuerySnapshot = await db
          .collection('Users_details')
          .where('Register Number', '==', registerNumber)
          .get();
  
        if (userQuerySnapshot.empty) {
          return { registerNumber, message: 'User not found' }; // If no user found
        }
  
        // Fetch the first matching document for this register number
        const userDoc = userQuerySnapshot.docs[0];
        const userData = userDoc.data();
  
        // Step 3: Filter the fields based on the fields object from the frontend
        let filteredUserData = {};
  
        Object.keys(fields).forEach((field) => {
          if (fields[field] === true && userData[field] !== undefined) {
            filteredUserData[field] = userData[field];
          }
        });
  
        // Always return the register number as part of the response
        filteredUserData['Register Number'] = registerNumber;
  
        return filteredUserData;
      });
  
      // Wait for all user details to be fetched and filtered
      const usersDetails = await Promise.all(userDetailsPromises);
  
      // Return the filtered user details
      res.json({
        company,
        willingData,
        usersDetails,
      });
    } catch (error) {
      console.error('Error fetching willingData or user details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }); 

module.exports = router;
