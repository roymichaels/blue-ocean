const serviceLatency = { startTimer: () => () => {} };
const serviceFailures = { inc: jest.fn() };
const logger = { info: jest.fn(), error: jest.fn() };
const startMetricsServer = jest.fn();
const notificationsBacklog = { set: jest.fn() };
const notificationDeliveryLatency = {
  observe: jest.fn(),
};
const deliveryBacklog = { set: jest.fn() };
const wakuReplayDrops = { inc: jest.fn() };
module.exports = {
  serviceLatency,
  serviceFailures,
  logger,
  startMetricsServer,
  notificationsBacklog,
  notificationDeliveryLatency,
  deliveryBacklog,
  wakuReplayDrops,
};
