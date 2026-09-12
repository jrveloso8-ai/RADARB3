import { fetchLiveMarketQuote, getLiveMarketOverview } from './src/lib/services/market-quotes';
import { calculateMarketSentiment } from './src/lib/domain/sentiment';

(async () => {
  console.log('===== P9: FEED EXTERNO INDISPONIVEL =====');
  const q = await fetchLiveMarketQuote('SPY', 'S&P 500 ETF (SPY)');
  console.log('fetchLiveMarketQuote("SPY") =', JSON.stringify(q));
  const inventado = await fetchLiveMarketQuote('ZZZZ', 'Ativo Inexistente');
  console.log('fetchLiveMarketQuote("ZZZZ") =', JSON.stringify(inventado), '<- ativo que nao existe recebe preco 100');
  console.log('Existe algum campo indicando fallback/staleness?', Object.keys(q).join(', '));

  const ov = await getLiveMarketOverview().catch(() => undefined);
  console.log('\ngetLiveMarketOverview() lancou erro?', ov === undefined ? 'SIM' : 'NAO — retornou objeto "ao vivo"');

  const rep = calculateMarketSentiment(new Date(), ov);
  console.log('\n===== P10: TERMOMETRO DE SENTIMENTO SOBRE ESSES DADOS =====');
  console.log('score =', rep.score, '| temperatura =', rep.temperatureCelsius + 'C', '| zona =', rep.zoneLabel);
  console.log('sessao =', rep.session.sessionName, '|', rep.session.timeSlotLabel, '| B3 aberta?', rep.session.isB3Open);
  for (const p of rep.pillars) console.log(` - ${p.name}: score ${p.score} | ${p.statusLabel}`);
  console.log('\nresumo do pilar 4 (curva de juros/DI):', rep.pillars[3].summary);
  console.log('resumo do pilar 5 (fluxo estrangeiro B3):', rep.pillars[4].summary);
  console.log('\ncotacoes exibidas:', JSON.stringify(rep.marketQuotes?.slice(0, 4)));
})();
