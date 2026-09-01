const fs = require('fs');
const quoteViewPath = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';
let quoteContent = fs.readFileSync(quoteViewPath, 'utf8');

quoteContent = quoteContent.replace(
  `interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
}`,
  `interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
  onBackToScreener?: () => void;
}`
);

quoteContent = quoteContent.replace(
  `export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex }: QuoteViewProps) {`,
  `export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex, onBackToScreener }: QuoteViewProps) {`
);

fs.writeFileSync(quoteViewPath, quoteContent, 'utf8');
console.log('Fixed QuoteViewProps cleanly');
