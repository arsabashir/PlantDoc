const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '6967259@Ab7',
    database: 'plantdoc'
});

db.connect((err) => {
    if (err) {
     console.log('Database connection failed:', err);
     return;
    }
    console.log('Connected to MySQL database!');
});
module.exports = db;