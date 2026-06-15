import { getRedis, connectRedis } from "../Config/Redis.js";

/*
 * Redis Key Patterns:
 * - reservation:{reservationId} → JSON { userId, productId, quantity, expiresAt, masterReservationId } TTL 600s
 * - cart:{userId}               → JSON array of reservationIds                         TTL 600s
 * - stock_lock:{productId}      → "1" for atomic stock check operations                TTL 5s
 */

const RESERVATION_PREFIX = "reservation:";
const CART_PREFIX = "cart:";
const STOCK_LOCK_PREFIX = "stock_lock:";

export { connectRedis };

export const setReservation = async (reservationId, data, ttlSeconds = 600) => {
  const redis = getRedis();
  const key = `${RESERVATION_PREFIX}${reservationId}`;
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
};

export const getReservation = async (reservationId) => {
  const redis = getRedis();
  const key = `${RESERVATION_PREFIX}${reservationId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteReservation = async (reservationId) => {
  const redis = getRedis();
  const key = `${RESERVATION_PREFIX}${reservationId}`;
  await redis.del(key);
};

export const getUserCart = async (userId) => {
  const redis = getRedis();
  const key = `${CART_PREFIX}${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : [];
};

export const setUserCart = async (userId, cartData, ttlSeconds = 600) => {
  const redis = getRedis();
  const key = `${CART_PREFIX}${userId}`;
  await redis.set(key, JSON.stringify(cartData), "EX", ttlSeconds);
};

export const deleteUserCart = async (userId) => {
  const redis = getRedis();
  const key = `${CART_PREFIX}${userId}`;
  await redis.del(key);
};

export const removeReservationFromCart = async (userId, reservationId) => {
  const cart = await getUserCart(userId);
  const updatedCart = cart.filter((id) => id !== reservationId);

  if (updatedCart.length === 0) {
    await deleteUserCart(userId);
  } else {
    await setUserCart(userId, updatedCart);
  }
};

export const acquireStockLock = async (productId, maxRetries = 3) => {
  const redis = getRedis();
  const key = `${STOCK_LOCK_PREFIX}${productId}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const acquired = await redis.set(key, "1", "EX", 5, "NX");
    if (acquired === "OK") return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
};

export const releaseStockLock = async (productId) => {
  const redis = getRedis();
  const key = `${STOCK_LOCK_PREFIX}${productId}`;
  await redis.del(key);
};

export const getReservedStockForProduct = async (productId) => {
  const redis = getRedis();
  let cursor = "0";
  let totalReserved = 0;
  const productIdStr = String(productId);

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${RESERVATION_PREFIX}*`,
      "COUNT",
      100
    );
    cursor = nextCursor;

    if (keys.length === 0) continue;

    const values = await redis.mget(keys);
    for (const value of values) {
      if (!value) continue;
      const reservation = JSON.parse(value);
      if (String(reservation.productId) === productIdStr) {
        totalReserved += reservation.quantity;
      }
    }
  } while (cursor !== "0");

  return totalReserved;
};
