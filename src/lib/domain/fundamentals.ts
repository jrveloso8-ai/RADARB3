import {
  FundamentalAnalysisResult,
  FundamentalMetric,
} from '../types/financial';

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
 */
export function analyzeFundamentals(
  symbol: string,
  raw: RawFundamentalData
): FundamentalAnalysisResult {
  const roeVal = normalizePct(raw.returnOnEquity);
  const netMarginVal = normalizePct(raw.netMargin);
  const ebitdaMarginVal = normalizePct(raw.ebitdaMargin);
  const debtToEbitdaVal = raw.debtToEbitda !== undefined && raw.debtToEbitda !== null ? Number(raw.debtToEbitda.toFixed(2)) : null;
  const currentRatioVal = raw.currentRatio !== undefined && raw.currentRatio !== null ? Number(raw.currentRatio.toFixed(2)) : null;
  const peVal = raw.priceEarnings !== undefined && raw.priceEarnings !== null ? Number(raw.priceEarnings.toFixed(2)) : null;
  const pbVal = raw.priceToBook !== undefined && raw.priceToBook !== null ? Number(raw.priceToBook.toFixed(2)) : null;
  const dyVal = normalizePct(raw.dividendYield);

  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = [];

  // 1. Avaliação do ROE (Retorno sobre Patrimônio Líquido) - Peso 20 pts
  let roeMetric: FundamentalMetric;
  if (roeVal !== null) {
    if (roeVal >= 15) {
      score += 20;
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: '≥ 15%',
        status: 'BOM',
        description: 'Excelente rentabilidade sobre o capital próprio.',
      };
      reasons.push(`ROE elevado de ${roeVal}% demonstra alta eficiência na geração de valor.`);
    } else if (roeVal >= 8) {
      score += 10;
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: '8% a 15%',
        status: 'NEUTRO',
        description: 'Rentabilidade moderada.',
      };
    } else {
      roeMetric = {
        name: 'ROE',
        value: roeVal,
        formatted: `${roeVal}%`,
        benchmark: '< 8%',
        status: 'RUIM',
        description: 'Baixo retorno sobre o patrimônio líquido.',
      };
      flags.push(`ROE de apenas ${roeVal}% abaixo do custo de oportunidade.`);
    }
  } else {
    score += 10;
    roeMetric = {
      name: 'ROE',
      value: null,
      formatted: 'N/D',
      benchmark: '≥ 12%',
      status: 'NEUTRO',
      description: 'Dado não divulgado no período.',
    };
  }

  // 2. Avaliação da Margem Líquida - Peso 20 pts (Eliminatória se < 0)
  let netMarginMetric: FundamentalMetric;
  if (netMarginVal !== null) {
    if (netMarginVal >= 10) {
      score += 20;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: '≥ 10%',
        status: 'BOM',
        description: 'Alta conversão de receita em lucro líquido.',
      };
      reasons.push(`Margem líquida saudável de ${netMarginVal}%.`);
    } else if (netMarginVal > 0) {
      score += 10;
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: '0% a 10%',
        status: 'NEUTRO',
        description: 'Margem positiva, porém com menor margem de segurança.',
      };
    } else {
      netMarginMetric = {
        name: 'Margem Líquida',
        value: netMarginVal,
        formatted: `${netMarginVal}%`,
        benchmark: '> 0%',
        status: 'RUIM',
        description: 'Empresa operando com prejuízo líquido.',
      };
      flags.push(`Empresa com margem negativa (${netMarginVal}%), operando em prejuízo.`);
    }
  } else {
    score += 10;
    netMarginMetric = {
      name: 'Margem Líquida',
      value: null,
      formatted: 'N/D',
      benchmark: '> 5%',
      status: 'NEUTRO',
      description: 'Dado não divulgado.',
    };
  }

  // 3. Avaliação de Endividamento: Dívida Líquida / EBITDA - Peso 25 pts
  let debtMetric: FundamentalMetric;
  if (debtToEbitdaVal !== null) {
    if (debtToEbitdaVal <= 2.0 && debtToEbitdaVal >= 0) {
      score += 25;
      debtMetric = {
        name: 'Dív. Líquida / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: '≤ 2.0x',
        status: 'BOM',
        description: 'Baixo endividamento, sólida solvência financeira.',
      };
      reasons.push(`Alavancagem controlada de ${debtToEbitdaVal}x Dívida Líquida/EBITDA.`);
    } else if (debtToEbitdaVal <= 3.2) {
      score += 12;
      debtMetric = {
        name: 'Dív. Líquida / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: '2.0x a 3.2x',
        status: 'NEUTRO',
        description: 'Alavancagem moderada, dentro dos limites operacionais.',
      };
    } else {
      debtMetric = {
        name: 'Dív. Líquida / EBITDA',
        value: debtToEbitdaVal,
        formatted: `${debtToEbitdaVal}x`,
        benchmark: '> 3.2x',
        status: 'RUIM',
        description: 'Alavancagem financeira elevada, risco de juros.',
      };
      flags.push(`Alavancagem elevada de ${debtToEbitdaVal}x Dívida Líq./EBITDA.`);
    }
  } else {
    score += 15;
    debtMetric = {
      name: 'Dív. Líquida / EBITDA',
      value: null,
      formatted: 'N/D',
      benchmark: '≤ 2.5x',
      status: 'NEUTRO',
      description: 'Estrutura financeira sem alavancagem crítica reportada.',
    };
  }

  // 4. Avaliação de Liquidez Corrente - Peso 15 pts
  let liqMetric: FundamentalMetric;
  if (currentRatioVal !== null) {
    if (currentRatioVal >= 1.3) {
      score += 15;
      liqMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: '≥ 1.3x',
        status: 'BOM',
        description: 'Folga financeira confortável no curto prazo.',
      };
    } else if (currentRatioVal >= 1.0) {
      score += 8;
      liqMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: '1.0x a 1.3x',
        status: 'NEUTRO',
        description: 'Capacidade de pagamento equilibrada.',
      };
    } else {
      liqMetric = {
        name: 'Liquidez Corrente',
        value: currentRatioVal,
        formatted: `${currentRatioVal}x`,
        benchmark: '< 1.0x',
        status: 'RUIM',
        description: 'Obrigações de curto prazo superam ativos circulantes.',
      };
      flags.push(`Liquidez corrente de ${currentRatioVal}x denota aperto no curto prazo.`);
    }
  } else {
    score += 8;
    liqMetric = {
      name: 'Liquidez Corrente',
      value: null,
      formatted: 'N/D',
      benchmark: '≥ 1.0x',
      status: 'NEUTRO',
      description: 'Dado não divulgado.',
    };
  }

  // 5. Avaliação do Valuation (P/L e P/VP) - Peso 20 pts
  let peMetric: FundamentalMetric;
  if (peVal !== null) {
    if (peVal > 0 && peVal <= 16) {
      score += 10;
      peMetric = {
        name: 'P/L (Preço / Lucro)',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: '0x a 16x',
        status: 'BOM',
        description: 'Múltiplo de lucro atrativo / razoável.',
      };
      reasons.push(`P/L atrativo de ${peVal}x.`);
    } else if (peVal > 16 && peVal <= 30) {
      score += 5;
      peMetric = {
        name: 'P/L (Preço / Lucro)',
        value: peVal,
        formatted: `${peVal}x`,
        benchmark: '16x a 30x',
        status: 'NEUTRO',
        description: 'Preço embute prêmio de crescimento.',
      };
    } else {
      peMetric = {
        name: 'P/L (Preço / Lucro)',
        value: peVal,
        formatted: peVal < 0 ? `Negativo (${peVal}x)` : `${peVal}x`,
        benchmark: peVal < 0 ? 'Prejuízo' : 'Elevado (> 30x)',
        status: 'RUIM',
        description: peVal < 0 ? 'Empresa em prejuízo contábil.' : 'Múltiplo esticado.',
      };
    }
  } else {
    score += 5;
    peMetric = {
      name: 'P/L (Preço / Lucro)',
      value: null,
      formatted: 'N/D',
      benchmark: '≤ 15x',
      status: 'NEUTRO',
      description: 'Dado não disponível.',
    };
  }

  let pbMetric: FundamentalMetric;
  if (pbVal !== null) {
    if (pbVal > 0 && pbVal <= 2.5) {
      score += 10;
      pbMetric = {
        name: 'P/VP (Preço / Valor Patrimonial)',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: '≤ 2.5x',
        status: 'BOM',
        description: 'Negociada com valuation patrimonial equilibrado.',
      };
    } else if (pbVal > 2.5 && pbVal <= 5.0) {
      score += 5;
      pbMetric = {
        name: 'P/VP (Preço / Valor Patrimonial)',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: '2.5x a 5.0x',
        status: 'NEUTRO',
        description: 'Prêmio patrimonial de mercado.',
      };
    } else {
      pbMetric = {
        name: 'P/VP (Preço / Valor Patrimonial)',
        value: pbVal,
        formatted: `${pbVal}x`,
        benchmark: '> 5.0x',
        status: 'RUIM',
        description: 'Preço muito distante do valor contábil.',
      };
    }
  } else {
    score += 5;
    pbMetric = {
      name: 'P/VP (Preço / Valor Patrimonial)',
      value: null,
      formatted: 'N/D',
      benchmark: '≤ 3.0x',
      status: 'NEUTRO',
      description: 'Dado não disponível.',
    };
  }

  // Dividend Yield complementar
  const dyMetric: FundamentalMetric = {
    name: 'Dividend Yield',
    value: dyVal,
    formatted: dyVal !== null ? `${dyVal}%` : 'N/D',
    benchmark: '≥ 6%',
    status: dyVal && dyVal >= 6 ? 'BOM' : dyVal && dyVal >= 3 ? 'NEUTRO' : 'RUIM',
    description: dyVal && dyVal >= 6 ? 'Excelente retorno em proventos.' : 'Proventos moderados ou baixos.',
  };

  // Crivo Final de Aprovação Fundamentalista (CNPI-P)
  // Regras de Eliminação: Prejuízo Líquido persistente OU Dívida > 3.8x OU Score < 50
  const isLossMaking = netMarginVal !== null && netMarginVal < -1.0;
  const isOverleveraged = debtToEbitdaVal !== null && debtToEbitdaVal > 3.8;
  const isApproved = score >= 50 && !isLossMaking && !isOverleveraged;

  let summary = '';
  if (isApproved) {
    summary = `Empresa aprovada no crivo fundamentalista com Score de ${score}/100. Apresenta boa estrutura financeira e solvência para teses de investimento.`;
  } else {
    const mainIssue = isLossMaking
      ? 'operação com margem negativa (prejuízo)'
      : isOverleveraged
      ? 'alavancagem financeira crítica (> 3.8x)'
      : 'score global insuficiente';
    summary = `Empresa reprovada no crivo fundamentalista (Score: ${score}/100) devido a ${mainIssue}. Compras são desaconselhadas.`;
  }

  return {
    symbol,
    score,
    status: isApproved ? 'APROVADO' : 'REPROVADO',
    summary,
    metrics: {
      roe: roeMetric,
      netMargin: netMarginMetric,
      ebitdaMargin: ebitdaMarginVal !== null
        ? {
            name: 'Margem EBITDA',
            value: ebitdaMarginVal,
            formatted: `${ebitdaMarginVal}%`,
            benchmark: '≥ 20%',
            status: ebitdaMarginVal >= 20 ? 'BOM' : 'NEUTRO',
            description: 'Geração de caixa operacional sobre receita.',
          }
        : undefined,
      debtToEbitda: debtMetric,
      currentLiquidity: liqMetric,
      peRatio: peMetric,
      pbRatio: pbMetric,
      dividendYield: dyMetric,
    },
    reasons: isApproved ? reasons : flags,
    analyzedAt: new Date().toISOString(),
  };
}
