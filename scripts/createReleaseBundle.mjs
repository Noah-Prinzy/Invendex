import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const RELEASE_ROOT = path.join(ROOT_DIR, 'release');
const OUTPUT_DIR = path.join(RELEASE_ROOT, `inventra-${Date.now()}`);

const EXCLUDED = new Set([
  '.git',
  '.github',
  '.vscode',
  '.idea',
  'node_modules',
  'release',
  'coverage',
  'build',
  'dist',
  'build_tmp'
]);

const shouldSkip = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.some((part) => EXCLUDED.has(part));
};

const copyRecursive = (sourceDir, targetDir, relativeRoot = '') => {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeRoot, entry.name);

    if (shouldSkip(relativePath)) {
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyRecursive(sourcePath, targetPath, relativePath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
};

const main = () => {
  fs.mkdirSync(RELEASE_ROOT, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  copyRecursive(ROOT_DIR, OUTPUT_DIR);

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: ROOT_DIR,
    output: OUTPUT_DIR,
    excluded: Array.from(EXCLUDED)
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'RELEASE_MANIFEST.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  console.log(`Release bundle prepared at: ${OUTPUT_DIR}`);
};

main();
