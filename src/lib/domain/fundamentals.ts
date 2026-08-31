import {
  FundamentalAnalysisResult,
  FundamentalMetric,
} from '../types/financial';
import { CNPI_RULES } from '../config/rules';

export interface RawFundamentalData {
  returnOnEquity?: number | null; // ROE decimal ou % (ex: 0.18 ou 18)
  netMargin?: number | null; // Margem Liquida (ex: 0.12 ou 12)
  ebitdaMargin?: number | null;
  debtToEbitda?: number | null; // Divida Liquida / EBITDA (ex: 1.8)
  currentRatio?: number | null; // Liquidez Corrente (ex: 1.5)
  priceEarnings?: number | null; // P/L (ex: 8.5)
  priceToBook?: number | null; // P/VP (ex: 1.2)
  dividendYield?: number | null; // DY decimal ou % (ex: 0.08 ou 8)
}

/**
 * Normaliza valores decimais para percentuais quando necessário
 */
function normalizePct(val?: number | null): number | null {
  if (val === undefined || val === null || isNaN(val)) return null;
  // Se o valor estiver no formato decimal (ex: 0.18), converter para 18.0
  if (Math.abs(val) <= 1.0 && val !== 0) {
    return Number((val * 100).toFixed(2));
  }
  return Number(val.toFixed(2));
}

/**
 * Motor Quantitativo de Análise Fundamentalista (Padrão CNPI-P / CG1)
 * Aplica pesos da especificação (Rentabilidade 35%, Solvência 35%, Valuation 30%)
 * Política de dados ausentes: DADOS NÃO DISPONÍVEIS NÃO SOMAM PONTOS (Score = 0 por omissão).
 */
