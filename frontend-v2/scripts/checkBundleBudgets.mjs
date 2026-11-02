import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

const rootDir = fileURLToPath(new URL("..", import.meta.url))
const distDir = path.join(rootDir, "dist")
const assetsDir = path.join(distDir, "assets")

const BUDGETS = {
  initialJsTotalGzip: 190 * 1024,
  initialCssTotalGzip: 15 * 1024,
  largestChunkGzip: 160 * 1024,
}

const formatKiB = (v) => `${(v / 1024).toFixed(2)} KiB`

const gz = (buf) => gzipSync(buf, { level: 9 }).length

const fail = (msg) => {
  console.error(`BUDGET FAIL: ${msg}`)
  process.exitCode = 1
}

const main = async () => {
  const html = await readFile(path.join(distDir, "index.html"), "utf8")
  const assetNames = [
    ...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g),
  ].map((m) => m[1])
  const initial = assetNames.filter(
    (n) => n.endsWith(".js") || n.endsWith(".css"),
  )

  const sizes = []
  for (const name of initial) {
    const buf = await readFile(path.join(assetsDir, name))
    sizes.push({ name, gzip: gz(buf) })
  }

  const initialJs = sizes
    .filter((s) => s.name.endsWith(".js"))
    .reduce((a, s) => a + s.gzip, 0)
  const initialCss = sizes
    .filter((s) => s.name.endsWith(".css"))
    .reduce((a, s) => a + s.gzip, 0)

  let largest = 0
  for (const file of await readdir(assetsDir)) {
    if (!file.endsWith(".js")) continue
    const buf = await readFile(path.join(assetsDir, file))
    largest = Math.max(largest, gz(buf))
  }

  console.log(
    `initial JS (gzip):  ${formatKiB(initialJs)} (budget ${formatKiB(BUDGETS.initialJsTotalGzip)})`,
  )
  console.log(
    `initial CSS (gzip): ${formatKiB(initialCss)} (budget ${formatKiB(BUDGETS.initialCssTotalGzip)})`,
  )
  console.log(
    `largest JS chunk (gzip): ${formatKiB(largest)} (budget ${formatKiB(BUDGETS.largestChunkGzip)})`,
  )

  if (initialJs > BUDGETS.initialJsTotalGzip)
    fail(
      `initial JS gzip ${formatKiB(initialJs)} exceeds ${formatKiB(BUDGETS.initialJsTotalGzip)}`,
    )
  if (initialCss > BUDGETS.initialCssTotalGzip)
    fail(
      `initial CSS gzip ${formatKiB(initialCss)} exceeds ${formatKiB(BUDGETS.initialCssTotalGzip)}`,
    )
  if (largest > BUDGETS.largestChunkGzip)
    fail(
      `largest chunk gzip ${formatKiB(largest)} exceeds ${formatKiB(BUDGETS.largestChunkGzip)}`,
    )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
