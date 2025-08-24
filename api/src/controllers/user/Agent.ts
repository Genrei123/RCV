import type { NextFunction, Request, Response } from 'express';

const scanQR = async (req: Request, res: Response) => {
    res.status(400).json({ message: "Not implemented" });
}