const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/domain/cme-catalog.ts';
let content = fs.readFileSync(target, 'utf8');

content = content.replace("bias: 'Direcional'", "bias: 'ALTA'");

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed bias in cme-catalog.ts');
