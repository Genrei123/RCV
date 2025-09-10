import { NextFunction, Request, Response } from "express";
import { Product } from "../../typeorm/entities/product.entity";
import CustomError from "../../utils/CustomError";
import * as z from "zod";
import { globalProductBlockchain, initializeProductBlockchain } from "../scan/Scan";
import { ProductBlock } from "../../typeorm/entities/productblock";

export const addProductRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const newProduct = req.body as Product;

        const ProductSchema = z.object({ Product });
        const parsed = ProductSchema.safeParse(newProduct);

        if (!globalProductBlockchain) {
            initializeProductBlockchain();
        }

        // Parse newProduct
        globalProductBlockchain.addNewBlock(new ProductBlock(3, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), newProduct));
        res.status(201).json({ success: true, message: 'Product record added successfully' });
        
    } catch (error) {
        next(error);
    }
}

export const getFullBlockchain = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!globalProductBlockchain) {
            initializeProductBlockchain();
        }
        res.status(200).json({ success: true, blockchain: globalProductBlockchain });
    }
    catch (error) {
        next(error);
    }
}