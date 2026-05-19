const db = require('./db/connection.js');

(async () => {
    const client = await db.pool.connect();
    try {
        const res = await client.query(
            `SELECT ausolicid, nuusuid, ausoldescr, ausolestad, ausoltipo, ausolfecal, 
                    (SELECT COUNT(*) FROM ausoaufo WHERE ausolicid = ausolici.ausolicid) as fotos 
             FROM ausolici 
             WHERE ausoldescr LIKE 'TEST-%' 
             ORDER BY ausolfecal DESC LIMIT 5`
        );
        
        console.log('✅ Authorization requests found in PostgreSQL:\n');
        
        if (res.rows.length === 0) {
            console.log('❌ No requests found. This might mean:');
            console.log('   - The request did not reach the backend');
            console.log('   - The backend did not insert into ausolici');
            client.release();
            return;
        }
        
        res.rows.forEach((row, idx) => {
            console.log(`📋 Request #${idx + 1}:`);
            console.log(`   ID: ${row.ausolicid}`);
            console.log(`   Reference: ${row.ausoldescr}`);
            console.log(`   Status: ${row.ausolestad}`);
            console.log(`   Type: ${row.ausoltipo === 'S' ? 'Sin Prescripcion' : 'Con Prescripcion'}`);
            console.log(`   Photos: ${row.fotos}`);
            console.log(`   Created: ${row.ausolfecal}`);
            console.log('');
        });
        
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        client.release();
        process.exit(1);
    }
})();
