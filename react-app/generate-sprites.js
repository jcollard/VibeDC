// Script to generate sprite-definitions.yaml from atlasmap.txt
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITE_SIZE = 12;
const ATLAS_WIDTH_IN_SPRITES = 42; // Standard atlas width (you can adjust if needed)

// Read the atlasmap.txt file
const atlasMapPath = path.join(__dirname, 'public', 'spritesheets', 'atlasmap.txt');
const atlasMapContent = fs.readFileSync(atlasMapPath, 'utf-8');
const lines = atlasMapContent.trim().split('\n');

console.log(`Processing ${lines.length} sprite entries...`);

// Parse the sprite IDs and create sprite definitions
const sprites = [];
lines.forEach((line, index) => {
  const spriteId = line.trim();

  // Skip empty sprites
  if (spriteId === 'empty') {
    return;
  }

  // Calculate x, y position from index (atlasmap.txt is 1-indexed, but we use 0-indexed positions)
  // Line 1 in file = index 0 = position (0, 0)
  const x = index % ATLAS_WIDTH_IN_SPRITES;
  const y = Math.floor(index / ATLAS_WIDTH_IN_SPRITES);

  // Extract the base name (group name) for tagging
  const match = spriteId.match(/^(.+?)-\d+$/);
  const groupName = match ? match[1] : spriteId;

  // Create sprite definition
  sprites.push({
    id: spriteId,
    spriteSheet: '/spritesheets/atlas.png',
    x: x,
    y: y,
    groupName: groupName
  });
});

console.log(`Generated ${sprites.length} sprite definitions (skipped ${lines.length - sprites.length} empty entries)`);

// Group sprites by their base name for better organization
const spritesByGroup = {};
sprites.forEach(sprite => {
  // Extract the base name (everything before the last hyphen and number)
  const match = sprite.id.match(/^(.+)-\d+$/);
  const baseName = match ? match[1] : sprite.id;

  if (!spritesByGroup[baseName]) {
    spritesByGroup[baseName] = [];
  }
  spritesByGroup[baseName].push(sprite);
});

// Generate YAML content
let yaml = '# Sprite definitions for atlas\n';
yaml += '# Maps sprite IDs to their locations in the atlas sprite sheet\n';
yaml += '# Auto-generated from atlasmap.txt\n\n';
yaml += 'sprites:\n';

// Sort groups alphabetically
const groupNames = Object.keys(spritesByGroup).sort();

for (const groupName of groupNames) {
  const groupSprites = spritesByGroup[groupName];

  // Add a comment for each group
  yaml += `\n  # ${groupName} sprites (${groupSprites.length} total)\n`;

  // Sort sprites within group by their number
  groupSprites.sort((a, b) => {
    const aMatch = a.id.match(/-(\d+)$/);
    const bMatch = b.id.match(/-(\d+)$/);
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    return a.id.localeCompare(b.id);
  });

  for (const sprite of groupSprites) {
    yaml += `  - id: "${sprite.id}"\n`;
    yaml += `    spriteSheet: "${sprite.spriteSheet}"\n`;
    yaml += `    x: ${sprite.x}\n`;
    yaml += `    y: ${sprite.y}\n`;
    yaml += `    tags: ["${sprite.groupName}"]\n`;
    yaml += '\n';
  }
}

// Write the YAML file
const outputPath = path.join(__dirname, 'src', 'data', 'sprite-definitions.yaml');
fs.writeFileSync(outputPath, yaml, 'utf-8');

console.log(`\nYAML file generated successfully: ${outputPath}`);
console.log(`Total sprite groups: ${groupNames.length}`);
console.log(`Sample groups: ${groupNames.slice(0, 10).join(', ')}...`);
console.log(`\nNOTE: This has overwritten the original sprite-definitions.yaml file.`);
