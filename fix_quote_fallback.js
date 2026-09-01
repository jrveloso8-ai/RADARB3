const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';
let content = fs.readFileSync(target, 'utf8');

content = content.replace(
  `      symbol: symbol.toUpperCase().trim(),
      name: \`\${symbol.toUpperCase().trim()} Stock\`,
      category: 'ALTA',`,
  `      symbol: symbol.toUpperCase().trim(),
      name: \`\${symbol.toUpperCase().trim()} Stock\`,
      sector: 'Geral',
      category: 'ALTA',`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed fallback sector in QuoteView.tsx');
