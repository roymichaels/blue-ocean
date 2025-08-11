require('dotenv/config');
const { expo } = require('./app.json');
module.exports = {
  ...expo,
  experiments: { web: { fastRefresh: false } },
};
