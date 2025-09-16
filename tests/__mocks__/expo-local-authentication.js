let hardwareSupported = true;
let enrolled = true;
let authenticateQueue = [];

const authenticateAsync = jest.fn(async () => {
  if (authenticateQueue.length > 0) {
    return authenticateQueue.shift();
  }
  return { success: false };
});

const hasHardwareAsync = jest.fn(async () => hardwareSupported);
const isEnrolledAsync = jest.fn(async () => enrolled);
const supportedAuthenticationTypesAsync = jest.fn(async () => []);

function __setHardware(value) {
  hardwareSupported = value;
}

function __setEnrolled(value) {
  enrolled = value;
}

function __queueAuthenticate(result) {
  authenticateQueue.push(result);
}

function __reset() {
  hardwareSupported = true;
  enrolled = true;
  authenticateQueue = [];
  authenticateAsync.mockClear();
  hasHardwareAsync.mockClear();
  isEnrolledAsync.mockClear();
  supportedAuthenticationTypesAsync.mockClear();
}

module.exports = {
  authenticateAsync,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
  __setHardware,
  __setEnrolled,
  __queueAuthenticate,
  __reset,
};
