const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Gather all react import lines
  const reactImportLines = lines.filter(l => l.match(/^import\s+\{?[^}]*\}?\s+from\s+['"]react['"]/));
  // Remove them
  let otherLines = lines.filter(l => !l.match(/^import\s+\{?[^}]*\}?\s+from\s+['"]react['"]/));

  // Determine needed hooks from removed lines
  const hooksSet = new Set();
  let hasDefaultReact = false;
  reactImportLines.forEach(l => {
    if (l.includes('import React')) hasDefaultReact = true;
    const match = l.match(/\{([^}]*)\}/);
    if (match) {
      match[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(h => hooksSet.add(h));
    }
  });
  // Ensure essential hooks are present (some files may use useEffect etc.)
  // Add any missing that we know are used globally
  const essential = ['useRef','useMemo','useState','useEffect'];
  essential.forEach(h => hooksSet.add(h));

  const hooksArray = Array.from(hooksSet);
  const importLine = hasDefaultReact ? `import React, { ${hooksArray.join(', ')} } from 'react';` : `import { ${hooksArray.join(', ')} } from 'react';`;

  // Insert import line after "use client" if present
  if (otherLines[0] && otherLines[0].startsWith('"use client"')) {
    otherLines.splice(1, 0, importLine);
  } else {
    otherLines.unshift(importLine);
  }

  // Fix pause/play logic for Water files
  if (file.toLowerCase().startsWith('water')) {
    // Ensure isPlayingRef and accumulatedTimeRef are defined at top of component
    const compIdx = otherLines.findIndex(l => l.includes('const WaterPlane') || l.includes('const Water') );
    if (compIdx !== -1) {
      // Insert after the line that defines the component start (the opening brace line)
      // Find the line after the opening brace of component function
      const braceIdx = otherLines.findIndex((l,i)=> i>compIdx && l.trim().startsWith('{'));
      if (braceIdx !== -1) {
        // Insert refs if not already present
        if (!otherLines.some(l=>l.includes('const isPlayingRef'))){
          otherLines.splice(braceIdx+1,0,'    const isPlayingRef = useRef(isPlaying);','    isPlayingRef.current = isPlaying;','    const accumulatedTimeRef = useRef(0);');
        }
      }
    }
    // Ensure useFrame has pause guard and uses accumulatedTimeRef
    const useFrameIdx = otherLines.findIndex(l=>l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      // Insert guard after opening brace of callback
      const nextIdx = useFrameIdx+1;
      if (!otherLines[nextIdx].includes('if (!isPlayingRef.current) return;')) {
        otherLines.splice(nextIdx,0,'        if (!isPlayingRef.current) return;');
      }
      // Replace time uniform assignment
      otherLines = otherLines.map(l=> l.replace(/materialRef\.current\.uniforms\.u_time\.value\s*=\s*state\.clock\.elapsedTime/, 'materialRef.current.uniforms.u_time.value = accumulatedTimeRef.current;'));
      // Ensure delta accumulation occurs when playing
      const deltaLineIdx = otherLines.findIndex(l=>l.includes('accumulatedTimeRef.current += delta'));
      if (deltaLineIdx===-1) {
        // Find where to add after guard
        const guardIdx = otherLines.findIndex(l=>l.includes('if (!isPlayingRef.current) return;'));
        if (guardIdx!==-1) {
          otherLines.splice(guardIdx+1,0,'        if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }');
        }
      }
    }
  }

  // Fix pause for Steel files (add guard in useFrame)
  if (file.toLowerCase().startsWith('steel')) {
    const useFrameIdx = otherLines.findIndex(l=>l.includes('useFrame('));
    if (useFrameIdx !== -1) {
      const nextIdx = useFrameIdx+1;
      if (!otherLines[nextIdx].includes('if (!isPlayingRef.current) return;')) {
        otherLines.splice(nextIdx,0,'        if (!isPlayingRef.current) return;');
      }
    }
  }

  const newContent = otherLines.join('\n');
  fs.writeFileSync(filePath, newContent);
});

console.log('Unified React imports and ensured pause/play logic');
