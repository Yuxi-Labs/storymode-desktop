const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = process.cwd();
const assetsSrc = path.join(projectRoot, 'assets');
const dest = path.join(projectRoot, 'dist', 'renderer', 'assets');

copyRecursive(path.join(assetsSrc, 'ui'), path.join(dest, 'ui'));
copyRecursive(path.join(assetsSrc, 'images'), path.join(dest, 'images'));
console.log('Assets copied to', dest);
