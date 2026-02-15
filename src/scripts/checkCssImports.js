import { scanComponentsForMissingImports } from '../utils/cssImportChecker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcPath = path.join(__dirname, '..');

// Scan all components for missing imports
const missingImports = scanComponentsForMissingImports(srcPath);

if (missingImports.length > 0) {
  console.log('\x1b[33m%s\x1b[0m', 'Components missing global.css import:');
  missingImports.forEach(file => console.log(`- \x1b[31m${file}\x1b[0m`));
  console.log('\nPlease add the following import to each file:');
  console.log('\x1b[32mimport \'../styles/global/global.css\';\x1b[0m');
  console.log('(Adjust the path as needed based on the component\'s location)');
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', 'All components have the global.css import!');
}
