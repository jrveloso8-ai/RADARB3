import { OptionAnalysisResult, OptionPositionItem } from '../types/financial';

export interface OptionLeg {
  action: 'COMPRA' | 'VENDA';
  symbol: string;
  strike: number;
  type: 'CALL' | 'PUT';
  estimatedPrice: number;
  openInterest: number;
}

export interface OptionStructureResult {
  title: string;
  type: 'CREDIT_BULL_PUT' | 'DEBIT_BULL_CALL' | 'CREDIT_BEAR_CALL' | 'DEBIT_BEAR_PUT';
  typeLabel: string;
  status: 'AUTORIZADA' | 'EM_ANALISE' | 'BLOQUEADA';
  expirationDate: string;
  dte: number;
  underlyingPrice: number;
  legs: OptionLeg[];
  spreadWidth: number;
  netCreditOrDebit: number;
  isCredit: boolean;
  maxProfit: number;
  maxLoss: number;
  breakEven: number;
  returnPercentage: number;
  riskRewardRatio: number;
  rationalSummary: string;
  homeBrokerInstructions: {
    recommendedOrder: string;
    entryZone: string;
    maxSlippage: string;
    takeProfitRule: string;
    stopLossRule: string;
  };
}

/**
 * Constrói a estrutura de opções sugerida (Trava a Crédito ou a Débito) alinhada ao Veredito CNPI
 */
