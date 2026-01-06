import { Router } from "express";
import { addToBlockchain } from "../../controllers/blockchain/Blockchain";

const BlockchainRouter = Router();
BlockchainRouter.post('/add', addToBlockchain);
BlockchainRouter.get('/status', )