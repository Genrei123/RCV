import { Router } from "express";
import * as ProductController from "../../controllers/product/Product";

const ProductRouter = Router();
ProductRouter.get('/', ProductController.getAllProducts);
ProductRouter.get('/:id', ProductController.getProductById);
ProductRouter.post('/', ProductController.createProduct);
ProductRouter.put('/:id', ProductController.updateProduct);
ProductRouter.patch('/:id', ProductController.partialUpdateProduct);
ProductRouter.delete('/:id', ProductController.deleteProduct);
// ProductRouter.get('/products/search?query=', ProductController.searchProducts);
// ProductRouter.get('/products/filter?type=&subtype=&company=');
// ProductRouter.get('/products/sort?by=&order=');

export default ProductRouter;