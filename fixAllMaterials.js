const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Remove all import lines that import from 'react'
  const otherLines = lines.filter(l => !l.match(/^import\s+.*from\s+['"]react['"]/));

  // Determine which hooks are used in the file (simple heuristic)
  const hookSet = new Set();
  const hookNames = ['useRef','useMemo','useState','useEffect','useCallback'];
  lines.forEach(l => {
    hookNames.forEach(h => {
      if (l.includes(`${h}(`)) hookSet.add(h);
    });
  });
  // Ensure useRef and useState are present (most files need them)
  hookSet.add('useRef');
  hookSet.add('useState');

  const hooksArray = Array.from(hookSet);
  const importLine = `import React, { ${hooksArray.join(', ')} } from 'react';`;

  // Insert import after "use client" if present
  let newLines = [];
  if (otherLines[0] && otherLines[0].startsWith('"use client"')) {
    newLines = [otherLines[0], importLine, ...otherLines.slice(1)];
  } else {
    newLines = [importLine, ...otherLines];
  }

  // Ensure pause/play logic for Water files
  if (file.toLowerCase().startsWith('water')) {
    // Insert isPlayingRef and accumulatedTimeRef if missing
    const compIdx = newLines.findIndex(l => l.includes('const WaterPlane'));
    if (compIdx !== -1) {
      // Find opening brace line after component definition
      const braceIdx = newLines.findIndex((l,i)=> i>compIdx && l.trim().startsWith('{'));
      if (braceIdx !== -1) {
        if (!newLines.some(l=>l.includes('const isPlayingRef'))){
          newLines.splice(braceIdx+1,0,'    const isPlayingRef = useRef(isPlaying);','    isPlayingRef.current = isPlaying;','    const accumulatedTimeRef = useRef(0);');
        }
      }
    }
    // Guard in useFrame
    const useFrameIdx = newLines.findIndex(l=>l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      const nextIdx = useFrameIdx+1;
      if (!newLines[nextIdx].includes('if (!isPlayingRef.current) return;')) {
        newLines.splice(nextIdx,0,'        if (!isPlayingRef.current) return;');
      }
      // Replace time uniform assignment
      newLines = newLines.map(l=>l.replace(/materialRef\.current\.uniforms\.u_time\.value\s*=\s*state\.clock\.elapsedTime/, 'materialRef.current.uniforms.u_time.value = accumulatedTimeRef.current;'));
      // Ensure delta accumulation
      if (!newLines.some(l=>l.includes('if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }'))){
        const guardIdx = newLines.findIndex(l=>l.includes('if (!isPlayingRef.current) return;'));
        if (guardIdx !== -1) {
          newLines.splice(guardIdx+1,0,'        if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }');
        }
      }
    }
  }

  // Ensure pause guard for Steel files
  if (file.toLowerCase().startsWith('steel')) {
    const useFrameIdx = newLines.findIndex(l=>l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      const nextIdx = useFrameIdx+1;
      if (!newLines[nextIdx].includes('if (!isPlayingRef.current) return;')) {
        newLines.splice(nextIdx,0,'        if (!isPlayingRef.current) return;');
      }
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'));
});

console.log('All material files cleaned and pause/play logic enforced');
