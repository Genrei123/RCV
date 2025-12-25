import { NextFunction, Request, Response } from "express";
import { initializeBlockchain } from "../services/blockchainService";
import { addToBlockchain, getBlockchainStatus } from "../controllers/blockchain/Blockchain";

jest.mock("../services/blockchainService");

describe("Blockchain API", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const mockInitializeBlockchain = initializeBlockchain as jest.Mock;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    })
    jest.clearAllMocks();

    describe("Error Cases", () => {
        it("should return 500 if blockchain service is not initialized in addToBlockchain", async () => {
            await mockInitializeBlockchain.mockResolvedValue(false);
            await addToBlockchain(req as Request, res as Response, next as NextFunction);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 500,
                    message: "Blockchain service not initialized",
                })
            );
        });
        
        it("should return 500 if blockchain service is not initialized in getBlockchainStatus", async () => {
            await mockInitializeBlockchain.mockResolvedValue(false);
            await getBlockchainStatus(req as Request, res as Response, next as NextFunction);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 500,
                    message: "Blockchain service not initialized",
                })
            );
        })

        it("should return 400 if the wallet is not authorized", async () => {
            await mockInitializeBlockchain.mockResolvedValue(true);
            req.body = {
                walletAddress: "unauthorized_wallet_address",
                data: "some_data",
            }
            await addToBlockchain(req as Request, res as Response, next as NextFunction);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: "Wallet not authorized to add data to the blockchain",
                })
            );
        })
    })
})