import { describe, it, expect } from 'vitest';
import { POST as newsletterPost } from '@/app/api/newsletter/route';
import { GET as analyticsGet } from '@/app/api/analytics/track/route';
import { NextRequest } from 'next/server';

describe('Rotas de Analytics e Inscrição de Newsletter', () => {
  it('Deve cadastrar e-mail válido para o Resumo da Abertura do Mercado', async () => {
    const req = new NextRequest('http://localhost:3000/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: `teste_${Date.now()}@mercado.com.br` }),
    });

    const res = await newsletterPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain('sucesso');
  });

  it('Deve rejeitar e-mail inválido com status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: 'email_invalido_sem_arroba' }),
    });

    const res = await newsletterPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('Deve rastrear acessos únicos com hash de IP diário', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/track', {
      headers: {
        'x-forwarded-for': '189.100.50.20',
      },
    });

    const res = await analyticsGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uniqueToday).toBeGreaterThanOrEqual(1);
    expect(json.totalViewsToday).toBeGreaterThanOrEqual(1);
  });
});
