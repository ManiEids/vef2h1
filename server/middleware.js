// Auth middleware - Öryggislög fyrir API
import jwt from 'jsonwebtoken';

// Athuga hvort notandi er innskráður - check if user authenticated
export const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1]; // Taka Bearer token

  try {
    // Staðfesta JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Athuga hvort notandi er admin - check if user is admin
export const adminRequired = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};
