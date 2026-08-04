const fs = require('fs');
const path = require('path');

const tscOutput = fs.readFileSync('tsc_kategori_output.txt', 'utf16le');
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

    if (line.includes("'id'") || line.includes("does not exist on type") || line.includes("does not exist in type")) {
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

    if (error.fullLine.includes("'id' does not exist in type 'KategoriToko")) {
      lineContent = lineContent.replace(/\bid\s*:/g, 'id_kategoriToko:');
    } else if (error.fullLine.includes("Property 'id' does not exist on type") && error.fullLine.includes("id_kategoriToko")) {
      lineContent = lineContent.replace(/\.id\b/g, '.id_kategoriToko');
    } else {
      // General catch all for id to id_kategoriToko if it is the only error on that line
      if (lineContent.includes('id:')) lineContent = lineContent.replace(/\bid\s*:/g, 'id_kategoriToko:');
      if (lineContent.includes('.id')) lineContent = lineContent.replace(/\.id\b/g, '.id_kategoriToko');
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
