const express = require('express');
const router = express.Router();
const { db } = require('./config/firebaseAdmin'); // Firestore instance
const extractRegisterNumber = require('./middlewares/extractRegisterNumber');

  // Add a new question
  router.post('/add-question', extractRegisterNumber, async (req, res) => {
    const { companyName, year, round, question, solution, tags, externalLinks, additionalNotes } = req.body;
    const registerNumber = req.registerNumber;

    try {
      const newQuestion = {
        companyName,
        year,
        round,
        question,
        solution,
        tags: tags.split(',').map(tag => tag.trim()), // store tags as an array
        externalLinks,
        additionalNotes,
        registerNumber,
        created_at: new Date(),
      };

      const docRef = await db.collection('CompanyQuestions').add(newQuestion);
      res.status(201).json({ message: 'Question added successfully', questionId: docRef.id });
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Retrieve questions by company name
  router.get('/search', async (req, res) => {
    const { companyName } = req.query;
  
    try {
      let query = db.collection('CompanyQuestions');
      
      // Check if companyName is provided and valid
      if (companyName && companyName.trim() !== '') {
        query = query.where('companyName', '==', companyName);
      }
  
      const snapshot = await query.get();
      
      // Check if snapshot is empty
      if (snapshot.empty) {
        return res.status(404).json({ message: 'No questions found for the given company.' });
      }
  
      const questions = [];
      
      snapshot.forEach(doc => {
        questions.push({ id: doc.id, ...doc.data() }); // Include the auto-generated ID
      });
  
      res.status(200).json(questions);
    } catch (error) {
      console.error('Error retrieving questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Retrieve a single question by ID
  router.get('/detail/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const doc = await db.collection('CompanyQuestions').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const question = {
        id: doc.id,
        ...doc.data(),
      };

      res.json(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Retrieve all questions
  router.get('/all', async (req, res) => {
  
    try {
      const snapshot = await db.collection('CompanyQuestions').get();
  
      if (snapshot.empty) {
        console.log('No documents found');
        return res.status(404).json({ message: 'No questions found' });
      }
  
      const questions = [];
      snapshot.forEach(doc => {
        questions.push({ id: doc.id, ...doc.data() });
      });
  
      res.status(200).json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

  // Update a question
  router.put('/update-question/:id', async (req, res) => {
    const { id } = req.params;
    const { companyName, year, round, question, solution, tags, externalLinks, additionalNotes, registerNumber } = req.body;

    try {
      const updatedQuestion = {
        companyName,
        year,
        round,
        question,
        solution,
        tags: tags.split(',').map(tag => tag.trim()), // ensure tags are stored as an array
        externalLinks,
        additionalNotes,
        registerNumber,
        updated_at: new Date(),
      };

      await db.collection('CompanyQuestions').doc(id).update(updatedQuestion);
      res.status(200).json({ message: 'Question updated successfully' });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a question
  router.delete('/delete-question/:id', async (req, res) => {
    const { id } = req.params;

    try {
      await db.collection('CompanyQuestions').doc(id).delete();
      res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

module.exports = router;
