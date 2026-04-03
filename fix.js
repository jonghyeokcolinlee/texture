const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Remove duplicate import { useState } from 'react'; if it's there
  code = code.replace(/import\s*\{\s*useState\s*\}\s*from\s*'react';\n/g, '');

  fs.writeFileSync(filePath, code);
}
