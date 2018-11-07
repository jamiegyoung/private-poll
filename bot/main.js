const Eris = require('eris');
const schedule = require('node-schedule');
const api = require('./src/apiHandler');
const db = require('./src/databaseHandler');
const conf = require('./private/conf.json');
const channelID = conf.channelID;

const client = new Eris.CommandClient(conf.discord, {}, {
  defaultHelpCommand: false,
  description: 'A deal bot made by Jam',
  owner: 'Jam',
  prefix: 'ocp!',
});

client.connect();

// const embedColor = 15158332;
// const startDate = new Date();


const ruleCheckForNewPoll = new schedule.RecurrenceRule();
ruleCheckForNewPoll.minute = [0,10,20,30,40,50];

// const jPollCheck = schedule.scheduleJob(ruleCheckForNewPoll, () => {
//   // api.getCurrentPoll()
// });

const testApi = async () => {
  const poll = await api.checkForNewPoll();
  if (poll) {
    const choices = JSON.parse(poll.options);
    client.createMessage(channelID, '<@&' + conf.roleID + '>\nClick the pencil emoticon below to vote for week 2\'s map!\nHere are your options:\n```- ' + choices.main.join('\n- ') + '```')
    .catch((err) => { throw err })
    .then(msg => {
      msg.addReaction('\ud83d\udcdd');
      db.trackMessage(msg.id, poll.id);
    });
    return;
  }
  client.createMessage(channelID, 'Poll not found').catch((err) => { throw err });
}

client.on("messageReactionAdd", async (msg, emoji, userID) => {
  if (await db.isTracked(msg.id) && emoji.name === '\ud83d\udcdd' && await db.hasNotBeenSentTo(msg.id, userID)) {
    const privateChannel = await client.getDMChannel(userID)
    .catch(() => {
      return;
    })
    if(privateChannel) {
      db.addSentUser(msg.id, userID)
      const unqiueURL = await api.getUniqueURL();
      privateChannel.createMessage('Please use this link to vote for the map you want: ' + unqiueURL)
      .catch(() => { console.log('Failed to send to: ' + userID)});
      return;
    }
  }
  return;
})

setTimeout(() => {
  testApi();
}, 2000);
