const jwt = require("jsonwebtoken");
const { errorResponse } = require("../context/responseHandle");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new errorResponse({ message: "Unauthorized", statusCode: 401 }));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return next(new errorResponse({ message: "Invalid or expired token", statusCode: 401 }));
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new errorResponse({ message: "Forbidden", statusCode: 403 }));
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
