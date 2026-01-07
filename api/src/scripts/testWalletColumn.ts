import { DB } from '../typeorm/data-source';

async function testQuery() {
  await DB.initialize();
  console.log('Database connected');
  
  try {
    // Try querying with quoted camelCase
    const r1 = await DB.query('SELECT "walletAuthorized" FROM "user" LIMIT 1');
    console.log('Query with camelCase succeeded:', r1);
  } catch (e: any) {
    console.log('Query with camelCase failed:', e.message);
  }
  
  try {
    // Try querying without quotes (lowercase)
    const r2 = await DB.query('SELECT walletauthorized FROM "user" LIMIT 1');
    console.log('Query with lowercase succeeded:', r2);
  } catch (e: any) {
    console.log('Query with lowercase failed:', e.message);
  }
  
  await DB.destroy();
}

testQuery();
