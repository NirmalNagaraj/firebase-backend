const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const loginRouter = require('./routes/auth/login'); // Adjust the path if necessary
const companyQuestionRouter = require('./routes/questions')
const companyRouter = require('./routes/company');
const profileRouter = require('./routes/profile');
const problemRouter = require('./routes/problem');
const compilerRouter = require('./routes/compiler')
const isMentorRouter = require('./routes/auth/isMentor')
const isOnboarding = require('./routes/auth/isOnboarding')
const onboardingData = require('./routes/onBoardData');
const isCredentialsRouter = require('./routes/auth/isCredentials');
const credentialsRouter = require('./routes/credentials');
const UsersPasswordRouter = require('./routes/auth/userPassword');
const adminRouter = require('./routes/auth/adminLogin');
const cgpaConfigRouter = require('./routes/config/cgpa');
const analyticsRouter = require('./routes/analytics');
const filterRouter = require('./routes/filter');
const mentorRouter = require('./routes/mentor');
// const emailRouter = require('./routes/email')
const applyRouter = require('./routes/applications')
const reportRouter = require('./routes/report')
const app = express();
const port = process.env.PORT || 8000;

// Middleware setup
app.use(cors()); // Allows cross-origin requests
app.use(bodyParser.json()); // Parses incoming JSON requests

// Use the login router
app.use('/auth', loginRouter); 
app.use('/questions',companyQuestionRouter)
app.use('/company',companyRouter); 
app.use('/profile',profileRouter())
app.use('/problems',problemRouter);
app.use('/',compilerRouter());
app.use('/mentor',isMentorRouter());
app.use('/check',isOnboarding);
app.use('/onboardData',onboardingData);
app.use('/credentials',credentialsRouter);
app.use('/',isCredentialsRouter);
app.use('/user',UsersPasswordRouter);
app.use('/auth',adminRouter)
app.use('/config',cgpaConfigRouter);
app.use('/analytics',analyticsRouter)
app.use('/query',filterRouter)
app.use('/',mentorRouter);
app.use('/',applyRouter);
app.use('/report',reportRouter)
// app.use('/email',emailRouter);
// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the API');
}); 

// Start the server 
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
