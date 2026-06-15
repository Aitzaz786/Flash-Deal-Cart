import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Order from "../Schema/Order.js";
import Product from "../Schema/Product.js";
import { AppError } from "../Utils/AppError.js";
import { getProductById } from "./ProductService.js";
import {
  acquireStockLock,
  releaseStockLock,
  setReservation,
  getReservation,
  deleteReservation,
  getUserCart,
  setUserCart,
  deleteUserCart,
  removeReservationFromCart,
  getReservedStockForProduct,
} from "./RedisService.js";

const RESERVATION_TTL = 600;

export const reserveItems = async (userId, items) => {
  const masterReservationId = uuidv4();
  const expiresAt = new Date(Date.now() + RESERVATION_TTL * 1000);
  const createdReservationIds = [];
  const reservedItems = [];

  try {
    for (const item of items) {
      const product = await getProductById(item.productId);

      const lockAcquired = await acquireStockLock(item.productId);
      if (!lockAcquired) {
        throw new AppError(
          `Could not acquire stock lock for product ${item.productId}. Please retry.`,
          409
        );
      }

      try {
        const reservedStock = await getReservedStockForProduct(item.productId);
        const availableStock = product.totalStock - product.soldStock - reservedStock;

        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product "${product.name}". Available: ${Math.max(availableStock, 0)}, Requested: ${item.quantity}`,
            409
          );
        }

        const reservationId = uuidv4();
        await setReservation(
          reservationId,
          {
            userId,
            productId: item.productId,
            quantity: item.quantity,
            expiresAt: expiresAt.toISOString(),
            masterReservationId,
          },
          RESERVATION_TTL
        );

        createdReservationIds.push(reservationId);
        reservedItems.push({
          reservationId,
          productId: item.productId,
          quantity: item.quantity,
          productName: product.name,
          price: product.price,
        });
      } finally {
        await releaseStockLock(item.productId);
      }
    }

    const existingCart = await getUserCart(userId);
    await setUserCart(userId, [...existingCart, ...createdReservationIds], RESERVATION_TTL);

    return {
      reservationId: masterReservationId,
      items: reservedItems,
      expiresAt,
    };
  } catch (error) {
    for (const reservationId of createdReservationIds) {
      await deleteReservation(reservationId).catch(() => {});
    }
    throw error;
  }
};

export const cancelReservation = async (userId, reservationId) => {
  const reservation = await getReservation(reservationId);

  if (!reservation) {
    throw new AppError("Reservation not found or expired", 404);
  }

  if (reservation.userId !== userId) {
    throw new AppError("Unauthorized to cancel this reservation", 403);
  }

  await deleteReservation(reservationId);
  await removeReservationFromCart(userId, reservationId);

  return {
    message: "Reservation cancelled successfully",
    reservationId,
  };
};

export const checkoutCart = async (userId) => {
  const reservationIds = await getUserCart(userId);

  if (!reservationIds || reservationIds.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  const reservations = [];
  for (const reservationId of reservationIds) {
    const reservation = await getReservation(reservationId);

    if (!reservation) {
      throw new AppError(
        `Reservation ${reservationId} has expired. Please reserve items again.`,
        410
      );
    }

    if (reservation.userId !== userId) {
      throw new AppError("Unauthorized checkout attempt", 403);
    }

    reservations.push({ reservationId, ...reservation });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderItems = [];
    let totalAmount = 0;
    const masterReservationId = reservations[0]?.masterReservationId || uuidv4();

    for (const reservation of reservations) {
      const product = await Product.findById(reservation.productId).session(session);

      if (!product) {
        throw new AppError(`Product ${reservation.productId} no longer exists`, 404);
      }

      const reservedStock = await getReservedStockForProduct(reservation.productId);
      const availableAtCheckout =
        product.totalStock - product.soldStock - reservedStock + reservation.quantity;

      if (availableAtCheckout < reservation.quantity) {
        throw new AppError(
          `Stock changed for "${product.name}". Please reserve again.`,
          409
        );
      }

      product.soldStock += reservation.quantity;
      await product.save({ session });

      const lineTotal = product.price * reservation.quantity;
      totalAmount += lineTotal;

      orderItems.push({
        productId: product._id,
        quantity: reservation.quantity,
        priceAtPurchase: product.price,
      });
    }

    const [order] = await Order.create(
      [
        {
          userId,
          items: orderItems,
          totalAmount,
          status: "confirmed",
          reservationId: masterReservationId,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    for (const reservationId of reservationIds) {
      await deleteReservation(reservationId).catch(() => {});
    }
    await deleteUserCart(userId);

    return {
      message: "Checkout successful",
      order: {
        orderId: order._id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        reservationId: order.reservationId,
        createdAt: order.createdAt,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
