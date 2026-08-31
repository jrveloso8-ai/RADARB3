/**
 * CONFIGURAÇÃO CENTRAL DE REGRAS QUANTITATIVAS E THRESHOLDS CNPI
 * Fonte única de parâmetros matemáticos para todas as camadas do sistema.
 */

export const CNPI_RULES = {
  // =========================================================================
  // CAMADA 1: FUNDAMENTOS (CNPI-P)
  // =========================================================================
  FUNDAMENTALS: {
    // Corte mínimo de pontos para aprovação
    APPROVAL_SCORE_THRESHOLD: 45,

    // Pesos por Categoria (Total = 100 pontos)
    WEIGHTS: {
      PROFITABILITY: 35, // ROE (18) + Margem Líquida (17)
      SOLVENCY: 35,      // DL/EBITDA (20) + Liquidez Corrente (15)
      VALUATION: 30,     // P/L (15) + P/VP (15)
    },

    // Thresholds específicos
    THRESHOLDS: {
      ROE_HEALTHY: 10.0, // >= 10% saudável
      ROE_MIN: 5.0,      // 5% a 10% neutro

      NET_MARGIN_HEALTHY: 8.0, // >= 8% saudável
      NET_MARGIN_MIN: 0.0,     // 0% a 8% neutro, <= 0% eliminatório

      DEBT_TO_EBITDA_HEALTHY: 2.5, // <= 2.5x saudável
      DEBT_TO_EBITDA_MAX: 3.0,     // 2.5x a 3.0x neutro, > 3.5x eliminatório

      CURRENT_RATIO_HEALTHY: 1.2, // >= 1.2x saudável
      CURRENT_RATIO_MIN: 1.0,     // 1.0x a 1.2x neutro, < 1.0x ruim

      PE_MIN: 3.0,  // P/L mínimo saudável
      PE_MAX: 25.0, // P/L máximo saudável

      P_VP_MIN: 0.5, // P/VP mínimo saudável
      P_VP_MAX: 4.0, // P/VP máximo saudável
    },
  },

  // =========================================================================
  // CAMADA 2: ANÁLISE TÉCNICA (CNPI-T)
  // =========================================================================
  TECHNICAL: {
    RSI: {
      HEALTHY_MIN: 40.0,
      HEALTHY_MAX: 65.0,
      OVERBOUGHT: 70.0,
      OVERSOLD: 30.0,
    },
    SMA: {
      SHORT: 20,
      MEDIUM: 50,
      LONG: 200,
    },
  },

  // =========================================================================
  // CAMADA 3: DERIVATIVOS & VOLATILIDADE (CNPI-D)
  // =========================================================================
  DERIVATIVES: {
    // Alerta de proximidade das muralhas de opções
    BARRIER_IMMINENCE_THRESHOLD_PCT: 3.0, // <= 3.0% do spot

    // Regime de Volatilidade (IV vs HV)
    VOLATILITY: {
      HIGH_IV_THRESHOLD: 28.0,      // IV >= 28% é considerada Alta
      SQUEEZE_IV_THRESHOLD: 16.0,   // IV < 16% é Squeeze / Vol Muito Baixa
      HIGH_RATIO_THRESHOLD: 1.05,   // IV / HV >= 1.05 favorece Crédito
      LOW_RATIO_THRESHOLD: 0.70,    // IV / HV < 0.70 é Squeeze
    },

    // Filtro de DTE para Iron Condor (dias úteis na B3)
    IRON_CONDOR: {
      MIN_DTE: 12,
      MAX_DTE: 35,
    },
  },
} as const;
