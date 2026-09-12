import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Auditoria Radar B3 PRO IA — Testes de Regressão da Fase 4', () => {
  // 4.1: Contador de visitantes sem piso artificial
  it('4.1: app/api/analytics/track/route.ts não deve usar Math.max(..., 1) para mascarar contagem de visitantes', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/analytics/track/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    expect(content).not.toContain('Math.max(analytics.uniqueHashes.length, 1)');
    expect(content).toContain('uniqueToday: analytics.uniqueHashes.length');
  });

  // 4.1b: Navbar sem fallback "uniqueVisitors || 1"
  it('4.1b: Navbar.tsx não deve forçar || 1 quando visitantes for zero', () => {
    const navPath = path.join(process.cwd(), 'src/components/layout/Navbar.tsx');
    const content = fs.readFileSync(navPath, 'utf-8');

    expect(content).not.toContain('{uniqueVisitors || 1}');
    expect(content).toContain('{uniqueVisitors ?? 0}');
  });

  // 4.2: Remoção do status fixo da Vercel
  it('4.2: Navbar.tsx não deve exibir status estático "Ativo em Tempo Real" sem API', () => {
    const navPath = path.join(process.cwd(), 'src/components/layout/Navbar.tsx');
    const content = fs.readFileSync(navPath, 'utf-8');

    expect(content).not.toContain('Ativo em Tempo Real');
  });

  // 4.3: Transparência no Manual Interativo (sem alegação de LLM inexistente)
  it('4.3: Rotulagem da base de conhecimento não deve se apresentar falsamente como LLM autônomo', () => {
    const quoteViewPath = path.join(process.cwd(), 'src/components/quote/QuoteView.tsx');
    const quoteContent = fs.readFileSync(quoteViewPath, 'utf-8');
    expect(quoteContent).toContain('Manual Interativo');
    expect(quoteContent).not.toContain('<span>Consultor IA</span>');

    const routePath = path.join(process.cwd(), 'src/app/api/ai-consultant/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');
    expect(routeContent).toContain('Manual Interativo');
  });
});
