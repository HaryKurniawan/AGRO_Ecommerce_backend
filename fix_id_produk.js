const fs = require('fs');
const path = require('path');

// Read as utf16le because PowerShell `>` produces UTF-16LE
const tscOutput = fs.readFileSync('tsc_output.txt', 'utf16le');
const lines = tscOutput.split('\n');

const updates = {};

for (let line of lines) {
  line = line.trim();
  if (!line) continue;
  const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+)\((\d+),\d+\):\s*error\s*(TS2353|TS2339|TS2551)/);
  if (match) {
    const filePath = match[1];
    const lineNum = parseInt(match[2], 10);
    const errorType = match[3];

    if (line.includes("'id'") || line.includes("'produkEcoms'") || line.includes("'toko'") || line.includes('does not exist on type') || line.includes('does not exist in type')) {
      if (!updates[filePath]) {
        updates[filePath] = [];
      }
      updates[filePath].push({ lineNum, errorType, fullLine: line });
    }
  }
}

let totalChanged = 0;

for (const [filePath, errors] of Object.entries(updates)) {
  const absolutePath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log("Not found:", absolutePath);
    continue;
  }

  let content = fs.readFileSync(absolutePath, 'utf8').split('\n');
  let changed = false;

  for (const error of errors) {
    const l = error.lineNum - 1;
    if (l < 0 || l >= content.length) continue;
    let lineContent = content[l];
    let oldLine = lineContent;

    if (error.fullLine.includes("'id' does not exist in type 'ProdukEcom")) {
      lineContent = lineContent.replace(/\bid\s*:/g, 'id_produk:');
    } else if (error.fullLine.includes("Property 'id' does not exist on type")) {
      lineContent = lineContent.replace(/\.id\b/g, '.id_produk');
    } else if (error.fullLine.includes("'produkEcoms' does not exist")) {
      lineContent = lineContent.replace(/produkEcoms/g, 'produk');
    } else if (error.fullLine.includes("'toko' does not exist")) {
      console.log("Needs manual review:", filePath, ":", l + 1, "=>", error.fullLine);
    } else {
      // Just catch all others that are `id` related
      if (lineContent.includes('id:')) lineContent = lineContent.replace(/\bid\s*:/g, 'id_produk:');
      if (lineContent.includes('.id')) lineContent = lineContent.replace(/\.id\b/g, '.id_produk');
    }
    
    if (oldLine !== lineContent) {
      console.log(`Replaced in ${filePath}:${l+1}\n  - ${oldLine.trim()}\n  + ${lineContent.trim()}`);
      content[l] = lineContent;
      changed = true;
      totalChanged++;
    }
  }

  if (changed) {
    fs.writeFileSync(absolutePath, content.join('\n'));
  }
}
console.log("Done fixing " + totalChanged + " lines.");
