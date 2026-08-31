/**
 * CONFIGURAÇÃO CENTRAL DE REGRAS QUANTITATIVAS E THRESHOLDS CNPI
 * Radar B3 Pro IA — Especificação Técnica v2 (31/08/2026)
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
      PROFITABILITY: 35, // Lucro Líquido (5) + ROE (15) + Margem Líquida (15)
      SOLVENCY: 35,      // DL/EBITDA (20) + Liquidez Corrente (15)
      VALUATION: 30,     // P/L (15) + P/VP (15)
    },

    // Thresholds específicos
    THRESHOLDS: {
      NET_INCOME_MIN: 0, // Lucro Líquido 12M deve ser > 0 (R$ > 0)
      ROE_HEALTHY: 10.0, // >= 10% saudável
      ROE_MIN: 5.0,      // 5% a 10% neutro

      NET_MARGIN_HEALTHY: 8.0, // >= 8% saudável
      NET_MARGIN_MIN: 0.0,     // 0% a 8% neutro, <= 0% eliminatório

      DEBT_TO_EBITDA_HEALTHY: 2.5,     // <= 2.5x saudável
      DEBT_TO_EBITDA_MAX: 3.0,         // 2.5x a 3.0x neutro
      DEBT_TO_EBITDA_ELIMINATORY: 3.5, // > 3.5x reprova (SUPERENDIVIDAMENTO)

      CURRENT_RATIO_HEALTHY: 1.2, // >= 1.2x saudável
      CURRENT_RATIO_MIN: 1.0,     // 1.0x a 1.2x neutro, < 1.0x ruim (0 pts, mas NÃO eliminatório)

      PE_MIN: 3.0,  // P/L mínimo saudável (3x)
      PE_MAX: 25.0, // P/L máximo saudável (25x)

      P_VP_MIN: 0.5, // P/VP mínimo saudável (0.5x)
      P_VP_MAX: 4.0, // P/VP máximo saudável (4.0x)
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

    // Elegibilidade para cálculo de IV ATM a partir do Analytics
    ATM_ELIGIBILITY: {
      MIN_OPTION_PRICE: 0.10,
      MIN_OPEN_INTEREST: 1000,
      MAX_DIST_SPOT_PCT: 0.05, // +- 5% do spot
      MAX_CALL_PUT_IV_DIVERGENCE_PP: 5.0, // Divergência > 5 pp torna IV não confiável
    },
  },

  // =========================================================================
  // CAMADA 4: PLANO DE TRADE
  // =========================================================================
  TRADE_PLAN: {
    MIN_RISK_REWARD_RATIO: 1.5, // R:R mínimo para viabilidade da operação
    ATR_PERIOD: 14,
    ATR_MULTIPLIER_STOP: 0.5,
  },
} as const;
