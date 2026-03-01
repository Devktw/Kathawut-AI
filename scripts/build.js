#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Copy prompt.md to dist
const promptSrc = path.join(rootDir, 'prompt.md');
const promptDest = path.join(rootDir, 'dist', 'prompt.md');

if (fs.existsSync(promptSrc)) {
    fs.copyFileSync(promptSrc, promptDest);
    console.log('✅ Copied prompt.md to dist/');
} else {
    console.error('❌ prompt.md not found!');
    process.exit(1);
}

// Copy sql.js wasm file
const wasmSrc = path.join(rootDir, 'node_modules/sql.js/dist/sql-wasm.wasm');
const wasmDest = path.join(rootDir, 'dist', 'sql-wasm.wasm');

if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDest);
    console.log('✅ Copied sql-wasm.wasm to dist/');
}

// Create bin directory and wrapper
const binDir = path.join(rootDir, 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir);
}

const wrapperContent = `#!/usr/bin/env node
import '../dist/index.js';
`;
const wrapperPath = path.join(binDir, 'karn.js');
fs.writeFileSync(wrapperPath, wrapperContent);
fs.chmodSync(wrapperPath, '755');
console.log('✅ Created bin/karn.js wrapper');

// Keep shebang as node (not bun) for universal compatibility
const indexPath = path.join(rootDir, 'dist', 'index.js');
if (fs.existsSync(indexPath)) {
    fs.chmodSync(indexPath, '755');
    console.log('✅ Made dist/index.js executable');
}

console.log('🎉 Build completed successfully!');
