const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  // Split into lines
  const lines = content.split('\n');
  // Find all import lines from 'react'
  const reactImportLines = lines.filter(l => l.startsWith('import React') || l.match(/^import\s+\{[^}]*\}\s+from\s+['"]react['"]/));
  // Remove them from content
  let newLines = lines.filter(l => !(l.startsWith('import React') || l.match(/^import\s+\{[^}]*\}\s+from\s+['"]react['"]/)));
  // Consolidate hooks
  const hooksSet = new Set();
  reactImportLines.forEach(l => {
    // extract hooks inside {}
    const match = l.match(/\{([^}]*)\}/);
    if (match) {
      const parts = match[1].split(',').map(p => p.trim()).filter(Boolean);
      parts.forEach(p => hooksSet.add(p));
    }
    // also check default import React
    if (l.includes('import React')) {
      // keep React default
      hooksSet.add('React');
    }
  });
  // Build new import line
  const defaultImport = hooksSet.has('React') ? 'React' : null;
  const otherHooks = Array.from(hooksSet).filter(h => h !== 'React');
  const importLine = defaultImport ? `import React, { ${otherHooks.join(', ')} } from 'react';` : `import { ${otherHooks.join(', ')} } from 'react';`;
  // Insert at top after possible "use client" line
  if (newLines[0].startsWith('"use client"')) {
    newLines.splice(1, 0, importLine);
  } else {
    newLines.unshift(importLine);
  }
  const newContent = newLines.join('\n');
  fs.writeFileSync(filePath, newContent);
});

console.log('Consolidated React imports across material files');
