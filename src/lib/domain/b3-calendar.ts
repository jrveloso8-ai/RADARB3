/**
 * Módulo de Calendário B3 e Cálculo de Dias Úteis (ANBIMA / B3 / Padrão Profit)
 */

// Cálculo da Páscoa pelo Algoritmo de Meeus/Jones/Butcher
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day, 12, 0, 0);
}

// Retorna conjunto de feriados nacionais e da B3 no formato 'YYYY-MM-DD'
export function getB3Holidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const pad = (n: number) => String(n).padStart(2, '0');

  // Feriados Fixos
  holidays.add(`${year}-01-01`); // Confraternização Universal
  holidays.add(`${year}-04-21`); // Tiradentes
  holidays.add(`${year}-05-01`); // Dia do Trabalho
  holidays.add(`${year}-09-07`); // Independência do Brasil
  holidays.add(`${year}-10-12`); // Nossa Senhora Aparecida
  holidays.add(`${year}-11-02`); // Finados
  holidays.add(`${year}-11-15`); // Proclamação da República
  holidays.add(`${year}-11-20`); // Consciência Negra
  holidays.add(`${year}-12-25`); // Natal

  // Feriados Móveis baseados na Páscoa
  const easter = getEasterDate(year);

  // Carnaval (Segunda e Terça: -48 e -47 dias da Páscoa)
  const carnivalMon = new Date(easter.getTime() - 48 * 86400000);
  const carnivalTue = new Date(easter.getTime() - 47 * 86400000);
  holidays.add(`${carnivalMon.getFullYear()}-${pad(carnivalMon.getMonth() + 1)}-${pad(carnivalMon.getDate())}`);
  holidays.add(`${carnivalTue.getFullYear()}-${pad(carnivalTue.getMonth() + 1)}-${pad(carnivalTue.getDate())}`);

  // Sexta-feira Santa / Paixão de Cristo (-2 dias da Páscoa)
  const goodFriday = new Date(easter.getTime() - 2 * 86400000);
  holidays.add(`${goodFriday.getFullYear()}-${pad(goodFriday.getMonth() + 1)}-${pad(goodFriday.getDate())}`);

  // Corpus Christi (+60 dias da Páscoa)
  const corpusChristi = new Date(easter.getTime() + 60 * 86400000);
  holidays.add(`${corpusChristi.getFullYear()}-${pad(corpusChristi.getMonth() + 1)}-${pad(corpusChristi.getDate())}`);

  return holidays;
}

/**
 * Normaliza qualquer Date ou string YYYY-MM-DD para Date com horário neutro 12:00:00
 */
export function normalizeDate(d: Date | string): Date {
  if (typeof d === 'string') {
    const parts = d.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    }
    const parsed = new Date(d);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

/**
 * Calcula a quantidade de DIAS ÚTEIS (Business Days) até o vencimento no padrão oficial da B3 e Profit.
 * Se a consulta for feita no fim de semana, avança para a segunda-feira como pregão de referência.
 */
export function calculateB3BusinessDays(startDate: Date | string, endDate: Date | string): number {
  const pad = (n: number) => String(n).padStart(2, '0');
  const current = normalizeDate(startDate);
  const target = normalizeDate(endDate);

  if (current >= target) return 0;

  // Ajustar fim de semana para a próxima segunda-feira como pregão base de referência
  while (current.getDay() === 0 || current.getDay() === 6) {
    current.setDate(current.getDate() + 1);
  }

  if (current >= target) return 0;

  // Cache de feriados por ano
  const holidaysByYear = new Map<number, Set<string>>();
  const getHolidays = (y: number) => {
    if (!holidaysByYear.has(y)) {
      holidaysByYear.set(y, getB3Holidays(y));
    }
    return holidaysByYear.get(y)!;
  };

  let businessDays = 0;
  current.setDate(current.getDate() + 1);

  while (current <= target) {
    const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = current.getFullYear();
      const dateStr = `${y}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
      const yearHolidays = getHolidays(y);

      if (!yearHolidays.has(dateStr)) {
        businessDays++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}
