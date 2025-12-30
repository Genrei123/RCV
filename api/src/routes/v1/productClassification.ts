import { Router } from "express";
import * as ClassificationController from "../../controllers/productClassification/ProductClassification";

const ProductClassificationRouter = Router();

// Get all classifications
ProductClassificationRouter.get('/classifications', ClassificationController.getAllClassifications);

// Get classification statistics (for dashboard)
ProductClassificationRouter.get('/classifications/stats', ClassificationController.getClassificationStats);

// Get sub-classifications for a parent
ProductClassificationRouter.get('/classifications/:parentId/sub-classifications', ClassificationController.getSubClassifications);

// Get classification by ID
ProductClassificationRouter.get('/classifications/:id', ClassificationController.getClassificationById);

// Get products by classification ID
ProductClassificationRouter.get('/classifications/:id/products', ClassificationController.getProductsByClassification);

// Create a new classification
ProductClassificationRouter.post('/classifications', ClassificationController.createClassification);

// Update a classification
ProductClassificationRouter.put('/classifications/:id', ClassificationController.updateClassification);

// Delete a classification (with optional re-routing)
ProductClassificationRouter.delete('/classifications/:id', ClassificationController.deleteClassification);

export default ProductClassificationRouter;
