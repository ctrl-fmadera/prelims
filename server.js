const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const prelim = express();

prelim.use(session({
    secret: 'supersecretkey', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

prelim.use(express.static(path.join(__dirname, 'public')));
prelim.use(express.json());
prelim.use(express.urlencoded({ extended: true }));

prelim.set('view engine', 'ejs');
prelim.set('views', path.join(__dirname, 'views'));

prelim.get('/', (req, res) => {
    res.redirect('/signup');
});

prelim.get('/signup', (req, res) => {
    res.render('signup', {
        errorMessage: null,
        ageRequired: false,
        username: ''
    });
});

prelim.post('/signup', async (req, res) => {
    const { username, password, age } = req.body;

    try {
        const response = await axios.post('https://prelim-exam.onrender.com/signup', { username, password, age });
        const data = response.data;

        req.session.userId = data.id;
        req.session.code = data.code;
        req.session.firstMessage = data.message;
        req.session.firstAnswer = data.answer;
        req.session.ageRequired = false;

        await req.session.save();

        res.redirect('/signup_success');
    } catch (error) {
        let errorMessage = 'Error creating user.';
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;

            req.session.ageRequired = errorMessage.toLowerCase().includes('age is required');
        } else if (error.message) {
            errorMessage = error.message;
        } else {
            req.session.ageRequired = false;
        }

        await req.session.save();

        return res.render('signup', {
            errorMessage,
            ageRequired: req.session.ageRequired || false,
            username
        });
    }
});

prelim.get('/signup_success', (req, res) => {
  const message = req.session.firstMessage || '';
  const id = req.session.userId || '';
  const code = req.session.code || '';  

  res.render('signup_success', { message, id, code });
});

prelim.get('/login', (req, res) => {
  res.render('login', {
    errorMessage: null,
    authKeyRequired: false,
    username: ''
  });
});

prelim.post('/login', async (req, res) => {
  const { username, password, authKey } = req.body;

  try {
    
      const response = await axios.post('https://prelim-exam.onrender.com/login', { username, password, authKey });
      const data = response.data;

      req.session.username = username;
      req.session.passwordVerified = true;

      req.session.code = data.code || req.session.code;

      await req.session.save();

      return res.render('login', {
        errorMessage: null,
        authKeyRequired: false, 
        username
      });

  } catch (error) {
    let errorMessage = 'Login failed.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    const authKeyRequired = errorMessage.toLowerCase().includes('authentication key is required');
    res.render('login', {
      errorMessage,
      authKeyRequired,
      username
    });
  }
});

const PORT = 5000;
prelim.listen(PORT, () => {
    console.log('Good Luck!');
});
