import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                  // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

handler: async (req, res) => {
  await logAudit({
    req,
    action: 'LOGIN_RATE_LIMITED',
    resource: 'AUTH',
    success: false
  });

  res.status(429).json({
    success: false,
    message: 'Too many login attempts'
  });
}