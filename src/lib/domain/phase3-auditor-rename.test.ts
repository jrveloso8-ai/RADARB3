import { describe, it, expect } from 'vitest';
import { generateStudyAudit } from './study-auditor';
import { QuoteDetails } from '../types/financial';

describe('Item 3C(d) — Regressão de Nomenclatura do Auditor de Estudos', () => {
  const baseQuote: QuoteDetails = {
    symbol: 'PETR4',
    shortName: 'Petrobras PN',
    currency: 'BRL',
    regularMarketPrice: 38.5,
    regularMarketChange: 0.5,
    regularMarketChangePercent: 1.3,
    regularMarketTime: '2026-09-12T10:00:00Z',
    regularMarketDayHigh: 39.0,
    regularMarketDayLow: 38.0,
    regularMarketVolume: 10000000,
    historicalDataPrice: [],
  };

  it('Regressão 3C(d): auditSeal deve usar status REGISTRO_CONFORME e rotulo sem alusao a Certificado Oficial', () => {
    const audit = generateStudyAudit(baseQuote);

    // 1. Status renomeado de CERTIFICADO_CONFORME para REGISTRO_CONFORME
    expect(audit.auditSeal.status).toBe('REGISTRO_CONFORME');
    expect((audit.auditSeal.status as string)).not.toContain('CERTIFICADO');

    // 2. Rótulo sem menção a "CERTIFICADO"
    expect(audit.auditSeal.label).not.toContain('CERTIFICADO');
    expect(audit.auditSeal.label).toContain('REGISTRO DE ANÁLISE');

    // 3. Título do veredito usa "Parecer Técnico" e não "Parecer Oficial"
    expect(audit.overallVerdictRationale.title).toContain('Parecer Técnico');
    expect(audit.overallVerdictRationale.title).not.toContain('Parecer Oficial');

    // 4. Código de registro técnico preenchido corretamente
    expect(audit.auditSeal.registrationCode).toMatch(/^REG-PETR4-\d{6}$/);
  });
});
