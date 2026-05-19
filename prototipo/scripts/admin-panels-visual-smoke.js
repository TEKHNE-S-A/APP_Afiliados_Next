#!/usr/bin/env node
/*
  Smoke visual basico para paneles admin.
  - mode=baseline: captura baseline en /build/admin-visual-smoke/baseline
  - mode=compare: captura current y compara hash con baseline
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

const DEFAULT_ROUTES = [
  '/admin',
  '/admin/usuarios',
  '/admin/credenciales',
  '/admin/noticias',
  '/admin/planes-ui',
  '/admin/historial-atencion',
  '/admin/info-util-ui',
  '/admin/cartilla',
  '/admin/notificaciones',
  '/admin/analytics',
  '/admin/soporte',
  '/admin/diagnostico'
];

function parseArgs(argv) {
  const out = {
    mode: 'compare',
    baseUrl: 'http://localhost:3000',
    outputDir: path.resolve(process.cwd(), 'build', 'admin-visual-smoke'),
    routes: DEFAULT_ROUTES,
    viewport: { width: 1440, height: 900 },
    failOnDiff: false,
    help: false
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--fail-on-diff') {
      out.failOnDiff = true;
      continue;
    }

    const next = argv[i + 1];
    if (arg === '--mode' && next) {
      out.mode = next;
      i += 1;
      continue;
    }
    if (arg === '--base-url' && next) {
      out.baseUrl = next.replace(/\/$/, '');
      i += 1;
      continue;
    }
    if (arg === '--output-dir' && next) {
      out.outputDir = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (arg === '--routes' && next) {
      out.routes = next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((r) => (r.startsWith('/') ? r : `/${r}`));
      i += 1;
      continue;
    }
    if (arg === '--viewport' && next) {
      const [w, h] = next.split('x').map((n) => Number(n));
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        out.viewport = { width: w, height: h };
      }
      i += 1;
    }
  }

  return out;
}

function printHelp() {
  console.log(`
admin-panels-visual-smoke

Uso:
  node scripts/admin-panels-visual-smoke.js --mode baseline
  node scripts/admin-panels-visual-smoke.js --mode compare

Opciones:
  --mode baseline|compare     Modo de ejecucion (default: compare)
  --base-url URL              URL base backend (default: http://localhost:3000)
  --routes a,b,c              Lista de rutas separadas por coma
  --output-dir DIR            Directorio de salida (default: build/admin-visual-smoke)
  --viewport WxH              Viewport (default: 1440x900)
  --fail-on-diff              En compare, sale con code 2 si hay diferencias
  --help                      Mostrar ayuda
`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugFromRoute(route) {
  if (route === '/') return 'root';
  return route.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'root';
}

function fileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!['baseline', 'compare'].includes(args.mode)) {
    console.error(`Modo invalido: ${args.mode}. Use baseline o compare.`);
    process.exit(1);
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (error) {
    try {
      const backendRequire = createRequire(path.resolve(process.cwd(), 'backend', 'package.json'));
      playwright = backendRequire('playwright');
    } catch (backendError) {
      console.error('No se encontro playwright. Instale con:');
      console.error('  cd backend && npm install --save-dev playwright');
      process.exit(1);
    }
  }

  const baselineDir = path.join(args.outputDir, 'baseline');
  const currentDir = path.join(args.outputDir, 'current');
  const reportsDir = path.join(args.outputDir, 'reports');
  ensureDir(baselineDir);
  ensureDir(currentDir);
  ensureDir(reportsDir);

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: args.viewport });
  const page = await context.newPage();

  const report = {
    executedAt: new Date().toISOString(),
    mode: args.mode,
    baseUrl: args.baseUrl,
    viewport: args.viewport,
    summary: {
      total: args.routes.length,
      ok: 0,
      changed: 0,
      missingBaseline: 0,
      error: 0
    },
    items: []
  };

  for (const route of args.routes) {
    const url = `${args.baseUrl}${route}`;
    const name = slugFromRoute(route);
    const baselinePath = path.join(baselineDir, `${name}.png`);
    const currentPath = path.join(currentDir, `${name}.png`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: currentPath, fullPage: true });

      if (args.mode === 'baseline') {
        fs.copyFileSync(currentPath, baselinePath);
        report.summary.ok += 1;
        report.items.push({ route, url, status: 'baseline_created' });
        console.log(`[baseline] ${route} -> OK`);
        continue;
      }

      if (!fs.existsSync(baselinePath)) {
        report.summary.missingBaseline += 1;
        report.items.push({ route, url, status: 'missing_baseline' });
        console.log(`[compare] ${route} -> missing_baseline`);
        continue;
      }

      const baselineHash = fileHash(baselinePath);
      const currentHash = fileHash(currentPath);
      if (baselineHash === currentHash) {
        report.summary.ok += 1;
        report.items.push({ route, url, status: 'ok' });
        console.log(`[compare] ${route} -> ok`);
      } else {
        report.summary.changed += 1;
        report.items.push({ route, url, status: 'changed' });
        console.log(`[compare] ${route} -> changed`);
      }
    } catch (error) {
      report.summary.error += 1;
      report.items.push({ route, url, status: 'error', error: String(error.message || error) });
      console.log(`[${args.mode}] ${route} -> error`);
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `report-${args.mode}-${stamp}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\nResumen:');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Reporte: ${reportPath}`);

  if (args.mode === 'compare' && args.failOnDiff && (report.summary.changed > 0 || report.summary.error > 0 || report.summary.missingBaseline > 0)) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
