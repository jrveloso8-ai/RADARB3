/**
 * AUDITORIA ESTRUTURAL RADAR B3 PRO IA — Verificador de Dados Fabricados
 * 
 * Script que falha (exit code != 0) se encontrar literais fixos, fallbacks mágicos
 * ou estimativas não documentadas explicitamente nos arquivos de produção.
 * 
 * REQUISITO DE AUDITORIA:
 * Todo comentário de proveniência deve obrigatoriamente especificar uma das categorias
 * da taxonomia oficial: // PROVENANCE: MEDIDO | DERIVADO | ESTIMADO | SIMULADO
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Arquivos escopo da auditoria (Fases 1 a 3)
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
  'src/components/options/OptionsBarriersView.tsx',
];

// Regex estrita de proveniência com taxonomia obrigatória
const VALID_PROVENANCE_REGEX = /\/\/\s*PROVENANCE:\s*(MEDIDO|DERIVADO|ESTIMADO|SIMULADO)\b/i;

// Padrões proibidos (sem comentário explícito de proveniência válida)
const FORBIDDEN_PATTERNS = [
  { name: 'Fallback "|| 0."', regex: /\|\|\s*0\.\d+/ },
  { name: 'Fallback "|| 100"', regex: /\|\|\s*100\b/ },
  { name: 'Nullish HV "?? 24.5"', regex: /\?\?\s*24\.5/ },
  { name: 'Fallback HV "|| 24.5"', regex: /\|\|\s*24\.5/ },
  { name: 'Nullish HV "?? 26.0"', regex: /\?\?\s*26\.0/ },
  { name: 'Fallback HV "|| 26.0"', regex: /\|\|\s*26\.0/ },
  { name: 'Nullish HV "?? 25.0"', regex: /\?\?\s*25(?:\.0)?\b/ },
  { name: 'Fallback HV "|| 25.0"', regex: /\|\|\s*25(?:\.0)?\b/ },
  { name: 'Débito estimado "* 0.02"', regex: /\*\s*0\.02\b/ },
  { name: 'Prêmio estimado "* 0.025"', regex: /\*\s*0\.025\b/ },
  { name: 'Crédito estimado "* 0.015"', regex: /\*\s*0\.015\b/ },
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

    // Verifica se há tag PROVENANCE válida na linha atual ou na anterior
    const hasValidProvenance =
      VALID_PROVENANCE_REGEX.test(line) || VALID_PROVENANCE_REGEX.test(prevLine);

    // Se houver // PROVENANCE: mas NÃO contiver a taxonomia válida (MEDIDO, DERIVADO, ESTIMADO, SIMULADO)
    const hasMalformedProvenance =
      (line.includes('// PROVENANCE:') && !VALID_PROVENANCE_REGEX.test(line)) ||
      (prevLine.includes('// PROVENANCE:') && !VALID_PROVENANCE_REGEX.test(prevLine));

    if (hasMalformedProvenance) {
      totalViolations++;
      violationsReport.push({
        file: relFile,
        lineNum: i + 1,
        pattern: 'PROVENANCE sem taxonomia válida (deve citar MEDIDO, DERIVADO, ESTIMADO ou SIMULADO)',
        content: line.trim(),
      });
      continue;
    }

    if (hasValidProvenance) {
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
  console.error('\n⚠️  Todo dado que não seja medido diretamente deve conter comentário estrito com:');
  console.error('    // PROVENANCE: <MEDIDO|DERIVADO|ESTIMADO|SIMULADO> <detalhes da fonte>\n');
  process.exit(1);
} else {
  console.log('✅ NENHUM DADO FABRICADO ENCONTRADO! Todos os arquivos auditados estão em conformidade estrita com a taxonomia.');
  process.exit(0);
}
