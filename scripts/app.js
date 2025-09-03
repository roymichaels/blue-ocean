#!/usr/bin/env node
/*
  Unified project CLI: `node scripts/app.js <task> [subtask]`
  Also exposed as `yarn app <task> [subtask]` and wired into npm scripts.
*/
const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const root = path.resolve(__dirname, '..');

if (!process.env.EXPO_PUBLIC_CHAIN) {
  process.env.EXPO_PUBLIC_CHAIN = 'near';
}

function bin(name) {
  const file = isWin ? `${name}.cmd` : name;
  return path.join(root, 'node_modules', '.bin', file);
}

function run(command, args = [], opts = {}) {
  return new Promise((resolve) => {
    const spawnOpts = {
      stdio: 'inherit',
      cwd: root,
      shell: false, // default to no shell; handle Windows .cmd/.bat explicitly
      ...opts,
    };

    // On Windows, use cmd.exe to execute .cmd/.bat files to avoid EINVAL issues
    let cmd = command;
    let cmdArgs = args;
    if (isWin) {
      if (/\.(cmd|bat)$/i.test(command)) {
        cmd = 'cmd.exe';
        cmdArgs = ['/d', '/s', '/c', command, ...args];
      }
      // PowerShell scripts (.ps1) can be run via powershell.exe if ever needed
      if (/\.(ps1)$/i.test(command)) {
        cmd = 'powershell.exe';
        cmdArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', command, ...args];
      }
    }

    const child = spawn(cmd, cmdArgs, spawnOpts);
    child.on('close', (code) => resolve(code || 0));
  });
}

function runBin(name, args = []) {
  return run(bin(name), args);
}

function runNode(file, args = []) {
  return run(process.execPath, [file, ...args]);
}

function spawnBg(command, args = [], opts = {}) {
  const spawnOpts = {
    stdio: 'inherit',
    cwd: root,
    shell: false,
    ...opts,
  };
  let cmd = command;
  let cmdArgs = args;
  if (isWin) {
    if (/\.(cmd|bat)$/i.test(command)) {
      cmd = 'cmd.exe';
      cmdArgs = ['/d', '/s', '/c', command, ...args];
    }
    if (/\.(ps1)$/i.test(command)) {
      cmd = 'powershell.exe';
      cmdArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', command, ...args];
    }
  }
  return spawn(cmd, cmdArgs, spawnOpts);
}

