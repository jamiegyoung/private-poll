const conf = require('./src/conf.json');
const express = require('express');
const db = require('./src/databaseHandler');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const SQLiteStore = require('connect-sqlite3')(session);
const storeOptions = {
  dir: __dirname + '/src/'
};

const app = express();
const port = conf.port;

app.use(express.static('public/'));

app.use(cookieParser());

app.use(session({
  store: new SQLiteStore(storeOptions),
  resave: false,
  saveUninitialized: false,
  secret: conf.sessionSecret,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
})); 

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');        
  }
  next();
});

const sessionChecker = (req) => {
  if (req.session.user && req.session.user_sid) {
    return true;
  }
  return false;
};

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
})

app.get('/admin/dashboard', (req, res) => {
  if (sessionChecker(req)) {
    res.sendFile(__dirname + '/private/admin/dashboard/index.html');
    return
  }
  res.redirect('/login');
})

app.get('/login', (req, res) => {
  if(!sessionChecker(req)) {
    res.sendFile(__dirname + '/private/admin/login/index.html');
    return;
  }
  res.redirect('/admin/dashboard');
});

app.get('/admin/loginRequest', async (req,res) => {
  const username = req.query.user;
  const password = req.query.pass;
  if(await db.checkAdmin(username, password)) {
    const sid = uuidv4();
    req.session.user = username;
    req.session.user_sid = sid
    res.json({ success: true })
    return;
  }
  res.json({
    error: 'user not found'
  })
})

app.get('/CurrentPoll', async (req, res) => {
  if (sessionChecker(req)) {
    const pollID = await db.getCurrentPoll();
    res.redirect('/results/' + pollID.id);
    return;
  }
  const exists = await db.checkAdmin(req.query.user, req.query.pass);
  if (exists) {
    const pollRes = await db.getCurrentPoll()
    if (pollRes) {
      res.json(pollRes);
      return;
    }
    res.json({
      error: 'no previous polls',
    });
    return;
  }
  res.status(404).redirect('/404');
});

app.get('/CurrentPollOptions', async (req, res) => {
  res.json(await db.getCurrentPollOptions());
})

app.get('/CreateNewPoll', async (req, res) => {
  if (sessionChecker(req)) {
    if(req.query.options) {
      try {
        const optionsArray = JSON.parse(req.query.options);
        await db.createNewPoll({
          main: optionsArray
        });
        res.send('<script>window.close();</script>');
        return;
      } catch (e) {
        res.status(400);
      }
    }
  }
  res.status(404).redirect('/404');
});

app.get('/CreateVotingSession', async (req,res) => {
  const exists = await db.checkAdmin(req.query.user, req.query.pass);
  if (exists) {
    const urlID = await db.createNewSession();
    const url = 'https://poll.jamieyoung.tech/vote/' + urlID;
    res.json({
      url: url
    })
    return;
  }
  res.status(404).redirect('/404');
})

app.get('/vote/:sessionID', async (req, res) => {
  if (await db.checkIfSessionExists(req.params.sessionID)) {
    const pollID = await db.getPollIDFromSession(req.params.sessionID)
    const isOngoing = await db.checkPollStatus(pollID);
    if (isOngoing == 'true') {
      res.sendFile(__dirname + '/private/voting/index.html');
      return;
    }
    res.redirect('/Late');
    return;
  }
  res.status(404).redirect('/404');
})

app.get('/submitVote/:sessionID/:choice', async (req, res) => {
  if (await db.checkIfSessionExists(req.params.sessionID)) {
    const pollID = await db.getPollIDFromSession(req.params.sessionID)
    const isOngoing = await db.checkPollStatus(pollID);
    if (isOngoing == 'true') {
      if (req.params.choice) {
        await db.addVote(req.params.sessionID, req.params.choice);
        res.json({success: true});
        return;
      }
    }
  }
  res.json({success: false});
})

app.get('/GetVotes/:pollID', async (req, res) => {
  res.json(await db.getVotes(req.params.pollID));
})

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
})

app.get('/results/:pollID', (req, res) => {
  res.sendFile(__dirname + '/private/results/index.html');
})

app.get('/messagePostCheck', async (req, res) => {
    res.json(await db.checkWhetherToSendVote())
});

app.get('/SendMessage', async (req, res) => {
  const exists = await db.checkAdmin(req.query.user, req.query.pass);
  if (sessionChecker(req) || exists) {
      db.updateSendMessage();
      if(!exists) {
        res.send('<script>window.close();</script>');
        return;
      }
      res.json({success: "true"})
      return;
  }
  res.status(404).redirect('/404');
})

app.listen(conf.port, () => console.log(`poll app listening on port ${conf.port}!`));
