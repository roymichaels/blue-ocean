const serviceLatency = { startTimer: () => () => {} };
const serviceFailures = { inc: jest.fn() };
const logger = { info: jest.fn(), error: jest.fn() };
const startMetricsServer = jest.fn();
const notificationsBacklog = { set: jest.fn() };
const notificationDeliveryLatency = {
  labels: () => ({ observe: jest.fn() }),
};
module.exports = {
  serviceLatency,
  serviceFailures,
  logger,
  startMetricsServer,
  notificationsBacklog,
  notificationDeliveryLatency,
};
