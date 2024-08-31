const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Firestore initialization

router.get('/retrieve/mentors', async (req, res) => {
    try {
        const usersCollection = db.collection('Users_details');
        const snapshot = await usersCollection.where('isMentor', '==', 1).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No mentors found' });
        }

        const registerNumbers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data['Register Number']) { // Use bracket notation for field names with spaces
                registerNumbers.push(data['Register Number']);
            }
        });

        return res.status(200).json({ registerNumbers });
    } catch (error) {
        console.error('Error retrieving mentors:', error);
        return res.status(500).json({ message: 'Error retrieving mentors' });
    }
});

module.exports = router;
