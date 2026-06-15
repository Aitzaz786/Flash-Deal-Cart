import rateLimit from "express-rate-limit";

export const reservationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests, slow down" },
});

export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many checkout attempts" },
});
