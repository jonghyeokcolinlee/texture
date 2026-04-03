const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Inject isPlayingRef mapping
  if (!code.includes('const isPlayingRef = useRef(isPlaying);')) {
    code = code.replace(
      'const accumulatedTimeRef = useRef(0);',
      `const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const accumulatedTimeRef = useRef(0);`
    );
  }

  // Replace isPlaying inside useFrame with isPlayingRef.current
  if (code.includes('if (isPlaying) { accumulatedTimeRef.')) {
    code = code.replace(/if \(isPlaying\) \{ accumulatedTimeRef/g, 'if (isPlayingRef.current) { accumulatedTimeRef');
  }

  // Also replace in handlePointerDown
  if (code.includes('if (!isPlaying) return;')) {
    code = code.replace('if (!isPlaying) return;', 'if (!isPlayingRef.current) return;');
  }

  fs.writeFileSync(filePath, code);
}
console.log('Fixed closure bug in pause mechanisms');
