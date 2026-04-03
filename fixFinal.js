const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Bulletproof global event listener for isPlayingRef inside WaterPlane
  // Replace the old isPlaying prop and ref setup
  // We'll replace it with a robust event listener to completely bypass Canvas bridge propagation drops.
  code = code.replace(/const isPlayingRef = useRef\(isPlaying\);\s*isPlayingRef\.current = isPlaying;/g, `
    const isPlayingRef = useRef(true);
    useEffect(() => {
        const handleSetPlay = (e: any) => { isPlayingRef.current = e.detail; };
        window.addEventListener('set-play', handleSetPlay);
        return () => window.removeEventListener('set-play', handleSetPlay);
    }, []);
  `);

  code = code.replace(/<InteractionUI isPlaying=\{isPlaying\} onTogglePlay=\{.*?\} onExport=\{triggerExport\} \/>/g, 
  `<InteractionUI isPlaying={isPlaying} onTogglePlay={() => {
        const next = !isPlaying;
        setIsPlaying(next);
        window.dispatchEvent(new CustomEvent('set-play', { detail: next }));
  }} onExport={triggerExport} />`);

  fs.writeFileSync(filePath, code);
}

// Fix 2: InteractionUI.tsx text alignment
const uiPath = path.join(__dirname, 'src/components/InteractionUI.tsx');
let uiCode = fs.readFileSync(uiPath, 'utf8');

// Use top-4/6 left-4/6 completely standard, but add leading-none to squeeze the line height!
uiCode = uiCode.replace(/top-\[0\.65rem\] left-4 md:top-\[1\.0rem\] md:left-6/g, 'top-4 left-4 lg:top-6 lg:left-6 leading-none');
uiCode = uiCode.replace(/top-\[calc\(50\%\+0\.65rem\)\] left-4 md:top-\[1\.0rem\] md:left-\[calc\(50\%\+1\.5rem\)\]/g, 'top-[calc(50%+1rem)] left-4 md:top-6 md:left-[calc(50%+1.5rem)] leading-none');

fs.writeFileSync(uiPath, uiCode);

console.log('Fixed playback event bubbling and text leading.');
