const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@expo', 'metro-config', 'build', 'file-store.js');
const serializer = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'serializer',
  'withExpoSerializers.js'
);
const envSerializer = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'serializer',
  'environmentVariableSerializerPlugin.js'
);
const baseBundle = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'serializer',
  'fork',
  'baseJSBundle.js'
);
const serializeChunks = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'serializer',
  'serializeChunks.js'
);
const getCssDeps = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'serializer',
  'getCssDeps.js'
);
const getAssets = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'transform-worker',
  'getAssets.js'
);
const cliTerminalReporter = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'metro',
  'TerminalReporter.js'
);
const runServerFork = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'metro',
  'runServer-fork.js'
);
const expoConfigFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'metro-config',
  'build',
  'ExpoMetroConfig.js'
);

try {
  if (fs.existsSync(target)) {
    let content = fs.readFileSync(target, 'utf8');
    if (content.includes('metro-cache/src/stores/FileStore')) {
      content = content
        .replace(
          'const FileStore_1 = __importDefault(require("metro-cache/src/stores/FileStore"));',
          'const { FileStore: MetroFileStore } = require("metro-cache");'
        )
        .replace(
          'class FileStore extends FileStore_1.default',
          'class FileStore extends MetroFileStore'
        );
      fs.writeFileSync(target, content);
    }
  }

  if (fs.existsSync(serializer)) {
    let content = fs.readFileSync(serializer, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/DeltaBundler/Serializers/sourceMapString")',
        'require("@expo/metro/metro/DeltaBundler/Serializers/sourceMapString")'
      )
      .replace(
        'require("metro/src/lib/bundleToString")',
        'require("@expo/metro/metro/lib/bundleToString")'
      );
    if (replaced !== content) {
      fs.writeFileSync(serializer, replaced);
    }
  }

  if (fs.existsSync(envSerializer)) {
    let content = fs.readFileSync(envSerializer, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/lib/CountingSet")',
        'require("@expo/metro/metro/lib/CountingSet")'
      )
      .replace(
        'require("metro/src/lib/countLines")',
        'require("@expo/metro/metro/lib/countLines")'
      );
    if (replaced !== content) {
      fs.writeFileSync(envSerializer, replaced);
    }
  }

  if (fs.existsSync(baseBundle)) {
    let content = fs.readFileSync(baseBundle, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/lib/CountingSet")',
        'require("@expo/metro/metro/lib/CountingSet")'
      )
      .replace(
        'require("metro/src/lib/countLines")',
        'require("@expo/metro/metro/lib/countLines")'
      )
      .replace(
        'require("metro/src/lib/getAppendScripts")',
        'require("@expo/metro/metro/lib/getAppendScripts")'
      );
    if (replaced !== content) {
      fs.writeFileSync(baseBundle, replaced);
    }
  }

  if (fs.existsSync(serializeChunks)) {
    let content = fs.readFileSync(serializeChunks, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/DeltaBundler/Serializers/sourceMapString")',
        'require("@expo/metro/metro/DeltaBundler/Serializers/sourceMapString")'
      )
      .replace(
        'require("metro/src/lib/bundleToString")',
        'require("@expo/metro/metro/lib/bundleToString")'
      );
    if (replaced !== content) {
      fs.writeFileSync(serializeChunks, replaced);
    }
  }

  if (fs.existsSync(getCssDeps)) {
    let content = fs.readFileSync(getCssDeps, 'utf8');
    const replaced = content.replace(
      'require("metro/src/DeltaBundler/Serializers/helpers/js")',
      'require("@expo/metro/metro/DeltaBundler/Serializers/helpers/js")'
    );
    if (replaced !== content) {
      fs.writeFileSync(getCssDeps, replaced);
    }
  }

  if (fs.existsSync(getAssets)) {
    let content = fs.readFileSync(getAssets, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/Assets")',
        'require("@expo/metro/metro/Assets")'
      )
      .replace(
        'require("metro/src/DeltaBundler/Serializers/helpers/js")',
        'require("@expo/metro/metro/DeltaBundler/Serializers/helpers/js")'
      );
    if (replaced !== content) {
      fs.writeFileSync(getAssets, replaced);
    }
  }

  if (fs.existsSync(cliTerminalReporter)) {
    let content = fs.readFileSync(cliTerminalReporter, 'utf8');
    const replaced = content.replace(
      'require("metro/src/lib/TerminalReporter")',
      'require("@expo/metro/metro/lib/TerminalReporter")'
    );
    if (replaced !== content) {
      fs.writeFileSync(cliTerminalReporter, replaced);
    }
  }

  if (fs.existsSync(runServerFork)) {
    let content = fs.readFileSync(runServerFork, 'utf8');
    const replaced = content
      .replace(
        'require("metro/src/HmrServer")',
        'require("@expo/metro/metro/HmrServer")'
      )
      .replace(
        'require("metro/src/lib/createWebsocketServer")',
        'require("@expo/metro/metro/lib/createWebsocketServer")'
      );
    if (replaced !== content) {
      fs.writeFileSync(runServerFork, replaced);
    }
  }

  if (fs.existsSync(expoConfigFile)) {
    let content = fs.readFileSync(expoConfigFile, 'utf8');
    const replaced = content.replace(
      "require('metro/src/DeltaBundler/Graph')",
      "require('@expo/metro/metro/DeltaBundler/Graph')"
    );
    if (replaced !== content) {
      fs.writeFileSync(expoConfigFile, replaced);
    }
  }
} catch (err) {
  console.warn('patch-metro-config: failed to patch', err);
}
