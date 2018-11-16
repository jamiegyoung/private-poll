const sqlite3 = require('sqlite3');
const uuidv4 = require('uuid/v4')
const { promisify } = require('util');

const db = new sqlite3.Database('./src/database.db');

const database = exports;

const dbGet = promisify(db.get).bind(db);
const dbRun = promisify(db.run).bind(db);

database.getCurrentPoll = () => dbGet('SELECT * FROM polls LIMIT 1 OFFSET (SELECT COUNT(*) FROM polls) - 1').catch(() => false);

database.getCurrentPollOptions = () => dbGet('SELECT options FROM polls LIMIT 1 OFFSET (SELECT COUNT(*) FROM polls) - 1').catch(() => false);

database.createNewPoll = (options) => {
  const id = uuidv4();
  dbRun('INSERT INTO votes VALUES(?, ?)', [id, JSON.stringify({votes: []})])
  dbRun('INSERT INTO polls VALUES(?, ?, "true")', [id, JSON.stringify(options)]).catch(err =>{ throw err });
};

database.checkAdmin = async (user, pass) => {
  const admin = await dbGet('SELECT * FROM admins WHERE user = ? AND pass = ?',[user, pass]).catch(() => { throw err });
  if (admin) {
    return true
  }
  return false;
}

database.checkIfSessionExists = async (sessionID) => {
  const sessionRes = await dbGet('SELECT * FROM votingSessions WHERE id = ?', [sessionID]);
  if (sessionRes) return true;
  return false;
}

database.addVote = async (sessionID, choice) => {
  const pollID = await dbGet('SELECT pollID FROM votingSessions WHERE id = ?', [sessionID]).catch(err => { throw err; });
  const oldVotes = await dbGet('SELECT votes FROM votes WHERE pollID = ?', [pollID.pollID]).catch(err => {throw err;});
  if (checkChoiceInRange(pollID.pollID, choice)) {
    await killSession(sessionID);
    const parsedOldVotes = getNewVotes(oldVotes, choice);
    dbRun('UPDATE votes SET votes = ?', [JSON.stringify(parsedOldVotes)]).catch(err => { throw err; })
    return;
  }
}

database.getPollIDFromSession = async (sessionID) => (await dbGet('SELECT pollID FROM votingSessions WHERE id = ?', [sessionID])).pollID;

database.checkPollStatus = async (pollID) => (await dbGet('SELECT status FROM polls WHERE id = ?', [pollID])).status;

database.updateSendMessage = async () => {
  const current = await dbGet('SELECT * FROM sendMessage');
  if (current.sendMessage === 'false') dbRun('UPDATE sendMEssage SET sendMessage = "true"');
  if (current.sendMessage === 'true') dbRun('UPDATE sendMEssage SET sendMessage = "false"');
  return;
}

database.createNewSession = async () => {
  const id = uuidv4();
  const pollID = await database.getCurrentPoll();
  await dbRun('INSERT INTO votingSessions VALUES(?, ?)', [id, pollID.id]).catch(err => { throw err; });
  return id;
}

database.getVotes = async (pollID) => {
  const voteRes = await dbGet('SELECT votes FROM votes WHERE pollID = ?', [pollID]);
  const optionsRes = await dbGet('SELECT options FROM polls WHERE id = ?', [pollID]);
  const parsedOptions = JSON.parse(optionsRes.options);
  const parsedVotes = JSON.parse(voteRes.votes);
  return { votes: parsedVotes.votes, options: parsedOptions.main };
}

database.checkWhetherToSendVote = async () => await dbGet('SELECT * FROM sendMessage');

const killSession = (sessionID) => dbRun('DELETE FROM votingSessions WHERE id = ?', [sessionID]).catch(err => { throw err; })

const checkChoiceInRange = async (pollID, choice) => {
  const votesRes = await dbGet('SELECT votes FROM votes WHERE pollID = ?', [pollID]);
  const parsedVotes = JSON.parse(votesRes.votes);
  if (choice <= parsedVotes.votes.length - 1 && choice <= 0) return true;
  return false;
}

function getNewVotes(oldVotes, choice) {
  const parsedOldVotes = JSON.parse(oldVotes.votes);
  if (parsedOldVotes.votes[choice] === undefined) {
    parsedOldVotes.votes[choice] = 1;
    return parsedOldVotes;
  }
  parsedOldVotes.votes[choice] += 1;
  return parsedOldVotes;
}
