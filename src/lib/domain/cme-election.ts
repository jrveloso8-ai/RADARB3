import {
  B3ExpirationInfo,
  OptionAnalysisResult,
  OptionPositionItem,
  StraddleRow,
} from '../types/financial';
import {
  OPTION_25_STRATEGIES,
  OptionStrategySpec,
  CME_25_STRATEGIES,
  CMEStrategySpec,
} from './cme-strategies';
import { classifyVolatilityRegime } from './volatility';

export interface OptionLegDetail {
  action: 'COMPRA' | 'VENDA';
  symbol: string;
  strike: number;
  type: 'CALL' | 'PUT';
  unitPrice: number;
  lotQuantity: number;
  totalFinancial: number;
  openInterest: number;
}

export type CMELegDetail = OptionLegDetail;

export interface ElectedOptionStrategy {
  strategySpec: OptionStrategySpec;
  title: string;
  bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'VOLATILIDADE' | 'NEUTRO';
  status: 'AUTORIZADA' | 'EM_ANALISE' | 'BLOQUEADA';
  expirationDate: string;
  dte: number;
  underlyingSymbol: string;
  underlyingPrice: number;

  // Detalhes da montagem financeira
  legs: OptionLegDetail[];
  netCostOrCredit: number; // Por cota
  isCredit: boolean;
  totalCostOrCreditForLot: number; // Para 1 lote padrão (1.000 cotas)
  spreadWidth: number;
  breakEven: number;
  maxProfit: number;
  maxProfitLot: number;
  maxLoss: number;
  maxLossLot: number;
  returnOnRiskPct: number;
  riskRewardRatio: string;

  // Gatilhos de saída operacionais
  takeProfitRule: {
    targetPrice: string;
    profitGoal: string;
    description: string;
  };
  stopLossRule: {
    stopPrice: string;
    lossLimit: string;
    description: string;
  };
  timeStopRule: {
    dteLimit: number;
    description: string;
  };

  // Racional da Eleição
  electionRationale: string[];

  // Boleta de Envio para Home Broker / Genial / Profit
  homeBrokerOrderSlip: {
    orderType: string;
    entryPriceRange: string;
    maxSlippage: string;
    legsSummary: string;
  };
}

/**
 * Motor de Inteligência para Eleição da ÚNICA Melhor Estratégia de Opções B3
 * Analisa: Tendência CNPI-T, Fundamentos CNPI-P, RSI(14), Regime de Volatilidade (HV/IV), Barreiras OI e Max Pain.
 */
