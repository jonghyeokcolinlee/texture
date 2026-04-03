const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Consolidate React imports: keep only one line starting with import React
  const reactLines = lines.filter(l => l.match(/^import\s+React|^import\s+\{[^}]*\}\s+from\s+['"]react['"]/));
  const otherLines = lines.filter(l => !l.match(/^import\s+React|^import\s+\{[^}]*\}\s+from\s+['"]react['"]/));
  const hooks = new Set();
  let hasDefaultReact = false;
  reactLines.forEach(l => {
    if (l.includes('import React')) hasDefaultReact = true;
    const match = l.match(/\{([^}]*)\}/);
    if (match) {
      match[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(h=>hooks.add(h));
    }
  });
  const hooksArray = Array.from(hooks);
  const importLine = hasDefaultReact ? `import React, { ${hooksArray.join(', ')} } from 'react';` : `import { ${hooksArray.join(', ')} } from 'react';`;
  // Insert after "use client" if present
  let newLines = [];
  if (otherLines[0].startsWith('"use client"')) {
    newLines = [otherLines[0], importLine, ...otherLines.slice(1)];
  } else {
    newLines = [importLine, ...otherLines];
  }

  // Fix useFrame logic for Water* files (time accumulation)
  const isWater = file.toLowerCase().startsWith('water');
  if (isWater) {
    // Replace uniform assignment with accumulatedTimeRef.current
    newLines = newLines.map(l => {
      if (l.includes('materialRef.current.uniforms.u_time.value = state.clock.elapsedTime')) {
        return '            materialRef.current.uniforms.u_time.value = accumulatedTimeRef.current;';
      }
      return l;
    });
    // Ensure accumulatedTimeRef is defined before useFrame if not present
    const hasAccumRef = newLines.some(l => l.includes('const accumulatedTimeRef = useRef(0)'));
    if (!hasAccumRef) {
      // Insert after isPlayingRef lines (we assume they exist)
      const idx = newLines.findIndex(l => l.includes('const isPlayingRef'));
      if (idx !== -1) {
        newLines.splice(idx+1, 0, '    const accumulatedTimeRef = useRef(0);');
      }
    }
    // Ensure useFrame includes pause check before adding delta
    const useFrameIdx = newLines.findIndex(l => l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      // Insert pause guard after opening brace of useFrame callback
      const braceLine = newLines[useFrameIdx];
      if (!braceLine.includes('if (!isPlayingRef.current) return;')) {
        // Find the line after the opening brace
        const nextIdx = useFrameIdx + 1;
        newLines.splice(nextIdx, 0, '        if (!isPlayingRef.current) return;');
      }
    }
  }

  // For Steel files, add pause guard in useFrame
  const isSteel = file.toLowerCase().startsWith('steel');
  if (isSteel) {
    const useFrameIdx = newLines.findIndex(l => l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      const nextIdx = useFrameIdx + 1;
      if (!newLines[nextIdx].includes('if (!isPlayingRef.current) return;')) {
        newLines.splice(nextIdx, 0, '        if (!isPlayingRef.current) return;');
      }
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'));
});

console.log('Deduped React imports and fixed pause/play logic across material files');
