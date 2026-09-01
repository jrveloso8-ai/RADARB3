import {
  FundamentalAnalysisResult,
  FundamentalMetric,
  EliminatoryFlag,
} from '../types/financial';
import { CNPI_RULES } from '../config/rules';

export interface RawFundamentalData {
  netIncome?: number | null; // Lucro Líquido 12M em R$ (ex: 133376000000)
  totalDebt?: number | null;
  totalCash?: number | null;
  ebitda?: number | null;
  returnOnEquity?: number | null; // ROE decimal ou % (ex: 0.2781 ou 27.81)
  netMargin?: number | null; // Margem Líquida (ex: 0.2438 ou 24.38)
  ebitdaMargin?: number | null;
  debtToEbitda?: number | null; // Dívida Líquida / EBITDA (ex: 2.28)
  currentRatio?: number | null; // Liquidez Corrente (ex: 0.854)
  priceEarnings?: number | null; // P/L (ex: 4.66)
  priceToBook?: number | null; // P/VP (ex: 1.16)
  dividendYield?: number | null; // DY decimal ou % (ex: 0.08 ou 8)

  // Extensões de Auditoria e Reconciliação (Auditoria CNPI-P / Normalização Metodológica)
  operatingCashFlow?: number | null; // FCO TTM (Fluxo de Caixa Operacional) em R$
  financialDebt?: number | null; // Dívida Financeira Bruta isolada (sem IFRS-16 e provisões não-financeiras)
  financialDebtToEbitda?: number | null; // DL Financeira / EBITDA reconciliada (ex: 0.8x)
  nonRecurringItems?: number | null; // Baixa não-caixa (impairment) ou item não-recorrente em R$
  normalizedNetIncome?: number | null; // Lucro Líquido Normalizado ex-impairment em R$
  normalizedRoe?: number | null; // ROE Normalizado decimal ou %
  normalizedNetMargin?: number | null; // Margem Líquida Normalizada decimal ou %
  normalizedPE?: number | null; // P/L Normalizado
  isAdjusted?: boolean;
}

/**
 * Normaliza valores decimais para percentuais quando necessário
 */
function normalizePct(val?: number | null): number | null {
  if (val === undefined || val === null || isNaN(val)) return null;
  if (Math.abs(val) <= 1.0 && val !== 0) {
    return Number((val * 100).toFixed(2));
  }
  return Number(val.toFixed(2));
}

/**
 * Formata números grandes de Lucro Líquido ou FCO (ex: 133.4 Bi ou 450 Mi)
 */
function formatCurrencyBrl(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) {
    return `R$ ${(val / 1_000_000_000).toFixed(1)} Bi`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `R$ ${(val / 1_000_000).toFixed(1)} Mi`;
  }
  return `R$ ${val.toLocaleString('pt-BR')}`;
}

/**
 * Motor Quantitativo de Análise Fundamentalista (Padrão CNPI-P / CG1)
 * Especificação Técnica v2.2 (Auditoria de Crivo Fundamentalista):
 * - Pesos: Rentabilidade 35% (LL 5, ROE 15, Margem 15), Solvência 35% (DL/EBITDA 20, Liq 15), Valuation 30% (P/L 15, P/VP 15)
 * - Flags Eliminatórias exaustivas: LUCRO_NEGATIVO, MARGEM_NEGATIVA, SUPERENDIVIDAMENTO (>3.5x ou EBITDA <= 0)
 * - Checagem de Sanidade DRE x DFC: Se FCO TTM >> Lucro Líquido por baixa não-caixa (impairment),
 *   utiliza métricas normalizadas para pontuação com auditoria transparente.
 * - Reconciliação de Solvência: Se totalDebt bruto agrega passivos IFRS-16 ou provisões não-financeiras,
 *   pontua com base na Dívida Financeira Líquida Real (ex: 0.8x na Vale).
 */
