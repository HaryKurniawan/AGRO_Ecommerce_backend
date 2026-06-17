#!/usr/bin/env node
'use strict';

if (process.env.SKIP_PRE_COMMIT === '1') {
  console.log('  ⏭️   Pre-commit dilewati (sudah dijalankan via npm run commit)');
  process.exit(0);
}

const { execSync } = require('child_process');
try {
  execSync('node scripts/pre-commit-check.js', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
