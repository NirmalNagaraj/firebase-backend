const express = require('express');
const router = express.Router();
const moment = require('moment');
const { db } = require('./config/firebaseAdmin'); // Firestore instance
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

// Route to get upcoming company data based on student's CGPA
router.get('/upcoming', extractRegisterNumber, async (req, res) => {
  const registerNumber = req.registerNumber;

  if (!registerNumber) {
    return res.status(400).json({ error: 'Register number is required' });
  }

  try {
    // Fetch student details using register number
    const studentSnapshot = await db.collection('Users_details')
      .where('Register Number', '==', registerNumber)
      .limit(1)
      .get();

    if (studentSnapshot.empty) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentData = studentSnapshot.docs[0].data();
    const studentCGPA = parseFloat(studentData.CGPA) || 0;
    const historyOfArrears = parseInt(studentData['History of Arrears']) || 0;
    const currentBacklogs = parseInt(studentData['Current Backlogs']) || 0;

    // Fetch upcoming companies from Firestore
    const companySnapshot = await db.collection('Company')
      .where('date', '>=', new Date())
      .get();

    // Filter the companies based on the conditions
    const companyData = companySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(company => {
        const companyCriteria = parseFloat(company.criteria) || 0;
        const companyHistoryArrears = company.maxAllowedHistoryOfArrears;
        const companyCurrentArrears = company.maxAllowedStandingArrears;

        // Condition 1: If both fields are "Not Mentioned," include the company
        if (companyHistoryArrears === 'Not Mentioned' && companyCurrentArrears === 'Not Mentioned') {
          return studentCGPA >= companyCriteria;
        }

        // Condition 2: If only maxAllowedStandingArrears is "Not Mentioned", check maxAllowedHistoryOfArrears
        if (companyCurrentArrears === 'Not Mentioned') {
          return studentCGPA >= companyCriteria &&
                 historyOfArrears <= parseInt(companyHistoryArrears);
        }

        // Condition 3: If only maxAllowedHistoryOfArrears is "Not Mentioned", check maxAllowedStandingArrears
        if (companyHistoryArrears === 'Not Mentioned') {
          return studentCGPA >= companyCriteria &&
                 currentBacklogs <= parseInt(companyCurrentArrears);
        }

        // Default condition: Check both history of arrears and standing arrears
        return studentCGPA >= companyCriteria &&
               historyOfArrears <= parseInt(companyHistoryArrears) &&
               currentBacklogs <= parseInt(companyCurrentArrears);
      });

    res.json(companyData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Route to get all upcoming companies
router.get('/upcoming-companies', async (req, res) => {
  try {
    // Query to get companies with date >= current date
    const companySnapshot = await db
      .collection('Company')
      .where('date', '>=', new Date())
      .get();

    const companyData = companySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(companyData);
  } catch (err) {
    console.error('Error querying database:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get previous company data
router.get('/previous', async (req, res) => {
  try {
    const currentDate = moment().format('YYYY-MM-DD');
    const companySnapshot = await db
      .collection('Company')
      .where('date', '<', new Date(currentDate))
      .get();

    const companyData = companySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(companyData);
  } catch (err) {
    console.error('Error querying database:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to add a new company
router.post('/add', async (req, res) => {
  const { name, date, ctc, criteria, type, role, link, imageUrls ,maxAllowedHistoryOfArrears ,maxAllowedStandingArrears} = req.body;

  try {
    const newCompany = {
      name,
      date: new Date(date), // Ensure date is stored as a Firestore Timestamp
      ctc,
      criteria,
      type,
      role,
      link,
      imageUrls: imageUrls || [], // Add imageUrls or default to an empty array if not provided
      maxAllowedStandingArrears ,
      maxAllowedHistoryOfArrears
    };

    // Add the company document to the Company collection
    const docRef = await db.collection('Company').add(newCompany);

    // Create a new document in the Company_Applications collection with the company name
    const applicationsDoc = {
      willing: [],
      notWilling: []
    };

    await db.collection('Company_Applications').doc(name).set(applicationsDoc);

    res.status(201).json({ success: true, message: 'Company added successfully!', companyId: docRef.id });
  } catch (error) {
    console.error('Error adding company:', error);
    res.status(500).json({ success: false, message: 'Error adding company' });
  }
});


router.post('/check-willingness', async (req, res) => {
  const { registerNumber, companyName } = req.body;

  if (!registerNumber || !companyName) {
    return res.status(400).json({ message: 'Register number and company name are required.' });
  }

  try {
    // Reference the Company_Applications collection
    const companyRef = db.collection('Company_Applications').doc(companyName);
    const doc = await companyRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    const data = doc.data();
    const willingArray = data.Willing || [];

    // Check if the register number is in the willing array
    const hasApplied = willingArray.includes(registerNumber);

    return res.status(200).json({ hasApplied });
  } catch (error) {
    console.error('Error checking willingness:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
