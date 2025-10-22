import { Router } from "express";
import * as ProductController from "../../controllers/product/Product";
import { verifyUser } from "../../middleware/verifyUser";

const ProductRouter = Router();
ProductRouter.get('/products', ProductController.getAllProducts);
ProductRouter.get('/products/:id', ProductController.getProductById);
ProductRouter.post('/products', verifyUser, ProductController.createProduct);
ProductRouter.put('/products/:id', ProductController.updateProduct);
ProductRouter.patch('/products/:id', ProductController.partialUpdateProduct);
ProductRouter.delete('/products/:id', ProductController.deleteProduct);
// ProductRouter.get('/products/search?query=', ProductController.searchProducts);
// ProductRouter.get('/products/filter?type=&subtype=&company=');
// ProductRouter.get('/products/sort?by=&order=');

export default ProductRouter;