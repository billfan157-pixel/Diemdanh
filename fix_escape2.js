const fs = require('fs');
const content = fs.readFileSync('src/core/utils.js', 'utf8');
const fixed = content
  .replace(/&/g, '\\u0026')
  .replace(/</g, '\\u003C')
  .replace(/>/g, '\\u003E')
  .replace(/"/g, '\\u0022')
  .replace(/'/g, '\\u0027');
fs.writeFileSync('src/core/utils.js', fixed);
console.log('Fixed with unicode');