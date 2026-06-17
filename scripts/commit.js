#!/usr/bin/env node
'use strict';

// Jalankan pre-commit check dulu, lalu cz dengan SKIP_PRE_COMMIT=1
const { execSync, spawnSync } = require('child_process');

// Step 1: pre-commit check
try {
  execSync('node scripts/pre-commit-check.js', { stdio: 'inherit' });
} catch {
  process.exit(1);
}

// Step 2: cz dengan env SKIP_PRE_COMMIT=1 agar hook tidak jalan dobel
const result = spawnSync('npx', ['cz'], {
  stdio: 'inherit',
  env: { ...process.env, SKIP_PRE_COMMIT: '1' },
  shell: true,
});

process.exit(result.status ?? 0);
