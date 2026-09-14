/**
 * AUDITORIA ESTRUTURAL RADAR B3 PRO IA — Verificador Dinâmico de Dados Fabricados
 * 
 * Script que falha (exit code != 0) se encontrar literais fixos, fallbacks mágicos
 * ou estimativas não documentadas explicitamente nos arquivos de produção.
 * 
 * COBERTURA:
 * Varre dinamicamente e recursivamente todo o código de produção em:
 * - src/lib/domain/
 * - src/lib/services/
 * - src/components/ (incluindo src/components/options/OptionsBarriersView.tsx)
 * - src/app/
 * 
 * REQUISITO DE AUDITORIA:
 * Todo dado não medido ou com fallback obrigatório deve especificar uma das categorias
 * da taxonomia oficial: // PROVENANCE: MEDIDO | DERIVADO | ESTIMADO | SIMULADO
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Pastas de produção auditadas dinamicamente
const TARGET_DIRS = [
  'src/lib/domain',
  'src/lib/services',
  'src/components',
  'src/app',
];

// Regex estrita de proveniência com taxonomia obrigatória
const VALID_PROVENANCE_REGEX = /\/\/\s*PROVENANCE:\s*(MEDIDO|DERIVADO|ESTIMADO|SIMULADO)\b/i;

// Padrões proibidos (sem comentário explícito de proveniência válida)
const FORBIDDEN_PATTERNS = [
  // Fallbacks de negócio em opções e deltas (Achado N1 da auditoria)
  { name: 'Delta de opção fabricado "?? 0.28"', regex: /\?\?\s*0\.28\b/ },
  { name: 'Delta de opção fabricado "?? 0.16"', regex: /\?\?\s*0\.16\b/ },
  { name: 'Delta de opção fabricado "?? 0.22"', regex: /\?\?\s*0\.22\b/ },
  { name: 'POP com fallback numérico "?? 75"', regex: /\?\?\s*75\b/ },

  // Preços fabricados de commodities agrícolas (Achado N2 da auditoria)
  { name: 'Preço fabricado Milho "|| 62.50"', regex: /\|\|\s*62\.5(?:0)?\b/ },
  { name: 'Preço fabricado Boi "|| 242.00"', regex: /\|\|\s*242(?:\.00)?\b/ },
  { name: 'Preço fabricado Soja "|| 132.80"', regex: /\|\|\s*132\.8(?:0)?\b/ },

  // Crivo fundamentalista e solvência (Achados C1, C2 e C5 da auditoria)
  { name: 'Bypass arbitrário de 1 bilhão em FCO', regex: /fcoVal\s*>\s*1_000_000_000/ },
  { name: 'ROE clamp forçado em 18%', regex: /Math\.min\(\s*18\.0\s*,/ },
  { name: 'Solvência hardcoded de VALE3 (0.8x)', regex: /cleanSymbol\s*===\s*['"]VALE3['"].*?:\s*0\.8\b/s },

  // Fallbacks de estratégia e R:R (Achado N4 da auditoria)
  { name: 'Strategy ID fabricado "|| 11"', regex: /strategySpec\?\.id\s*\|\|\s*11\b/ },
  { name: 'R:R duplicado fabricado "|| 1.5"', regex: /riskRewardRatio\s*\|\|\s*1\.5\b/ },

  // Fallbacks numéricos genéricos e constantes fixas históricas
  { name: 'Fallback "|| 0.X"', regex: /\|\|\s*0\.[1-9]\d*/ },
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
];

/**
 * Coleta recursivamente todos os arquivos .ts, .tsx, .js, .jsx
 * excluindo testes (.test., .spec.) e declarações (.d.ts)
 */
function collectSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '_backups') {
        collectSourceFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.') && !entry.name.endsWith('.d.ts')) {
          fileList.push(fullPath);
        }
      }
    }
  }

  return fileList;
}

let totalViolations = 0;
const violationsReport = [];

console.log('================================================================');
console.log('🔍 AUDITORIA DINÂMICA COMPLETA: Verificando Dados Fabricados / Fallbacks');
console.log('================================================================\n');

const allTargetFiles = [];
for (const relDir of TARGET_DIRS) {
  collectSourceFiles(path.join(ROOT_DIR, relDir), allTargetFiles);
}

console.log(`📁 Varrendo dinamicamente ${allTargetFiles.length} arquivos de código-fonte de produção...\n`);

for (const fullPath of allTargetFiles) {
  const relFile = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
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
  console.log(`✅ NENHUM DADO FABRICADO ENCONTRADO em ${allTargetFiles.length} arquivos auditados! Todos em conformidade estrita com a taxonomia.`);
  process.exit(0);
}
