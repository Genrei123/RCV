import { Router } from "express";
import * as ProductController from "../../controllers/product/Product";

const ProductRouter = Router();
ProductRouter.get('/products', ProductController.getAllProducts);
ProductRouter.get('/products/:id', ProductController.getProductById);
ProductRouter.post('/products', ProductController.createProduct);
ProductRouter.put('/products/:id', ProductController.updateProduct);
ProductRouter.patch('/products/:id', ProductController.partialUpdateProduct);
ProductRouter.delete('/products/:id', ProductController.deleteProduct);
ProductRouter.post('/products/:id/archive', ProductController.archiveProduct);
ProductRouter.post('/products/:id/unarchive', ProductController.unarchiveProduct);

export default ProductRouter;