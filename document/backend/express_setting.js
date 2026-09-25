// backend/express_setting.js
// настройка Express

const express = require('express');
const session = require('express-session');
const app = express();  
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); 

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // сессия живёт 7 дней
  }
}));


// const categoriesRouter = require('./routes/categories');
const tasksRouter = require('./routes/tasks');

// app.use('/categories', categoriesRouter);
app.use('/tasks', tasksRouter);
module.exports = app;

