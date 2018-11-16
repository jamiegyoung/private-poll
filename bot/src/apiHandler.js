const fetch = require('node-fetch');
const conf = require('../private/conf.json');
const api = exports;

api.getNewPoll = async () => {
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

api.checkWhetherToMessage = async () => {
  const toMessageRes = await fetch(`https://poll.jamieyoung.tech/messagePostCheck`)
  .then(res => res.json())
  .catch(() => console.log(error));
  if (toMessageRes.sendMessage === "true") {
    return true;
  }
  return false;
}