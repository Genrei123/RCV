import setUpApp from './setUpApp';
import dotenv from 'dotenv';
import { CryptoBlockChain } from './typeorm/entities/cryptoblockchain';
import { CryptoBlock } from './typeorm/entities/cryptoblock';

dotenv.config();
const { PORT } = process.env;

const initializeApp = async () => {
  const app = await setUpApp();

  app.listen(PORT || 3000, () =>
    console.log('Server is running on port: ', PORT)
  );

  let smashingCoin = new CryptoBlockChain();
  smashingCoin.addNewBlock(new CryptoBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), {sender: "Iris Ljesnjanin", recipient: "Cosima Mielke", quantity: 50}));
  smashingCoin.addNewBlock(new CryptoBlock(2, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), {sender: "Vitaly Friedman", recipient: "Ricardo Gimenes", quantity: 100}) );
  console.log(JSON.stringify(smashingCoin, null, 4));

};

// Call the function
// Initialize entry of App for server
initializeApp();
