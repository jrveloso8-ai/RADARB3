import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RADAR B3 PRO IA — Análise Quantitativa, Tendências & Opções B3',
  description:
    'Plataforma analítica RADAR B3 PRO IA para Ações, Opções e Mercado Futuro B3 com Inteligência Artificial, Médias Móveis (MM20, MM50, MM200), Barreiras de Opções e Estratégias CME Group.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0b0f19] text-gray-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
