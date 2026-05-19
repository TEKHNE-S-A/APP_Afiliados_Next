const db = require('./db/connection.js');
const crypto = require('crypto');

// Helper de hash de contraseña (como en server-soap.js)
function hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

(async () => {
    const client = await db.pool.connect();
    try {
        const email = `opcion1testuser_${Date.now()}@test.local`;
        const password = 'TestPassword123';
        const afiliadoId = '000000000100000000000000001';  // Usar el mismo que se usa en las solicitudes
        
        // Verificar que el afiliado existe en nuusuari
        const checkRes = await client.query(
            'SELECT nuusuid FROM nuusuari WHERE nuusuafili = $1 LIMIT 1',
            [afiliadoId]
        );
        
        if (checkRes.rows.length === 0) {
            console.log('ERROR: El afiliadoId no existe en nuusuari');
            console.log('Usando usuario existente en su lugar...');
            
            // Usar un usuario que sabemos que existe
            const existingRes = await client.query(
                'SELECT u.nuusuid, u.nuusumail, u.nuusuafili FROM nuusuari u LEFT JOIN crcredus cu ON u.nuusuid = cu.nuusuid WHERE u.nuusuafili != \'\' GROUP BY u.nuusuid ORDER BY COUNT(cu.crcreid) DESC LIMIT 1'
            );
           
            if (existingRes.rows.length > 0) {
                console.log(`Found existing user: ${existingRes.rows[0].nuusumail.trim()}`);
                console.log(`AfiliadoId: ${existingRes.rows[0].nuusuafili.trim()}`);
            }
            client.release();
            process.exit(1);
        }
        
        const nuusuid = checkRes.rows[0].nuusuid;
        
        // Insertar en nuusuari
       await client.query(
            'INSERT INTO nuusuari (nuusuid, nuusumail, nuusuafili, nuusufecha) VALUES ($1, $2, $3, NOW()) ON CONFLICT (nuusuid) DO UPDATE SET nuusumail = $2',
            [nuusuid, email, afiliadoId]
        );
        
        // Insertar/actualizar en nuusuauth
        const hashedPass = hashPassword(password);
        await client.query(
            'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = $2, nuusuultm = NOW()',
            [nuusuid, hashedPass]
        );
        
        console.log('✅ Test user created successfully:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   AfiliadoId: ${afiliadoId}`);
        console.log('');
        console.log('Next: Run the test with this user:');
        console.log(`   .\\test-option1.ps1 -Email "${email}" -Password "${password}"`);
        
        client.release();
    } catch (err) {
        console.error('ERROR:', err.message);
        client.release();
        process.exit(1);
    }
})();
