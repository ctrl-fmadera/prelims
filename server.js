const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const prelims = express();

prelims.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

prelims.use(express.static(path.join(__dirname, 'public')));
prelims.use(express.json());
prelims.use(express.urlencoded({ extended: true }));

prelims.set('view engine', 'ejs');
prelims.set('views', path.join(__dirname, 'views'));

prelims.get('/', (req, res) => {
    res.redirect('/signup');
});

prelims.get('/signup', (req, res) => {
    res.render('signup', {
        errorMessage: null,
        ageRequired: false,
        username: ''
    });
});

prelims.post('/signup', async (req, res) => {
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

        res.render('signup', {
            errorMessage,
            ageRequired,
            username
        });
    }
});

prelims.get('/signup_success', (req, res) => {
    const message = req.session.firstMessage || '';
    const id = req.session.userId || '';
    const code = req.session.code || '';

    res.render('signup_success', { message, id, code });
});

prelims.get('/login', (req, res) => {
    res.render('login', {
        errorMessage: null,
        authKeyRequired: false,
        username: ''
    });
});

prelims.post('/login', async (req, res) => {
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

        res.render('login', {
            errorMessage,
            authKeyRequired,
            username
        });
    }
});

prelims.get('/login_success', (req, res) => {
    const message = req.session.thirdMessage || '';
    res.render('login_success', { message });
});

prelims.get('/update_username', (req, res) => {
    res.render('update_username', {
        username: ''
    });
});

prelims.post('/update_username', async (req, res) => {
    const { username } = req.body;

    try {
        const userId = req.session.userId;
        const code = req.session.code;

        const response = await axios.patch(
            `https://prelim-exam.onrender.com/users/${userId}`,
            { username },
            { headers: { 'Authorization-Code': code } }
        );

        req.session.fourthMessage = response.data.message || 'Username updated successfully!';
        await req.session.save();
        res.redirect('/un_success');
    } catch (error) {
        res.redirect('/update_username');
    }
});

prelims.get('/un_success', (req, res) => {
    const message = req.session.fourthMessage || '';
    res.render('un_success', { message });
});

prelims.get('/add_pet', (req, res) => {
    res.render('add_pet', {
        ownerId: req.session.userId || '',
        petName: '',
        petType: ''
    });
});

prelims.post('/add_pet', async (req, res) => {
    const { ownerId, name, type } = req.body;
    
    try {
        const response = await axios.post('https://prelim-exam.onrender.com/pets/new', { ownerId, name, type });
        const data = response.data;

        req.session.fifthMessage = data.message;
        req.session.petId = data.petId;
        await req.session.save();
        res.redirect('/pet_success');
    } catch (error) {
        let errorMessage = 'Failed to add pet.';

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.render('add_pet', {
            errorMessage,
            ownerId,
            petName: name,
            petType: type
        });
    }
});

prelims.get('/pet_success', (req, res) => {
    const message = req.session.fifthMessage || '';
    const petId = req.session.petId || '';

    res.render('pet_success', {
        message,
        pet: { petId }
    });
});

prelims.get('/view_pet', async (req, res) => {
    try {
        const userId = req.session.userId;
        const code = req.session.code;

        if (!userId || !code) {
            return res.redirect('/signup');
        }

        const response = await axios.get(`https://prelim-exam.onrender.com/users/${userId}/pets`, {
            headers: { 'Authorization-Code': code }
        });

        const data = response.data;
        const pets = data.pets || [];
        const message = data.message || '';

        res.render('view_pet', {
            message,
            pets
        });
    } catch (error) {
        let errorMessage = 'Failed to fetch pets.';

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.render('view_pet', {
            message: errorMessage,
            pets: []
        });
    }
});

prelims.get('/all_pets', async (req, res) => {
    let message = req.session.sixthMessage || '';
    const userId = req.session.targetUserId || '';
    const showEditRole = req.session.showEditRole || false;
    const editRoleMessage = req.session.editRoleMessage || '';
    const editRoleSuccess = req.session.editRoleSuccess || false;

    if (editRoleMessage && editRoleMessage.includes('ITMC{9.')) {
        message = '';
    }

    delete req.session.editRoleMessage;
    delete req.session.editRoleSuccess;
    delete req.session.sixthMessage;
    await req.session.save();

    res.render('all_pets', {
        message,
        userId,
        showEditRole, 
        editRoleMessage,
        editRoleSuccess
    });
});

prelims.post('/all_pets', async (req, res) => {
    const { userId } = req.body;

    try {
        req.session.targetUserId = userId;
        const response = await axios.get(`https://prelim-exam.onrender.com/pets?userId=${userId}`);
        req.session.sixthMessage = response.data.message || 'Unexpected success';
        req.session.showEditRole = false;
    } catch (error) {
        req.session.sixthMessage = error.response?.data?.message || 'Error accessing pets';
        req.session.showEditRole = true;
    }

    await req.session.save();
    res.redirect('/all_pets');
});

