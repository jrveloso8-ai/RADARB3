const fs = require('fs');
const path = require('path');

const targetDir = 'C:/projetos antigravity/RADAR-TASYTRADE';

let findings = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', '.gemini'].includes(entry.name)) continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Skip .env.local because it will be gitignored
      if (entry.name === '.env.local' || entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.ico') || entry.name.endsWith('.bat')) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for hardcoded API keys or passwords
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Look for sensitive words with raw values
        if (
          (line.includes('TASTYTRADE_LOGIN') || line.includes('TASTYTRADE_PASSWORD') || line.includes('TASTYTRADE_ACCOUNT') || line.includes('BEARER') || line.includes('TOKEN')) &&
          !line.includes('process.env.') &&
          !line.includes('export interface') &&
          !line.includes('type ') &&
          !line.includes('interface ') &&
          !line.includes('//') &&
          !line.includes('console.log')
        ) {
          findings.push({ file: fullPath, lineNum: idx + 1, content: line.trim() });
        }
      });
    }
  }
}

scanDir(targetDir);

console.log('=== RELATÓRIO DE VARREDURA DE SEGURANÇA ===');
if (findings.length === 0) {
  console.log('NENHUMA CHAVE OU CREDENCIAL SENSÍVEL ENCONTRADA NO CÓDIGO FONTE!');
} else {
  console.log('Itens encontrados para revisão:');
  findings.forEach(f => console.log(`${f.file}:${f.lineNum} -> ${f.content}`));
}
