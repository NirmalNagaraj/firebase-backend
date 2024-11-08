// Import required modules
const express = require('express');
const axios = require('axios');
const { db } = require('./config/firebaseAdmin'); // Import Firestore from your firebase config
const router = express.Router();
require('dotenv').config(); // Load environment variables

// Brevo SMTP API URL
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = process.env.BREVO_API_KEY;

// Define max recipients per batch
const MAX_RECIPIENTS = 99;

// /getEmails Route to get all emails and send a test email using Brevo
router.get('/sendTestEmails', async (req, res) => {
  try {
    // Fetch emails from the Firestore Users_details collection
    const usersCollection = db.collection('Users_details');
    const snapshot = await usersCollection.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Collect emails from the snapshot
    const emails = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.Email) { // Check field name "Email"
        emails.push(data.Email);
      }
    });

    if (emails.length === 0) {
      return res.status(404).json({ message: 'No valid email addresses found.' });
    }

    // Function to send a batch of emails
    const sendEmailBatch = async (emailBatch) => {
      const emailContent = {
        sender: { email: 'noreply.kiteplacements@gmail.com' },
        subject: 'Test Mail',
        htmlContent: `
          <p>This mail is sent for test purposes as this does not pose any threat or vulnerability, please ignore this.</p>
          <p><b>Note:</b> Do not reply to this email.</p>
        `,
        to: emailBatch.map(email => ({ email })),
      };

      // Send the email using Brevo's SMTP API
      return axios.post(
        BREVO_API_URL,
        emailContent,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY,
          },
        }
      );
    };

    // Send emails in batches
    const emailBatches = [];
    for (let i = 0; i < emails.length; i += MAX_RECIPIENTS) {
      emailBatches.push(emails.slice(i, i + MAX_RECIPIENTS));
    }

    // Process each batch and send emails
    for (const batch of emailBatches) {
      try {
        const response = await sendEmailBatch(batch);
        if (response.status === 200 || response.status === 202) {
          console.log(`Batch sent successfully to ${batch.length} recipients.`);
        } else {
          console.error('Failed to send batch:', response.data);
        }
      } catch (error) {
        console.error('Error sending batch:', error.response?.data || error.message);
      }
    }

    // Respond when all batches are processed
    res.status(200).json({ message: 'Emails sent in batches successfully.' });

  } catch (error) {
    console.error('Error getting documents or sending email:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
