import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().positive(),
  description: z.string().min(5).max(500),
  totalStock: z.number().int().positive(),
  isFlashDeal: z.boolean().optional(),
});

export const reserveItemsSchema = z.object({
  userId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().length(24),
        quantity: z.number().int().positive().max(10),
      })
    )
    .min(1)
    .max(10),
});

export const checkoutSchema = z.object({
  userId: z.string().min(1),
});

export const cancelSchema = z.object({
  userId: z.string().min(1),
  reservationId: z.string().min(1),
});
