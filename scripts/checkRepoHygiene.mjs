import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const normalizePath = (value) => String(value || '').replace(/\\/g, '/');
const workspaceRoot = process.cwd();
const maxTrackedFileSizeBytes = 50 * 1024 * 1024;
const archiveFilePattern = /\.(zip|7z|rar|tar|gz|tgz|bz2|xz)$/i;

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
})
  .split('\0')
  .map((file) => normalizePath(file).trim())
  .filter(Boolean);

const generatedDirectoryPattern =
  /(^|\/)(node_modules|playwright-report|test-results|coverage|desktop-dist|desktop-resources|\.desktop-packager|\.next|\.nuxt|\.svelte-kit|build|build_tmp|dist|out|tmp|temp|backups|logs|\.playwright|\.cypress)(\/|$)/;

const isTrackedEnvFile = (file) => {
  const baseName = path.posix.basename(file);

  if (baseName === '.env') {
    return true;
  }

  if (!baseName.startsWith('.env.')) {
    return false;
  }

  return !baseName.endsWith('.example');
};

const violations = trackedFiles.flatMap((file) => {
  const matches = [];
  const baseName = path.posix.basename(file);
  const absolutePath = path.join(workspaceRoot, file);

  if (isTrackedEnvFile(file)) {
    matches.push({
      file,
      reason:
        'Environment file is tracked. Keep local secrets untracked and use .env*.example files as templates.'
    });
  }

  if (generatedDirectoryPattern.test(file)) {
    matches.push({
      file,
      reason:
        'Generated or runtime artifact is tracked. Build outputs, caches, reports, and temp directories should stay out of git.'
    });
  }

  if (baseName.endsWith('.log')) {
    matches.push({
      file,
      reason:
        'Log file is tracked. Runtime logs should remain local-only artifacts.'
    });
  }

  if (baseName.endsWith('.sqlite') || baseName.endsWith('.db')) {
    matches.push({
      file,
      reason:
        'Database artifact is tracked. Local database files should not be committed.'
    });
  }

  if (archiveFilePattern.test(file)) {
    matches.push({
      file,
      reason:
        'Archive artifact is tracked. Release bundles and exported archives should not be committed.'
    });
  }

  try {
    const stats = statSync(absolutePath);
    if (stats.size > maxTrackedFileSizeBytes) {
      matches.push({
        file,
        reason: `Tracked file exceeds ${Math.floor(
          maxTrackedFileSizeBytes / (1024 * 1024)
        )} MB. Large binaries should be excluded from git or moved to Git LFS/object storage.`
      });
    }
  } catch {
    // Ignore missing paths so the check can still run in partial worktrees.
  }

  return matches;
});

if (!violations.length) {
  process.stdout.write('Repo hygiene check passed.\n');
  process.exit(0);
}

process.stderr.write('Repo hygiene check failed.\n');
for (const violation of violations) {
  process.stderr.write(`- ${violation.file}\n`);
  process.stderr.write(`  ${violation.reason}\n`);
}
process.stderr.write(
  '\nRemove tracked local artifacts with `git rm --cached <path>` and keep a corresponding *.example file when needed.\n'
);
process.exit(1);
