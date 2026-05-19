// Check existing users in database
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'app_afiliados_genexus',
    user: 'postgres',
    password: 'postgres'
});

async function main() {
    try {
        // Find users with afiliado ID
        const result = await pool.query(`
            SELECT nuusuid, nuusumail, nuusuafili, nuusuestit
            FROM nuusuari
            WHERE nuusuafili IS NOT NULL AND nuusuafili != ''
            ORDER BY nuusufecha DESC
            LIMIT 5
        `);
        
        console.log('Users with AfiliadoId:');
        result.rows.forEach(row => {
            console.log(`  Email: ${row.nuusumail}, AfiliadoId: ${row.nuusuafili}, Titular: ${row.nuusuestit}`);
        });
        
        // Try to find users with credentials
        const credResult = await pool.query(`
            SELECT DISTINCT u.nuusuid, u.nuusumail, u.nuusuafili, COUNT(c.crcrepoid) as cred_count
            FROM nuusuari u
            LEFT JOIN crcreden c ON u.nuusuid = c.nuusuid
            WHERE u.nuusuafili IS NOT NULL
            GROUP BY u.nuusuid, u.nuusumail, u.nuusuafili
            ORDER BY cred_count DESC
            LIMIT 5
        `);
        
        console.log('\nUsers with credentials:');
        credResult.rows.forEach(row => {
            console.log(`  Email: ${row.nuusumail}, AfiliadoId: ${row.nuusuafili}, Credentials: ${row.cred_count}`);
        });
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
