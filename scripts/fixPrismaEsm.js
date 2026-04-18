#!/usr/bin/env node
/**
 * Post-generation script to fix Prisma ESM imports
 * Adds .js extensions to relative imports in generated Prisma client files
 * This is needed for Node.js strict ESM module resolution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(__dirname, '..', 'src', 'generated', 'prisma');

const filesToFix = [
  { path: 'client.ts', patterns: [
    { regex: /from ["']\.\/enums["']/g, replacement: "from \"./enums.js\"" },
    { regex: /from ["']\.\/internal\/class["']/g, replacement: "from \"./internal/class.js\"" },
    { regex: /from ["']\.\/internal\/prismaNamespace["']/g, replacement: "from \"./internal/prismaNamespace.js\"" }
  ]},
  { path: 'browser.ts', patterns: [
    { regex: /from ["']\.\/internal\/prismaNamespaceBrowser["']/g, replacement: "from \"./internal/prismaNamespaceBrowser.js\"" },
    { regex: /from ["']\.\/enums["']/g, replacement: "from \"./enums.js\"" }
  ]}
];

console.log('🔧 Fixing Prisma ESM imports...');

filesToFix.forEach(({ path: filePath, patterns }) => {
  const fullPath = path.join(basePath, filePath);
  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    patterns.forEach(({ regex, replacement }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    process.exit(1);
  }
});

console.log('✨ Done!');
