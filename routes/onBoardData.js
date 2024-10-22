const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin');
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

// Route to update onboarding data
router.post('/add', extractRegisterNumber, async (req, res) => {
  const { registerNumber } = req;
  const { currentBacklogs, historyOfArrears, github, linkedin, resume } = req.body;

  if (!registerNumber) {
    return res.status(400).json({ message: 'Register number is required' });
  }

  if (!currentBacklogs || !historyOfArrears || !github || !linkedin || !resume) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Reference to the document where the Register Number matches
    const userDoc = await db.collection('Users_details').where('Register Number', '==', registerNumber).get();

    if (userDoc.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the document
    const userRef = userDoc.docs[0].ref;
    await userRef.update({
      'History of Arrears': historyOfArrears,
      'Github': github,
      'LinkedIn': linkedin,
      'Resume': resume,
      'Current Backlogs': currentBacklogs,
    });

    // After a successful update, add the register number to the isOnboarding collection with an auto-generated ID
    await db.collection('isOnboarding').add({
      'Register Number': registerNumber,
    });

    res.status(200).json({ message: 'Data updated and register number added to isOnboarding collection successfully' });
  } catch (error) {
    console.error('Error updating onboarding data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/new', extractRegisterNumber, async (req, res) => {
  try {
    const {
      email, // Previously 'Email'
      github, // Previously 'Github'
      rollNo, // Previously 'RollNo'
      currentBacklogs, // Previously 'CurrentBacklogs'
      historyOfArrears, // Previously 'HistoryOfArrears'
      tenPercent, // Previously 'TenPercent'
      diplomaPercent, // Previously 'DiplomaPercent'
      name, // Previously 'Name'
      linkedin, // Previously 'LinkedIn'
      mobileNumber, // Previously 'MobileNumber'
      isDiploma, // Previously 'isDiploma'
      otherInterestedDomain, // Previously 'OtherInterestedDomain'
      skillSet, // Previously 'SkillSet'
      domain, // Previously 'Domain'
      resume, // Previously 'Resume'
      cgpa, // Previously 'CGPA'
    } = req.body;
    
    const { registerNumber } = req;
    
    console.log({
      email,
      github,
      rollNo,
      currentBacklogs,
      historyOfArrears,
      tenPercent,
      diplomaPercent,
      name,
      linkedin,
      mobileNumber,
      isDiploma,
      otherInterestedDomain,
      skillSet,
      domain,
      resume,
      cgpa,
      registerNumber,
    });
    
    // Construct the data object to insert into Firestore
    const userDetails = {
      Email: email || '',
      'Register Number': registerNumber,
      Github: github || '',
      'Roll No': rollNo || '',
      'Current Backlogs': currentBacklogs || '0',
      'History Of Arrears': historyOfArrears || '0',
      '10 Percent': tenPercent || '',
      'Diploma / 12th Percentage': diplomaPercent || '',
      Name: name || '',
      LinkedIn: linkedin || '',
      'Mobile Number': mobileNumber || '',
      isDiploma: isDiploma ? 'Yes' : 'No', // If true, insert "Yes", otherwise "No"
      SkillSet: skillSet || '',
      Domain: domain || '',
      Resume: resume || '',
      CGPA: cgpa || '',
      OtherInterestedDomain: otherInterestedDomain || '',
      isMentor: 0, // Default value
    };

    // Insert into the Firestore collection
    const newDocRef = await db.collection('Users_details').add(userDetails);

    res.status(200).json({
      success: true,
      message: 'User details added successfully',
      id: newDocRef.id, // Return the auto-generated Firestore ID
    });
  } catch (error) {
    console.error('Error adding user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding user details',
    });
  }
});


module.exports = router;
