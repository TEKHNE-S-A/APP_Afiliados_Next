const db = require('./db/connection.js');

(async () => {
    try {
        const client = await db.pool.connect();
        
        const res = await client.query(`
            SELECT DISTINCT u.nuusuid, u.nuusumail, u.nuusuafili, COUNT(cu.crcreid) as creds, auth.nuusupass
            FROM nuusuari u
            LEFT JOIN crcredus cu ON u.nuusuid = cu.nuusuid
            LEFT JOIN nuusuauth auth ON u.nuusuid = auth.nuusuid
            WHERE u.nuusuafili IS NOT NULL AND u.nuusuafili != '' AND auth.nuusupass IS NOT NULL
            GROUP BY u.nuusuid, u.nuusumail, u.nuusuafili, auth.nuusupass
            ORDER BY creds DESC
            LIMIT 5
        `);
        
        process.stdout.write('Users available for testing:\n');
        res.rows.forEach(row => {
            const mail = (row.nuusumail || '').trim();
            const afil = (row.nuusuafili || '').trim();
            process.stdout.write(`  Email: ${mail}, AfiliadoId: ${afil}, Credentials: ${row.creds}\n`);
        });
        
        client.release();
        process.exit(0);
    } catch (err) {
        process.stdout.write(`Error: ${err.message}\n`);
        process.exit(1);
    }
})();
