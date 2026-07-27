const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const files = [];

function findFiles(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFiles(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
}
findFiles(srcDir);

for (const file of files) {
  if (file.includes('config\\\\api.js') || file.includes('config/api.js')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const isRootSrc = path.dirname(file) === srcDir;
  const importPrefix = isRootSrc ? '.' : '..';

  // Pattern 1: Base URL (usually inside component)
  const patternBase = /^\s*const API_URL = import\.meta\.env\.PROD \? '' : 'http:\/\/localhost:3001';\r?\n/gm;
  if (patternBase.test(content)) {
    content = content.replace(patternBase, ''); // Remove local variable
    // Add import at the top
    const importStr = `import { BASE_URL as API_URL } from '${importPrefix}/config/api';\n`;
    if (!content.includes(importStr)) {
      content = importStr + content;
    }
    changed = true;
  }

  // Pattern 2: API URL (usually top level module var)
  // This regex matches single line and multiline
  const patternApi = /^const API_URL = import\.meta\.env\.PROD \? '\/api\/pedidos' :[ \r\n]*'http:\/\/localhost:3001\/api\/pedidos';\r?\n/gm;
  if (patternApi.test(content)) {
    content = content.replace(patternApi, '');
    const importStr = `import { API_URL } from '${importPrefix}/config/api';\n`;
    if (!content.includes(importStr)) {
      content = importStr + content;
    }
    changed = true;
  }
  
  // Pattern 3: App.jsx might have slightly different spacing or logic
  const patternApp = /^const API_URL = import\.meta\.env\.VITE_API_URL \|\| \(import\.meta\.env\.PROD[ \r\n]*\?[ \r\n]*'\/api\/pedidos'[ \r\n]*:[ \r\n]*'http:\/\/localhost:3001\/api\/pedidos'\);\r?\n/gm;
  if (patternApp.test(content)) {
    content = content.replace(patternApp, '');
    const importStr = `import { API_URL } from '${importPrefix}/config/api';\n`;
    if (!content.includes(importStr)) {
      content = importStr + content;
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
  }
}
