// attach auth status middleware
function attachAuthStatus(req, res, next) {
  res.locals.isAuthenticated = !!(req.session && req.session.authenticated);
  next();
}

module.exports = attachAuthStatus;
