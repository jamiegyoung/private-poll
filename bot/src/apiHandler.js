const fetch = require('node-fetch');
const conf = require('./conf.json');
const api = exports;

api.checkForNewPoll = async () => {
  const currentPollRes = await fetch(`https://poll.jamieyoung.tech/CurrentPoll?user=${conf.api.username}&pass=${conf.api.password}`)
  .then(res => res.json())
  .catch(() => false);
    if(currentPollRes) {
      if(currentPollRes.error) {
        console.log(`Error: ${currentPollRes.error}`);
        return false;
      }
      return currentPollRes;
    }
    console.log('failed to connect to current poll');
}

api.getUniqueURL = async () => {
  const currentPollRes = await fetch(`https://poll.jamieyoung.tech/CreateVotingSession?user=${conf.api.username}&pass=${conf.api.password}`)
  .then(res => res.json());
  return currentPollRes.url;
}