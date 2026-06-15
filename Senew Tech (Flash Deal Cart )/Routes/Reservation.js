import express from "express";
import {
  reserveItems,
  cancelReservation,
  checkout,
} from "../Controller/ReservationController.js";
import { validate } from "../Middleware/validate.js";
import {
  reservationLimiter,
  checkoutLimiter,
} from "../Middleware/rateLimit.js";
import {
  reserveItemsSchema,
  cancelSchema,
  checkoutSchema,
} from "../Validations/schemas.js";

const ReservationRoutes = express.Router();

ReservationRoutes.post(
  "/cart/reserve",
  reservationLimiter,
  validate(reserveItemsSchema),
  reserveItems
);

ReservationRoutes.post("/cart/cancel", validate(cancelSchema), cancelReservation);

ReservationRoutes.post(
  "/cart/checkout",
  checkoutLimiter,
  validate(checkoutSchema),
  checkout
);

export default ReservationRoutes;
