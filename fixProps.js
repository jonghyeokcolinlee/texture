const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix WaterPlane and SteelPlane signature
  if (code.match(/const (WaterPlane|SteelPlane) = \(\) => {/)) {
    code = code.replace(/const (WaterPlane|SteelPlane) = \(\) => {/g, 'const $1 = ({ isPlaying }: { isPlaying: boolean }) => {');
  }

  // They might also have `const Plane = () => {` ? No, they use `SteelPlane` and `WaterPlane`.

  // Pass isPlaying into the Plane
  if (code.includes('<WaterPlane />')) {
    code = code.replace(/<WaterPlane \/>/g, '<WaterPlane isPlaying={isPlaying} />');
  }
  if (code.includes('<SteelPlane />')) {
    code = code.replace(/<SteelPlane \/>/g, '<SteelPlane isPlaying={isPlaying} />');
  }

  // Steel might not use state.clock.elapsedTime directly or might have broken.
  // Actually, did Steel break? The error ONLY listed Water, Water1..4. Wait, Steel didn't error?!
  // Oh, Steel doesn't use `state.clock.elapsedTime`? Wait, I should verify.

  fs.writeFileSync(filePath, code);
}
console.log('Fixed props');
