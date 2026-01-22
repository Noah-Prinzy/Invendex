// src/middlewares/requireRoles.js
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient permissions'
      });
    }
    next();
  };
  router.post('/', protect, requireRoles('admin'), createProduct);
};

export default requireRoles;
