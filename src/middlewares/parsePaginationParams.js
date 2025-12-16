const parsePaginationParams = (req, res, next) => {
  req.query.page = parseInt(req.query.page, 10) || 1;
  req.query.limit = parseInt(req.query.limit, 10) || 10;

  if (Number.isNaN(req.query.page) || req.query.page < 1) {
    req.query.page = 1;
  }

  if (Number.isNaN(req.query.limit) || req.query.limit < 1 || req.query.limit > 50) {
    req.query.limit = 10;
  }

  next();
};

module.exports = parsePaginationParams;
