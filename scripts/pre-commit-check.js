#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const SEP = '='.repeat(50);

function header(title) {
  console.log('');
  console.log(SEP);
  console.log(`  ${title}`);
  console.log(SEP);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ── 1. ESLint via lint-staged ─────────────────────────────────────────────
header('🔍  LANGKAH 1 — Menjalankan ESLint (lint-staged)');
try {
  run('npx lint-staged');
  console.log('  ✅  ESLint selesai — tidak ada error!');
} catch {
  console.log('  ❌  ESLint menemukan error. Perbaiki sebelum commit.');
  process.exit(1);
}

// ── 2. npm audit (warning only) ───────────────────────────────────────────
header('🛡️   LANGKAH 2 — Menjalankan npm audit');
try {
  run('npm audit --audit-level=critical');
  console.log('  ✅  npm audit selesai — tidak ada kerentanan kritis.');
} catch {
  console.log('  ⚠️   npm audit menemukan isu. Review disarankan, tidak memblokir commit.');
  console.log('  ⚠️   Jalankan: npm audit fix  untuk memperbaiki.');
}

// ── Selesai ───────────────────────────────────────────────────────────────
console.log('');
console.log(SEP);
console.log('  ✅  Semua pengecekan selesai! Lanjut ke pesan commit...');
console.log(SEP);
console.log('');
