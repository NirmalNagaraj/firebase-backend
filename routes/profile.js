const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Firestore instance
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

module.exports = () => {
  // Route to get user details
  router.get('/', extractRegisterNumber, async (req, res) => {
    const registerNumber = req.registerNumber;

    try {
      const usersSnapshot = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

      if (usersSnapshot.empty) {
        console.log('No user found'); // Debugging line
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = usersSnapshot.docs[0].data();
      res.json(userData);
    } catch (err) {
      console.error('Error fetching user details:', err); // Debugging line
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Route to update user profile
  router.post('/update-profile', extractRegisterNumber, async (req, res) => {
    const { cgpa, historyOfArrears, currentBacklogs, skillset, otherDomain, resumeLink, githubLink, linkedinLink } = req.body;
    const registerNumber = req.registerNumber;

    console.log(`Updating profile for registerNumber: ${registerNumber}`); // Debugging line

    try {
      const usersSnapshot = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

      if (usersSnapshot.empty) {
        console.log('No user found'); // Debugging line
        return res.status(404).json({ message: 'User not found' });
      }

      const userDocRef = usersSnapshot.docs[0].ref;
      await userDocRef.update({
        CGPA: cgpa,
        "History Of Arrears": historyOfArrears,
        "Current Backlogs": currentBacklogs,
        "Skill Set": skillset,
        "Other Interested Domain": otherDomain,
        Resume: resumeLink,
        Github: githubLink,
        Linkedin: linkedinLink,
      });
      
      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error); // Debugging line
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  router.get('/get-arrear-details',extractRegisterNumber , async (req, res) => {
    const registerNumber = req.registerNumber;
  
    if (!registerNumber) {
      return res.status(400).json({ error: 'Register number is required' });
    }
  
    try {
      const usersRef = db.collection('Users_details');
      const snapshot = await usersRef.where('Register Number', '==', registerNumber).get();
  
      if (snapshot.empty) {
        return res.status(404).json({ error: 'No user found with the provided register number' });
      }
  
      // Assuming that there's only one document per register number
      const doc = snapshot.docs[0];
      const data = doc.data();
  
      // Extract only specific fields
      const arrearDetails = {
        historyOfArrears: data["History of Arrears"],
        currentBacklogs: data["Current Backlogs"],
        imageUrl: data.imageUrl
      };
  
      res.status(200).json({ arrearDetails });
    } catch (error) {
      console.error('Error fetching arrear details:', error);
      res.status(500).json({ error: 'Failed to fetch arrear details' });
    }
  });

  router.post('/profile-image', extractRegisterNumber, async (req, res) => {
    const { imageUrl } = req.body;
    const registerNumber = req.registerNumber;
    
    if (!registerNumber || !imageUrl) {
      return res.status(400).json({ error: 'registerNumber and imageUrl are required' });
    }
  
    try {
      // Query Firestore for the document with the specified registerNumber
      const usersRef = db.collection('Users_details');
      const querySnapshot = await usersRef.where('Register Number', '==', registerNumber).get();
  
      if (querySnapshot.empty) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update the first document found with the new imageUrl
      const userDoc = querySnapshot.docs[0];
      await userDoc.ref.update({ imageUrl });
  
      res.status(200).json({ message: 'Profile image updated successfully' });
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  router.get('/checkPlacedCompanies', extractRegisterNumber, async (req, res) => {
    try {
      const { registerNumber } = req; // Extract registerNumber from middleware
  
      // Validate input
      if (!registerNumber) {
        return res.status(400).json({ error: 'Register Number is required' });
      }
  
      // Reference the Applications_Tracking collection and fetch the document by registerNumber
      const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
      const applicationsTrackingDoc = await applicationsTrackingRef.get();
  
      if (!applicationsTrackingDoc.exists) {
        return res.status(404).json({ message: `No data found for Register Number: ${registerNumber}` });
      }
  
      // Retrieve the placed field from the document
      const data = applicationsTrackingDoc.data();
      const placed = data.placed || {}; // Default to an empty object if 'placed' field does not exist
  
      // Filter company names where the 'offerAccepted' field is not present
      const companyNames = Object.keys(placed).filter(
        (companyName) => !Object.prototype.hasOwnProperty.call(placed[companyName], 'offerAccepted')
      );
  
      res.status(200).json({
        registerNumber,
        companyNames,
      });
    } catch (error) {
      console.error('Error checking placed companies:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });



  router.post('/offerAccepted', extractRegisterNumber, async (req, res) => {
    try {
      const { companyName, offerAccepted, reason } = req.body; // Extract details from request body
      const { registerNumber } = req;
  
      // Validate input
      if (!registerNumber || !companyName || typeof offerAccepted !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid input. Please provide registerNumber, companyName, and offerAccepted (boolean).',
        });
      }
  
      // Reference to the Applications_Tracking document for the provided registerNumber
      const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
      const applicationsTrackingDoc = await applicationsTrackingRef.get();
  
      if (!applicationsTrackingDoc.exists) {
        return res.status(404).json({
          message: `No data found for Register Number: ${registerNumber}`,
        });
      }
  
      // Get the current placed data
      const data = applicationsTrackingDoc.data();
      const placed = data.placed || {};
  
      // Check if the company exists in the placed field
      if (!placed[companyName]) {
        return res.status(404).json({
          message: `Company ${companyName} not found for Register Number: ${registerNumber}`,
        });
      }
  
      // Update the offerAccepted field for the specific company
      placed[companyName].offerAccepted = offerAccepted;
  
      // If reason is provided, add/update the reason field
      if (reason) {
        placed[companyName].reason = reason;
      }
  
      // Update the Applications_Tracking document
      await applicationsTrackingRef.update({ placed });
  
      res.status(200).json({
        message: `Offer acceptance status for company ${companyName} updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating offer acceptance status:', error);
      res.status(500).json({
        error: 'Failed to update offer acceptance status.',
        details: error.message,
      });
    }
  });


router.post('/updateGender', extractRegisterNumber, async (req, res) => {
  try {
    const { gender } = req.body;
    const { registerNumber } = req; // Extracted by the middleware

    // Validate inputs
    if (!gender || (gender.toLowerCase() !== 'male' && gender.toLowerCase() !== 'female')) {
      return res.status(400).json({ message: 'Invalid gender provided. Please specify "male" or "female".' });
    }

    if (!registerNumber) {
      return res.status(400).json({ message: 'Register number not found in the request.' });
    }

    // Locate the document in the Users_details collection
    const usersCollection = db.collection('Users_details');
    const querySnapshot = await usersCollection.where('Register Number', '==', registerNumber).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: `User with Register Number "${registerNumber}" not found.` });
    }

    // Update the gender field in the matched document
    const docRef = querySnapshot.docs[0].ref;
    await docRef.update({ gender: gender.toLowerCase() });

    res.status(200).json({ message: 'Gender updated successfully.' });
  } catch (error) {
    console.error('Error updating gender:', error);
    res.status(500).json({ message: 'Failed to update gender.', error: error.message });
  }
});
router.get('/getRegisternumber', extractRegisterNumber , async(req , res)=>{
  const {registerNumber} = req;
  res.status(200).json({
    registerNumber
  })
})

router.get('/no-due/:registerNumber', async (req, res) => {
  const { registerNumber } = req.params;

  if (!registerNumber) {
    return res.status(400).json({ error: 'Register number is required' });
  }

  try {
    // Initialize counters
    let totalCount = 0; // Total feedbackCompleted entries for the registerNumber
    let trueCount = 0;  // True feedbackCompleted entries for the registerNumber

    // === STEP 1: Check feedbackCompleted in Company Collection ===
    const companyRef = db.collection('Company');
    const companySnapshot = await companyRef.get();

    if (!companySnapshot.empty) {
      companySnapshot.forEach((doc) => {
        const docData = doc.data();

        // Check if feedbackCompleted exists and has the registerNumber as a key
        const feedbackCompleted = docData.feedbackCompleted || {};
        if (registerNumber in feedbackCompleted) {
          totalCount++; // Increment total count
          if (feedbackCompleted[registerNumber] === true) {
            trueCount++; // Increment true count
          }
        }
      });
    }

    // === STEP 2: Fetch CompletionStatus from Tests Collection ===
    const testsRef = db.collection('Tests');
    const testsSnapshot = await testsRef.get();

    let completionStatus = []; // To store data from Tests collection

    if (!testsSnapshot.empty) {
      testsSnapshot.forEach((doc) => {
        const docData = doc.data();

        // Check if completionStatus exists and contains the registerNumber
        const completionData = docData.completionStatus || {};
        if (completionData[registerNumber]) {
          completionStatus.push({
            testId: doc.id,
            status: completionData[registerNumber], // Store the data for this registerNumber
          });
        }
      });
    }

    // === STEP 3: Fetch Placed Data from Applications_Tracking Collection ===
    const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
    const applicationsTrackingDoc = await applicationsTrackingRef.get();

    let placedData = null; // To store placed field data
    if (applicationsTrackingDoc.exists) {
      const docData = applicationsTrackingDoc.data();
      placedData = docData.placed || null; // Fetch the placed field
    }

    // Respond with the aggregated data
    res.status(200).json({
      registerNumber,
      totalFeedbackCount: totalCount,
      trueFeedbackCount: trueCount,
      completionStatus, // Data from Tests collection
      placedData, // Placed field from Applications_Tracking
    });
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({
      message: 'Error retrieving data',
      error,
    });
  }
});

router.post('/get-placed', extractRegisterNumber, async (req, res) => {
  const { registerNumber } = req;

  if (!registerNumber) {
    return res.status(400).json({ error: 'Register number is required' });
  }

  try {
    // Reference the Applications_Tracking collection
    const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
    const applicationsTrackingDoc = await applicationsTrackingRef.get();

    // Check if the document exists
    if (!applicationsTrackingDoc.exists) {
      return res.status(404).json({ message: `No data found for register number: ${registerNumber}` });
    }

    // Extract the placed field
    const docData = applicationsTrackingDoc.data();
    const placedData = docData.placed || null;

    res.status(200).json({
      registerNumber,
      placed: placedData || [],
    });
  } catch (error) {
    console.error('Error retrieving placed data:', error);
    res.status(500).json({
      message: 'Error retrieving placed data',
      error,
    });
  }
});

router.post('/upload-offerLetter', extractRegisterNumber ,async (req, res) => {
  const { company, offerLetterUrl } = req.body;
  const { registerNumber } = req;

  if (!company || !offerLetterUrl || !registerNumber) {
    return res.status(400).json({
      error: 'company, offerLetterUrl, and registerNumber are required',
    });
  }

  try {
    // === STEP 1: Update Applications_Tracking collection ===
    const applicationsTrackingRef = db.collection('Applications_Tracking').doc(registerNumber);
    const applicationsTrackingDoc = await applicationsTrackingRef.get();

    if (!applicationsTrackingDoc.exists) {
      // Create the document if it doesn't exist
      await applicationsTrackingRef.set({
        placed: {
          [company]: {
            offerLetter: 'true',
            offerLetterUrl,
          },
        },
      });
    } else {
      // Update the placed field for the company
      const placedData = applicationsTrackingDoc.data().placed || {};
      placedData[company] = {
        ...placedData[company],
        offerLetter: 'true',
        offerLetterUrl,
      };

      await applicationsTrackingRef.update({
        placed: placedData,
      });
    }

    // === STEP 2: Update Company_Applications collection ===
    const companyApplicationsRef = db.collection('Company_Applications').doc(company);
    const companyApplicationsDoc = await companyApplicationsRef.get();

    if (!companyApplicationsDoc.exists) {
      // Create the document if it doesn't exist
      await companyApplicationsRef.set({
        placed: {
          [registerNumber]: {
            offerLetter: true,
            offerLetterUrl,
          },
        },
      });
    } else {
      // Update the placed field for the registerNumber
      const placedData = companyApplicationsDoc.data().placed || {};
      placedData[registerNumber] = {
        ...placedData[registerNumber],
        offerLetter: true,
        offerLetterUrl,
      };

      await companyApplicationsRef.update({
        placed: placedData,
      });
    }

    // Response
    res.status(200).json({
      message: 'Offer letter details updated successfully',
      company,
      registerNumber,
      offerLetterUrl,
    });
  } catch (error) {
    console.error('Error updating offer letter information:', error);
    res.status(500).json({
      message: 'Error updating offer letter information',
      error,
    });
  }
});



  return router;
};
