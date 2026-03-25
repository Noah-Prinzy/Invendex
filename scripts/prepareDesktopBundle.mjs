import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const desktopResourcesDir = path.join(workspaceRoot, 'desktop-resources');
const frontendBuildDir = path.join(workspaceRoot, 'frontend', 'build');
const backendSourceDir = path.join(workspaceRoot, 'backend');
const desktopFrontendDir = path.join(desktopResourcesDir, 'frontend');
const desktopBackendDir = path.join(desktopResourcesDir, 'backend');

const copyTree = (source, target) => {
  cpSync(source, target, {
    recursive: true
  });
};

const pruneBackendDependencies = () => {
  const npmExecPath = String(process.env.npm_execpath || '').trim();

  if (npmExecPath) {
    execFileSync(
      process.execPath,
      [npmExecPath, 'prune', '--omit=dev', '--no-audit', '--no-fund'],
      {
        cwd: desktopBackendDir,
        stdio: 'inherit'
      }
    );
    return;
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  execFileSync(
    npmCommand,
    ['prune', '--omit=dev', '--no-audit', '--no-fund'],
    {
      cwd: desktopBackendDir,
      stdio: 'inherit'
    }
  );
};

const main = () => {
  if (!existsSync(frontendBuildDir)) {
    throw new Error(
      'Missing frontend/build. Run `npm --prefix frontend run build` before preparing the desktop bundle.'
    );
  }

  if (!existsSync(path.join(backendSourceDir, 'node_modules'))) {
    throw new Error(
      'Missing backend/node_modules. Run `npm --prefix backend install` before preparing the desktop bundle.'
    );
  }

  rmSync(desktopResourcesDir, { recursive: true, force: true });
  mkdirSync(desktopFrontendDir, { recursive: true });
  mkdirSync(desktopBackendDir, { recursive: true });

  copyTree(frontendBuildDir, desktopFrontendDir);
  copyTree(path.join(backendSourceDir, 'src'), path.join(desktopBackendDir, 'src'));
  copyTree(
    path.join(backendSourceDir, 'node_modules'),
    path.join(desktopBackendDir, 'node_modules')
  );
  copyTree(
    path.join(backendSourceDir, 'package.json'),
    path.join(desktopBackendDir, 'package.json')
  );
  copyTree(
    path.join(backendSourceDir, 'package-lock.json'),
    path.join(desktopBackendDir, 'package-lock.json')
  );

  pruneBackendDependencies();

  console.log(`Prepared desktop frontend bundle at ${desktopFrontendDir}`);
  console.log(`Prepared desktop backend bundle at ${desktopBackendDir}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
