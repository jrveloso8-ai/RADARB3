const fs = require('fs');
const quoteViewPath = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';
let quoteContent = fs.readFileSync(quoteViewPath, 'utf8');

quoteContent = quoteContent.replace(
`interface QuoteViewProps {
  initialSymbol?: string;
  symbol?: string;
  onNavigateToGex?: (sym: string) => void;
  onNavigateToBarreiras?: (sym: string) => void;
}`,
`interface QuoteViewProps {
  initialSymbol?: string;
  symbol?: string;
  onNavigateToGex?: (sym: string) => void;
  onNavigateToBarreiras?: (sym: string) => void;
  onBackToScreener?: () => void;
}`
);

quoteContent = quoteContent.replace(
`export function QuoteView({ initialSymbol, symbol: propSymbol, onNavigateToGex, onNavigateToBarreiras }: QuoteViewProps) {`,
`export function QuoteView({ initialSymbol, symbol: propSymbol, onNavigateToGex, onNavigateToBarreiras, onBackToScreener }: QuoteViewProps) {`
);

fs.writeFileSync(quoteViewPath, quoteContent, 'utf8');
console.log('QuoteViewProps fixed with onBackToScreener');
