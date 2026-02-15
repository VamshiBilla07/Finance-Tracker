/**
 * Utility to help ensure global.css is imported in every component
 * Can be run during development to check for missing imports
 */

import fs from 'fs';
import path from 'path';

const GLOBAL_CSS_IMPORT = "import './styles/global/global.css'";
const GLOBAL_CSS_IMPORT_RELATIVE = "import '../styles/global/global.css'";
const GLOBAL_CSS_IMPORT_DOUBLE_RELATIVE = "import '../../styles/global/global.css'";

/**
 * Checks if a file has the global CSS import
 * @param {string} filePath - Path to the file to check
 * @returns {boolean} - Whether the file has the import
 */
export function checkGlobalCssImport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return (
      content.includes(GLOBAL_CSS_IMPORT) || 
      content.includes(GLOBAL_CSS_IMPORT_RELATIVE) ||
      content.includes(GLOBAL_CSS_IMPORT_DOUBLE_RELATIVE) ||
      content.includes("/styles/global/global.css")
    );
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error);
    return false;
  }
}

/**
 * Scans a directory for React components and checks if they import global.css
 * @param {string} directory - Directory to scan
 * @returns {Array} - List of files missing the import
 */
export function scanComponentsForMissingImports(directory) {
  const missingImports = [];
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (
        (file.endsWith('.jsx') || file.endsWith('.js')) && 
        !file.endsWith('.test.js') &&
        !file.endsWith('.spec.js')
      ) {
        if (!checkGlobalCssImport(fullPath)) {
          missingImports.push(fullPath);
        }
      }
    }
  }
  
  scanDir(directory);
  return missingImports;
}

// Example usage (could be run as a script)
// const missingImports = scanComponentsForMissingImports('./src/components');
// if (missingImports.length > 0) {
//   console.log('Components missing global.css import:');
//   missingImports.forEach(file => console.log(`- ${file}`));
// } else {
//   console.log('All components have the global.css import!');
// }
