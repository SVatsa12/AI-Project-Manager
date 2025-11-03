// tree.js
const fs = require('fs');
const path = require('path');

// Recursive function to print directory tree
function printTree(dirPath, indent = '') {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      console.log(`${indent}📁 ${item.name}`);
      printTree(fullPath, indent + '   ');
    } else {
      console.log(`${indent}📄 ${item.name}`);
    }
  }
}

// Start from current working directory
const startDir = process.cwd();

console.log(`\n📂 Directory tree for: ${startDir}\n`);
printTree(startDir);
