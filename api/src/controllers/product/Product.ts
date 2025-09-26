import { Request, Response, NextFunction } from 'express';
import { ProductValidation } from '../../typeorm/entities/product.entity';
import { ProductRepo } from '../../typeorm/data-source';
import CustomError from '../../utils/CustomError';

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await ProductRepo.find();
        res.status(200).json({ products });
    } catch (error) {
        return new CustomError(500, 'Failed to retrieve products');
    }
}

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    if (!ProductValidation.parse({ id: req.params.id })) {
        return new CustomError(400, 'Invalid Product ID');
    }
    try {
        // Logic to get a product by ID
        res.status(200).json({ message: `Product with ID ${req.params.id} retrieved successfully` });
    } catch (error) {
        return new CustomError(500, 'Failed to retrieve product');
    }
    return CustomError.security(400, 'Invalid user data', );
}

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    if (!ProductValidation.parse(req.body)) {
        return new CustomError(400, 'Invalid Product Data');
    }
    try {
        const newProduct = ProductRepo.create(req.body);
        await ProductRepo.save(newProduct);
        res.status(201).json({ product: newProduct });
    } catch (error) {
        return new CustomError(500, 'Failed to create product');
    }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    if (!ProductValidation.parse({ _id: req.params.id, ...req.body })) {
        return new CustomError(400, 'Invalid Product Data');
    }
    try {
        const product = await ProductRepo.findOneBy({ _id: req.params.id });
        if (!product) {
            return new CustomError(404, 'Product not found');
        }
        ProductRepo.merge(product, req.body);
        await ProductRepo.save(product);
        res.status(200).json({ product });
    } catch (error) {
        return new CustomError(500, 'Failed to update product');
    }
}

export const partialUpdateProduct = async (req: Request, res: Response, next: NextFunction) => {
    if (!ProductValidation.parse({ id: req.params.id, ...req.body })) {
        return new CustomError(400, 'Invalid Product Data');
    }
    try {
        const product = await ProductRepo.findOneBy({ _id: req.params.id });
        if (!product) {
            return new CustomError(404, 'Product not found');
        }
        ProductRepo.merge(product, req.body);
        await ProductRepo.save(product);
        res.status(200).json({ product });
    }
    catch (error) {
        return new CustomError(500, 'Failed to partially update product');
    }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    if (!ProductValidation.parse({ id: req.params.id })) {
        return new CustomError(400, 'Invalid Product ID');
    }
    try {
        const result = await ProductRepo.delete(req.params.id);
        if (result.affected === 0) {
            return new CustomError(404, 'Product not found');
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        return new CustomError(500, 'Failed to delete product');
    }
};

export const searchProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return new CustomError(400, 'Invalid search query');
    }
    try {
        const products = await ProductRepo.createQueryBuilder('product')
            .where('product.LTONumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.CFPRNumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.lotNumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.brandName LIKE :query', { query: `%${query}%` })
            .orWhere('product.productName LIKE :query', { query: `%${query}%` })
            .getMany();
        res.status(200).json({ products });
    } catch (error) {
        return new CustomError(500, 'Failed to search products');
    }
};

export const searchProductByCompany = async (req: Request, res: Response, next: NextFunction) => {
    // TO DO if requirements need it
};

export const sortProducType = async (req: Request, res: Response, next: NextFunction) => {
    // TO DO if requirements need it
};


                 





