const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Checks if the database schema is initialized and runs the migration script if not.
 * This version splits the SQL file into individual statements for robust execution.
 */
async function runMigrations() {
    console.log('[DATABASE] Checking database schema...');
    const client = await pool.connect();

    try {
        // Check if the 'players' table already exists.
        const res = await client.query(`
            SELECT EXISTS (
                SELECT FROM pg_catalog.pg_tables
                WHERE schemaname = 'public' AND tablename = 'players'
            );
        `);

        if (res.rows[0].exists) {
            console.log('[DATABASE] Schema is already initialized. Skipping migration.');
            return;
        }

        console.log('[DATABASE] Tables not found. Beginning database initialization...');
        const initSqlPath = path.join(__dirname, 'migrations', 'init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        
        // Split the SQL script into individual statements. This is crucial for drivers
        // that do not support multi-statement queries in a single call.
        const statements = initSql.split(';').filter(statement => statement.trim().length > 0);

        // Run all statements within a single transaction.
        // If any statement fails, the entire transaction is rolled back.
        await client.query('BEGIN');
        console.log(`[DATABASE] Found ${statements.length} statements to execute.`);
        
        for (const statement of statements) {
            if (statement.trim()) { // Ensure we don't run empty queries
                await client.query(statement);
            }
        }
        
        await client.query('COMMIT');
        
        console.log('[DATABASE] ✅ Successfully initialized database schema!');

    } catch (err) {
        console.error('[DATABASE] ❌ Error during migration, rolling back transaction.');
        await client.query('ROLLBACK');
        console.error(err); // Log the detailed error
        console.error('[FATAL] Could not initialize the database. The application will now exit.');
        process.exit(1);
    } finally {
        client.release();
    }
}

module.exports = { runMigrations };

