#!/usr/bin/env node
/**
 * QA automatizable para paneles admin piloto.
 *
 * Uso:
 *   node scripts/admin-panels-qa.js
 *   node scripts/admin-panels-qa.js --all
 *   node scripts/admin-panels-qa.js --all-strict
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PILOTS = [
  'backend/public/admin-usuarios.html',
  'backend/public/admin-parametros.html',
  'backend/public/admin-credenciales.html'
];

const ADMIN_PUBLIC_DIR = path.join(ROOT, 'backend', 'public');

function getAllAdminPanels() {
  const entries = fs.readdirSync(ADMIN_PUBLIC_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^admin-.*\.html$/i.test(name))
    .filter((name) => !/^test-/i.test(name))
    .map((name) => path.join('backend/public', name).replace(/\\/g, '/'))
    .sort();
}

const ALL_PANELS = getAllAdminPanels();

const HIGIENE_CHECK_IDS = new Set([
  'no-native-dialogs',
  'no-adhoc-visual-classes'
]);

const checks = [
  {
    id: 'skip-link',
    description: 'Tiene skip-link al contenido principal',
    test: (txt) => txt.includes('class="skip-link"') && txt.includes('href="#main-content"')
  },
  {
    id: 'main-content',
    description: 'Tiene main#main-content',
    test: (txt) => /<main[^>]*id="main-content"/i.test(txt)
  },
  {
    id: 'nav-main',
    description: 'Tiene nav principal con aria-label',
    test: (txt) => /<nav[^>]*aria-label="Navegación principal"/i.test(txt)
  },
  {
    id: 'breadcrumb',
    description: 'Tiene contenedor de breadcrumb',
    test: (txt) => txt.includes('id="adminBreadcrumb"')
  },
  {
    id: 'footer-contentinfo',
    description: 'Tiene footer con role contentinfo',
    test: (txt) => /<footer[^>]*role="contentinfo"/i.test(txt)
  },
  {
    id: 'table-scope',
    description: 'Los th usan scope="col"',
    test: (txt) => {
      const th = txt.match(/<th\b[^>]*>/gi) || [];
      if (!th.length) return true;
      return th.every((tag) => /scope="col"/i.test(tag));
    }
  },
  {
    id: 'no-native-dialogs',
    description: 'No usa confirm()/prompt() nativos',
    test: (txt) => !/\bconfirm\(/.test(txt) && !/\bprompt\(/.test(txt)
  },
  {
    id: 'shared-scripts',
    description: 'Usa admin-shared.js y admin-nav.js',
    test: (txt) => txt.includes('src="/admin-shared.js"') && txt.includes('src="/admin-nav.js"')
  },
  {
    id: 'no-adhoc-visual-classes',
    description: 'No usa clases visuales ad-hoc legacy (btn-edit/btn-delete/badge-grupo/actions)',
    test: (txt) => {
      const forbidden = new Set(['btn-edit', 'btn-delete', 'badge-grupo', 'actions']);
      const classMatches = txt.match(/class\s*=\s*"([^"]+)"/gi) || [];

      for (const fullAttr of classMatches) {
        const classValueMatch = fullAttr.match(/"([^"]+)"/);
        if (!classValueMatch) continue;

        const tokens = classValueMatch[1]
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean);

        for (const token of tokens) {
          if (forbidden.has(token)) {
            return false;
          }
        }
      }

      return true;
    }
  }
];

function run() {
  const args = new Set(process.argv.slice(2));
  const useAllPanels = args.has('--all') || args.has('--all-strict');
  const allStrict = args.has('--all-strict');

  const targets = useAllPanels ? ALL_PANELS : PILOTS;
  const activeChecks = useAllPanels && !allStrict
    ? checks.filter((c) => HIGIENE_CHECK_IDS.has(c.id))
    : checks;

  let totalFailures = 0;

  const modeLabel = useAllPanels
    ? (allStrict ? 'all-panels strict' : 'all-panels higiene')
    : 'pilotos';

  console.log(`QA Paneles Admin (${modeLabel})`);
  console.log('='.repeat(50));

  for (const rel of targets) {
    const full = path.join(ROOT, rel);
    const txt = fs.readFileSync(full, 'utf8');

    console.log(`\n${rel}`);
    let fileFailures = 0;

    for (const c of activeChecks) {
      const ok = c.test(txt);
      if (!ok) fileFailures += 1;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${c.id} - ${c.description}`);
    }

    if (fileFailures === 0) {
      console.log('  Resultado: OK');
    } else {
      console.log(`  Resultado: ${fileFailures} falla(s)`);
    }

    totalFailures += fileFailures;
  }

  console.log('\n' + '='.repeat(50));
  if (totalFailures === 0) {
    console.log('QA global: OK (sin fallas)');
    process.exit(0);
  }

  console.log(`QA global: FAIL (${totalFailures} falla(s) totales)`);
  process.exit(1);
}

run();