export function analyzeFundamentals(
  symbol: string,
  raw: RawFundamentalData
): FundamentalAnalysisResult {
  const netIncomeVal = raw.netIncome !== undefined && raw.netIncome !== null ? Number(raw.netIncome) : null;
  const rawRoeVal = normalizePct(raw.returnOnEquity);
  const rawNetMarginVal = normalizePct(raw.netMargin);
  const ebitdaMarginVal = normalizePct(raw.ebitdaMargin);
  const ebitdaVal = raw.ebitda !== undefined && raw.ebitda !== null ? Number(raw.ebitda) : null;
  const rawDebtToEbitdaVal =
    raw.debtToEbitda !== undefined && raw.debtToEbitda !== null ? Number(raw.debtToEbitda.toFixed(2)) : null;
  const currentRatioVal =
    raw.currentRatio !== undefined && raw.currentRatio !== null ? Number(raw.currentRatio.toFixed(2)) : null;
  const rawPeVal = raw.priceEarnings !== undefined && raw.priceEarnings !== null ? Number(raw.priceEarnings.toFixed(2)) : null;
  const pbVal = raw.priceToBook !== undefined && raw.priceToBook !== null ? Number(raw.priceToBook.toFixed(2)) : null;
  const dyVal = normalizePct(raw.dividendYield);

  const fcoVal = raw.operatingCashFlow !== undefined && raw.operatingCashFlow !== null ? Number(raw.operatingCashFlow) : null;
  const financialDebtToEbitdaVal =
    raw.financialDebtToEbitda !== undefined && raw.financialDebtToEbitda !== null
      ? Number(raw.financialDebtToEbitda.toFixed(2))
      : raw.financialDebt !== undefined && raw.financialDebt !== null && raw.totalCash !== undefined && raw.totalCash !== null && ebitdaVal && ebitdaVal > 0
      ? Number(((Number(raw.financialDebt) - Number(raw.totalCash)) / ebitdaVal).toFixed(2))
      : null;

  const normalizedRoeVal = normalizePct(raw.normalizedRoe);
  const normalizedNetMarginVal = normalizePct(raw.normalizedNetMargin);
  const normalizedPeVal =
    raw.normalizedPE !== undefined && raw.normalizedPE !== null ? Number(raw.normalizedPE.toFixed(2)) : null;
  const normalizedNetIncomeVal =
    raw.normalizedNetIncome !== undefined && raw.normalizedNetIncome !== null ? Number(raw.normalizedNetIncome) : null;

  const rules = CNPI_RULES.FUNDAMENTALS.THRESHOLDS;
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = []; // Observações de métricas ruins
  const eliminatoryFlags: EliminatoryFlag[] = []; // Lista fechada de reprovação imediata
  const distortionAlerts: string[] = [];
  let isNormalized = false;

  // =========================================================================
  // DETECÇÃO DE SANIDADE DRE x DFC E EVENTOS NÃO-RECORRENTES (IMPAIRMENT)
  // =========================================================================
  let hasImpairmentOrNonCashDistortion = false;
  if (raw.nonRecurringItems && Math.abs(raw.nonRecurringItems) > 0) {
    hasImpairmentOrNonCashDistortion = true;
  } else if (fcoVal !== null && fcoVal > 0 && netIncomeVal !== null) {
    // Se FCO TTM for muito superior ao Lucro Líquido contábil (>= 1.8x) ou se Lucro contábil foi comprimido por baixas não-caixa
    if (fcoVal >= 1.8 * netIncomeVal || (netIncomeVal <= 0 && fcoVal > 1_000_000_000)) {
      hasImpairmentOrNonCashDistortion = true;
    }
  }

  if (hasImpairmentOrNonCashDistortion) {
    isNormalized = true;
    if (fcoVal !== null) {
      distortionAlerts.push(
        `Cruzamento DRE x DFC: Geração operacional de caixa robusta (FCO TTM de ${formatCurrencyBrl(
          fcoVal
        )}) indica que o resultado contábil foi impactado por baixas não-caixa (impairment/provisões).`
      );
    } else {
      distortionAlerts.push('Resultado contábil com impacto relevante de eventos não-recorrentes/baixa não-caixa.');
    }
  }

  // =========================================================================
  // 1. Lucro Líquido 12M (Rentabilidade - 5 pts)
  // =========================================================================
  let netIncomeMetric: FundamentalMetric;
  const effectiveNetIncome = (hasImpairmentOrNonCashDistortion && normalizedNetIncomeVal !== null)
    ? normalizedNetIncomeVal
    : netIncomeVal;

  if (effectiveNetIncome !== null) {
    if (effectiveNetIncome > rules.NET_INCOME_MIN) {
      score += 5;
      const isAdj = hasImpairmentOrNonCashDistortion && normalizedNetIncomeVal !== null && normalizedNetIncomeVal !== netIncomeVal;
      netIncomeMetric = {
        name: 'Lucro Líquido 12M',
        value: effectiveNetIncome,
        formatted: formatCurrencyBrl(effectiveNetIncome),
        benchmark: '> R$ 0',
        status: 'BOM',
        description: isAdj
          ? `Lucro Líquido Normalizado ex-impairment (${formatCurrencyBrl(effectiveNetIncome)}).`
          : 'Resultado líquido consolidado positivo nos últimos 12 meses.',
        isAdjusted: isAdj,
        rawAccountingValue: netIncomeVal,
        rawAccountingFormatted: netIncomeVal !== null ? formatCurrencyBrl(netIncomeVal) : undefined,
        source: isAdj ? 'NORMALIZADO_FCO' : 'BRAPI_CONTABIL',
        adjustmentReason: isAdj ? 'Ajustado por baixa contábil não-caixa / reconciliação com FCO' : undefined,
      };
      reasons.push(`Lucro Líquido positivo de ${formatCurrencyBrl(effectiveNetIncome)} nos últimos 12 meses.`);
    } else {
      // Prejuízo real (não-caixa ou sem FCO positivo de mitigação)
      if (hasImpairmentOrNonCashDistortion && fcoVal !== null && fcoVal > 0) {
        // Prejuízo puramente contábil por baixa não-caixa com forte geração de caixa
        netIncomeMetric = {
          name: 'Lucro Líquido 12M',
          value: effectiveNetIncome,
          formatted: formatCurrencyBrl(effectiveNetIncome),
          benchmark: '> R$ 0',
          status: 'NEUTRO',
          description: `Prejuízo contábil (${formatCurrencyBrl(effectiveNetIncome)}) decorrente de baixa não-caixa com FCO positivo de ${formatCurrencyBrl(fcoVal)}.`,
          isAdjusted: true,
          rawAccountingValue: netIncomeVal,
          rawAccountingFormatted: netIncomeVal !== null ? formatCurrencyBrl(netIncomeVal) : undefined,
          source: 'NORMALIZADO_FCO',
        };
        flags.push(`Lucro contábil negativo, porém com caixa operacional (FCO) positivo de ${formatCurrencyBrl(fcoVal)}.`);
      } else {
        netIncomeMetric = {
          name: 'Lucro Líquido 12M',
          value: effectiveNetIncome,
          formatted: formatCurrencyBrl(effectiveNetIncome),
          benchmark: '> R$ 0',
          status: 'RUIM',
          description: 'Empresa acumulando prejuízo contábil nos últimos 12 meses.',
        };
        eliminatoryFlags.push('LUCRO_NEGATIVO');
        flags.push(`Prejuízo contábil de ${formatCurrencyBrl(effectiveNetIncome)} nos últimos 12 meses.`);
      }
    }
  } else {
    netIncomeMetric = {
      name: 'Lucro Líquido 12M',
      value: null,
      formatted: 'N/D',
      benchmark: '> R$ 0',
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 2. ROE (Rentabilidade - 15 pts)
  // =========================================================================
  let roeMetric: FundamentalMetric;
  const effectiveRoe = (hasImpairmentOrNonCashDistortion && normalizedRoeVal !== null)
    ? normalizedRoeVal
    : (hasImpairmentOrNonCashDistortion && rawRoeVal !== null && rawRoeVal < rules.ROE_MIN && fcoVal !== null && fcoVal > 0)
    ? (normalizedRoeVal ?? Math.min(18.0, Number((rawRoeVal * (fcoVal / Math.max(1, netIncomeVal || 1))).toFixed(2))))
    : rawRoeVal;

  if (effectiveRoe !== null) {
    const isRoeAdjusted = effectiveRoe !== rawRoeVal && rawRoeVal !== null;
    if (effectiveRoe >= rules.ROE_HEALTHY) {
      score += 15;
      roeMetric = {
        name: 'ROE',
        value: effectiveRoe,
        formatted: isRoeAdjusted ? `${effectiveRoe}% (Norm.)` : `${effectiveRoe}%`,
        benchmark: `≥ ${rules.ROE_HEALTHY}%`,
        status: 'BOM',
        description: isRoeAdjusted
          ? `ROE Normalizado ex-impairment (${effectiveRoe}%) reflete a capacidade de retorno do capital.`
          : 'Excelente rentabilidade sobre o capital próprio.',
        isAdjusted: isRoeAdjusted,
        rawAccountingValue: rawRoeVal,
        rawAccountingFormatted: rawRoeVal !== null ? `${rawRoeVal}% (Contábil)` : undefined,
        source: isRoeAdjusted ? 'NORMALIZADO_FCO' : 'BRAPI_CONTABIL',
        adjustmentReason: isRoeAdjusted ? 'Normalizado por exclusão de baixas contábeis não-caixa no numerador' : undefined,
      };
      reasons.push(`ROE de ${effectiveRoe}% demonstra alta eficiência na geração de valor para o acionista.`);
    } else if (effectiveRoe >= rules.ROE_MIN) {
      score += 7;
      roeMetric = {
        name: 'ROE',
        value: effectiveRoe,
        formatted: isRoeAdjusted ? `${effectiveRoe}% (Norm.)` : `${effectiveRoe}%`,
        benchmark: `${rules.ROE_MIN}% a ${rules.ROE_HEALTHY}%`,
        status: 'NEUTRO',
        description: 'Rentabilidade moderada.',
        isAdjusted: isRoeAdjusted,
        rawAccountingValue: rawRoeVal,
        rawAccountingFormatted: rawRoeVal !== null ? `${rawRoeVal}% (Contábil)` : undefined,
      };
    } else {
      roeMetric = {
        name: 'ROE',
        value: effectiveRoe,
        formatted: `${effectiveRoe}%`,
        benchmark: `< ${rules.ROE_MIN}%`,
        status: 'RUIM',
        description: 'Baixo retorno sobre o patrimônio líquido.',
      };
      flags.push(`ROE de apenas ${effectiveRoe}% abaixo do custo de oportunidade.`);
    }
  } else {
    roeMetric = {
      name: 'ROE',
      value: null,
      formatted: 'N/D',
      benchmark: `≥ ${rules.ROE_HEALTHY}%`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 3. Margem Líquida (Rentabilidade - 15 pts / Eliminatória se <= 0)
  // =========================================================================
  let netMarginMetric: FundamentalMetric;
  const effectiveNetMargin = (hasImpairmentOrNonCashDistortion && normalizedNetMarginVal !== null)
    ? normalizedNetMarginVal
    : rawNetMarginVal;

  if (effectiveNetMargin !== null) {
    const isMarginAdjusted = effectiveNetMargin !== rawNetMarginVal && rawNetMarginVal !== null;
    if (effectiveNetMargin >= rules.NET_MARGIN_HEALTHY) {
      score += 15;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: effectiveNetMargin,
        formatted: isMarginAdjusted ? `${effectiveNetMargin}% (Norm.)` : `${effectiveNetMargin}%`,
        benchmark: `≥ ${rules.NET_MARGIN_HEALTHY}%`,
        status: 'BOM',
        description: isMarginAdjusted
          ? `Margem líquida normalizada de ${effectiveNetMargin}% ex-efeitos extraordinários.`
          : 'Alta conversão de receita líquida em lucro.',
        isAdjusted: isMarginAdjusted,
        rawAccountingValue: rawNetMarginVal,
        rawAccountingFormatted: rawNetMarginVal !== null ? `${rawNetMarginVal}% (Contábil)` : undefined,
        source: isMarginAdjusted ? 'NORMALIZADO_FCO' : 'BRAPI_CONTABIL',
      };
      reasons.push(`Margem líquida saudável de ${effectiveNetMargin}%.`);
    } else if (effectiveNetMargin > rules.NET_MARGIN_MIN) {
      score += 7;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: effectiveNetMargin,
        formatted: isMarginAdjusted ? `${effectiveNetMargin}% (Norm.)` : `${effectiveNetMargin}%`,
        benchmark: `0% a ${rules.NET_MARGIN_HEALTHY}%`,
        status: 'NEUTRO',
        description: 'Margem positiva, porém com menor margem de segurança.',
        isAdjusted: isMarginAdjusted,
        rawAccountingValue: rawNetMarginVal,
        rawAccountingFormatted: rawNetMarginVal !== null ? `${rawNetMarginVal}% (Contábil)` : undefined,
      };
    } else {
      if (hasImpairmentOrNonCashDistortion && fcoVal !== null && fcoVal > 0) {
        netMarginMetric = {
          name: 'Margem Líquida',
          value: effectiveNetMargin,
          formatted: `${effectiveNetMargin}%`,
          benchmark: '≤ 0%',
          status: 'NEUTRO',
          description: 'Margem contábil negativa por baixa não-caixa, com caixa operacional gerador.',
          isAdjusted: true,
          rawAccountingValue: rawNetMarginVal,
          rawAccountingFormatted: `${rawNetMarginVal}% (Contábil)`,
        };
        flags.push(`Margem líquida contábil negativa (${effectiveNetMargin}%), atenuada por FCO TTM positivo.`);
      } else {
        netMarginMetric = {
          name: 'Margem Líquida',
          value: effectiveNetMargin,
          formatted: `${effectiveNetMargin}%`,
          benchmark: '≤ 0%',
          status: 'RUIM',
          description: 'Operação deficitária com margem líquida negativa.',
        };
        eliminatoryFlags.push('MARGEM_NEGATIVA');
        flags.push(`Margem líquida negativa de ${effectiveNetMargin}% (operação com prejuízo).`);
      }
    }
  } else {
    netMarginMetric = {
      name: 'Margem Líquida',
      value: null,
      formatted: 'N/D',
      benchmark: `≥ ${rules.NET_MARGIN_HEALTHY}%`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 4. Dívida Líquida / EBITDA (Solvência - 20 pts / Eliminatória se > 3.5x ou EBITDA <= 0)
  // =========================================================================
  let debtToEbitdaMetric: FundamentalMetric;
  // Se houver dado de dívida financeira reconciliada isolando IFRS-16 e provisões
  const isDebtReconciled = financialDebtToEbitdaVal !== null && rawDebtToEbitdaVal !== null && financialDebtToEbitdaVal !== rawDebtToEbitdaVal;
  const effectiveDebtToEbitda = isDebtReconciled ? financialDebtToEbitdaVal : rawDebtToEbitdaVal;

  if (isDebtReconciled) {
    isNormalized = true;
    distortionAlerts.push(
      `Reconciliação de Dívida: Dívida Financeira Líquida de ${financialDebtToEbitdaVal}x EBITDA utilizada (excluídos passivos de arrendamento IFRS-16 e provisões não-financeiras do balanço bruto de ${rawDebtToEbitdaVal}x).`
    );
  }

  if (ebitdaVal !== null && ebitdaVal <= 0) {
    debtToEbitdaMetric = {
      name: 'Dív. Líq. / EBITDA',
      value: null,
      formatted: 'EBITDA Negativo',
      benchmark: `≤ ${rules.DEBT_TO_EBITDA_HEALTHY}x`,
      status: 'RUIM',
      description: 'EBITDA negativo impede cobertura de dívida.',
    };
    eliminatoryFlags.push('SUPERENDIVIDAMENTO');
    flags.push('Geração de caixa operacional negativa (EBITDA ≤ 0).');
  } else if (effectiveDebtToEbitda !== null) {
    if (effectiveDebtToEbitda <= rules.DEBT_TO_EBITDA_HEALTHY && effectiveDebtToEbitda >= 0) {
      score += 20;
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: effectiveDebtToEbitda,
        formatted: isDebtReconciled ? `${effectiveDebtToEbitda}x (Financ.)` : `${effectiveDebtToEbitda}x`,
        benchmark: `≤ ${rules.DEBT_TO_EBITDA_HEALTHY}x`,
        status: 'BOM',
        description: isDebtReconciled
          ? `Alavancagem financeira líquida de ${effectiveDebtToEbitda}x EBITDA (excluídas provisões de balanço).`
          : 'Endividamento baixo e controlado pela geração de caixa operacional.',
        isAdjusted: isDebtReconciled,
        rawAccountingValue: rawDebtToEbitdaVal,
        rawAccountingFormatted: rawDebtToEbitdaVal !== null ? `${rawDebtToEbitdaVal}x (Bruto IFRS)` : undefined,
        source: isDebtReconciled ? 'RECONCILIADO_FINANCEIRO' : 'BRAPI_CONTABIL',
        adjustmentReason: isDebtReconciled ? 'Exclusão de IFRS-16 e provisões socioambientais/descomissionamento' : undefined,
      };
      reasons.push(`Dívida Líquida/EBITDA equilibrada de ${effectiveDebtToEbitda}x.`);
    } else if (effectiveDebtToEbitda <= rules.DEBT_TO_EBITDA_MAX && effectiveDebtToEbitda >= 0) {
      score += 10;
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: effectiveDebtToEbitda,
        formatted: isDebtReconciled ? `${effectiveDebtToEbitda}x (Financ.)` : `${effectiveDebtToEbitda}x`,
        benchmark: `${rules.DEBT_TO_EBITDA_HEALTHY}x a ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'NEUTRO',
        description: 'Alavancagem moderada dentro dos parâmetros aceitáveis.',
        isAdjusted: isDebtReconciled,
        rawAccountingValue: rawDebtToEbitdaVal,
        rawAccountingFormatted: rawDebtToEbitdaVal !== null ? `${rawDebtToEbitdaVal}x (Bruto IFRS)` : undefined,
      };
    } else {
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: effectiveDebtToEbitda,
        formatted: isDebtReconciled ? `${effectiveDebtToEbitda}x (Financ.)` : `${effectiveDebtToEbitda}x`,
        benchmark: `> ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'RUIM',
        description: 'Alavancagem financeira excessiva sobre o EBITDA.',
        isAdjusted: isDebtReconciled,
        rawAccountingValue: rawDebtToEbitdaVal,
        rawAccountingFormatted: rawDebtToEbitdaVal !== null ? `${rawDebtToEbitdaVal}x (Bruto IFRS)` : undefined,
      };
      flags.push(`Alavancagem de ${effectiveDebtToEbitda}x excede os limites de segurança.`);
      if (effectiveDebtToEbitda > rules.DEBT_TO_EBITDA_ELIMINATORY) {
        eliminatoryFlags.push('SUPERENDIVIDAMENTO');
      }
    }
  } else {
    debtToEbitdaMetric = {
      name: 'Dív. Líq. / EBITDA',
      value: null,
      formatted: 'N/D',
      benchmark: `≤ ${rules.DEBT_TO_EBITDA_MAX}x`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 5. Liquidez Corrente (Solvência - 15 pts / NÃO eliminatória)
  // =========================================================================
  let currentRatioMetric: FundamentalMetric;
  if (currentRatioVal !== null) {
    if (currentRatioVal >= rules.CURRENT_RATIO_HEALTHY) {
      score += 15;
      currentRatioMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: `≥ ${rules.CURRENT_RATIO_HEALTHY}x`,
        status: 'BOM',
        description: 'Capacidade folgada de pagamento de obrigações de curto prazo.',
      };
      reasons.push(`Liquidez corrente robusta de ${currentRatioVal}x.`);
    } else if (currentRatioVal >= rules.CURRENT_RATIO_MIN) {
      score += 7;
      currentRatioMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: `${rules.CURRENT_RATIO_MIN}x a ${rules.CURRENT_RATIO_HEALTHY}x`,
        status: 'NEUTRO',
        description: 'Liquidez adequada para honrar compromissos imediatos.',
      };
    } else {
      currentRatioMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: `< ${rules.CURRENT_RATIO_MIN}x`,
        status: 'RUIM',
        description: 'Ativo circulante menor que o passivo circulante (típico de capital intensivo).',
      };
      flags.push(`Liquidez corrente de ${currentRatioVal}x indica capital de giro comprimido.`);
    }
  } else {
    currentRatioMetric = {
      name: 'Liquidez Corrente',
      value: null,
      formatted: 'N/D',
      benchmark: `≥ ${rules.CURRENT_RATIO_MIN}x`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 6. P/L (Valuation - 15 pts)
  // =========================================================================
  let peMetric: FundamentalMetric;
  const effectivePe = (hasImpairmentOrNonCashDistortion && normalizedPeVal !== null)
    ? normalizedPeVal
    : rawPeVal;

  if (effectivePe !== null) {
    const isPeAdjusted = effectivePe !== rawPeVal && rawPeVal !== null;
    if (effectivePe >= rules.PE_MIN && effectivePe <= rules.PE_MAX) {
      score += 15;
      peMetric = {
        name: 'P/L',
        value: effectivePe,
        formatted: isPeAdjusted ? `${effectivePe}x (Norm.)` : `${effectivePe}x`,
        benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
        status: 'BOM',
        description: isPeAdjusted
          ? `Múltiplo P/L Normalizado (${effectivePe}x) atrativo após neutralização de itens não-caixa.`
          : 'Múltiplo de preço sobre lucro atrativo e condizente.',
        isAdjusted: isPeAdjusted,
        rawAccountingValue: rawPeVal,
        rawAccountingFormatted: rawPeVal !== null ? `${rawPeVal}x (Contábil)` : undefined,
        source: isPeAdjusted ? 'NORMALIZADO_FCO' : 'BRAPI_CONTABIL',
      };
      reasons.push(`P/L atrativo de ${effectivePe}x.`);
    } else {
      peMetric = {
        name: 'P/L',
        value: effectivePe,
        formatted: isPeAdjusted ? `${effectivePe}x (Norm.)` : `${effectivePe}x`,
        benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
        status: 'RUIM',
        description:
          effectivePe > rules.PE_MAX
            ? hasImpairmentOrNonCashDistortion
              ? 'Múltiplo contábil inflado por baixa pontual de lucro.'
              : 'Múltiplo de lucro esticado (> 25x).'
            : 'P/L muito baixo ou negativo (< 3x).',
        isAdjusted: isPeAdjusted,
        rawAccountingValue: rawPeVal,
        rawAccountingFormatted: rawPeVal !== null ? `${rawPeVal}x (Contábil)` : undefined,
      };
    }
  } else {
    peMetric = {
      name: 'P/L',
      value: null,
      formatted: 'N/D',
      benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 7. P/VP (Valuation - 15 pts)
  // =========================================================================
  let pbMetric: FundamentalMetric;
  if (pbVal !== null) {
    if (pbVal >= rules.P_VP_MIN && pbVal <= rules.P_VP_MAX) {
      score += 15;
      pbMetric = {
        name: 'P/VP',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: `${rules.P_VP_MIN}x a ${rules.P_VP_MAX}x`,
        status: 'BOM',
        description: 'Preço sobre valor patrimonial em patamar equilibrado.',
      };
      reasons.push(`P/VP justo de ${pbVal}x em relação ao patrimônio líquido.`);
    } else {
      pbMetric = {
        name: 'P/VP',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: `${rules.P_VP_MIN}x a ${rules.P_VP_MAX}x`,
        status: 'RUIM',
        description: pbVal > rules.P_VP_MAX ? 'Ágio elevado sobre o valor patrimonial (> 4.0x).' : 'Desconto excessivo sobre o patrimônio (< 0.5x).',
      };
    }
  } else {
    pbMetric = {
      name: 'P/VP',
      value: null,
      formatted: 'N/D',
      benchmark: `${rules.P_VP_MIN}x a ${rules.P_VP_MAX}x`,
      status: 'N/D',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // =========================================================================
  // 8. Dividend Yield (Informativo)
  // =========================================================================
  const dyMetric: FundamentalMetric = {
    name: 'Dividend Yield',
    value: dyVal,
    formatted: dyVal !== null ? `${dyVal}%` : 'N/D',
    benchmark: 'Informativo',
    status: dyVal === null ? 'N/D' : dyVal >= 6 ? 'BOM' : 'NEUTRO',
    description: dyVal === null ? 'Dado não disponível.' : dyVal >= 6 ? 'Excelente retorno em dividendos.' : 'Distribuição de proventos dentro da média.',
  };

  const metrics = {
    netIncome: netIncomeMetric,
    roe: roeMetric,
    netMargin: netMarginMetric,
    ebitdaMargin:
      ebitdaMarginVal !== null
        ? {
            name: 'Margem EBITDA',
            value: ebitdaMarginVal,
            formatted: `${ebitdaMarginVal}%`,
            benchmark: 'Informativo',
            status: 'NEUTRO' as const,
            description: 'Geração operacional sobre a receita líquida.',
          }
        : undefined,
    debtToEbitda: debtToEbitdaMetric,
    currentLiquidity: currentRatioMetric,
    peRatio: peMetric,
    pbRatio: pbMetric,
    dividendYield: dyMetric,
  };

  // Regra de Aprovação CNPI-P:
  // APROVADO <=> score >= 45 E eliminatoryFlags.length === 0 E hasProfitabilityData E hasSolvencyData
  const hasProfitabilityData =
    rawRoeVal !== null ||
    rawNetMarginVal !== null ||
    netIncomeVal !== null ||
    (raw.normalizedRoe !== undefined && raw.normalizedRoe !== null);
  const hasSolvencyData =
    rawDebtToEbitdaVal !== null ||
    currentRatioVal !== null ||
    financialDebtToEbitdaVal !== null;

  const isApproved =
    score >= CNPI_RULES.FUNDAMENTALS.APPROVAL_SCORE_THRESHOLD &&
    eliminatoryFlags.length === 0 &&
    hasProfitabilityData &&
    hasSolvencyData;

  const status: 'APROVADO' | 'REPROVADO' = isApproved ? 'APROVADO' : 'REPROVADO';

  let summary = '';
  if (status === 'APROVADO') {
    if (isNormalized) {
      summary = `Ativo APROVADO no crivo fundamentalista CNPI-P com Score de ${score}/100 (ajustado por reconciliação de dívida financeira e sanidade de caixa operacional FCO). Solvência equilibrada e fundamentos sólidos.`;
    } else {
      summary = `Ativo APROVADO no crivo fundamentalista CNPI-P com Score de ${score}/100. Solvência equilibrada e rentabilidade consistente.`;
    }
  } else {
    if (!hasProfitabilityData || !hasSolvencyData) {
      summary = `Ativo REPROVADO por ausência de dados mínimos de rentabilidade/solvência (Score: ${score}/100). Prevenção contra armadilha de valor.`;
    } else if (eliminatoryFlags.length > 0) {
      summary = `Ativo REPROVADO por critério eliminatório (${eliminatoryFlags.join(', ')}). Score: ${score}/100.`;
    } else {
      summary = `Ativo REPROVADO no crivo fundamentalista por pontuação insuficiente (Score: ${score}/100, mínimo 45).`;
    }
  }

  return {
    symbol,
    score,
    status,
    summary,
    isNormalized,
    distortionAlerts: distortionAlerts.length > 0 ? distortionAlerts : undefined,
    reasons,
    flags,
    eliminatoryFlags,
    metrics,
    analyzedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
