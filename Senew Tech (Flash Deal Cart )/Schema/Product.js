import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    totalStock: {
      type: Number,
      required: true,
      min: 0,
    },
    soldStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFlashDeal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