export function analyzeFundamentals(
  symbol: string,
  raw: RawFundamentalData
): FundamentalAnalysisResult {
  const roeVal = normalizePct(raw.returnOnEquity);
  const netMarginVal = normalizePct(raw.netMargin);
  const ebitdaMarginVal = normalizePct(raw.ebitdaMargin);
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
  const flags: string[] = [];
  let availableMetricsCount = 0;

  // 1. Avaliação do ROE (Rentabilidade - até 18 pts)
  let roeMetric: FundamentalMetric;
  if (roeVal !== null) {
    availableMetricsCount++;
    if (roeVal >= rules.ROE_HEALTHY) {
      score += 18;
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: `≥ ${rules.ROE_HEALTHY}%`,
        status: 'BOM',
        description: 'Excelente rentabilidade sobre o capital próprio.',
      };
      reasons.push(`ROE de ${roeVal}% demonstra eficiência na geração de valor para o acionista.`);
    } else if (roeVal >= rules.ROE_MIN) {
      score += 9;
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

  // 2. Avaliação da Margem Líquida (Rentabilidade - até 17 pts / Eliminatória se <= 0)
  let netMarginMetric: FundamentalMetric;
  if (netMarginVal !== null) {
    availableMetricsCount++;
    if (netMarginVal >= rules.NET_MARGIN_HEALTHY) {
      score += 17;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: `≥ ${rules.NET_MARGIN_HEALTHY}%`,
        status: 'BOM',
        description: 'Alta conversão de receita em lucro líquido.',
      };
      reasons.push(`Margem líquida saudável de ${netMarginVal}%.`);
    } else if (netMarginVal > rules.NET_MARGIN_MIN) {
      score += 8;
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
        description: 'Empresa operando no prejuízo líquido.',
      };
      flags.push(`Margem líquida negativa de ${netMarginVal}% (operação com prejuízo contábil).`);
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

  // 3. Avaliação de Dívida Líquida / EBITDA (Solvência - até 20 pts / Eliminatória se superendividada)
  let debtToEbitdaMetric: FundamentalMetric;
  if (debtToEbitdaVal !== null) {
    availableMetricsCount++;
    if (debtToEbitdaVal <= rules.DEBT_TO_EBITDA_HEALTHY && debtToEbitdaVal >= 0) {
      score += 20;
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `≤ ${rules.DEBT_TO_EBITDA_HEALTHY}x`,
        status: 'BOM',
        description: 'Endividamento baixo e perfeitamente controlado pela geração de caixa.',
      };
      reasons.push(`Dívida Líquida/EBITDA equilibrada de ${debtToEbitdaVal}x.`);
    } else if (debtToEbitdaVal <= rules.DEBT_TO_EBITDA_MAX && debtToEbitdaVal >= 0) {
      score += 10;
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `${rules.DEBT_TO_EBITDA_HEALTHY}x a ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'NEUTRO',
        description: 'Alavancagem moderada dentro dos limites aceitáveis.',
      };
    } else {
      debtToEbitdaMetric = {
        name: 'Dív. Líq. / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: `> ${rules.DEBT_TO_EBITDA_MAX}x`,
        status: 'RUIM',
        description: 'Elevada alavancagem financeira sobre a geração de caixa operacional.',
      };
      flags.push(`Alavancagem de ${debtToEbitdaVal}x excede os limites de segurança.`);
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

  // 4. Avaliação de Liquidez Corrente (Solvência - até 15 pts)
  let currentRatioMetric: FundamentalMetric;
  if (currentRatioVal !== null) {
    availableMetricsCount++;
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
      score += 8;
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
        description: 'Ativo circulante menor que o passivo circulante.',
      };
      flags.push(`Liquidez corrente de ${currentRatioVal}x indica aperto de caixa no curto prazo.`);
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

  // 5. Avaliação do P/L (Valuation - até 15 pts)
  let peMetric: FundamentalMetric;
  if (peVal !== null) {
    availableMetricsCount++;
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
      reasons.push(`P/L equilibrado de ${peVal}x.`);
    } else if (peVal > rules.PE_MAX) {
      peMetric = {
        name: 'P/L',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: `> ${rules.PE_MAX}x`,
        status: 'NEUTRO',
        description: 'Múltiplo de lucro esticado (precificação de alto crescimento futuro).',
      };
    } else {
      peMetric = {
        name: 'P/L',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: `< ${rules.PE_MIN}x`,
        status: 'RUIM',
        description: 'P/L negativo ou distorcido por eventos não recorrentes.',
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

  // 6. Avaliação do P/VP (Valuation - até 15 pts)
  let pbMetric: FundamentalMetric;
  if (pbVal !== null) {
    availableMetricsCount++;
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
    } else if (pbVal > rules.P_VP_MAX) {
      pbMetric = {
        name: 'P/VP',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: `> ${rules.P_VP_MAX}x`,
        status: 'NEUTRO',
        description: 'Ágio elevado sobre o valor patrimonial.',
      };
    } else {
      pbMetric = {
        name: 'P/VP',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: `< ${rules.P_VP_MIN}x`,
        status: 'RUIM',
        description: 'Desconto excessivo sobre patrimônio (possível deterioração contábil).',
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

  // 7. Dividend Yield (Informativo)
  const dyMetric: FundamentalMetric = {
    name: 'Dividend Yield',
    value: dyVal,
    formatted: dyVal !== null ? `${dyVal}%` : 'N/D',
    benchmark: 'Informativo',
    status: dyVal && dyVal >= 6 ? 'BOM' : 'NEUTRO',
    description: dyVal && dyVal >= 6 ? 'Excelente política de remuneração aos acionistas.' : 'Distribuição de proventos dentro da média.',
  };

  const metrics = {
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

  // Se houver menos de 2 métricas disponíveis, o ativo não tem dados mínimos para análise
  if (availableMetricsCount < 2) {
    flags.push('Dados fundamentalistas insuficientes para aprovação no crivo CNPI-P.');
  }

  // Definição do Status de Aprovação Fundamentalista (Corte: Score >= 45 e sem flags eliminatórias)
  const approvalThreshold = CNPI_RULES.FUNDAMENTALS.APPROVAL_SCORE_THRESHOLD;
  const isApproved = score >= approvalThreshold && flags.length === 0 && availableMetricsCount >= 2;
  const status: 'APROVADO' | 'REPROVADO' = isApproved ? 'APROVADO' : 'REPROVADO';

  let summary = '';
  if (status === 'APROVADO') {
    summary = `Ativo APROVADO no crivo fundamentalista CNPI-P com Score de ${score}/100. Apresenta solvência equilibrada e rentabilidade consistente.`;
  } else {
    if (availableMetricsCount < 2) {
      summary = `Ativo REPROVADO por ausência de dados fundamentalistas mínimos na B3 (Score: ${score}/100). Estudos de compra bloqueados por conservadorismo.`;
    } else {
      summary = `Ativo REPROVADO no crivo fundamentalista (Score: ${score}/100). Pontos de atenção: ${flags.join('; ')}`;
    }
  }

  return {
    symbol,
    score,
    status,
    summary,
    reasons,
    flags,
    metrics,
    analyzedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
