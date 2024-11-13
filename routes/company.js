const express = require('express');
const router = express.Router();
const moment = require('moment');
const { db ,admin} = require('./config/firebaseAdmin'); // Firestore instance
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


//route to get placed data as per the student number
router.get('/placed-details/:studentId', async (req, res) => {
  const { studentId } = req.params; // Get studentId from route parameters

  try {
    let placedDetails = [];

    // Retrieve all documents from the Company_Applications collection
    const applicationsSnapshot = await db.collection('Company_Applications').where('placed', '!=', null).get();

    applicationsSnapshot.forEach(doc => {
      const docData = doc.data();

      if (docData.placed && docData.placed[studentId]) {
        const placedEntry = docData.placed[studentId];

        placedDetails.push({
          companyName: doc.id, // Document ID as company name
          studentId: studentId,
          role: placedEntry.role,
          ctc: placedEntry.ctc,
          date: placedEntry.date,
          imageUrl: placedEntry.imageUrl // Include imageUrl if needed
        });
      }
    });

    if (placedDetails.length === 0) {
      return res.status(404).json({ error: 'No placement details found for the given student ID.' });
    }

    res.status(200).json(placedDetails);
  } catch (error) {
    console.error('Error fetching placement details:', error);
    res.status(500).json({ error: 'Failed to retrieve placement details.' });
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
      maxAllowedHistoryOfArrears,
      created_at: new Date()
    };

    // Add the company document to the Company collection
    const docRef = await db.collection('Company').add(newCompany);

    // Create a new document in the Company_Applications collection with the company name
    const applicationsDoc = {
      willing: [],
      notWilling: [],
      feedback:{},
      placed:{}
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


router.get('/no-feedback-status', async (req, res) => {
  try {
    const companyRef = db.collection('Company');
    const snapshot = await companyRef.where('feedbackStatus', '==', false).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No matching documents found' });
    }

    // Map through the snapshot to retrieve each document's 'name' field
    const companyNames = snapshot.docs.map(doc => doc.data().name);

    res.status(200).json(companyNames);
  } catch (error) {
    console.error('Error retrieving documents:', error);
    res.status(500).json({ message: 'Error retrieving documents', error });
  }
});

router.post('/feedback', async (req, res) => {
  const { companyName, pushTo } = req.body;

  if (!companyName || !pushTo) {
    return res.status(400).json({ error: 'companyName and pushTo are required' });
  }

  try {
    // Step 1: Query for the company document by name
    const companyQuery = db.collection('Company').where('name', '==', companyName);
    const companySnapshot = await companyQuery.get();

    // Check if company exists
    if (companySnapshot.empty) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const companyDoc = companySnapshot.docs[0];
    const companyDocRef = companyDoc.ref;

    // Step 2: Retrieve Register Numbers based on pushTo condition
    let registerNumbers = [];
    if (pushTo === 'All') {
      const usersSnapshot = await db.collection('Users_details').get();
      registerNumbers = usersSnapshot.docs.map(doc => doc.get('Register Number'));
    } else if (pushTo === 'Applicants') {
      const applicationDocRef = db.collection('Company_Applications').doc(companyName);
      const applicationDoc = await applicationDocRef.get();

      if (!applicationDoc.exists) {
        return res.status(404).json({ error: 'Company application not found' });
      }
      registerNumbers = applicationDoc.get('willing') || [];
    }

    // Step 3: Create feedbackCompleted map with Register Numbers as keys and false as default value
    const feedbackCompleted = {};
    registerNumbers.forEach(registerNumber => {
      feedbackCompleted[registerNumber] = false;
    });

    // Step 4: Update the Company document with feedbackStatus and feedbackCompleted map
    await companyDocRef.set({
      feedbackStatus: true,
      feedbackCompleted
    }, { merge: true });

    res.status(200).json({ message: 'Feedback status updated and feedbackCompleted added successfully.' });

  } catch (error) {
    console.error('Error updating feedback status and feedbackCompleted:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/check-feedback-status', extractRegisterNumber ,async (req, res) => {
  const { registerNumber } = req;

  // Validate input
  if (!registerNumber) {
    return res.status(400).json({ error: 'registerNumber is required' });
  }

  try {
    // Step 1: Retrieve all documents in the Company collection
    const companySnapshot = await db.collection('Company').get();

    const matchingCompanies = [];

    // Step 2: Traverse through each document
    companySnapshot.forEach((doc) => {
      const companyData = doc.data();

      // Check if feedbackStatus is true
      if (companyData.feedbackStatus) {
        const feedbackCompleted = companyData.feedbackCompleted || {};

        // Check if registerNumber is in feedbackCompleted and set to false
        if (feedbackCompleted[registerNumber] === false) {
          matchingCompanies.push({
            documentId: doc.id,
            companyName: companyData.name,
          });
        }
      }
    });

    // Step 3: Return results based on whether any matches were found
    if (matchingCompanies.length > 0) {
      return res.status(200).json({ matchingCompanies });
    } else {
      return res.status(404).json({ error: 'No matching documents found' });
    }
  } catch (error) {
    console.error('Error checking feedback status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/got-selected', extractRegisterNumber, async (req, res) => {
  const { companyName, imageUrl, role, ctc } = req.body;
  const { registerNumber } = req;

  if (!companyName || !imageUrl || !registerNumber || !role || !ctc) {
    return res.status(400).json({ error: 'companyName, imageUrl, registerNumber, role, and ctc are required' });
  }

  try {
    const timestamp = admin.firestore.Timestamp.now();

    // Step 1: Update or create the placed field in Company_Applications
    const companyApplicationRef = db.collection('Company_Applications').doc(companyName);
    const companyApplicationDoc = await companyApplicationRef.get();

    // Create the document if it doesn't exist
    if (!companyApplicationDoc.exists) {
      await companyApplicationRef.set({
        placed: {
          [registerNumber]: {
            role,
            ctc,
            imageUrl,
            date: timestamp,
          },
        },
      });
    } else {
      await companyApplicationRef.set({
        placed: {
          [registerNumber]: {
            role,
            ctc,
            imageUrl,
            date: timestamp,
          },
        },
      }, { merge: true });
    }

    // Step 2: Update feedbackCompleted in the Company collection
    const companyRef = db.collection('Company').where('name', '==', companyName);
    const companySnapshot = await companyRef.get();

    if (!companySnapshot.empty) {
      const companyDoc = companySnapshot.docs[0].ref;
      await companyDoc.update({
        [`feedbackCompleted.${registerNumber}`]: true,
      });
    } else {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Step 3: Update or create placed field in Applications_Tracking
    const applicationTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
    await applicationTrackingRef.set({
      placed: {
        [companyName]: {
          role,
          ctc,
          date: timestamp,
        },
      },
    }, { merge: true });

    res.status(200).json({ message: 'Student placement information updated successfully.' });
  } catch (error) {
    console.error('Error updating placement information:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// /rejection-review route
router.post('/rejection-review', extractRegisterNumber, async (req, res) => {
  const { companyName, needTraining, rejectedRound } = req.body;
  const { registerNumber } = req;

  if (!companyName || typeof needTraining === 'undefined' || !rejectedRound || !registerNumber) {
    return res.status(400).json({ error: 'companyName, needTraining, rejectedRound, and registerNumber are required' });
  }

  try {
    // Step 1: Update or create feedback field in Company_Applications
    const companyAppRef = db.collection('Company_Applications').doc(companyName);
    const companyAppDoc = await companyAppRef.get();

    if (!companyAppDoc.exists) {
      await companyAppRef.set({
        feedback: {
          [registerNumber]: {
            needTraining,
            rejectedRound,
          },
        },
      });
    } else {
      await companyAppRef.set({
        feedback: {
          [registerNumber]: {
            needTraining,
            rejectedRound,
          },
        },
      }, { merge: true });
    }

    // Step 2: Update feedbackCompleted in the Company collection
    const companyRef = db.collection('Company').where('name', '==', companyName);
    const companySnapshot = await companyRef.get();

    if (!companySnapshot.empty) {
      const companyDoc = companySnapshot.docs[0].ref;
      await companyDoc.update({
        [`feedbackCompleted.${registerNumber}`]: true,
      });
    } else {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.status(200).json({ message: 'Rejection review information updated successfully.' });
  } catch (error) {
    console.error('Error updating rejection review information:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
