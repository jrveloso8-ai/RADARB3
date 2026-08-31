'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Send, Sparkles } from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';

interface SubscribeResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  isExisting?: boolean;
}

export const MarketOpeningSubscribeCard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { ok, data } = await safeFetchJson<SubscribeResponse>('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (ok && data?.ok) {
        setSuccessMsg(data.message || 'Cadastro realizado com sucesso!');
        setEmail('');
      } else {
        setErrorMsg(data?.error || 'Erro ao realizar cadastro. Tente novamente.');
      }
    } catch {
      setErrorMsg('Falha na comunicação com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-gradient-to-br from-[#0c1220] via-[#111827] to-[#0f172a] rounded-3xl border border-cyan-500/30 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-md">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base sm:text-lg">
                Resumo da Abertura do Mercado
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                DIÁRIO • 08h45
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Receba antes da abertura do pregão o panorama global (S&P 500, Petróleo Brent, Dólar e Sentimento B3) no seu e-mail.
            </p>
          </div>
        </div>
      </div>

      {successMsg ? (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs leading-relaxed animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-emerald-200 text-sm font-semibold mb-0.5">Inscrição Confirmada!</strong>
            <span>{successMsg}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Seu melhor e-mail corporativo ou pessoal..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-[#070b14] border border-gray-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition shadow-inner font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Receber Resumo Diário</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 font-mono">
            <span>🔒 Sem spam. 100% gratuito e focado no mercado.</span>
            <span className="text-gray-400 hidden sm:inline">Disparo diário pré-mercado às 08h45</span>
          </div>
        </form>
      )}
    </div>
  );
};
