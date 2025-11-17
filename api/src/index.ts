import dotenv from 'dotenv';
import setUpApp from './setUpApp';
import { initializeCertificateBlockchain } from './services/certificateblockchain';
import { redisService } from './services/redisService';

dotenv.config();
const { PORT } = process.env;

const initializeApp = async () => {
  const app = await setUpApp();

  // Initialize Certificate Blockchain
  initializeCertificateBlockchain();

  // Initialize Redis connection
  // await redisService.connect();

  app.listen(PORT || 3000, () =>
    console.log('Server is running on port: ', PORT)    
  );
};

initializeApp();
