const mysql = require("mysql2");

const pool = mysql.createConnection({
    'user': 'root',
    'password': 'root',
    'database': 'mydb',
    'host': 'localhost',
    'port': 3307
});

exports.execute = (query, params = [], var_pool = pool) => {
    return new Promise((resolve, reject) => {
        var_pool.query(query, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}
