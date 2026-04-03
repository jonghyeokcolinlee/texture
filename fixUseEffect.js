const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Insert useEffect if not imported
  if (code.includes('useEffect') && !code.match(/import\s+.*\{[^}]*useEffect[^}]*\}.*from\s+['"]react['"]/)) {
    code = code.replace(/import React, \{([^\}]+)\} from 'react';/, "import React, { useEffect, $1 } from 'react';");
  }

  fs.writeFileSync(filePath, code);
}
console.log('Fixed useEffect import');
