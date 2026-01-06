import { Router } from "express";
import * as BrandNameController from "../../controllers/brandName/BrandName";

const BrandNameRouter = Router();

// Get all brand names
BrandNameRouter.get('/brand-names', BrandNameController.getAllBrandNames);

// Get brand name statistics (for dashboard)
BrandNameRouter.get('/brand-names/stats', BrandNameController.getBrandNameStats);

// Get brand name by ID
BrandNameRouter.get('/brand-names/:id', BrandNameController.getBrandNameById);

// Get products by brand name ID
BrandNameRouter.get('/brand-names/:id/products', BrandNameController.getProductsByBrandName);

// Create a new brand name
BrandNameRouter.post('/brand-names', BrandNameController.createBrandName);

// Update a brand name
BrandNameRouter.put('/brand-names/:id', BrandNameController.updateBrandName);

// Delete a brand name (with optional re-routing)
BrandNameRouter.delete('/brand-names/:id', BrandNameController.deleteBrandName);

export default BrandNameRouter;
