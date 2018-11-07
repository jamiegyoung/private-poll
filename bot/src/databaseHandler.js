const sqlite3 = require('sqlite3');
const uuidv4 = require('uuid/v4')
const { promisify } = require('util');

const db = new sqlite3.Database('./src/database.db');

const database = exports;

const dbGet = promisify(db.get).bind(db);
const dbRun = promisify(db.run).bind(db);

database.isTracked = async (msgID) => {
  const res = await dbGet('SELECT id FROM trackedMessages WHERE id = ?', [msgID]).catch(err => { throw err; })
  if (res) {
    return true;
  }
  return false;
};

database.trackMessage = async (id, pollID) => {
  const sentTo = {recipients: []};
  dbRun('INSERT INTO trackedMessages VALUES(?, ?)', [id, pollID]).catch(err => { throw err; })
  dbRun('INSERT INTO pollUsers VALUES(?, ?)', [pollID, JSON.stringify(sentTo)]).catch(err => { throw err; })
};

database.addSentUser = async (msgID, userID) => {
  const pollID = await dbGet('SELECT pollID FROM trackedMessages WHERE id = ?', [msgID]);
  const oldSent = await dbGet('SELECT sentTo FROM pollUsers WHERE pollID = (?)', [pollID.pollID]);
  if (oldSent) {
    const parsedSent = JSON.parse(oldSent.sentTo);
    parsedSent.recipients.push(userID);
    dbRun('UPDATE pollUsers SET sentTo = ?', [JSON.stringify(parsedSent)]).catch(err => { throw err; })
  }
}

database.hasNotBeenSentTo = async (msgID, userID) => {
  // console.log(msgID);
  const pollID = await dbGet('SELECT pollID FROM trackedMessages WHERE id = ?', [msgID]);
  // console.log(pollID);
  const oldSent = await dbGet('SELECT sentTo FROM pollUsers WHERE pollID = (?)', [pollID.pollID]);
  if (oldSent) {
    const parsedSent = JSON.parse(oldSent.sentTo);
    if(parsedSent.recipients.includes(userID)) {
      return false;
    }
  }
  return true;
}