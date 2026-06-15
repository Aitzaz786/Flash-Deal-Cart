import mongoose from "mongoose";
import Product from "../Schema/Product.js";
import { AppError } from "../Utils/AppError.js";
import { getReservedStockForProduct } from "./RedisService.js";

export const createProduct = async (data) => {
  const product = await Product.create({
    name: data.name,
    price: data.price,
    description: data.description,
    totalStock: data.totalStock,
    soldStock: 0,
    isFlashDeal: data.isFlashDeal ?? false,
  });

  return product;
};

export const getProductStatus = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const reservedStock = await getReservedStockForProduct(productId);
  const availableStock = product.totalStock - product.soldStock - reservedStock;

  return {
    productId: product._id,
    name: product.name,
    totalStock: product.totalStock,
    soldStock: product.soldStock,
    reservedStock,
    availableStock: Math.max(availableStock, 0),
    isFlashDeal: product.isFlashDeal,
  };
};

export const getProductById = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};
