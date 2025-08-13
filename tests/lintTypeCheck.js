const { execSync } = require('child_process');

module.exports = async () => {
  execSync('yarn lint', { stdio: 'inherit' });
  execSync('yarn typecheck', { stdio: 'inherit' });
};