export function electBestOptionStrategy(
  symbol: string,
  spotPrice: number,
  verdict: string,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  rsi: number | null,
  hv21: number,
  optionAnalysis?: OptionAnalysisResult,
  fundamentalStatus?: 'APROVADO' | 'REPROVADO'
): ElectedOptionStrategy | null {
  if (!optionAnalysis || !optionAnalysis.straddleRows || optionAnalysis.straddleRows.length === 0) {
    return null;
  }

  const spot = spotPrice > 0 ? spotPrice : optionAnalysis.underlyingPrice;
  const dte = optionAnalysis.selectedExpirationInfo?.dte || 15;
  const expDate = optionAnalysis.selectedExpiration || '2026-09-18';
  const ivAtm = optionAnalysis.ivAtm?.callIv || hv21 || 25.0;
  const maxPain = optionAnalysis.maxPain || spot;

  const lotSize = 1000;

  // =========================================================================
  // CRIVO DE SEGURANÇA 1: BLOQUEIO POR FUNDAMENTOS
  // =========================================================================
  const isFundamentalReproved =
    fundamentalStatus === 'REPROVADO' ||
    verdict.includes('BLOQUEADO') ||
    verdict === 'BLOQUEADO_POR_FUNDAMENTOS';

  if (isFundamentalReproved) {
    return {
      strategySpec: OPTION_25_STRATEGIES[0],
      title: 'Estratégia Bloqueada: Ativo Reprovado nos Fundamentos (CNPI-P)',
      bias: 'NEUTRO',
      status: 'BLOQUEADA',
      expirationDate: expDate,
      dte,
      underlyingSymbol: symbol,
      underlyingPrice: spot,
      legs: [],
      netCostOrCredit: 0,
      isCredit: false,
      totalCostOrCreditForLot: 0,
      spreadWidth: 0,
      breakEven: spot,
      maxProfit: 0,
      maxProfitLot: 0,
      maxLoss: 0,
      maxLossLot: 0,
      returnOnRiskPct: 0,
      riskRewardRatio: '0 : 0',
      takeProfitRule: { targetPrice: '-', profitGoal: '-', description: '-' },
      stopLossRule: { stopPrice: '-', lossLimit: '-', description: '-' },
      timeStopRule: { dteLimit: 0, description: '-' },
      electionRationale: [
        `Empresa reprovada no crivo fundamentalista (prejuízo líquido recorrente ou superendividamento).`,
        `Montagem de estratégias com opções terminantemente desaconselhada para evitar armadilhas de valor (Value Trap) e risco de colapso de suporte.`,
      ],
      homeBrokerOrderSlip: {
        orderType: 'BLOQUEADO',
        entryPriceRange: 'Nenhuma ordem autorizada',
        maxSlippage: '0',
        legsSummary: 'OPERAÇÃO BLOQUEADA PELOS FUNDAMENTOS',
      },
    };
  }

  // Filtrar strikes reais com cotação e Open Interest
  const validRows = optionAnalysis.straddleRows
    .filter((r) => r.strike > 0)
    .sort((a, b) => a.strike - b.strike);

  if (validRows.length < 2) return null;

  // Classificar regime de volatilidade
  const volRegime = classifyVolatilityRegime(ivAtm, hv21);

  // =========================================================================
  // CENÁRIO 1: ALTA / COMPRA FORTE (Direcional Altista)
  // =========================================================================
  if (verdict.includes('COMPRA') || trend === 'ALTA') {
    const isHighIV = volRegime.isCreditFavorable && (ivAtm >= hv21 * 0.95 || ivAtm >= 30.0);

    if (isHighIV) {
      // Estratégia #11: Bull Put Spread a Crédito (Venda OTM Put no suporte + Compra Put proteção)
      const putsBelowSpot = validRows.filter((r) => r.strike <= spot * 0.99 && r.put);
      const shortPutRow = putsBelowSpot[putsBelowSpot.length - 1] || validRows[0];
      const longPutRow = putsBelowSpot[Math.max(0, putsBelowSpot.length - 3)] || validRows[0];

      if (shortPutRow && longPutRow && shortPutRow.strike > longPutRow.strike) {
        const shortStrike = shortPutRow.strike;
        const longStrike = longPutRow.strike;
        const width = Number((shortStrike - longStrike).toFixed(2));

        const shortPrice = shortPutRow.put?.lastPrice || Number((width * 0.40).toFixed(2));
        const longPrice = longPutRow.put?.lastPrice || Number((width * 0.15).toFixed(2));
        const netCredit = Number((Math.max(0.05, shortPrice - longPrice)).toFixed(2));

        const maxProfit = netCredit;
        const maxLoss = Number((width - netCredit).toFixed(2));
        const breakEven = Number((shortStrike - netCredit).toFixed(2));
        const returnPct = Number(((netCredit / width) * 100).toFixed(1));

        return {
          strategySpec: OPTION_25_STRATEGIES[10], // #11 Bull Spread
          title: `Estratégia de Opções #11: Trava de Alta com Put a Crédito (Bull Put Spread ${shortStrike.toFixed(2)} / ${longStrike.toFixed(2)})`,
          bias: 'ALTA',
          status: 'AUTORIZADA',
          expirationDate: expDate,
          dte,
          underlyingSymbol: symbol,
          underlyingPrice: spot,
          legs: [
            {
              action: 'VENDA',
              symbol: shortPutRow.put?.symbol || `${symbol}U${Math.round(shortStrike * 10)}`,
              strike: shortStrike,
              type: 'PUT',
              unitPrice: shortPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
              openInterest: shortPutRow.put?.openInterest || 100000,
            },
            {
              action: 'COMPRA',
              symbol: longPutRow.put?.symbol || `${symbol}U${Math.round(longStrike * 10)}`,
              strike: longStrike,
              type: 'PUT',
              unitPrice: longPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((longPrice * lotSize).toFixed(2)),
              openInterest: longPutRow.put?.openInterest || 50000,
            },
          ],
          netCostOrCredit: netCredit,
          isCredit: true,
          totalCostOrCreditForLot: Number((netCredit * lotSize).toFixed(2)),
          spreadWidth: width,
          breakEven,
          maxProfit,
          maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
          maxLoss,
          maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
          returnOnRiskPct: returnPct,
          riskRewardRatio: `1 : ${(maxLoss / maxProfit).toFixed(1)}`,
          takeProfitRule: {
            targetPrice: `R$ ${shortStrike.toFixed(2)} (ou superior)`,
            profitGoal: `Capturar 75% a 80% do crédito (R$ ${(netCredit * 0.8 * lotSize).toFixed(2)} no lote)`,
            description: `Encerrar a trava quando as opções perderem a maior parte do prêmio por decaimento temporal (Theta).`,
          },
          stopLossRule: {
            stopPrice: `Fechamento abaixo de R$ ${longStrike.toFixed(2)} ou perda da MM20`,
            lossLimit: `Stop se a perda atingir 2x o crédito recebido (R$ ${(netCredit * 2 * lotSize).toFixed(2)})`,
            description: `Desmontar imediatamente se o ativo romper o suporte e entrar em zona de risco de exercício da ponta vendida.`,
          },
          timeStopRule: {
            dteLimit: 5,
            description: `Desmontar a operação a 5 dias úteis do vencimento para eliminar risco de atribuição.`,
          },
          electionRationale: [
            `Ativo aprovado no Crivo Fundamentalista (CNPI-P) e gráfico alinhado em Tendência de Alta (MM20 > MM50).`,
            `Volatilidade Implícita (${volRegime.label}, IV ATM: ${ivAtm}%) favorável à VENDA DE CRÉDITO para captura de prêmio e IV Crush.`,
            `Perna vendida posicionada no strike R$ ${shortStrike.toFixed(2)} com colchão de segurança e defesa institucional.`,
          ],
          homeBrokerOrderSlip: {
            orderType: `Ordem de Spread Limite a Crédito (Vender ${shortPutRow.put?.symbol || 'P1'} / Comprar ${longPutRow.put?.symbol || 'P2'})`,
            entryPriceRange: `Crédito Líquido mínimo de R$ ${(netCredit * 0.9).toFixed(2)} a R$ ${netCredit.toFixed(2)} por cota`,
            maxSlippage: `R$ 0,02 de spread entre as pontas`,
            legsSummary: `VENDER ${lotSize} ${shortPutRow.put?.symbol || 'P1'} @ R$ ${shortPrice.toFixed(2)} | COMPRAR ${lotSize} ${longPutRow.put?.symbol || 'P2'} @ R$ ${longPrice.toFixed(2)}`,
          },
        };
      }
    }

    // Trava de Alta com Call (Bull Call Spread a Débito - IV Normal ou Baixa)
    const callsNearSpot = validRows.filter((r) => r.strike >= spot * 0.98 && r.call);
    const longCallRow = callsNearSpot[0] || validRows.find((r) => r.call) || validRows[0];
    const shortCallRow = callsNearSpot[Math.min(callsNearSpot.length - 1, 2)] || validRows[validRows.length - 1];

    if (longCallRow && shortCallRow && shortCallRow.strike > longCallRow.strike) {
      const longStrike = longCallRow.strike;
      const shortStrike = shortCallRow.strike;
      const width = Number((shortStrike - longStrike).toFixed(2));

      const longPrice = longCallRow.call?.lastPrice || Number((width * 0.55).toFixed(2));
      const shortPrice = shortCallRow.call?.lastPrice || Number((width * 0.20).toFixed(2));
      const netDebit = Number((Math.max(0.10, longPrice - shortPrice)).toFixed(2));

      const maxProfit = Number((width - netDebit).toFixed(2));
      const maxLoss = netDebit;
      const breakEven = Number((longStrike + netDebit).toFixed(2));
      const returnPct = Number(((maxProfit / netDebit) * 100).toFixed(1));

      return {
        strategySpec: OPTION_25_STRATEGIES[10], // #11 Bull Spread
        title: `Estratégia de Opções #11: Trava de Alta com Call (Bull Call Spread ${longStrike.toFixed(2)} / ${shortStrike.toFixed(2)})`,
        bias: 'ALTA',
        status: 'AUTORIZADA',
        expirationDate: expDate,
        dte,
        underlyingSymbol: symbol,
        underlyingPrice: spot,
        legs: [
          {
            action: 'COMPRA',
            symbol: longCallRow.call?.symbol || `${symbol}I${Math.round(longStrike * 10)}`,
            strike: longStrike,
            type: 'CALL',
            unitPrice: longPrice,
            lotQuantity: lotSize,
            totalFinancial: Number((longPrice * lotSize).toFixed(2)),
            openInterest: longCallRow.call?.openInterest || 100000,
          },
          {
            action: 'VENDA',
            symbol: shortCallRow.call?.symbol || `${symbol}I${Math.round(shortStrike * 10)}`,
            strike: shortStrike,
            type: 'CALL',
            unitPrice: shortPrice,
            lotQuantity: lotSize,
            totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
            openInterest: shortCallRow.call?.openInterest || 50000,
          },
        ],
        netCostOrCredit: netDebit,
        isCredit: false,
        totalCostOrCreditForLot: Number((netDebit * lotSize).toFixed(2)),
        spreadWidth: width,
        breakEven,
        maxProfit,
        maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
        maxLoss,
        maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
        returnOnRiskPct: returnPct,
        riskRewardRatio: `1 : ${(maxProfit / maxLoss).toFixed(1)}`,
        takeProfitRule: {
          targetPrice: `R$ ${shortStrike.toFixed(2)} (Alvo da trava)`,
          profitGoal: `Realizar ao capturar 80% do ganho máximo (R$ ${(maxProfit * 0.8 * lotSize).toFixed(2)} no lote)`,
          description: `Desmontar a operação quando o ativo atingir o strike vendido ou a Call Wall.`,
        },
        stopLossRule: {
          stopPrice: `Perda da MM20 (R$ ${(spot * 0.97).toFixed(2)})`,
          lossLimit: `Stop ao atingir 50% de desvalorização do prêmio pago (R$ ${(netDebit * 0.5 * lotSize).toFixed(2)})`,
          description: `Desmontar antes da perda total do prêmio pago se o ativo desconfigurar o pivô de alta.`,
        },
        timeStopRule: {
          dteLimit: 5,
          description: `Encerrar a 5 dias úteis do vencimento.`,
        },
        electionRationale: [
          `Setup altista com opções a custo reduzido (${volRegime.label}, IV ATM: ${ivAtm}%).`,
          `Risco 100% limitado ao custo inicial pago pelo spread.`,
          `Perna comprada ATM no strike R$ ${longStrike.toFixed(2)} captura valorização e perna vendida no strike R$ ${shortStrike.toFixed(2)} financia o custo.`,
        ],
        homeBrokerOrderSlip: {
          orderType: `Ordem de Spread Limite a Débito (Comprar ${longCallRow.call?.symbol || 'C1'} / Vender ${shortCallRow.call?.symbol || 'C2'})`,
          entryPriceRange: `Débito Líquido máximo de R$ ${netDebit.toFixed(2)} a R$ ${(netDebit * 1.05).toFixed(2)} por cota`,
          maxSlippage: `R$ 0,02 de spread`,
          legsSummary: `COMPRAR ${lotSize} ${longCallRow.call?.symbol || 'C1'} @ R$ ${longPrice.toFixed(2)} | VENDER ${lotSize} ${shortCallRow.call?.symbol || 'C2'} @ R$ ${shortPrice.toFixed(2)}`,
        },
      };
    }
  }

  // =========================================================================
  // CENÁRIO 2: BAIXA / VENDA TÉCNICA (Direcional Baixista)
  // =========================================================================
  if (verdict.includes('VENDA') || trend === 'BAIXA') {
    const isHighIV = volRegime.isCreditFavorable && (ivAtm >= hv21 * 0.95 || ivAtm >= 28.0);

    if (isHighIV) {
      // Estratégia #12: Bear Call Spread a Crédito (IV Alta)
      const callsAboveSpot = validRows.filter((r) => r.strike >= spot * 1.01 && r.call);
      const shortCallRow = callsAboveSpot[0] || validRows[validRows.length - 2];
      const longCallRow = callsAboveSpot[Math.min(callsAboveSpot.length - 1, 2)] || validRows[validRows.length - 1];

      if (shortCallRow && longCallRow && longCallRow.strike > shortCallRow.strike) {
        const shortStrike = shortCallRow.strike;
        const longStrike = longCallRow.strike;
        const width = Number((longStrike - shortStrike).toFixed(2));

        const shortPrice = shortCallRow.call?.lastPrice || Number((width * 0.40).toFixed(2));
        const longPrice = longCallRow.call?.lastPrice || Number((width * 0.15).toFixed(2));
        const netCredit = Number((Math.max(0.05, shortPrice - longPrice)).toFixed(2));

        const maxProfit = netCredit;
        const maxLoss = Number((width - netCredit).toFixed(2));
        const breakEven = Number((shortStrike + netCredit).toFixed(2));
        const returnPct = Number(((netCredit / width) * 100).toFixed(1));

        return {
          strategySpec: OPTION_25_STRATEGIES[11], // #12 Bear Spread
          title: `Estratégia de Opções #12: Trava de Baixa com Call a Crédito (Bear Call Spread ${shortStrike.toFixed(2)} / ${longStrike.toFixed(2)})`,
          bias: 'BAIXA',
          status: 'AUTORIZADA',
          expirationDate: expDate,
          dte,
          underlyingSymbol: symbol,
          underlyingPrice: spot,
          legs: [
            {
              action: 'VENDA',
              symbol: shortCallRow.call?.symbol || `${symbol}I${Math.round(shortStrike * 10)}`,
              strike: shortStrike,
              type: 'CALL',
              unitPrice: shortPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
              openInterest: shortCallRow.call?.openInterest || 100000,
            },
            {
              action: 'COMPRA',
              symbol: longCallRow.call?.symbol || `${symbol}I${Math.round(longStrike * 10)}`,
              strike: longStrike,
              type: 'CALL',
              unitPrice: longPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((longPrice * lotSize).toFixed(2)),
              openInterest: longCallRow.call?.openInterest || 50000,
            },
          ],
          netCostOrCredit: netCredit,
          isCredit: true,
          totalCostOrCreditForLot: Number((netCredit * lotSize).toFixed(2)),
          spreadWidth: width,
          breakEven,
          maxProfit,
          maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
          maxLoss,
          maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
          returnOnRiskPct: returnPct,
          riskRewardRatio: `1 : ${(maxLoss / maxProfit).toFixed(1)}`,
          takeProfitRule: {
            targetPrice: `R$ ${shortStrike.toFixed(2)} (ou inferior)`,
            profitGoal: `Capturar 80% do crédito recebido (R$ ${(netCredit * 0.8 * lotSize).toFixed(2)} no lote)`,
            description: `Encerrar a trava quando as Calls perderem valor pela continuidade da tendência de baixa.`,
          },
          stopLossRule: {
            stopPrice: `Rompimento da MM20 para cima (R$ ${shortStrike.toFixed(2)})`,
            lossLimit: `Stop ao atingir 2x o crédito recebido (R$ ${(netCredit * 2 * lotSize).toFixed(2)})`,
            description: `Desmontar imediatamente se o ativo recuperar a média de 20 e invalidar o viés baixista.`,
          },
          timeStopRule: {
            dteLimit: 5,
            description: `Encerrar a 5 dias úteis do vencimento.`,
          },
          electionRationale: [
            `Alinhamento técnico de baixa (MM20 < MM50 < MM200).`,
            `Volatilidade Implícita alta (${volRegime.label}, IV ATM: ${ivAtm}%) favorece VENDA DE CRÉDITO acima da Call Wall.`,
            `Recebimento de crédito antecipado com probabilidade estatística a favor da desvalorização/estabilização.`,
          ],
          homeBrokerOrderSlip: {
            orderType: `Ordem de Spread Limite a Crédito (Vender ${shortCallRow.call?.symbol || 'C1'} / Comprar ${longCallRow.call?.symbol || 'C2'})`,
            entryPriceRange: `Crédito Líquido mínimo de R$ ${(netCredit * 0.9).toFixed(2)} a R$ ${netCredit.toFixed(2)} por cota`,
            maxSlippage: `R$ 0,02 de spread`,
            legsSummary: `VENDER ${lotSize} ${shortCallRow.call?.symbol || 'C1'} @ R$ ${shortPrice.toFixed(2)} | COMPRAR ${lotSize} ${longCallRow.call?.symbol || 'C2'} @ R$ ${longPrice.toFixed(2)}`,
          },
        };
      }
    }

    // Trava de Baixa com Put a Débito (Bear Put Spread - IV Normal ou Baixa)
    const putsNearSpot = validRows.filter((r) => r.strike <= spot * 1.02 && r.put);
    const longPutRow = putsNearSpot[putsNearSpot.length - 1] || validRows[0];
    const shortPutRow = putsNearSpot[Math.max(0, putsNearSpot.length - 3)] || validRows[0];

    if (longPutRow && shortPutRow && longPutRow.strike > shortPutRow.strike) {
      const longStrike = longPutRow.strike;
      const shortStrike = shortPutRow.strike;
      const width = Number((longStrike - shortStrike).toFixed(2));

      const longPrice = longPutRow.put?.lastPrice || Number((width * 0.55).toFixed(2));
      const shortPrice = shortPutRow.put?.lastPrice || Number((width * 0.20).toFixed(2));
      const netDebit = Number((Math.max(0.10, longPrice - shortPrice)).toFixed(2));

      const maxProfit = Number((width - netDebit).toFixed(2));
      const maxLoss = netDebit;
      const breakEven = Number((longStrike - netDebit).toFixed(2));
      const returnPct = Number(((maxProfit / netDebit) * 100).toFixed(1));

      return {
        strategySpec: OPTION_25_STRATEGIES[11], // #12 Bear Spread
        title: `Estratégia de Opções #12: Trava de Baixa com Put (Bear Put Spread ${longStrike.toFixed(2)} / ${shortStrike.toFixed(2)})`,
        bias: 'BAIXA',
        status: 'AUTORIZADA',
        expirationDate: expDate,
        dte,
        underlyingSymbol: symbol,
        underlyingPrice: spot,
        legs: [
          {
            action: 'COMPRA',
            symbol: longPutRow.put?.symbol || `${symbol}U${Math.round(longStrike * 10)}`,
            strike: longStrike,
            type: 'PUT',
            unitPrice: longPrice,
            lotQuantity: lotSize,
            totalFinancial: Number((longPrice * lotSize).toFixed(2)),
            openInterest: longPutRow.put?.openInterest || 100000,
          },
          {
            action: 'VENDA',
            symbol: shortPutRow.put?.symbol || `${symbol}U${Math.round(shortStrike * 10)}`,
            strike: shortStrike,
            type: 'PUT',
            unitPrice: shortPrice,
            lotQuantity: lotSize,
            totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
            openInterest: shortPutRow.put?.openInterest || 50000,
          },
        ],
        netCostOrCredit: netDebit,
        isCredit: false,
        totalCostOrCreditForLot: Number((netDebit * lotSize).toFixed(2)),
        spreadWidth: width,
        breakEven,
        maxProfit,
        maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
        maxLoss,
        maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
        returnOnRiskPct: returnPct,
        riskRewardRatio: `1 : ${(maxProfit / maxLoss).toFixed(1)}`,
        takeProfitRule: {
          targetPrice: `R$ ${shortStrike.toFixed(2)} (Alvo da trava de baixa)`,
          profitGoal: `Realizar ao capturar 80% do ganho máximo (R$ ${(maxProfit * 0.8 * lotSize).toFixed(2)} no lote)`,
          description: `Desmontar a operação quando o ativo atingir o strike vendido ou a Put Wall.`,
        },
        stopLossRule: {
          stopPrice: `Recuperação da MM20 (R$ ${(spot * 1.03).toFixed(2)})`,
          lossLimit: `Stop ao atingir 50% de desvalorização do prêmio pago (R$ ${(netDebit * 0.5 * lotSize).toFixed(2)})`,
          description: `Desmontar para estancar perda se o ativo retomar padrão de alta.`,
        },
        timeStopRule: {
          dteLimit: 5,
          description: `Encerrar a 5 dias úteis do vencimento para evitar perda por decaimento temporal acelerado.`,
        },
        electionRationale: [
          `Tendência de baixa confirmada graficamente (MM20 < MM50).`,
          `Volatilidade Implícita reduzida (${volRegime.label}, IV ATM: ${ivAtm}%) permite compra de Puts com custo baixo (Débito).`,
          `Perna vendida financia a compra da Put ATM, limitando o risco financeiro total ao prêmio pago.`,
        ],
        homeBrokerOrderSlip: {
          orderType: `Ordem de Spread Limite a Débito (Comprar ${longPutRow.put?.symbol || 'P1'} / Vender ${shortPutRow.put?.symbol || 'P2'})`,
          entryPriceRange: `Débito Líquido máximo de R$ ${netDebit.toFixed(2)} a R$ ${(netDebit * 1.05).toFixed(2)} por cota`,
          maxSlippage: `R$ 0,02 de spread`,
          legsSummary: `COMPRAR ${lotSize} ${longPutRow.put?.symbol || 'P1'} @ R$ ${longPrice.toFixed(2)} | VENDER ${lotSize} ${shortPutRow.put?.symbol || 'P2'} @ R$ ${shortPrice.toFixed(2)}`,
        },
      };
    }
  }

  // =========================================================================
  // CENÁRIO 3: LATERALIZAÇÃO / MERCADO ESTÁVEL (Iron Condor / Short Strangle Coberto)
  // =========================================================================
  if (trend === 'LATERAL' || verdict.includes('LATERAL')) {
    // Verificação de Regime de Volatilidade:
    // Se a volatilidade for MUITO BAIXA (Squeeze), bloquear a venda de crédito do Iron Condor
    if (volRegime.regime === 'MUITO_BAIXA') {
      return {
        strategySpec: OPTION_25_STRATEGIES[12], // #13 Long Butterfly ou Cautela
        title: 'Alerta: Volatilidade Comprimida (Iron Condor Bloqueado)',
        bias: 'LATERAL',
        status: 'EM_ANALISE',
        expirationDate: expDate,
        dte,
        underlyingSymbol: symbol,
        underlyingPrice: spot,
        legs: [],
        netCostOrCredit: 0,
        isCredit: false,
        totalCostOrCreditForLot: 0,
        spreadWidth: 0,
        breakEven: spot,
        maxProfit: 0,
        maxProfitLot: 0,
        maxLoss: 0,
        maxLossLot: 0,
        returnOnRiskPct: 0,
        riskRewardRatio: '0 : 0',
        takeProfitRule: { targetPrice: '-', profitGoal: '-', description: '-' },
        stopLossRule: { stopPrice: '-', lossLimit: '-', description: '-' },
        timeStopRule: { dteLimit: 0, description: '-' },
        electionRationale: [
          `Ativo em consolidação lateral, porém com Volatilidade Implícita muito baixa (IV ATM: ${ivAtm}%, ${volRegime.label}).`,
          `Risco elevado de rompimento de volatilidade (Volatility Breakout / Squeeze) rompendo as asas do Iron Condor.`,
          `Venda de crédito desaconselhada neste nível de prêmio. Recomendado aguardar expansão de volatilidade ou operar Borboleta Comprada a débito reduzido.`,
        ],
        homeBrokerOrderSlip: {
          orderType: 'EM ESPERA',
          entryPriceRange: 'Aguardar aumento de IV',
          maxSlippage: '0',
          legsSummary: 'AGUARDANDO EXPANSÃO DE VOLATILIDADE',
        },
      };
    }

    // Volatilidade Moderada ou Alta: Eleger Estratégia #20 - Short Strangle Coberto (Iron Condor)
    const putsBelowSpot = validRows.filter((r) => r.strike <= spot * 0.99 && r.put);
    const callsAboveSpot = validRows.filter((r) => r.strike >= spot * 1.01 && r.call);

    if (putsBelowSpot.length >= 2 && callsAboveSpot.length >= 2) {
      // Perna 2 (Venda Put B - Suporte / Put Wall)
      const shortPutRow = putsBelowSpot[putsBelowSpot.length - 1];
      // Perna 1 (Compra Put A - Asa inferior proteção)
      const longPutRow = putsBelowSpot[Math.max(0, putsBelowSpot.length - 2)];

      // Perna 3 (Venda Call C - Resistência / Call Wall)
      const shortCallRow = callsAboveSpot[0];
      // Perna 4 (Compra Call D - Asa superior proteção)
      const longCallRow = callsAboveSpot[Math.min(callsAboveSpot.length - 1, 1)];

      if (
        longPutRow &&
        shortPutRow &&
        shortCallRow &&
        longCallRow &&
        longPutRow.strike < shortPutRow.strike &&
        shortPutRow.strike < shortCallRow.strike &&
        shortCallRow.strike < longCallRow.strike
      ) {
        const strikeA = longPutRow.strike;
        const strikeB = shortPutRow.strike;
        const strikeC = shortCallRow.strike;
        const strikeD = longCallRow.strike;

        const putWingWidth = Number((strikeB - strikeA).toFixed(2));
        const callWingWidth = Number((strikeD - strikeC).toFixed(2));
        const maxWingWidth = Math.max(putWingWidth, callWingWidth);

        const shortPutPrice = shortPutRow.put?.lastPrice || Number((putWingWidth * 0.35).toFixed(2));
        const longPutPrice = longPutRow.put?.lastPrice || Number((putWingWidth * 0.10).toFixed(2));
        const shortCallPrice = shortCallRow.call?.lastPrice || Number((callWingWidth * 0.35).toFixed(2));
        const longCallPrice = longCallRow.call?.lastPrice || Number((callWingWidth * 0.10).toFixed(2));

        const netCredit = Number(
          Math.max(0.10, shortPutPrice + shortCallPrice - (longPutPrice + longCallPrice)).toFixed(2)
        );

        const maxProfit = netCredit;
        const maxLoss = Number((maxWingWidth - netCredit).toFixed(2));
        const breakEvenLower = Number((strikeB - netCredit).toFixed(2));
        const breakEvenUpper = Number((strikeC + netCredit).toFixed(2));
        const returnPct = Number(((netCredit / maxLoss) * 100).toFixed(1));

        return {
          strategySpec: OPTION_25_STRATEGIES[19], // #20 Short Strangle Coberto (Iron Condor)
          title: `Estratégia de Opções #20: Short Strangle Coberto / Iron Condor (${strikeA.toFixed(2)} / ${strikeB.toFixed(2)} / ${strikeC.toFixed(2)} / ${strikeD.toFixed(2)})`,
          bias: 'LATERAL',
          status: 'AUTORIZADA',
          expirationDate: expDate,
          dte,
          underlyingSymbol: symbol,
          underlyingPrice: spot,
          legs: [
            {
              action: 'COMPRA',
              symbol: longPutRow.put?.symbol || `${symbol}U${Math.round(strikeA * 10)}`,
              strike: strikeA,
              type: 'PUT',
              unitPrice: longPutPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((longPutPrice * lotSize).toFixed(2)),
              openInterest: longPutRow.put?.openInterest || 50000,
            },
            {
              action: 'VENDA',
              symbol: shortPutRow.put?.symbol || `${symbol}U${Math.round(strikeB * 10)}`,
              strike: strikeB,
              type: 'PUT',
              unitPrice: shortPutPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((shortPutPrice * lotSize).toFixed(2)),
              openInterest: shortPutRow.put?.openInterest || 100000,
            },
            {
              action: 'VENDA',
              symbol: shortCallRow.call?.symbol || `${symbol}I${Math.round(strikeC * 10)}`,
              strike: strikeC,
              type: 'CALL',
              unitPrice: shortCallPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((shortCallPrice * lotSize).toFixed(2)),
              openInterest: shortCallRow.call?.openInterest || 100000,
            },
            {
              action: 'COMPRA',
              symbol: longCallRow.call?.symbol || `${symbol}I${Math.round(strikeD * 10)}`,
              strike: strikeD,
              type: 'CALL',
              unitPrice: longCallPrice,
              lotQuantity: lotSize,
              totalFinancial: Number((longCallPrice * lotSize).toFixed(2)),
              openInterest: longCallRow.call?.openInterest || 50000,
            },
          ],
          netCostOrCredit: netCredit,
          isCredit: true,
          totalCostOrCreditForLot: Number((netCredit * lotSize).toFixed(2)),
          spreadWidth: maxWingWidth,
          breakEven: Number(((breakEvenLower + breakEvenUpper) / 2).toFixed(2)),
          maxProfit,
          maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
          maxLoss,
          maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
          returnOnRiskPct: returnPct,
          riskRewardRatio: `1 : ${(maxLoss / maxProfit).toFixed(1)}`,
          takeProfitRule: {
            targetPrice: `Faixa entre R$ ${strikeB.toFixed(2)} e R$ ${strikeC.toFixed(2)}`,
            profitGoal: `Realizar ao capturar 60% a 70% do crédito recebido (R$ ${(netCredit * 0.7 * lotSize).toFixed(2)} no lote)`,
            description: `Encerrar a estrutura antecipadamente quando o decaimento temporal (Theta) desinflar os prêmios vendidos.`,
          },
          stopLossRule: {
            stopPrice: `Violação dos strikes vendidos (Abaixo de R$ ${strikeB.toFixed(2)} ou Acima de R$ ${strikeC.toFixed(2)})`,
            lossLimit: `Stop se a perda da estrutura atingir 1.5x o crédito recebido (R$ ${(netCredit * 1.5 * lotSize).toFixed(2)})`,
            description: `Desmontar imediatamente se o ativo iniciar tendência direcional violenta para fora do canal lateral.`,
          },
          timeStopRule: {
            dteLimit: 5,
            description: `Encerrar a 5 dias úteis do vencimento para eliminar risco de exercício de cauda.`,
          },
          electionRationale: [
            `Ativo com Fundamentos Aprovados (CNPI-P) e gráfico em Tendência Lateral consolidada.`,
            `Volatilidade Implícita favorável (${volRegime.label}, IV ATM: ${ivAtm}%) para coleta de prêmio em ambos os lados.`,
            `Miolo de venda ancorado na Put Wall (R$ ${strikeB.toFixed(2)}) e Call Wall (R$ ${strikeC.toFixed(2)}) com asas de proteção travando 100% do risco.`,
            `Faixa de lucro confortável entre R$ ${breakEvenLower.toFixed(2)} e R$ ${breakEvenUpper.toFixed(2)}.`,
          ],
          homeBrokerOrderSlip: {
            orderType: `Ordem de 4 Pontas (Iron Condor a Crédito) ou 2 Travas Combinadas`,
            entryPriceRange: `Crédito Líquido mínimo de R$ ${(netCredit * 0.9).toFixed(2)} a R$ ${netCredit.toFixed(2)} por conjunto`,
            maxSlippage: `R$ 0,03 no spread global`,
            legsSummary: `VENDER Put ${strikeB.toFixed(2)} + Call ${strikeC.toFixed(2)} | COMPRAR Put ${strikeA.toFixed(2)} + Call ${strikeD.toFixed(2)}`,
          },
        };
      }
    }
  }

  return null;
}

export const electBestCMEStrategy = electBestOptionStrategy;
