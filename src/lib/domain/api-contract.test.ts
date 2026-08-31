import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Contrato API ↔ UI (Defeito A1) — Especificação Técnica v2.1', () => {
  it('A6: QuoteView.tsx não deve conter nenhuma ocorrência do objeto obsoleto ind.riskReward', () => {
    const quoteViewPath = path.resolve(process.cwd(), 'src/components/quote/QuoteView.tsx');
    const content = fs.readFileSync(quoteViewPath, 'utf-8');
    expect(content).not.toContain('.riskReward.');
    expect(content).not.toContain('ind?.riskReward');
    expect(content).not.toContain('ind.riskReward');
  });

  it('B1: options-structures.ts não deve existir no repositório (motor único consolidado em cme-election.ts)', () => {
    const oldEnginePath = path.resolve(process.cwd(), 'src/lib/domain/options-structures.ts');
    expect(fs.existsSync(oldEnginePath)).toBe(false);
  });
});
