import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const outputDir = path.join(workspaceRoot, 'desktop', 'assets');
const outputPath = path.join(outputDir, 'invendex-desktop.ico');
const candidatePngs = [
  path.join(workspaceRoot, 'frontend', 'public', 'logo192.png'),
  path.join(workspaceRoot, 'frontend', 'public', 'favicon-48.png'),
  path.join(workspaceRoot, 'frontend', 'public', 'favicon-32.png'),
  path.join(workspaceRoot, 'frontend', 'public', 'favicon-16.png')
].filter((candidate) => existsSync(candidate));

const main = async () => {
  if (!candidatePngs.length) {
    throw new Error(
      'Could not find any logo PNG assets to generate the desktop icon.'
    );
  }

  mkdirSync(outputDir, { recursive: true });
  const iconBuffer = await pngToIco(candidatePngs);
  writeFileSync(outputPath, iconBuffer);
  console.log(`Generated desktop icon at ${outputPath}`);
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
