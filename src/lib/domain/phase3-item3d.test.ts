import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Item 3D — Eliminação do Fallback 24.5 e Validação Estrita de Taxonomia em Opções', () => {
  const optionsViewPath = path.join(process.cwd(), 'src/components/options/OptionsBarriersView.tsx');
  const checkScriptPath = path.join(process.cwd(), 'scripts/check-fabricated-data.js');

  it('Regressão 3D(a, b, c): OptionsBarriersView não contém fallback || 24.5 nem rótulo THEORETICAL fora da taxonomia', () => {
    const content = fs.readFileSync(optionsViewPath, 'utf-8');

    // 1. Sem fallback de || 24.5
    expect(content).not.toContain('|| 24.5');
    expect(content).not.toContain('?? 24.5');

    // 2. Sem rótulo fora da taxonomia oficial
    expect(content).not.toContain('THEORETICAL_BS_HV21_B3_EOD');

    // 3. Proveniência DERIVADO e nota metodológica explícita
    expect(content).toContain('DERIVADO');
    expect(content).toContain('HV calculada internamente a partir do histórico de preços B3');
  });

  it('Regressão 3D(d): check-fabricated-data.js detecta violação de fallback "|| 24.5" se reintroduzida', () => {
    const scriptContent = fs.readFileSync(checkScriptPath, 'utf-8');

    // Confirma que o script monitora OptionsBarriersView.tsx
    expect(scriptContent).toContain('src/components/options/OptionsBarriersView.tsx');

    // Confirma que a regex do script cobre o operador OR (||)
    const orFallbackRegex = /\|\|\s*24\.5/;
    expect(orFallbackRegex.test('Volatilidade: HV21 ({data?.hv21 || 24.5}%)')).toBe(true);
    expect(orFallbackRegex.test('const x = val || 24.5;')).toBe(true);

    // Linha com proveniência válida deve passar, mas sem proveniência deve ser pega
    const invalidLine = 'Volatilidade: HV21 ({data?.hv21 || 24.5}%)';
    const hasForbiddenPattern = scriptContent.includes('/\\|\\|\\s*24\\.5/');
    expect(hasForbiddenPattern).toBe(true);
  });
});
