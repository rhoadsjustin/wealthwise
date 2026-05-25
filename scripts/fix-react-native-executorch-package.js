/* eslint-env node */
const fs = require('fs');
const path = require('path');

const packageRoot = process.cwd();
const executorchRoot = path.join(packageRoot, 'node_modules', 'react-native-executorch');
const sourcePackageJson = path.join(executorchRoot, 'package.json');
const libDir = path.join(executorchRoot, 'lib');
const targetPackageJson = path.join(libDir, 'package.json');

function main() {
  if (!fs.existsSync(executorchRoot)) {
    return;
  }

  if (!fs.existsSync(sourcePackageJson)) {
    console.warn('[postinstall] react-native-executorch package.json not found, skipping fix.');
    return;
  }

  fs.mkdirSync(libDir, { recursive: true });
  fs.copyFileSync(sourcePackageJson, targetPackageJson);
  console.log(
    '[postinstall] Patched react-native-executorch lib/package.json for Metro resolution.'
  );
}

main();
