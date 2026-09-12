import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Item 3C(e) — Regressão de Nomenclatura do Manual Interativo (Sem Alegação Falsa de LLM)', () => {
  it('Regressão 3C(e): QuoteView e HelpSupportView não devem usar "Consultor IA" ou "Agente IA"', () => {
    const quotePath = path.join(process.cwd(), 'src/components/quote/QuoteView.tsx');
    const quoteContent = fs.readFileSync(quotePath, 'utf-8');

    // QuoteView deve renderizar e importar InteractiveManualView
    expect(quoteContent).toContain('InteractiveManualView');
    expect(quoteContent).toContain('Manual Interativo');
    expect(quoteContent).not.toContain('Consultor IA');
    expect(quoteContent).not.toContain('<AIConsultantView');

    const helpPath = path.join(process.cwd(), 'src/components/help/HelpSupportView.tsx');
    const helpContent = fs.readFileSync(helpPath, 'utf-8');

    // HelpSupportView deve se apresentar como Manual Interativo de Regras
    expect(helpContent).toContain('Manual Interativo');
    expect(helpContent).not.toContain('Agente IA do Manual');
    expect(helpContent).not.toContain('Agente de IA Especialista');
  });

  it('Regressão 3C(e): Rota api/ai-consultant se declara como base de regras / motor determinístico do manual', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/ai-consultant/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    expect(routeContent).toContain('Manual Interativo');
    expect(routeContent).toContain('Motor Determinístico');
    expect(routeContent).not.toContain('🤖 Assistente');
  });
});
