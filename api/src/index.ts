import dotenv from 'dotenv';
import setUpApp from './setUpApp';
import { Product } from './typeorm/entities/product.entity';
import { DB } from './typeorm/data-source';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { initializeCertificateBlockchain } from './services/certificateblockchain';

dotenv.config();
const { PORT } = process.env;

const initializeApp = async () => {
  const app = await setUpApp();

  // Initialize Certificate Blockchain
  initializeCertificateBlockchain();

  app.listen(PORT || 3000, () =>
    console.log('Server is running on port: ', PORT)    
  );
};

initializeApp();
