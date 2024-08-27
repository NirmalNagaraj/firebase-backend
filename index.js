const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const loginRouter = require('./routes/auth/login'); // Adjust the path if necessary
const companyQuestionRouter = require('./routes/questions')
const comapnyRouter = require('./routes/company');
const profileRouter = require('./routes/profile');
const problemRouter = require('./routes/problem');

const app = express();
const port = process.env.PORT || 8000;

// Middleware setup
app.use(cors()); // Allows cross-origin requests
app.use(bodyParser.json()); // Parses incoming JSON requests

// Use the login router
app.use('/auth', loginRouter); 
app.use('/questions',companyQuestionRouter)
app.use('/company',comapnyRouter);
app.use('/profile',profileRouter())
app.use('/problems',problemRouter);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the API');
}); 

// Start the server 
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
