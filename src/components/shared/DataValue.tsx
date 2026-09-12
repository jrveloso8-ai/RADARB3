'use client';

import React from 'react';
import { DataProvenance } from '@/lib/types/provenance';
import { HelpCircle, AlertCircle } from 'lucide-react';

export interface DataValueProps {
  /**
   * Valor numérico ou texto a ser exibido.
   * Se for null, undefined, ou a proveniência for INDISPONIVEL, será exibido 'N/D' (ou fallbackText).
   */
  value: number | string | null | undefined;
  /**
   * Classificação obrigatória da proveniência do dado.
   */
  provenance: DataProvenance;
  /**
   * Função opcional de formatação quando o valor for válido.
   */
  format?: (val: any) => string;
  /**
   * Classes CSS adicionais.
   */
  className?: string;
  /**
   * Texto de fallback quando o valor for indisponível (padrão: "N/D").
   */
  fallbackText?: string;
  /**
   * Prefixo (ex: 'R$ ', '+').
   */
  prefix?: string;
  /**
   * Sufixo (ex: '%', ' DTE', ' pts').
   */
  suffix?: string;
  /**
   * Se true, exibe um badge visual estilizado com a proveniência.
   */
  showBadge?: boolean;
  /**
   * Tooltip opcional ou texto explicativo.
   */
  title?: string;
}

export const DataValue: React.FC<DataValueProps> = ({
  value,
  provenance,
  format,
  className = '',
  fallbackText = 'N/D',
  prefix = '',
  suffix = '',
  showBadge = false,
  title,
}) => {
  // Se for INDISPONIVEL ou valor nulo/indefinido, NUNCA renderizar o valor
  if (provenance === 'INDISPONIVEL' || value === null || value === undefined || value === '') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono text-xs italic ${className}`}
        title={title || 'Dado indisponível no momento'}
      >
        <span>{fallbackText}</span>
        {showBadge && (
          <span className="text-[10px] uppercase font-semibold px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            N/D
          </span>
        )}
      </span>
    );
  }

  // Formatando o valor
  let formattedValue: string;
  if (format) {
    try {
      formattedValue = format(value);
    } catch {
      formattedValue = String(value);
    }
  } else if (typeof value === 'number') {
    formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  } else {
    formattedValue = String(value);
  }

  const renderedContent = `${prefix}${formattedValue}${suffix}`;

  // Indicador visual para ESTIMADO
  if (provenance === 'ESTIMADO') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono ${className}`}
        title={title || 'Dado estimado via heurística/proxy estatístico. Não é medição primária.'}
      >
        <span>{renderedContent}</span>
        <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded tracking-tight">
          (est.)
        </span>
      </span>
    );
  }

  // Indicador visual para SIMULADO
  if (provenance === 'SIMULADO') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono ${className}`}
        title={title || 'Valor paramétrico ou de referência de regra. Não representa dado ao vivo.'}
      >
        <span>{renderedContent}</span>
        <span className="text-[10px] font-semibold text-purple-400 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1 py-0.2 rounded tracking-tight">
          (ref.)
        </span>
      </span>
    );
  }

  // MEDIDO ou DERIVADO: dado confiável
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono ${className}`}
      title={title || (provenance === 'MEDIDO' ? 'Dado medido de fonte oficial' : 'Dado derivado deterministicamente')}
    >
      <span>{renderedContent}</span>
      {showBadge && (
        <span className="text-[9px] uppercase font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
          {provenance === 'MEDIDO' ? 'MED' : 'DER'}
        </span>
      )}
    </span>
  );
};
