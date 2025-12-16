

const pointsPerAction = {
  login: 1,
  giftSent: 0, // Points based on gift value, handled separately
  roomEntry: 10,
  microphone: 10,
  follow: 1,
  follower: 1,
  games: 10,
};
const actions = {
  login: 'login',
  roomEntry: 'roomEntry',
  microphone: 'microphone',
  games: 'games',
  giftSent: 'giftSent',
  follow: 'follow',
  follower: 'follower',
};

const dailyActions = ['login', 'roomEntry', 'microphone', 'games', 'follow', 'follower'];

module.exports = {
  pointsPerAction,
  dailyActions,
  actions,
};
