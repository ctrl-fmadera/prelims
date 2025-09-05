const express = require('express');
const axios = require('axios');
const path = require('path');

const prelims = express();

prelims.use(express.static(path.join(__dirname, 'public')));

prelims.use(express.json());
prelims.use(express.urlencoded({ extended:true }));

prelims.set('view engine', 'ejs');
prelims.set('views', path.join(__dirname, 'views'));
let prelimData = {};

prelims.get('/', (req,res) => {
    res.render('start');
});

const PORT = 5000;
prelims.listen(PORT, () => {
    console.log('Good Luck!');
});