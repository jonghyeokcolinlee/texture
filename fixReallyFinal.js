const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // CLEANUP previous experimental bodge code
  code = code.replace(/const isPlayingRef = useRef\((true|isPlaying)\);[\s\S]*?useEffect\(\(\) => \{[\s\S]*?window.addEventListener\('set-play'[\s\S]*?\}, \[\]\);/g, '');
  code = code.replace(/const isPlayingRef = useRef\((true|isPlaying)\);\s*isPlayingRef\.current = isPlaying;/g, '');
  code = code.replace(/const isPlayingRef = useRef\((true|isPlaying)\);/g, '');
  code = code.replace(/isPlayingRef\.current = isPlaying;/g, '');
  code = code.replace(/const accumulatedTimeRef = useRef\(0\);/g, '');
  
  // INJECT standard isPlayingRef & accumulatedTimeRef (if Water)
  const isWater = file.startsWith('Water');
  const injectCode = isWater 
    ? `const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const accumulatedTimeRef = useRef(0);`
    : `const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;`;

  const planeRegex = /const (WaterPlane|SteelPlane) = \(\{ isPlaying \}: \{ isPlaying: boolean \}\) => \{/;
  if (code.match(planeRegex)) {
      code = code.replace(planeRegex, (match) => match + '\n    ' + injectCode);
  }

  // FORCE correct useFrame logic
  // First, normalize useFrame signature
  code = code.replace(/useFrame\(\(state, delta\) => \{/g, 'useFrame((state, delta) => {');
  code = code.replace(/useFrame\(\(state\) => \{/g, 'useFrame((state, delta) => {');

  if (isWater) {
      // Ensure time accumulation logic
      if (!code.includes('accumulatedTimeRef.current += delta')) {
          code = code.replace(/(if \(materialRef\.current\) \{)/, `$1
            if (isPlayingRef.current) { accumulatedTimeRef.current += delta; }
            const currentTime = accumulatedTimeRef.current;
            materialRef.current.uniforms.u_time.value = currentTime;`);
          // Scrub potential duplicate currentTime assignments
          code = code.replace(/const currentTime = state\.clock\.elapsedTime;/g, '');
          code = code.replace(/const currentTime = accumulatedTimeRef\.current;/g, ''); // avoid double assignment
          // Actually the injection already has it. Let's make it cleaner.
      } else {
          // It's there, but ensure it uses isPlayingRef.current
          code = code.replace(/if \(isPlaying(?!Ref)\)/g, 'if (isPlayingRef.current)');
          code = code.replace(/if \(!isPlaying(?!Ref)\)/g, 'if (!isPlayingRef.current)');
      }
  } else {
      // Steel: just add early return if !isPlayingRef.current
      if (!code.includes('if (!isPlayingRef.current) return;')) {
          code = code.replace(/useFrame\(\(state, delta\) => \{/, `useFrame((state, delta) => {
        if (!isPlayingRef.current) return;`);
      }
  }

  // POINTER DOWN SAFETY
  if (!code.includes('if (!isPlayingRef.current) return;')) {
      code = code.replace(/handlePointerDown = \([\s\S]*?\) => \{/, (m) => m + '\n        if (!isPlayingRef.current) return;');
  }

  // RESTORE InteractionUI
  code = code.replace(/<InteractionUI[\s\S]*?\/>/g, `<InteractionUI isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} onExport={triggerExport} />`);

  fs.writeFileSync(filePath, code);
}

// UI PADDING POLISH
const uiPath = path.join(__dirname, 'src/components/InteractionUI.tsx');
let uiCode = fs.readFileSync(uiPath, 'utf8');

// Optical baseline: Top padding matches visual center of Left padding.
// Left: 1rem (4) -> Top: 0.75rem (3)
// Left: 1.5rem (6) -> Top: 1.25rem (5)
uiCode = uiCode.replace(/top-4 left-4 lg:top-6 lg:left-6/g, 'top-[0.75rem] left-4 md:top-[1.25rem] md:left-6');
uiCode = uiCode.replace(/top-\[calc\(50\%\+1rem\)\] left-4 md:top-6 md:left-\[calc\(50\%\+1\.5rem\)\]/g, 'top-[calc(50%+0.75rem)] left-4 md:top-[1.25rem] md:left-[calc(50%+1.5rem)]');
uiCode = uiCode.replace(/tracking-\[-0\.03em\]/g, 'tracking-[-0.03em] leading-none');

fs.writeFileSync(uiPath, uiCode);

console.log('Final Fix node-execution successful.');
