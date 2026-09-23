// backend/express_setting.js
// настройка Express

const express = require('express');
const app = express();  
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); 

// const categoriesRouter = require('./routes/categories');
const tasksRouter = require('./routes/tasks');

// app.use('/categories', categoriesRouter);
app.use('/tasks', tasksRouter);
module.exports = app;

