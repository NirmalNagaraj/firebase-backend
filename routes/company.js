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
    let studentCGPA = parseFloat(studentData.CGPA) || 0;

    // Normalize CGPA if it's in a scale of 100 (i.e., greater than 10)
    if (studentCGPA > 10) {
      studentCGPA = studentCGPA / 10;
    }

    const historyOfArrears = parseInt(studentData['History of Arrears']) || 0;
    const currentBacklogs = parseInt(studentData['Current Backlogs']) || 0;

    // Fetch upcoming companies from Firestore
    const companySnapshot = await db.collection('Company')
      .where('date', '>=', new Date())
      .get();

    // Filter the companies and fetch the count of willing students
    const companyData = await Promise.all(companySnapshot.docs.map(async (doc) => {
      const company = { id: doc.id, ...doc.data() };
      const companyName = company.name; // Assuming 'name' field holds the company name
      const companyCriteria = parseFloat(company.criteria) || 0;
      const companyHistoryArrears = company.maxAllowedHistoryOfArrears;
      const companyCurrentArrears = company.maxAllowedStandingArrears;

      // Determine if the student is eligible based on the given conditions
      let isEligible = false;

      if (companyHistoryArrears === 'Not Mentioned' && companyCurrentArrears === 'Not Mentioned') {
        isEligible = studentCGPA >= companyCriteria;
      } else if (companyCurrentArrears === 'Not Mentioned') {
        isEligible = studentCGPA >= companyCriteria && historyOfArrears <= parseInt(companyHistoryArrears);
      } else if (companyHistoryArrears === 'Not Mentioned') {
        isEligible = studentCGPA >= companyCriteria && currentBacklogs <= parseInt(companyCurrentArrears);
      } else {
        isEligible = studentCGPA >= companyCriteria &&
                     historyOfArrears <= parseInt(companyHistoryArrears) &&
                     currentBacklogs <= parseInt(companyCurrentArrears);
      }

      if (!isEligible) return null;

      // Fetch the willing count from Company_Applications using company name as the document ID
      const applicationSnapshot = await db.collection('Company_Applications').doc(companyName).get();
      const willingCount = applicationSnapshot.exists && Array.isArray(applicationSnapshot.data().willing)
        ? applicationSnapshot.data().willing.length
        : 0;

      // Return company data with the additional willing count
      return {
        ...company,
        willingCount
      };
    }));

    // Filter out any null results (companies where the student is not eligible)
    const filteredCompanyData = companyData.filter(company => company !== null);

    res.json(filteredCompanyData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.put('/edit', async (req, res) => {
  const {
    id,
    name,
    date,  // This should be { _seconds, _nanoseconds }
    role,
    criteria,
    ctc,
    link,
    maxAllowedHistoryOfArrears,
    maxAllowedStandingArrears
  } = req.body;

  const companyCollection = db.collection('Company');

  if (!id) {
    return res.status(400).json({ error: 'Company ID is required.' });
  }

  try {
    // Document reference based on the provided company ID
    const companyDocRef = companyCollection.doc(id);

    // Convert Firestore's timestamp to a Date object if date is an object with _seconds and _nanoseconds
    const formattedDate = date && date._seconds
      ? new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1e6)
      : null;

    // Update the document with the provided fields
    await companyDocRef.update({
      name,
      date: formattedDate,  // Firestore will accept Date objects here
      role,
      criteria,
      ctc,
      link,
      maxAllowedHistoryOfArrears,
      maxAllowedStandingArrears
    });

    res.status(200).json({ message: 'Company details updated successfully.' });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company data.' });
  }
});
//Route to get the company names for Using it in the Admin side
router.get('/company-names', async (req, res) => {
  try {
    // Query the Company collection to get only the 'name' field
    const companySnapshot = await db.collection('Company').select('name').get();

    // Map through the results to get an array of names
    const companyNames = companySnapshot.docs.map(doc => ({
      // id: doc.id,        // Including document ID if needed
      name: doc.data().name
    }));

    res.status(200).json(companyNames);
  } catch (error) {
    console.error('Error fetching company names:', error);
    res.status(500).json({ error: 'Failed to retrieve company names.' });
  }
});

//route to get placed data company - wise
router.get('/placed-companies', async (req, res) => {
  const { companyName, duration } = req.query; // Get params from query string

  try {
    let placedCompanies = [];

    // If companyName is provided, filter by company name (document ID)
    if (companyName) {
      const applicationSnapshot = await db.collection('Company_Applications').doc(companyName).get();

      if (applicationSnapshot.exists) {
        const docData = applicationSnapshot.data();

        // Check if 'placed' field exists
        if (docData.placed) {
          // Iterate over the placed entries and format the response
          for (const [studentId, value] of Object.entries(docData.placed)) {
            placedCompanies.push({
              companyName: companyName,
              studentId: studentId,
              ...value // spread the other fields (role, ctc, date, imageUrl)
            });
          }
        }
      } else {
        return res.status(404).json({ error: 'Company not found' });
      }
    } 
    // If duration is provided, filter placed data within the specified duration
    else if (duration) {
      const [startDate, endDate] = duration.split(',').map(date => new Date(date.trim()));
      const applicationsSnapshot = await db.collection('Company_Applications').where('placed', '!=', null).get();

      applicationsSnapshot.forEach(doc => {
        const docData = doc.data();

        if (docData.placed) {
          const placedEntries = docData.placed;

          // Filter placed entries by date
          for (const [key, value] of Object.entries(placedEntries)) {
            const placementDate = new Date(value.date._seconds * 1000); // Convert Firestore date to JavaScript Date

            // Check if the placement date is within the specified duration
            if (placementDate >= startDate && placementDate <= endDate) {
              placedCompanies.push({
                companyName: doc.id, // Use document ID as company name
                studentId: key,
                ...value
              });
            }
          }
        }
      });
    } else {
      // If no params are provided, retrieve all placed data
      const applicationsSnapshot = await db.collection('Company_Applications').where('placed', '!=', null).get();

      applicationsSnapshot.forEach(doc => {
        const docData = doc.data();

        if (docData.placed) {
          // Iterate over the placed entries and format the response
          for (const [studentId, value] of Object.entries(docData.placed)) {
            placedCompanies.push({
              companyName: doc.id, // Use document ID as company name
              studentId: studentId,
              ...value // spread the other fields (role, ctc, date, imageUrl)
            });
          }
        }
      });
    }

    res.status(200).json(placedCompanies);
  } catch (error) {
    console.error('Error fetching placed companies:', error);
    res.status(500).json({ error: 'Failed to retrieve placed companies.' });
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