prelims.get('/edit_role', (req, res) => {
    const userId = req.session.targetUserId || '';
    const showEditRole = req.session.showEditRole || false;
    const editRoleMessage = req.session.editRoleMessage || '';
    const editRoleSuccess = req.session.editRoleSuccess || false;

    delete req.session.editRoleMessage;
    delete req.session.editRoleSuccess;

    res.render('edit_role', {
        userId,
        showEditRole,
        editRoleMessage,
        editRoleSuccess
    });
});

prelims.post('/edit_role', async (req, res) => {
    const { userId, newRole } = req.body;

    try {
        const code = req.session.code;
        const response = await axios.patch(
            `https://prelim-exam.onrender.com/users/${userId}`,
            { role: newRole },
            {
                headers: {
                    'Authorization-Code': code,
                    'Content-Type': 'application/json'
                }
            }
        );

        req.session.editRoleMessage = response.data.message;
        req.session.editRoleSuccess = true;
        await req.session.save();
        res.redirect('/edit_role');
    } catch (error) {
        let errorMessage = 'Failed to update role.';

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        req.session.editRoleMessage = errorMessage;
        req.session.editRoleSuccess = false;
        await req.session.save();
        res.redirect('/edit_role');
    }
});

prelims.get('/view_allpets', async (req, res) => {
    let message = req.session.editRoleMessage || '';
    const success = req.session.editRoleSuccess || false;
    const userId = req.session.targetUserId || '';

    let pets = [];
    let fetchError = null;

    if (userId) {
        try {
            const response = await axios.get(`https://prelim-exam.onrender.com/pets?userId=${userId}`);
            const data = response.data;

            if (data.pets) {
                pets = data.pets;
            }
            if (data.message && !message) {
                message = data.message;
            }
        } catch (error) {
            fetchError = error.response?.data?.message || 'Failed to fetch pet data.';
        }
    }

    delete req.session.editRoleMessage;
    delete req.session.editRoleSuccess;
    await req.session.save();

    res.render('view_allpets', {
        message,
        success,
        userId,
        pets,
        fetchError
    });
});

prelims.get('/pet_count', async (req, res) => {
    try {
        const response = await axios.get('https://prelim-exam.onrender.com/stats/pets/count');
        const data = response.data;

        res.render('pet_count', {
            success: data.success,
            count: data.count,
            message: data.message
        });
    } catch (error) {
        res.render('pet_count', {
            success: false,
            count: 0,
            message: error.response?.data?.message || error.message || 'Failed to fetch pet count'
        });
    }
});

prelims.get('/delete_pet', async (req, res) => {
    const { petId } = req.query;

    try {
        const code = req.session.code;
        const response = await axios.delete(`https://prelim-exam.onrender.com/pets/${petId}`, {
            headers: {
                'Authorization-Code': code,
                'Content-Type': 'application/json'
            }
        });

        req.session.deleteMessage = response.data.message;
        req.session.deleteSuccess = true;
        await req.session.save();
        res.redirect('/check_age');
    } catch (error) {
        req.session.deleteMessage = error.response?.data?.message || 'Failed to delete pet.';
        req.session.deleteSuccess = false;
        await req.session.save();
        res.redirect('/check_age');
    }
});

prelims.get('/check_age', async (req, res) => {
    const deleteMessage = req.session.deleteMessage || '';
    const deleteSuccess = req.session.deleteSuccess || false;
    const errorMessage = req.session.errorMessage || '';

    delete req.session.deleteMessage;
    delete req.session.deleteSuccess;
    delete req.session.errorMessage;
    await req.session.save();

    res.render('check_age', {
        message: deleteMessage || errorMessage
    });
});

prelims.get('/user_count', async (req, res) => {
    try {
        const response = await axios.get('https://prelim-exam.onrender.com/stats/users/count');
        const data = response.data;

        res.render('user_count', {
            success: data.success,
            count: data.count,
            message: data.message
        });
    } catch (error) {
        res.render('user_count', {
            success: false,
            count: 0,
            message: error.response?.data?.message || error.message || 'Failed to fetch user count'
        });
    }
});

prelims.get('/logout', async (req, res) => {
    res.render('logout');
});

prelims.post('/logout', async (req, res) => {
    const userId = req.session.userId;

    try {
        const response = await axios.post('https://prelim-exam.onrender.com/logout', {
            id: userId
        });

        const data = response.data;
        
        req.session.destroy((err) => {
            res.render('logout', {
                message: data.message || 'Logged out successfully!'
            });
        });

    } catch (error) {
        req.session.destroy((err) => {
            let errorMessage = 'Logout failed.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            res.render('logout', {
                message: errorMessage
            });
        });
    }
});

const PORT = 5000;
prelims.listen(PORT, () => {
    console.log('Good Luck!');
});