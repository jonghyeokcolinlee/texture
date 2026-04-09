import os
import re

mappings = {
    "01 brushed steel": ["Steel4.tsx", "Steel5.tsx"],
    "02 scattered puddle": ["Water1.tsx", "Water2.tsx", "Water3.tsx", "Water4.tsx", "Water5.tsx", "Water6.tsx"],
    "03 rgb drops": [f"RGBWater{i}.tsx" for i in range(1, 20)],
    "04 frosted glass": ["FrostedGlass1.tsx", "FrostedGlass2.tsx"],
    "06 cd iridescence": ["CDIridescence1.tsx", "CDIridescence2.tsx", "CDIridescence3.tsx", "CDIridescence4.tsx"],
    "07 shattered glass": ["ShatteredCubism1.tsx", "ShatteredCubism2.tsx", "ShatteredGlass3.tsx"],
    "08 soap bubbles": ["SoapBubbles1.tsx", "SoapBubbles2.tsx"],
    "09 white vinyl": ["WhiteVinyl1.tsx", "WhiteVinyl2.tsx"],
    "10 frosted glassmorphism": ["FrostedGlassmorphism1.tsx"]
}

materials_dir = "src/materials"

for title, files in mappings.items():
    for filename in files:
        filepath = os.path.join(materials_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Find InteractionUI tag and add title prop
            new_content = re.sub(
                r'<InteractionUI\s+',
                f'<InteractionUI title="{title}" ',
                content
            )
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filename} with title '{title}'")
            else:
                print(f"Could not find InteractionUI in {filename} or already updated")
        else:
            print(f"File {filename} not found at {filepath}")
