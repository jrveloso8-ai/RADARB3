import { describe, it, expect } from 'vitest';
import { calculateB3BusinessDays } from './b3-calendar';

describe('Cálculo de Dias Úteis B3 (Padrão Profit)', () => {
  const baseDate = '2026-08-29'; // Data de referência (Sábado)

  const profitExpectedCases = [
    { date: '2026-09-04', expectedDte: 4, desc: 'Setembro W1' },
    { date: '2026-09-11', expectedDte: 8, desc: 'Setembro W2' },
    { date: '2026-09-18', expectedDte: 13, desc: 'Setembro Mensal' },
    { date: '2026-09-25', expectedDte: 18, desc: 'Setembro W4' },
    { date: '2026-10-02', expectedDte: 23, desc: 'Outubro W1' },
    { date: '2026-10-09', expectedDte: 28, desc: 'Outubro W2' },
    { date: '2026-10-16', expectedDte: 32, desc: 'Outubro Mensal' },
    { date: '2026-10-23', expectedDte: 37, desc: 'Outubro W4' },
    { date: '2026-10-30', expectedDte: 42, desc: 'Outubro W5' },
    { date: '2026-11-06', expectedDte: 46, desc: 'Novembro W1' },
    { date: '2026-11-19', expectedDte: 55, desc: 'Novembro Mensal' },
    { date: '2026-12-18', expectedDte: 75, desc: 'Dezembro Mensal' },
    { date: '2027-01-15', expectedDte: 93, desc: 'Janeiro Mensal' },
  ];

  profitExpectedCases.forEach(({ date, expectedDte, desc }) => {
    it(`deve calcular exatamente ${expectedDte} dias úteis para ${date} (${desc})`, () => {
      const dte = calculateB3BusinessDays(baseDate, date);
      expect(dte).toBe(expectedDte);
    });
  });

  it('deve calcular 4 dias úteis a partir do fim de semana 2026-08-01 até 2026-08-07', () => {
    const dte = calculateB3BusinessDays('2026-08-01', '2026-08-07');
    expect(dte).toBe(4);
  });
});
