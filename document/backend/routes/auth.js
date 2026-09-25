// Маршруты для аутентификации пользователя (вход и выход).
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// GET-запрос для отображения страницы входа
router.get('/login', (req, res) => {
  res.render('login', { error: null, redirect: req.query.redirect || '/' });
});

// Обработка POST-запроса для входа
router.post('/login', async (req, res) => {
  const { password, redirect } = req.body;

  const isValid = await bcrypt.compare(password, process.env.EDIT_PASSWORD_HASH);

  if (!isValid) {
    return res.render('login', { error: 'Неверный пароль', redirect: redirect || '/' });
  }

  req.session.authenticated = true;
  res.redirect(redirect || '/');
});

// Маршрут для выхода из системы
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;