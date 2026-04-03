const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.startsWith('Water') && f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Ensure useEffect import
  if (!/import React, \{[^}]*useEffect[^}]*\} from 'react'/.test(content)) {
    content = content.replace(/import React, \{([^}]*)\} from 'react';/, (match, p1) => {
      const hooks = p1.split(',').map(h=>h.trim()).filter(Boolean);
      if (!hooks.includes('useEffect')) hooks.push('useEffect');
      return `import React, { ${hooks.join(', ')} } from 'react';`;
    });
  }

  // Insert isPlayingRef and accumulatedTimeRef if missing
  if (!/const isPlayingRef/.test(content)) {
    content = content.replace(/(const WaterPlane[^}]*\{)/, `$1\n    const isPlayingRef = useRef(isPlaying);\n    isPlayingRef.current = isPlaying;\n    const accumulatedTimeRef = useRef(0);`);
  }

  // Ensure useFrame guard and time handling
  content = content.replace(/useFrame\((state, delta) => \{/, match => {
    let newBlock = match + '\n        if (!isPlayingRef.current) return;';
    return newBlock;
  });
  // Replace any assignment of u_time from state.clock.elapsedTime
  content = content.replace(/materialRef\.current\.uniforms\.u_time\.value\s*=\s*state\.clock\.elapsedTime/g, 'materialRef.current.uniforms.u_time.value = accumulatedTimeRef.current');
  // Ensure delta accumulation when playing
  if (!/if \(isPlayingRef.current\) \{ accumulatedTimeRef.current \+= delta; \}/.test(content)) {
    content = content.replace(/if \(!isPlayingRef.current\) return;/, match => {
      return match + '\n        if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }';
    });
  }

  // Add useEffect to update resolution on size change
  if (!/useEffect\(\(\) => \{\s*if \(materialRef.current\) \{\s*materialRef.current\.uniforms\.u_resolution/.test(content)) {
    const insertIdx = content.indexOf('const uniforms = useMemo');
    if (insertIdx !== -1) {
      const before = content.slice(0, insertIdx);
      const after = content.slice(insertIdx);
      const effect = `\n    // Update resolution on window resize / size change\n    useEffect(() => {\n        if (materialRef.current) {\n            materialRef.current.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio);\n        }\n    }, [size]);\n`;
      content = before + effect + after;
    }
  }

  // Ensure handlePointerDown checks isPlayingRef
  content = content.replace(/const handlePointerDown = \(e: ThreeEvent<PointerEvent>\) => \{/, match => {
    if (!/if \(!isPlayingRef.current\) return;/.test(content)) {
      return match + '\n        if (!isPlayingRef.current) return;';
    }
    return match;
  });

  fs.writeFileSync(filePath, content);
});

console.log('Water components updated for responsive resize and robust pause/play');
