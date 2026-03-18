import { Router, Request, Response, NextFunction } from 'express';
import { verifyUser } from '../../middleware/verifyUser';
import { verifyAdmin } from '../../middleware/verifyAdmin';
import {
  checkProductIntegrity,
  revertProductFromBlockchain,
  checkAllProductsIntegrity,
  restoreDeletedProduct,
  checkReportIntegrity
} from '../../services/integrityCheckService';

const router = Router();

/**
 * GET /api/v1/integrity/check/all
 * Check integrity for ALL products that have blockchain records.
 * Returns a summary plus detailed results for tampered products.
 * Requires: Admin authentication
 */
router.get(
  '/check/all',
  verifyUser,
  verifyAdmin,
  async (_req: Request, res: Response) => {
    try {
      const result = await checkAllProductsIntegrity();

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error checking all products integrity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check all products integrity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/integrity/check/product/:id
 * Compare a product's DB record against its blockchain data.
 * Requires: Admin authentication
 */
router.get(
  '/check/product/:id',
  verifyUser,
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await checkProductIntegrity(id);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error checking product integrity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check product integrity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/v1/integrity/revert/product/:id
 * Revert a product's DB data to match blockchain values.
 * Requires: Admin authentication
 */
router.post(
  '/revert/product/:id',
  verifyUser,
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await revertProductFromBlockchain(id);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json({
        success: result.success,
        message: result.message,
        data: { revertedFields: result.revertedFields },
      });
    } catch (error) {
      console.error('Error reverting product from blockchain:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to revert product from blockchain',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Restore a deleted product from the blockchain
 * POST /api/v1/integrity/restore/product/:id
 */
router.post('/restore/product/:id', verifyUser, verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;
    
    if (!txHash) {
      return res.status(400).json({ success: false, message: 'Transaction hash (txHash) is required to restore.' });
    }

    const result = await restoreDeletedProduct(id, txHash);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;


/**
 * GET /api/v1/integrity/check/report/:id
 * Compare a report's DB resolution record against its blockchain data.
 * Requires: Admin authentication
 */
router.get(
  '/check/report/:id',
  verifyUser,
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await checkReportIntegrity(id);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error checking report integrity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check report integrity',
        error: error instanceof Error ? error.message : 'Unknown error',        
      });
    }
  }
);
