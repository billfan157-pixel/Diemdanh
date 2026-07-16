const fs = require('fs');
const content = fs.readFileSync('src/core/utils.js', 'utf8');
const fixed = content
  .replace(/&/g, '&')
  .replace(/</g, '<')
  .replace(/>/g, '>')
  .replace(/"/g, '"')
  .replace(/'/g, '\'');
fs.writeFileSync('src/core/utils.js', fixed);
console.log('Fixed');