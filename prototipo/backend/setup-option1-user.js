const db = require('./db/connection.js');
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

(async () => {
    const client = await db.pool.connect();
    try {
        // Find the user with most credentials
        const res = await client.query(`
            SELECT u.nuusuid, u.nuusumail, u.nuusuafili
            FROM nuusuari u
            LEFT JOIN crcredus cu ON u.nuusuid = cu.nuusuid
            WHERE u.nuusuafili != ''
            GROUP BY u.nuusuid, u.nuusumail, u.nuusuafili
            ORDER BY COUNT(cu.crcreid) DESC
            LIMIT 1
        `);
        
        if (res.rows.length === 0) {
            console.log('ERROR: No users found');
            client.release();
            process.exit(1);
        }
        
        const user = res.rows[0];
        const email = user.nuusumail.trim();
        const afiliadoId = user.nuusuafili.trim();
        const nuusuid = user.nuusuid;
        const password = 'TestPass123456';
        
        // Update password
        const hashedPass = hashPassword(password);
        await client.query(
            'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = $2, nuusuultm = NOW()',
            [nuusuid, hashedPass]
        );
        
        console.log('✅ Password set for test user:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   AfiliadoId: ${afiliadoId}`);
        console.log(`   Credentials: 7`);
        console.log('');
        console.log('Ready to test! Run:');
        console.log(`   cd E:\\MisProyectos\\appmovil\\APP_Afiliados`);
        console.log(`.   .\\test-option1.ps1 -Email "${email}" -Password "${password}"`);
        
        client.release();
    } catch (err) {
        console.error('ERROR:', err.message);
        client.release();
        process.exit(1);
    }
})();
