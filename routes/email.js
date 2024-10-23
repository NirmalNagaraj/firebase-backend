// Import required modules
const express = require('express');
const axios = require('axios');
const { db } = require('./config/firebaseAdmin'); // Import Firestore from your firebase config
const router = express.Router();
require('dotenv').config(); // To load environment variables

// Middleware to fetch emails based on minCGPA (reused from earlier)
const fetchEmailsMiddleware = async (req, res, next) => {
  const { minCGPA } = req.body;

  if (!minCGPA) {
    return res.status(400).json({ message: 'CGPA value is required' });
  }

  try {
    const usersRef = db.collection('Users_details');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No users found' });
    }

    const emails = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const userCGPA = parseFloat(data.CGPA); 
      const minCGPAValue = parseFloat(minCGPA);

      if (userCGPA >= minCGPAValue && data.Email) {
        emails.push(data.Email);
      }
    });

    if (emails.length === 0) {
      return res.status(404).json({ message: 'No users found with CGPA greater than the specified value' });
    }

    req.emails = emails;
    next();
  } catch (error) {
    console.error('Error retrieving emails:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Route to send emails using Brevo
router.post('/sendEmails', fetchEmailsMiddleware, async (req, res) => {
  const emails = req.emails;
  const { companyName } = req.body; // Get CompanyName from frontend

  if (!companyName) {
    return res.status(400).json({ message: 'CompanyName is required' });
  }

  // Subject dynamically generated using CompanyName
  const subject = `${companyName} is recruiting! Fill the application ASAP`;

  // HTML content with inline styles for an attractive layout
  const content = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h1 style="text-align: center; color: #2c3e50;">Exciting Opportunity with ${companyName}!</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #444;">
        Dear Candidate,
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #444;">
        We are thrilled to announce that <strong>${companyName}</strong> has started their recruitment drive. This is your chance to join a prestigious company that values talent and innovation. Make sure you don’t miss out on this golden opportunity!
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #444;">
        Click the button below to fill out your application and take the first step towards an exciting career!
      </p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://kite-placement.vercel.com" style="background-color: #3498db; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-size: 16px;">
          Visit the Placement Portal
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #777; margin-top: 20px;">
        If you have any questions or need further information, please don't hesitate to reach out. Best of luck with your application!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #777;">
        Best regards,<br>
        <strong>The Placement Team</strong>
      </p>
    </div>
  `;

  try {
    // Brevo API URL
    const brevoUrl = 'https://api.brevo.com/v3/smtp/email';
    
    // Email payload to send
    const emailPayload = {
      sender: { name: "Placement Cell", email: "placementkite@gmail.com" }, // Customize this
      to: emails.map(email => ({ email })), // Send to the list of emails
      subject,
      htmlContent: content
    };

    // Send the email using Brevo API
    const response = await axios.post(brevoUrl, emailPayload, {
      headers: {
        'api-key': 'xkeysib-7d5a02a54c1fa773a0db912fbbdb260be2a896255a03b94fb4b0c13d91c141b6-sBn2Yqnr45UbKHS',
        'Content-Type': 'application/json'
      }
    });

    // Send a success response
    return res.status(200).json({ message: 'Emails sent successfully', response: response.data });
  } catch (error) {
    console.error('Error sending emails:', error.response ? error.response.data : error.message);
    return res.status(500).json({ message: 'Error sending emails', error: error.message });
  }
});

module.exports = router;