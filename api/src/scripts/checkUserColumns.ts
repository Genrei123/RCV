import { DB } from '../typeorm/data-source';

async function checkColumns() {
  await DB.initialize();
  const result = await DB.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'user'`);
  console.log('Columns in user table:');
  result.forEach((row: any) => console.log(' -', row.column_name));
  await DB.destroy();
}

checkColumns();
