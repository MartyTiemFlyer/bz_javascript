// Middleware для проверки аутентификации пользователя перед доступом к защищенным маршрутам.
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = requireAuth;