async function main() {
  const [task = 'help', sub = ''] = process.argv.slice(2);

  switch (task) {
    case 'dev': {
      // Start indexer + relayer in background, then Expo as the foreground process
      const children = [];
      async function ensureInstalled(dir) {
        const nm = path.join(root, dir, 'node_modules');
        try {
          require('fs').accessSync(nm);
        } catch {
          await run(isWin ? 'yarn.cmd' : 'yarn', ['--cwd', dir], { env: { ...process.env } });
        }
      }
      const hasReal = (val) => !!val && !String(val).includes('<') && !String(val).includes('...');
      const shouldStartIndexer = hasReal(process.env.CONTRACT_ID || process.env.EXPO_PUBLIC_CONTRACT_ID);
      const shouldStartRelayer = hasReal(process.env.RELAYER_ACCOUNT_ID) && hasReal(process.env.RELAYER_PRIVATE_KEY) && hasReal(process.env.CONTRACT_ID);
      try {
        if (shouldStartIndexer) {
          await ensureInstalled('indexers/lake');
          // Lake indexer
          children.push(
            spawnBg(isWin ? 'yarn.cmd' : 'yarn', ['--cwd', 'indexers/lake', 'dev'], {
              env: { ...process.env },
            })
          );
        }
      } catch {}
      try {
        if (shouldStartRelayer) {
          await ensureInstalled('relayer');
          // Relayer service
          children.push(
            spawnBg(isWin ? 'yarn.cmd' : 'yarn', ['--cwd', 'relayer', 'dev'], {
              env: { ...process.env },
            })
          );
        }
      } catch {}

      const cleanup = () => {
        for (const c of children) {
          if (c && !c.killed) {
            try { c.kill('SIGTERM'); } catch {}
          }
        }
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('exit', cleanup);

      const code = await run(bin('expo'), ['start', ...process.argv.slice(3)], {
        env: { ...process.env, EXPO_WEB_BUNDLER: 'webpack', EXPO_ROUTER_APP_ROOT: 'app', EXPO_PROJECT_ROOT: root },
      });
      cleanup();
      return process.exit(code);
    }

    case 'dev:core':
      return process.exit(
        await run(bin('expo'), ['start', ...process.argv.slice(3)], {
          env: { ...process.env, EXPO_WEB_BUNDLER: 'webpack' },
        })
      );

    case 'web':
      return process.exit(
        await run(bin('expo'), ['start', '--web', ...process.argv.slice(3)], {
          env: { ...process.env, EXPO_WEB_BUNDLER: 'webpack', EXPO_ROUTER_APP_ROOT: 'app', EXPO_PROJECT_ROOT: root },
        })
      );

    case 'build':
      // Static web export to ./dist (Expo SDK 50 prefers Metro for export)
      return process.exit(
        await run(
          bin('expo'),
          ['export', '--platform', 'web', '--output-dir', 'dist', ...process.argv.slice(3)],
          { env: { ...process.env, EXPO_WEB_BUNDLER: 'metro', EXPO_ROUTER_APP_ROOT: 'app', EXPO_PROJECT_ROOT: root } }
        )
      );

    case 'preview':
      // Local static server
      return process.exit(
        await run(isWin ? 'npx.cmd' : 'npx', ['serve@14.2.0', 'dist', '-l', '4173'], { shell: false })
      );

    case 'clean':
      return process.exit(await runNode(path.join('scripts', 'web-clean.js')));

    case 'seed':
      return process.exit(await runNode(path.join('scripts', 'seed.js')));

    case 'lint':
      return process.exit(await runBin('eslint', ['.']));

    case 'typecheck':
      return process.exit(await runBin('tsc', ['--noEmit']));

    case 'test':
      return process.exit(await runBin('jest', process.argv.slice(3)));

    case 'depcheck':
      return process.exit(await runBin('depcheck'));

    case 'knip':
      return process.exit(await runBin('knip'));

    case 'ts-prune':
      return process.exit(await runBin('ts-prune'));

    case 'doctor': {
      const steps = [
        ['depcheck'],
        ['knip'],
        ['ts-prune'],
      ];
      for (const [cmd] of steps) {
        const code = await runBin(cmd);
        if (code !== 0) return process.exit(code);
      }
      return process.exit(0);
    }

    case 'docker': {
      if (sub === 'dev') {
        return process.exit(await run(isWin ? 'docker.exe' : 'docker', ['compose', 'up']));
      }
      if (sub === 'build') {
        return process.exit(
          await run(isWin ? 'docker.exe' : 'docker', [
            'compose',
            'run',
            '--rm',
            'app',
            'yarn',
            'build',
          ])
        );
      }
      if (sub === 'preview') {
        return process.exit(
          await run(isWin ? 'docker.exe' : 'docker', [
            'compose',
            'run',
            '--rm',
            '-p',
            '4173:4173',
            'app',
            isWin ? 'npx.cmd' : 'npx',
            'serve@14.2.0',
            'dist',
            '-l',
            '4173',
          ])
        );
      }
      return usage('docker');
    }

    case 'indexer': {
      if (sub === 'dev') {
        return process.exit(await run(isWin ? 'yarn.cmd' : 'yarn', ['--cwd', 'indexers/lake', 'dev']));
      }
      return usage('indexer');
    }

    case 'relayer': {
      if (sub === 'dev') {
        return process.exit(await run(isWin ? 'yarn.cmd' : 'yarn', ['--cwd', 'relayer', 'dev']));
      }
      return usage('relayer');
    }

    case 'contract': {
      if (sub === 'build') {
        return process.exit(
          await run(isWin ? 'cargo.exe' : 'cargo', [
            'build',
            '--manifest-path',
            'contracts/marketplace/Cargo.toml',
            '--release',
          ])
        );
      }
      if (sub === 'deploy') {
        // Requires bash (e.g., Git Bash on Windows)
        return process.exit(
          await run(isWin ? 'bash.exe' : 'bash', ['scripts/deploy-marketplace.sh'], { shell: false })
        );
      }
      return usage('contract');
    }

    case 'help':
    default:
      return usage();
  }
}

function usage(scope) {
  const lines = [
    '',
    'Usage:',
    '  yarn app <task> [subtask]',
    '',
    'Common tasks:',
    '  dev                  Start Expo dev server (native/web)',
    '  web                  Start Expo dev server for web',
    '  build                Export static web build to ./dist',
    '  preview              Serve ./dist at http://localhost:4173',
    '  clean                Clean generated web artifacts',
    '  seed                 Seed local data',
    '  lint                 Run ESLint',
    '  typecheck            Run TypeScript without emit',
    '  test                 Run Jest tests',
    '  doctor               Run depcheck, knip, ts-prune',
    '',
    'Advanced:',
    '  docker dev           Compose dev environment',
    '  docker build         Run web build inside Docker',
    '  docker preview       Serve dist from Docker',
    '  indexer dev          Start the lake indexer',
    '  relayer dev          Start the relayer service',
    '  contract build       Build contracts (Rust)',
    '  contract deploy      Deploy marketplace contract',
    '',
  ];

  if (scope) {
    lines.push(`Unknown or missing subtask for: ${scope}`);
  }
  console.log(lines.join('\n'));
  process.exit(scope ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
