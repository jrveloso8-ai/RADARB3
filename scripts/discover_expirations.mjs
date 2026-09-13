/**
 * Descobre quais vencimentos a BRAPI tem disponíveis para um ativo
 * e testa automaticamente o mais líquido encontrado.
 *
 * Uso: node scripts/discover_expirations.mjs [TICKER]
 */

import { readFileSync } from 'fs';

function loadToken() {
  try {
    const env = readFileSync('.env.local', 'utf8');
    for (const line of env.split('\n')) {
      const [k, v] = line.split('=');
      if (k?.trim() === 'BRAPI_API_KEY' && v?.trim()) return v.trim();
    }
  } catch {}
  return null;
}

function decodeStrikeFromSymbol(symbol) {
  const match = symbol.match(/^[A-Z]{4,5}[A-Z](\d+)$/);
  if (!match) return null;
  const code = parseInt(match[1], 10);
  return { code, div10: code / 10, div100: code / 100 };
}

async function main() {
  const ticker = process.argv[2] || 'PETR4';
  const token = loadToken();
  const BASE = 'https://brapi.dev/api';

  if (!token) { console.error('❌ Token não encontrado'); process.exit(1); }

  // ─── 1. Buscar posições para ver vencimentos disponíveis ───────────────
  console.log(`\nBuscando vencimentos disponíveis na BRAPI para ${ticker}...`);
  
  // A BRAPI /v2/options/positions sem expirationDate pode retornar a lista
  // Tenta alguns endpoints para descobrir
  const attempts = [
    `/v2/options/${ticker}`,
    `/v2/options/positions?underlying=${ticker}`,
    `/v2/options/analytics?underlying=${ticker}`,
    `/quote/${ticker}?modules=options`,
  ];

  let foundData = null;
  let foundUrl = '';
  for (const path of attempts) {
    try {
      const url = `${BASE}${path}&token=${token}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        console.log(`  ✅ ${path} → HTTP 200`);
        console.log(`     Keys: ${Object.keys(data).join(', ')}`);
        if (data.expirationDates || data.expirationDate || data.analytics || data.positions) {
          foundData = data;
          foundUrl = path;
          break;
        }
      } else {
        const txt = await res.text().catch(() => '');
        console.log(`  ❌ ${path} → HTTP ${res.status}: ${txt.slice(0,100)}`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${path} → ${e.message}`);
    }
  }

  // ─── 2. Tentar datas de vencimento B3 dos próximos 6 meses ─────────────
  console.log(`\nTestando datas de vencimento B3 (3ª sexta-feira dos próximos 6 meses)...`);
  
  const candidateDates = getNextB3Expirations(6);
  console.log(`  Datas candidatas: ${candidateDates.join(', ')}\n`);

  const validExpirations = [];

  for (const date of candidateDates) {
    try {
      const url = `${BASE}/v2/options/analytics?underlying=${ticker}&expirationDate=${date}&token=${token}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const items = data?.analytics || data?.options || (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          console.log(`  ✅ ${date} → ${items.length} séries encontradas (spot: R$ ${data.underlyingPrice || '?'})`);
          validExpirations.push({ date, count: items.length, data });
        } else {
          console.log(`  ⚠️  ${date} → resposta OK mas sem séries`);
        }
      } else {
        const txt = await res.text().catch(() => '');
        const msg = JSON.parse(txt)?.message || txt.slice(0, 80);
        console.log(`  ❌ ${date} → HTTP ${res.status}: ${msg}`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${date} → ${e.message}`);
    }
  }

  if (validExpirations.length === 0) {
    console.log('\n❌ Nenhum vencimento com dados encontrado na BRAPI para ' + ticker);
    console.log('   Verifique se o ativo possui opções listadas na B3.');
    return;
  }

  // ─── 3. Analisar o vencimento mais próximo com mais séries ─────────────
  const best = validExpirations[0]; // Mais próximo (primeiro com dados)
  const analytics = best.data?.analytics || best.data?.options || [];
  const spot = best.data?.underlyingPrice || 0;

  console.log(`\n${'═'.repeat(90)}`);
  console.log(`  ANÁLISE DE STRIKES: ${ticker} | Vencimento: ${best.date} | ${analytics.length} séries | Spot: R$ ${spot}`);
  console.log(`${'═'.repeat(90)}\n`);

  console.log(`  ${'SÍMBOLO'.padEnd(14)} ${'TIPO'.padEnd(5)} ${'STRIKE BRAPI'.padStart(12)} ${'DEC /10'.padStart(9)} ${'DEC /100'.padStart(10)} ${'Δ(/10)'.padStart(9)}  VEREDICTO`);
  console.log('  ' + '─'.repeat(84));

  let nOk = 0, nDivergent = 0;
  const divergences = [];

  const sorted = [...analytics].sort((a, b) => {
    if (a.side !== b.side) return a.side === 'call' ? -1 : 1;
    return a.strike - b.strike;
  });

  for (const item of sorted) {
    const sym = item.symbol || '';
    const brapiStrike = Number(item.strike);
    const dec = decodeStrikeFromSymbol(sym);

    if (!dec) {
      console.log(`  ${sym.padEnd(14)} ${'?'.padEnd(5)} ${brapiStrike.toFixed(2).padStart(12)}  ← não parseável`);
      continue;
    }

    const delta10 = Number((brapiStrike - dec.div10).toFixed(4));
    const isDivergent = Math.abs(delta10) > 0.05;
    const verdict = isDivergent
      ? `❌ Δ=${delta10 > 0 ? '+' : ''}${delta10.toFixed(4)} (Profit provavelmente mostra R$ ${dec.div10.toFixed(2)})`
      : '✅ OK';

    const side = item.side === 'call' ? 'CALL ' : 'PUT  ';
    console.log(
      `  ${sym.padEnd(14)} ${side} ${brapiStrike.toFixed(2).padStart(12)} ${dec.div10.toFixed(2).padStart(9)} ${dec.div100.toFixed(2).padStart(10)} ${(delta10 >= 0 ? '+' : '') + delta10.toFixed(4).padStart(8)}  ${verdict}`
    );

    if (isDivergent) { nDivergent++; divergences.push({ sym, brapiStrike, expected: dec.div10, delta: delta10 }); }
    else nOk++;
  }

  // ─── 4. Resumo e conclusão ──────────────────────────────────────────────
  console.log(`\n${'═'.repeat(90)}`);
  console.log(`  RESUMO: ${nOk} OK | ${nDivergent} DIVERGENTES`);

  if (nDivergent > 0) {
    const deltas = divergences.map(d => d.delta);
    const spreadDelta = Math.max(...deltas) - Math.min(...deltas);
    console.log(`\n  🔴 CAUSA DO BUG IDENTIFICADA:`);
    if (spreadDelta < 0.02) {
      console.log(`  Delta constante ≈ ${deltas[0].toFixed(4)} → Strike ajustado por PROVENTO (ex-dividend)`);
      console.log(`  BRAPI retorna strike ajustado, Profit mostra strike nominal (registrado na B3)`);
      console.log(`  Ação recomendada: exibir aviso "Strike ajustado. Profit mostrará R$ X."` );
    } else {
      console.log(`  Delta variável (spread=${spreadDelta.toFixed(4)}) → Dados BRAPI inconsistentes por série`);
      console.log(`  Ação recomendada: decodificar strike do símbolo como fonte de verdade`);
    }
  } else {
    console.log(`\n  ✅ BRAPI está em acordo com a convenção B3 para ${ticker}/${best.date}`);
  }
  console.log('');
}

function getNextB3Expirations(count) {
  const now = new Date();
  const results = [];
  let year = now.getFullYear();
  let month = now.getMonth();

  while (results.length < count) {
    let fridayCount = 0;
    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) break;
      if (date.getDay() === 5) {
        fridayCount++;
        if (fridayCount === 3) {
          const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          // Incluir mesmo expirado — a BRAPI pode ainda ter dados
          results.push(str);
          break;
        }
      }
    }
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return results;
}

main().catch(console.error);
