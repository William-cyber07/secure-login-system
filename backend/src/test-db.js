import { testConnection, query } from './config/db.js';
import { hashPassword, verifyPassword } from './utils/hash.js';

(async () => {
  try {
    // 1. Test DB
    await testConnection();

    // 2. Show tables in current DB
    const tables = await query('SHOW TABLES');
    console.log('📦 Tables:', tables);

    // 3. Round-trip a hash
    const hash = await hashPassword('MySecret123!');
    console.log('🔐 Hash:', hash.slice(0, 40) + '...');

    const ok = await verifyPassword('MySecret123!', hash);
    const bad = await verifyPassword('WrongPassword', hash);
    console.log('✅ Correct password verifies:', ok);
    console.log('❌ Wrong password verifies:', bad);

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
})();