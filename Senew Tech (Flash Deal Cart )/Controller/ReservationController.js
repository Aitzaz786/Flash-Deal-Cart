import * as ReservationService from "../Services/ReservationService.js";

export const reserveItems = async (req, res, next) => {
  try {
    const { userId, items } = req.validatedData;
    const result = await ReservationService.reserveItems(userId, items);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const cancelReservation = async (req, res, next) => {
  try {
    const { userId, reservationId } = req.validatedData;
    const result = await ReservationService.cancelReservation(userId, reservationId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const checkout = async (req, res, next) => {
  try {
    const { userId } = req.validatedData;
    const result = await ReservationService.checkoutCart(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
