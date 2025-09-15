import setUpApp from './setUpApp';
import dotenv from 'dotenv';
import { ProductBlockchain } from './typeorm/entities/productblockchain';
import { ProductBlock } from './typeorm/entities/productblock';
import { Product } from './typeorm/entities/product.entity';
import { DB } from './typeorm/data-source';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

dotenv.config();
const { PORT } = process.env;

const initializeApp = async () => {
  const app = await setUpApp();

  app.listen(PORT || 3000, () =>
    console.log('Server is running on port: ', PORT)
  );

  // Uncomment to test the blockchain functionality. Very similar talaga siya sa linkedlist.
  // let Product: Product = {
  //   LTONumber: "1234567890",
  //   CFPRNumber: "0987654321",
  //   productName: "Sample Product",
  //   productType: 0,
  //   manufacturerName: "Sample Manufacturer",
  //   distributorName: "Sample Distributor",
  //   importerName: "Sample Importer"
  // }

  // let smashingCoin = new ProductBlockchain(Product);
  // smashingCoin.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), Product));
  // smashingCoin.addNewBlock(new ProductBlock(2, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), Product));
  // console.log(JSON.stringify(smashingCoin, null, 4));

};

// Call the function
// Initialize entry of App for server
initializeApp();
