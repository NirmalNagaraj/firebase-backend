const { db } = require('../config/firebaseAdmin'); // Ensure this path is correct

const getUserCredentials = async (req, res, next) => {
  const registerNumber = req.body.registerNumber; // Or get it from headers, query, etc.

  if (!registerNumber) {
    return res.status(400).json({ error: 'Register number is required' });
  }

  try {
    // Retrieve user credentials from Firestore
    const credentialsDoc = await db.collection('userCredentials')
      .where('registerNumber', '==', registerNumber)
      .limit(1)
      .get();

    if (credentialsDoc.empty) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    // Extract credentials from the document
    const credentials = credentialsDoc.docs[0].data();
    req.clientId = credentials.clientId;
    req.clientSecret = credentials.clientSecret;

    next();
  } catch (error) {
    console.error('Error retrieving user credentials:', error);
    res.status(500).json({ error: 'Failed to retrieve user credentials' });
  }
};

module.exports = getUserCredentials;
