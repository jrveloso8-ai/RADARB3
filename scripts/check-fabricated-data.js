/**
 * Script de Verificação Anti-Dados Fabricados (Fase 0 - Cerca Estrutural)
 *
 * Verifica se os arquivos de produção das Fases 1 a 3 contêm literais e fallbacks
 * numéricos silenciosos proibidos sem a anotação obrigatória:
 *   // PROVENANCE: <motivo>
 *
 * Execução: node scripts/check-fabricated-data.js
 * Retorno:
 *   0 = Tudo limpo e conforme
 *   1 = Violações encontradas
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_FILES = [
  'src/lib/domain/opportunity-radar.ts',
  'src/app/api/opportunities/route.ts',
  'src/lib/services/market-quotes.ts',
  'src/components/tradingview/TradingViewOverview.tsx',
  'src/lib/domain/sentiment.ts',
  'src/components/quote/QuoteView.tsx',
  'src/lib/services/brapi.ts',
  'src/lib/domain/black-scholes.ts',
  'src/lib/domain/study-auditor.ts',
  'src/lib/domain/options-barriers.ts',
];

const FORBIDDEN_PATTERNS = [
  { name: 'Fallback "|| 0."', regex: /\|\|\s*0\./ },
  { name: 'Fallback "|| 100"', regex: /\|\|\s*100(?![0-9])/ },
  { name: 'Nullish HV "?? 24.5"', regex: /\?\?\s*24\.5(?![0-9])/ },
  { name: 'Nullish HV "?? 26.0"', regex: /\?\?\s*26(?:\.0)?(?![0-9])/ },
  { name: 'Estimativa de prêmio "* 0.02"', regex: /\*\s*0\.02(?![0-9])/ },
  { name: 'Estimativa de prêmio "* 0.025"', regex: /\*\s*0\.025(?![0-9])/ },
  { name: 'Estimativa de prêmio "* 0.015"', regex: /\*\s*0\.015(?![0-9])/ },
  { name: 'Preço fixo Minério de Ferro (97.90)', regex: /\b97\.9(?:0)?\b/ },
  { name: 'Preço fixo Milho B3 (63.80)', regex: /\b63\.8(?:0)?\b/ },
  { name: 'Preço fixo Boi B3 (244.50)', regex: /\b244\.5(?:0)?\b/ },
  { name: 'Preço fixo Soja B3 (134.50)', regex: /\b134\.5(?:0)?\b/ },
  { name: 'Preço fixo SPY (761.78)', regex: /\b761\.78\b/ },
];

let totalViolations = 0;
const violationsReport = [];

console.log('================================================================');
console.log('🔍 AUDITORIA AUTOMÁTICA: Verificando Dados Fabricados / Fallbacks');
console.log('================================================================\n');

for (const relFile of TARGET_FILES) {
  const fullPath = path.join(ROOT_DIR, relFile);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[AVISO] Arquivo não encontrado: ${relFile}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';

    // Permite se houver // PROVENANCE: na linha atual ou na anterior
    const hasProvenanceTag =
      line.includes('// PROVENANCE:') || prevLine.includes('// PROVENANCE:');

    if (hasProvenanceTag) {
      continue;
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(line)) {
        totalViolations++;
        violationsReport.push({
          file: relFile,
          lineNum: i + 1,
          pattern: pattern.name,
          content: line.trim(),
        });
      }
    }
  }
}

if (totalViolations > 0) {
  console.error(`❌ ENCONTRADAS ${totalViolations} VIOLAÇÃO(ÕES) DE DADOS FABRICADOS:\n`);
  for (const v of violationsReport) {
    console.error(`  - ${v.file}:${v.lineNum} [${v.pattern}]`);
    console.error(`    Linha: "${v.content}"`);
  }
  console.error('\n⚠️  Para permitir um valor fixo justificável, documente explicitamente com:');
  console.error('    // PROVENANCE: <motivo detalhado da fonte ou estimativa>\n');
  process.exit(1);
} else {
  console.log('✅ NENHUM DADO FABRICADO ENCONTRADO! Todos os arquivos auditados estão em conformidade.\n');
  process.exit(0);
}
