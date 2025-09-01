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
        
        // Split the SQL script into individual statements while ignoring semicolons
        // that appear inside single quotes, double quotes, or dollar-quoted strings.
        function splitSqlStatements(sql) {
            const statements = [];
            let current = '';
            let inSingle = false;
            let inDouble = false;
            let inDollar = false;
            let dollarTag = null;

            for (let i = 0; i < sql.length; i++) {
                const ch = sql[i];

                // Check for start/end of dollar-quoted string
                if (!inSingle && !inDouble && ch === '$') {
                    // attempt to read a tag like $tag$
                    const match = sql.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
                    if (match) {
                        const tag = match[0];
                        if (!inDollar) {
                            inDollar = true;
                            dollarTag = tag;
                            current += tag;
                            i += tag.length - 1;
                            continue;
                        } else if (inDollar && tag === dollarTag) {
                            inDollar = false;
                            current += tag;
                            i += tag.length - 1;
                            dollarTag = null;
                            continue;
                        }
                    }
                }

                if (!inDollar) {
                    if (ch === "'") {
                        inSingle = !inSingle;
                        current += ch;
                        continue;
                    }
                    if (ch === '"') {
                        inDouble = !inDouble;
                        current += ch;
                        continue;
                    }
                }

                if (!inSingle && !inDouble && !inDollar && ch === ';') {
                    if (current.trim().length > 0) statements.push(current.trim());
                    current = '';
                    continue;
                }

                current += ch;
            }

            if (current.trim().length > 0) statements.push(current.trim());
            return statements;
        }

        const statements = splitSqlStatements(initSql);

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

