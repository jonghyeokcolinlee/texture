const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/materials');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  // Add imports if missing
  if (!code.includes('InteractionUI')) {
    code = code.replace(/import \{.*\} from '@react-three\/fiber';/, match => match + "\nimport { useState } from 'react';\nimport { InteractionUI } from '../components/InteractionUI';");
    modified = true;
  }

  // Update useExport to capture triggerExport and add isPlaying state
  if (code.includes('useExport(canvasRef,')) {
    code = code.replace(/useExport\(canvasRef,\s*(['"].*?['"])\);/, `const triggerExport = useExport(canvasRef, $1) as () => void;
    const [isPlaying, setIsPlaying] = useState(true);`);
    modified = true;
  }

  // Update Canvas to use frameloop
  if (code.includes('<Canvas') && !code.includes('frameloop=')) {
    code = code.replace(/<Canvas/g, `<Canvas frameloop={isPlaying ? "always" : "never"}`);
    modified = true;
  }

  // Insert interaction UI before the closing div, after Canvas
  if (!code.includes('<InteractionUI')) {
    code = code.replace(/<\/Canvas>\s*<\/div>/g, `</Canvas>
            <InteractionUI isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(!isPlaying)} onExport={triggerExport} />
        </div>`);
    modified = true;
  }

  // Ensure useState is actually imported if useMemo is there
  if (code.includes('useState') && !code.match(/import\s+.*\{[^}]*useState[^}]*\}.*from\s+['"]react['"]/)) {
    code = code.replace(/import React, \{([^\}]+)\} from 'react';/, "import React, { useState, $1 } from 'react';");
  }

  if (modified) {
    fs.writeFileSync(filePath, code);
    console.log('Patched', file);
  }
}
