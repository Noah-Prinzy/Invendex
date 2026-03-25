import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const desktopResourcesDir = path.join(workspaceRoot, 'desktop-resources');
const outputDir = path.join(workspaceRoot, 'desktop-dist');
const iconPath = path.join(
  workspaceRoot,
  'desktop',
  'assets',
  'invendex-desktop.ico'
);
const builderConfigPath = path.join(workspaceRoot, 'electron-builder.json');
const electronBuilderCliPath = path.join(
  workspaceRoot,
  'node_modules',
  'electron-builder',
  'cli.js'
);

const ensureDesktopInputsExist = () => {
  const requiredPaths = [
    path.join(desktopResourcesDir, 'frontend', 'index.html'),
    path.join(desktopResourcesDir, 'backend', 'src', 'server.js'),
    path.join(workspaceRoot, 'desktop', 'main.mjs'),
    path.join(workspaceRoot, 'desktop', 'preload.mjs'),
    iconPath,
    builderConfigPath,
    electronBuilderCliPath
  ];

  const missingPath = requiredPaths.find((candidate) => !existsSync(candidate));
  if (missingPath) {
    throw new Error(
      `Desktop packaging input is missing: ${missingPath}. Run \`npm run desktop:prepare\` and \`npm install\` first.`
    );
  }
};

const runElectronBuilder = () => {
  rmSync(outputDir, { recursive: true, force: true });

  execFileSync(
    process.execPath,
    [
      electronBuilderCliPath,
      '--config',
      builderConfigPath,
      '--win',
      'nsis',
      '--x64',
      '--publish',
      'never'
    ],
    {
      cwd: workspaceRoot,
      stdio: 'inherit'
    }
  );
};

const readRootVersion = () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')
  );

  return String(packageJson.version || '1.0.0').trim() || '1.0.0';
};

const listArtifacts = (directoryPath) => {
  const entries = readdirSync(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directoryPath, entry.name));
};

const verifyOutputs = () => {
  const version = readRootVersion();
  const installerPath = path.join(outputDir, `Invendex-Setup-${version}.exe`);
  const latestMetadataPath = path.join(outputDir, 'latest.yml');
  const unpackedExePath = path.join(
    outputDir,
    'win-unpacked',
    'Invendex.exe'
  );

  const requiredArtifacts = [installerPath, latestMetadataPath, unpackedExePath];
  const missingArtifact = requiredArtifacts.find(
    (candidate) => !existsSync(candidate)
  );

  if (missingArtifact) {
    const knownArtifacts = existsSync(outputDir) ? listArtifacts(outputDir) : [];
    throw new Error(
      `Desktop installer build finished, but ${missingArtifact} was not created as expected.\nKnown top-level artifacts:\n${knownArtifacts.join('\n') || '(none)'}`
    );
  }

  console.log(`Desktop installer created at ${installerPath}`);
  console.log(`Update metadata created at ${latestMetadataPath}`);
  console.log(`Unpacked desktop app created at ${unpackedExePath}`);
};

try {
  ensureDesktopInputsExist();
  runElectronBuilder();
  verifyOutputs();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