export function buildSuggestedOptionStructure(
  symbol: string,
  spotPrice: number,
  verdict: string,
  optionAnalysis?: OptionAnalysisResult
): OptionStructureResult | null {
  if (!optionAnalysis || !optionAnalysis.straddleRows || optionAnalysis.straddleRows.length === 0) {
    return null;
  }

  const dte = optionAnalysis.selectedExpirationInfo?.dte || 20;
  const expDate = optionAnalysis.selectedExpiration || '2026-09-18';
  const spot = spotPrice > 0 ? spotPrice : optionAnalysis.underlyingPrice;

  // Filtrar strikes válidos
  const rows = optionAnalysis.straddleRows.filter((r) => r.strike > 0);

  // Cenário 1: Estrutura Altista para COMPRA -> Bull Put Spread a Crédito (OTM abaixo do spot)
  if (verdict.includes('COMPRA') || verdict === 'ALTA') {
    // Achar strikes OTM de PUT abaixo do spot
    const otmPuts = rows
      .filter((r) => r.strike < spot && r.put && (r.put.openInterest || 0) > 0)
      .sort((a, b) => b.strike - a.strike); // mais próximo do spot primeiro

    const shortPutRow = otmPuts[0] || rows.find((r) => r.strike <= spot * 0.98);
    const longPutRow = otmPuts[1] || otmPuts[2] || rows.find((r) => r.strike <= spot * 0.94);

    if (shortPutRow && longPutRow && shortPutRow.strike > longPutRow.strike) {
      const shortStrike = shortPutRow.strike;
      const longStrike = longPutRow.strike;
      const spreadWidth = Number((shortStrike - longStrike).toFixed(2));

      const shortPrice = shortPutRow.put?.lastPrice || Number((spreadWidth * 0.35).toFixed(2));
      const longPrice = longPutRow.put?.lastPrice || Number((spreadWidth * 0.15).toFixed(2));
      const netCredit = Number((Math.max(0.05, shortPrice - longPrice)).toFixed(2));

      const maxProfit = netCredit;
      const maxLoss = Number((spreadWidth - netCredit).toFixed(2));
      const breakEven = Number((shortStrike - netCredit).toFixed(2));
      const returnPct = Number(((netCredit / spreadWidth) * 100).toFixed(1));

      return {
        title: `Trava de Alta com Put a Crédito (Bull Put Spread ${shortStrike.toFixed(2)} / ${longStrike.toFixed(2)})`,
        type: 'CREDIT_BULL_PUT',
        typeLabel: 'TRAVA DE ALTA A CRÉDITO',
        status: 'AUTORIZADA',
        expirationDate: expDate,
        dte,
        underlyingPrice: spot,
        legs: [
          {
            action: 'VENDA',
            symbol: shortPutRow.put?.symbol || `${symbol}V${Math.round(shortStrike)}`,
            strike: shortStrike,
            type: 'PUT',
            estimatedPrice: shortPrice,
            openInterest: shortPutRow.put?.openInterest || 100000,
          },
          {
            action: 'COMPRA',
            symbol: longPutRow.put?.symbol || `${symbol}V${Math.round(longStrike)}`,
            strike: longStrike,
            type: 'PUT',
            estimatedPrice: longPrice,
            openInterest: longPutRow.put?.openInterest || 50000,
          },
        ],
        spreadWidth,
        netCreditOrDebit: netCredit,
        isCredit: true,
        maxProfit,
        maxLoss,
        breakEven,
        returnPercentage: returnPct,
        riskRewardRatio: Number((maxLoss / maxProfit).toFixed(1)),
        rationalSummary: `Convergência ideal entre viés técnico altista (MM20/50) e crivo fundamentalista (CNPI-P). Estrutura com excelente assimetria para rentabilização direcional via theta/decaimento temporal.`,
        homeBrokerInstructions: {
          recommendedOrder: `Ordem de Spread Limite a Crédito (Vender ${shortPutRow.put?.symbol || 'P1'} e Comprar ${longPutRow.put?.symbol || 'P2'})`,
          entryZone: `Crédito Líquido mínimo de R$ ${(netCredit * 0.9).toFixed(2)} a R$ ${netCredit.toFixed(2)}`,
          maxSlippage: `R$ 0,02 de spread máximo`,
          takeProfitRule: `Encerrar ao capturar 75% a 80% do crédito máximo recebido.`,
          stopLossRule: `Stop de defesa se a ação fechar abaixo de R$ ${shortStrike.toFixed(2)} (perda da MM20).`,
        },
      };
    }
  }

  // Cenário 2: Estrutura Baixista para VENDA -> Bear Call Spread a Crédito (OTM acima do spot)
  if (verdict.includes('VENDA') || verdict === 'BAIXA') {
    const otmCalls = rows
      .filter((r) => r.strike > spot && r.call && (r.call.openInterest || 0) > 0)
      .sort((a, b) => a.strike - b.strike);

    const shortCallRow = otmCalls[0] || rows.find((r) => r.strike >= spot * 1.02);
    const longCallRow = otmCalls[1] || rows.find((r) => r.strike >= spot * 1.06);

    if (shortCallRow && longCallRow && longCallRow.strike > shortCallRow.strike) {
      const shortStrike = shortCallRow.strike;
      const longStrike = longCallRow.strike;
      const spreadWidth = Number((longStrike - shortStrike).toFixed(2));

      const shortPrice = shortCallRow.call?.lastPrice || Number((spreadWidth * 0.35).toFixed(2));
      const longPrice = longCallRow.call?.lastPrice || Number((spreadWidth * 0.15).toFixed(2));
      const netCredit = Number((Math.max(0.05, shortPrice - longPrice)).toFixed(2));

      const maxProfit = netCredit;
      const maxLoss = Number((spreadWidth - netCredit).toFixed(2));
      const breakEven = Number((shortStrike + netCredit).toFixed(2));
      const returnPct = Number(((netCredit / spreadWidth) * 100).toFixed(1));

      return {
        title: `Trava de Baixa com Call a Crédito (Bear Call Spread ${shortStrike.toFixed(2)} / ${longStrike.toFixed(2)})`,
        type: 'CREDIT_BEAR_CALL',
        typeLabel: 'TRAVA DE BAIXA A CRÉDITO',
        status: 'AUTORIZADA',
        expirationDate: expDate,
        dte,
        underlyingPrice: spot,
        legs: [
          {
            action: 'VENDA',
            symbol: shortCallRow.call?.symbol || `${symbol}I${Math.round(shortStrike)}`,
            strike: shortStrike,
            type: 'CALL',
            estimatedPrice: shortPrice,
            openInterest: shortCallRow.call?.openInterest || 100000,
          },
          {
            action: 'COMPRA',
            symbol: longCallRow.call?.symbol || `${symbol}I${Math.round(longStrike)}`,
            strike: longStrike,
            type: 'CALL',
            estimatedPrice: longPrice,
            openInterest: longCallRow.call?.openInterest || 50000,
          },
        ],
        spreadWidth,
        netCreditOrDebit: netCredit,
        isCredit: true,
        maxProfit,
        maxLoss,
        breakEven,
        returnPercentage: returnPct,
        riskRewardRatio: Number((maxLoss / maxProfit).toFixed(1)),
        rationalSummary: `Operação de proteção/rentabilização aproveitando tendência técnica de baixa e resistência institucional das Call Walls.`,
        homeBrokerInstructions: {
          recommendedOrder: `Ordem de Spread Limite a Crédito (Vender ${shortCallRow.call?.symbol || 'C1'} e Comprar ${longCallRow.call?.symbol || 'C2'})`,
          entryZone: `Crédito Líquido mínimo de R$ ${(netCredit * 0.9).toFixed(2)} a R$ ${netCredit.toFixed(2)}`,
          maxSlippage: `R$ 0,02 de spread máximo`,
          takeProfitRule: `Encerrar ao capturar 80% do crédito recebido.`,
          stopLossRule: `Stop se a ação romper a resistência em R$ ${shortStrike.toFixed(2)}.`,
        },
      };
    }
  }

  return null;
}
