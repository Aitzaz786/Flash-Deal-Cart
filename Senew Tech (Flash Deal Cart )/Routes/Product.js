import express from "express";
import { createProduct, getProductStatus } from "../Controller/Product.js";
import { validate } from "../Middleware/validate.js";
import { createProductSchema } from "../Validations/schemas.js";

const ProductRoutes = express.Router();

ProductRoutes.post("/products/create", validate(createProductSchema), createProduct);
ProductRoutes.get("/products/:productId/status", getProductStatus);

export default ProductRoutes;
