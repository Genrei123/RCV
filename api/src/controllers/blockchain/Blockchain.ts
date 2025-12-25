import { NextFunction, Request, Response } from "express";
import { isInitialized } from "../../services/blockchainService";
import CustomError from "../../utils/CustomError";

export const addToBlockchain = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!isInitialized()) {
        return next(new CustomError(500, "Blockchain service not initialized"));
    }
}

export const getBlockchainStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!isInitialized()) {
        return next(new CustomError(500, "Blockchain service not initialized"));
    }
}