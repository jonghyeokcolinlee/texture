const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Prevent interactions while paused
  if (code.includes('const handlePointerDown') && !code.includes('if (!isPlaying) return;')) {
    code = code.replace(/const handlePointerDown = \(e: ThreeEvent<PointerEvent>\) => \{/, `const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!isPlaying) return;`);
  }

  fs.writeFileSync(filePath, code);
}
console.log('Fixed pause-click behavior');
