import dotenv from 'dotenv';
import setUpApp from './setUpApp';
import { initializeCertificateBlockchain } from './services/certificateblockchain';
import { initializeSepoliaBlockchain } from './services/sepoliaBlockchainService';
import { redisService } from './services/redisService';
import { recoverFromBlockchain, getRecoveryStatus } from './services/blockchainRecoveryService';
import { FuzzySearchService } from './services/fuzzySearchService';

dotenv.config();
const { PORT, ENABLE_BLOCKCHAIN_RECOVERY } = process.env;

const initializeApp = async () => {
  const app = await setUpApp();

  // Initialize Certificate Blockchain (local)
  initializeCertificateBlockchain();

  // Initialize Sepolia Blockchain (Ethereum testnet)
  await initializeSepoliaBlockchain();

  // Initialize Redis connection
  // await redisService.connect();

  // Initialize Fuzzy Search Service (learn patterns from database)
  try {
    await FuzzySearchService.initialize();
  } catch (error) {
    console.error('[FuzzySearch] Failed to initialize:', error);
    console.warn('[FuzzySearch] Will initialize on first search request');
  }

  // Blockchain Recovery Check on Startup
  // This demonstrates the robustness of blockchain technology:
  // Even if the database is wiped, we can recover records from the blockchain!
  if (ENABLE_BLOCKCHAIN_RECOVERY === 'true') {
    console.log('\n🔗 Blockchain Recovery Check Enabled');
    
    try {
      const status = await getRecoveryStatus();
      
      if (status.missingRecords > 0) {
        const recoveryResult = await recoverFromBlockchain();
        
        if (recoveryResult.companiesRecovered > 0 || recoveryResult.productsRecovered > 0) {
          console.log(`\n✅ Recovery Complete: ${recoveryResult.companiesRecovered} companies, ${recoveryResult.productsRecovered} products identified`);
        }
      } else {
        console.log('✅ All blockchain records are present in database');
      }
    } catch (error) {
      console.error('⚠️  Blockchain recovery check failed:', error);
      // Don't fail startup, just log the error
    }
  }

  app.listen(PORT || 3000, () =>
    console.log('Server is running on port: ', PORT)    
  );
};

initializeApp();
