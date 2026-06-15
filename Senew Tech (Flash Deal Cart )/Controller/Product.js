import * as ProductService from "../Services/ProductService.js";

export const createProduct = async (req, res, next) => {
  try {
    const product = await ProductService.createProduct(req.validatedData);
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const getProductStatus = async (req, res, next) => {
  try {
    const status = await ProductService.getProductStatus(req.params.productId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};
