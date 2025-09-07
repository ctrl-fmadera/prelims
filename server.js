const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');
const { name } = require('ejs');

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
        req.session.ageRequired = false;

        await req.session.save();

        res.redirect('/signup_success');
    } catch (error) {
        let errorMessage = 'Signup failed.';
        let ageRequired = false;

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
            ageRequired = errorMessage.toLowerCase().includes('age is required');
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.render('signup', {
            errorMessage,
            ageRequired,
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

        req.session.thirdMessage = data.message; 
        
        req.session.username = username;
        req.session.passwordVerified = true;
        req.session.code = data.code || req.session.code;

        await req.session.save();

        res.redirect('/login_success');
    } catch (error) {
        let errorMessage = 'Login failed.';
        let authKeyRequired = false;

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
            authKeyRequired = (
                errorMessage.toLowerCase().includes('authentication key') ||
                errorMessage.toLowerCase().includes('authkey') ||
                errorMessage.toLowerCase().includes('auth key')
            );
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.render('login', {
            errorMessage,
            authKeyRequired,
            username
        });
    }
});

prelim.get('/login_success', (req, res) => {
    const message = req.session.thirdMessage || '';

    res.render('login_success', { message });
});

prelim.get('/update_username', (req, res) => {
    res.render('update_username', {
        username: ''
    });
});

prelim.post('/update_username', async (req, res) => {
    const { username } = req.body;

    try {
        const userId = req.session.userId;
        const code = req.session.code;

        const response = await axios.patch(`https://prelim-exam.onrender.com/users/${userId}`, 
          { username },
          { headers: { 'Authorization-Code': code } });
        
        const data = response.data; 
        
        req.session.fourthMessage = data.message || "Username updated successfully!";  
        
        await req.session.save();

        res.redirect('/un_success');
    } catch (error) {
        let errorMessage = 'Username update failed.';
        
        if (error.response?.data) {
            const data = error.response.data;
            errorMessage = data.message || data;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.redirect('/update_username');
    }
});

prelim.get('/un_success', (req, res) => {
    const message = req.session.fourthMessage || '';
    res.render('un_success', { message });
});

prelim.get('/add_pet', (req, res) => {
    res.render('add_pet', {
        ownerId: req.session.userId || '',
        petName: '',
        petType: ''
    });
});

prelim.post('/add_pet', async (req, res) => {
    const { ownerId, name, type } = req.body;
    try {
        const response = await axios.post('https://prelim-exam.onrender.com/pets/new', { ownerId, name, type });
        const data = response.data;
        req.session.fifthMessage = data.message;
        await req.session.save();

        res.redirect('/pet_success');

    } catch (error) {
let errorMessage = 'Failed to add pet.';
        
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Render the form again with error message and previous values
        res.render('add_pet', {
            errorMessage,
            ownerId,
            petName: name,
            petType: type
        });
    }
});

prelim.get('/pet_success', (req, res) => {
    const message = req.session.petMessage || '';
    res.render('pet_success', { message });
});

const PORT = 5000;
prelim.listen(PORT, () => {
    console.log('Good Luck!');
});