const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Restore frameloop="always" by completely stripping the prop
  code = code.replace(/<Canvas\s+frameloop=\{isPlaying \? "always" : "never"\}/g, '<Canvas');

  // Fix 2: Introduce accumulatedTimeRef for custom time tracking
  if (!code.includes('accumulatedTimeRef')) {
    code = code.replace(/useFrame\(\(state\).*?=>\s*\{/g, `const accumulatedTimeRef = useRef(0);
    useFrame((state, delta) => {`);
  }

  // Replace exact time assignment with conditional time accumulation
  if (code.includes('const currentTime = state.clock.elapsedTime;')) {
    code = code.replace(
      'const currentTime = state.clock.elapsedTime;',
      `if (isPlaying) { accumulatedTimeRef.current += delta; }
            const currentTime = accumulatedTimeRef.current;`
    );
  }

  fs.writeFileSync(filePath, code);
}
console.log("Done");
