import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Pré-Liberação: Badge de Minério (ref.) e Disclaimers Permanentes', () => {
  it('OpportunityRadarView deve renderizar badge (ref.) para Minério de Ferro e banner de governança', () => {
    const radarPath = path.join(process.cwd(), 'src/components/opportunities/OpportunityRadarView.tsx');
    const content = fs.readFileSync(radarPath, 'utf-8');

    // 1. Badge (ref.) no Minério de Ferro
    expect(content).toMatch(/Minério:[\s\S]*?\(ref\.\)/);

    // 2. Banner de governança e aviso legal
    expect(content).toContain('Aviso Legal & Governança');
    expect(content).toContain('Conteúdo estritamente educacional e analítico');
    expect(content).toContain('(est.)');
    expect(content).toContain('(ref.)');
  });

  it('Footer global deve conter aviso legal expresso sobre caráter educacional e dados referenciais', () => {
    const footerPath = path.join(process.cwd(), 'src/components/layout/Footer.tsx');
    const content = fs.readFileSync(footerPath, 'utf-8');

    expect(content).toContain('AVISO LEGAL & CARÁTER ESTRITAMENTE EDUCACIONAL');
    expect(content).toContain('não constitui recomendação de compra, venda ou execução');
    expect(content).toContain('(est.)');
    expect(content).toContain('(ref.)');
  });
});
