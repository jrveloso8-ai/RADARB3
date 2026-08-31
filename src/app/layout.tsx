import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'RADAR B3 PRO IA — Estudos Quantitativos, Tendências & Opções B3',
  description:
    'Plataforma analítica e educacional RADAR B3 PRO IA para estudos de Ações e Opções B3 com Inteligência Artificial, Médias Móveis (MM20, MM50, MM200), Barreiras de Opções e Catálogo de Estratégias.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0b0f19] text-gray-100 antialiased min-h-screen flex flex-col justify-between">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
