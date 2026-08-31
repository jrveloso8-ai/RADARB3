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
 * Formata números grandes de Lucro Líquido (ex: 133.4 Bi ou 450 Mi)
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
 * Especificação Técnica v2 (31/08/2026):
 * - Pesos: Rentabilidade 35% (LL 5, ROE 15, Margem 15), Solvência 35% (DL/EBITDA 20, Liq 15), Valuation 30% (P/L 15, P/VP 15)
 * - Flags Eliminatórias exaustivas: LUCRO_NEGATIVO, MARGEM_NEGATIVA, SUPERENDIVIDAMENTO (>3.5x ou EBITDA <= 0)
 * - Liquidez < 1.0 pontua zero mas NÃO é eliminatória (evita falso negativo em elétricas/petróleo).
 */
export function analyzeFundamentals(
  symbol: string,
  raw: RawFundamentalData
): FundamentalAnalysisResult {
  const netIncomeVal = raw.netIncome !== undefined && raw.netIncome !== null ? Number(raw.netIncome) : null;
  const roeVal = normalizePct(raw.returnOnEquity);
  const netMarginVal = normalizePct(raw.netMargin);
  const ebitdaMarginVal = normalizePct(raw.ebitdaMargin);
  const ebitdaVal = raw.ebitda !== undefined && raw.ebitda !== null ? Number(raw.ebitda) : null;
  const debtToEbitdaVal =
    raw.debtToEbitda !== undefined && raw.debtToEbitda !== null ? Number(raw.debtToEbitda.toFixed(2)) : null;
  const currentRatioVal =
    raw.currentRatio !== undefined && raw.currentRatio !== null ? Number(raw.currentRatio.toFixed(2)) : null;
  const peVal = raw.priceEarnings !== undefined && raw.priceEarnings !== null ? Number(raw.priceEarnings.toFixed(2)) : null;
  const pbVal = raw.priceToBook !== undefined && raw.priceToBook !== null ? Number(raw.priceToBook.toFixed(2)) : null;
  const dyVal = normalizePct(raw.dividendYield);

  const rules = CNPI_RULES.FUNDAMENTALS.THRESHOLDS;
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = []; // Observações de métricas ruins (reduzem score, mas não reprovam por si sós)
  const eliminatoryFlags: EliminatoryFlag[] = []; // Lista fechada de reprovação imediata

  // 1. Lucro Líquido 12M (Rentabilidade - 5 pts)
  let netIncomeMetric: FundamentalMetric;
  if (netIncomeVal !== null) {
    if (netIncomeVal > rules.NET_INCOME_MIN) {
      score += 5;
      netIncomeMetric = {
        name: 'Lucro Líquido 12M',
        value: netIncomeVal,
        formatted: formatCurrencyBrl(netIncomeVal),
        benchmark: '> R$ 0',
        status: 'BOM',
        description: 'Resultado líquido consolidado positivo nos últimos 12 meses.',
      };
      reasons.push(`Lucro Líquido positivo de ${formatCurrencyBrl(netIncomeVal)} nos últimos 12 meses.`);
    } else {
      netIncomeMetric = {
        name: 'Lucro Líquido 12M',
        value: netIncomeVal,
        formatted: formatCurrencyBrl(netIncomeVal),
        benchmark: '> R$ 0',
        status: 'RUIM',
        description: 'Empresa acumulando prejuízo contábil nos últimos 12 meses.',
      };
      eliminatoryFlags.push('LUCRO_NEGATIVO');
      flags.push(`Prejuízo contábil de ${formatCurrencyBrl(netIncomeVal)} nos últimos 12 meses.`);
    }
  } else {
    netIncomeMetric = {
      name: 'Lucro Líquido 12M',
      value: null,
      formatted: 'N/D',
      benchmark: '> R$ 0',
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 2. ROE (Rentabilidade - 15 pts)
  let roeMetric: FundamentalMetric;
  if (roeVal !== null) {
    if (roeVal >= rules.ROE_HEALTHY) {
      score += 15;
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: `≥ ${rules.ROE_HEALTHY}%`,
        status: 'BOM',
        description: 'Excelente rentabilidade sobre o capital próprio.',
      };
      reasons.push(`ROE de ${roeVal}% demonstra alta eficiência na geração de valor para o acionista.`);
    } else if (roeVal >= rules.ROE_MIN) {
      score += 7; // Metade de 15
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: `${rules.ROE_MIN}% a ${rules.ROE_HEALTHY}%`,
        status: 'NEUTRO',
        description: 'Rentabilidade moderada.',
      };
    } else {
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: `< ${rules.ROE_MIN}%`,
        status: 'RUIM',
        description: 'Baixo retorno sobre o patrimônio líquido.',
      };
      flags.push(`ROE de apenas ${roeVal}% abaixo do custo de oportunidade.`);
    }
  } else {
    roeMetric = {
      name: 'ROE',
      value: null,
      formatted: 'N/D',
      benchmark: `≥ ${rules.ROE_HEALTHY}%`,
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 3. Margem Líquida (Rentabilidade - 15 pts / Eliminatória se <= 0)
  let netMarginMetric: FundamentalMetric;
  if (netMarginVal !== null) {
    if (netMarginVal >= rules.NET_MARGIN_HEALTHY) {
      score += 15;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: `≥ ${rules.NET_MARGIN_HEALTHY}%`,
        status: 'BOM',
        description: 'Alta conversão de receita líquida em lucro.',
      };
      reasons.push(`Margem líquida saudável de ${netMarginVal}%.`);
    } else if (netMarginVal > rules.NET_MARGIN_MIN) {
      score += 7; // Metade de 15
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: `0% a ${rules.NET_MARGIN_HEALTHY}%`,
        status: 'NEUTRO',
        description: 'Margem positiva, porém com menor margem de segurança.',
      };
    } else {
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: '≤ 0%',
        status: 'RUIM',
        description: 'Operação deficitária com margem líquida negativa.',
      };
      eliminatoryFlags.push('MARGEM_NEGATIVA');
      flags.push(`Margem líquida negativa de ${netMarginVal}% (operação com prejuízo).`);
    }
  } else {
    netMarginMetric = {
      name: 'Margem Líquida',
      value: null,
      formatted: 'N/D',
      benchmark: `≥ ${rules.NET_MARGIN_HEALTHY}%`,
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 4. Dívida Líquida / EBITDA (Solvência - 20 pts / Eliminatória se > 3.5x ou EBITDA <= 0)
  let debtToEbitdaMetric: FundamentalMetric;
  if (ebitdaVal !== null && ebitdaVal <= 0) {
    // EBITDA negativo = geração de caixa operacional nula/negativa -> Superendividamento
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
  } else if (debtToEbitdaVal !== null) {
    if (debtToEbitdaVal <= rules.DEBT_TO_EBITDA_HEALTHY && debtToEbitdaVal >= 0) {
      score += 20;
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `≤ ${rules.DEBT_TO_EBITDA_HEALTHY}x`,
        status: 'BOM',
        description: 'Endividamento baixo e controlado pela geração de caixa operacional.',
      };
      reasons.push(`Dívida Líquida/EBITDA equilibrada de ${debtToEbitdaVal}x.`);
    } else if (debtToEbitdaVal <= rules.DEBT_TO_EBITDA_MAX && debtToEbitdaVal >= 0) {
      score += 10; // Metade de 20
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `${rules.DEBT_TO_EBITDA_HEALTHY}x a ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'NEUTRO',
        description: 'Alavancagem moderada dentro dos parâmetros aceitáveis.',
      };
    } else {
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `> ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'RUIM',
        description: 'Alavancagem financeira excessiva sobre o EBITDA.',
      };
      flags.push(`Alavancagem de ${debtToEbitdaVal}x excede os limites de segurança.`);
      if (debtToEbitdaVal > rules.DEBT_TO_EBITDA_ELIMINATORY) {
        eliminatoryFlags.push('SUPERENDIVIDAMENTO');
      }
    }
  } else {
    debtToEbitdaMetric = {
      name: 'Dív. Líq. / EBITDA',
      value: null,
      formatted: 'N/D',
      benchmark: `≤ ${rules.DEBT_TO_EBITDA_MAX}x`,
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 5. Liquidez Corrente (Solvência - 15 pts / NÃO eliminatória para evitar falso negativo em infra/petróleo)
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
      score += 7; // Metade de 15
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
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 6. P/L (Valuation - 15 pts, sem faixa neutra)
  let peMetric: FundamentalMetric;
  if (peVal !== null) {
    if (peVal >= rules.PE_MIN && peVal <= rules.PE_MAX) {
      score += 15;
      peMetric = {
        name: 'P/L',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
        status: 'BOM',
        description: 'Múltiplo de preço sobre lucro atrativo e condizente.',
      };
      reasons.push(`P/L atrativo de ${peVal}x.`);
    } else {
      peMetric = {
        name: 'P/L',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
        status: 'RUIM',
        description: peVal > rules.PE_MAX ? 'Múltiplo de lucro esticado (> 25x).' : 'P/L muito baixo ou negativo (< 3x).',
      };
    }
  } else {
    peMetric = {
      name: 'P/L',
      value: null,
      formatted: 'N/D',
      benchmark: `${rules.PE_MIN}x a ${rules.PE_MAX}x`,
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 7. P/VP (Valuation - 15 pts, sem faixa neutra)
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
      status: 'NEUTRO',
      description: 'Dado não disponível (0 pts atribuídos).',
    };
  }

  // 8. Dividend Yield (Informativo)
  const dyMetric: FundamentalMetric = {
    name: 'Dividend Yield',
    value: dyVal,
    formatted: dyVal !== null ? `${dyVal}%` : 'N/D',
    benchmark: 'Informativo',
    status: dyVal && dyVal >= 6 ? 'BOM' : 'NEUTRO',
    description: dyVal && dyVal >= 6 ? 'Excelente retorno em dividendos.' : 'Distribuição de proventos dentro da média.',
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

  // Regra de Aprovação Definitiva da Spec v2:
  // APROVADO <=> score >= 45 E eliminatoryFlags.length === 0 E hasProfitabilityData E hasSolvencyData
  const hasProfitabilityData = roeVal !== null || netMarginVal !== null || netIncomeVal !== null;
  const hasSolvencyData = debtToEbitdaVal !== null || currentRatioVal !== null;

  const isApproved =
    score >= CNPI_RULES.FUNDAMENTALS.APPROVAL_SCORE_THRESHOLD &&
    eliminatoryFlags.length === 0 &&
    hasProfitabilityData &&
    hasSolvencyData;

  const status: 'APROVADO' | 'REPROVADO' = isApproved ? 'APROVADO' : 'REPROVADO';

  let summary = '';
  if (status === 'APROVADO') {
    summary = `Ativo APROVADO no crivo fundamentalista CNPI-P com Score de ${score}/100. Solvência equilibrada e rentabilidade consistente.`;
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
    reasons,
    flags,
    eliminatoryFlags,
    metrics,
    analyzedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
