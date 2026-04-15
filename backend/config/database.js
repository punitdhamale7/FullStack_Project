const mysql = require('mysql2');
require('dotenv').config();

// Debug: Log database environment variables (without password)
console.log('Database Configuration:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: 'Required'
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('CRITICAL: Database connection failed!');
        console.error('Error details:', {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            message: err.message
        });
        return;
    }
    console.log('SUCCESS: Connected to MySQL database (' + (process.env.DB_NAME || 'default') + ')');
    connection.release();
});

module.exports = pool;

