const sqlite3 = require('sqlite3');
const readline = require('readline');
const uuidv4 = require('uuid/v4')
const { promisify } = require('util');

const db = new sqlite3.Database('./src/database.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dbRun = promisify(db.run).bind(db);

rl.question('Please enter a username: ', (answer) => {
  if(answer.length > 0 && answer.length <= 32) {
    rl.question('Please enter a password: ', async (password) => {
      if(password.length > 0 && password.length <= 64) {
        await dbRun('INSERT INTO admins VALUES(?, ?, ?)', [uuidv4(), answer, password])
        .catch(err => { throw err; });
        console.log('Successfully created admin!');
        return;
      }
    });
    return;
  }
  console.log('invalid details');
})
