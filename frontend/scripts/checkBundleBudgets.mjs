import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const buildDir = path.join(rootDir, 'build');
const assetsDir = path.join(buildDir, 'assets');
const indexHtmlPath = path.join(buildDir, 'index.html');

const BUDGETS = {
  initialJsTotal: 330 * 1024,
  initialCssTotal: 50 * 1024,
  largestLazyJs: 55 * 1024,
  largestLazyCss: 48 * 1024
};

const formatKiB = (value) => `${(value / 1024).toFixed(2)} KiB`;

const readBuildIndexAssetNames = async () => {
  const html = await readFile(indexHtmlPath, 'utf8');
  const assetPattern = /(?:src|href)="\/assets\/([^"]+)"/g;
  const assetNames = [];

  for (const match of html.matchAll(assetPattern)) {
    assetNames.push(match[1]);
  }

  return assetNames;
};

const readAssetSizes = async () => {
  const entries = await readdir(assetsDir, { withFileTypes: true });
  const assetEntries = entries.filter(
    (entry) => entry.isFile() && !entry.name.endsWith('.map')
  );

  const assets = await Promise.all(
    assetEntries.map(async (entry) => {
      const assetPath = path.join(assetsDir, entry.name);
      const { size } = await stat(assetPath);

      return {
        name: entry.name,
        size
      };
    })
  );

  return new Map(assets.map((asset) => [asset.name, asset]));
};

const sumAssetSizes = (assets) =>
  assets.reduce((total, asset) => total + (asset?.size || 0), 0);

const describeAssetList = (assets) =>
  assets.map((asset) => `${asset.name} (${formatKiB(asset.size)})`).join(', ');

const main = async () => {
  const referencedAssetNames = await readBuildIndexAssetNames();
  const assetMap = await readAssetSizes();

  const initialAssets = referencedAssetNames
    .map((name) => assetMap.get(name))
    .filter(Boolean);

  if (!initialAssets.length) {
    throw new Error('No initial assets found in build/index.html');
  }

  const initialJsAssets = initialAssets.filter((asset) =>
    asset.name.endsWith('.js')
  );
  const initialCssAssets = initialAssets.filter((asset) =>
    asset.name.endsWith('.css')
  );

  const initialAssetNames = new Set(initialAssets.map((asset) => asset.name));
  const allAssets = Array.from(assetMap.values());
  const lazyJsAssets = allAssets.filter(
    (asset) => asset.name.endsWith('.js') && !initialAssetNames.has(asset.name)
  );
  const lazyCssAssets = allAssets.filter(
    (asset) => asset.name.endsWith('.css') && !initialAssetNames.has(asset.name)
  );

  const largestLazyJsAsset = lazyJsAssets.reduce(
    (largest, asset) => (asset.size > largest.size ? asset : largest),
    { name: '(none)', size: 0 }
  );
  const largestLazyCssAsset = lazyCssAssets.reduce(
    (largest, asset) => (asset.size > largest.size ? asset : largest),
    { name: '(none)', size: 0 }
  );

  const checks = [
    {
      label: 'Initial JS total',
      actual: sumAssetSizes(initialJsAssets),
      limit: BUDGETS.initialJsTotal,
      detail: describeAssetList(initialJsAssets)
    },
    {
      label: 'Initial CSS total',
      actual: sumAssetSizes(initialCssAssets),
      limit: BUDGETS.initialCssTotal,
      detail: describeAssetList(initialCssAssets)
    },
    {
      label: 'Largest lazy JS chunk',
      actual: largestLazyJsAsset.size,
      limit: BUDGETS.largestLazyJs,
      detail: `${largestLazyJsAsset.name} (${formatKiB(largestLazyJsAsset.size)})`
    },
    {
      label: 'Largest lazy CSS chunk',
      actual: largestLazyCssAsset.size,
      limit: BUDGETS.largestLazyCss,
      detail: `${largestLazyCssAsset.name} (${formatKiB(largestLazyCssAsset.size)})`
    }
  ];

  let hasFailure = false;

  console.log('Bundle budget report');
  for (const check of checks) {
    const status = check.actual <= check.limit ? 'PASS' : 'FAIL';
    if (status === 'FAIL') {
      hasFailure = true;
    }

    console.log(
      `${status} ${check.label}: ${formatKiB(check.actual)} / ${formatKiB(check.limit)}`
    );
    console.log(`     ${check.detail}`);
  }

  if (hasFailure) {
    throw new Error('Frontend bundle budget exceeded');
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
