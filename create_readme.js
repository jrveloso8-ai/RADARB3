const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/README.md';

const readmeContent = `# 🚀 RADAR TASTYTRADE PRO IA + GEX ENGINE

> **Terminal Quantitativo Institucional para o Mercado Americano (S&P 500, Nasdaq 100 & Opções Tastytrade)**
> Desenvolvido com Next.js 14, TypeScript, Tailwind CSS e Algoritmo Puro de Gamma Exposure (GEX).

---

## 📑 Principais Funcionalidades

1. **📊 Panorama Geral do Mercado:**
   * Termômetro de Sentimento Institucional & Velocímetro Gauge (Alta / Neutro / Baixa).
   * Painel de volatilidade VIX, juros do FED e fluxo de capital.

2. **🕯️ Consulta Técnica CNPI-T com Candlesticks Diários:**
   * Gráfico completo em SVG com médias móveis (MA20, MA50, MA200), suporte e resistência automáticos.
   * Sub-painéis integrados de Volume (com média de 20 períodos), RSI(14) e MACD Histograma.
   * Checklist técnico de 5 itens e matriz risco/retorno (R:R).

3. **💎 Recomendações de Estudo Estruturadas (Paridade Radar B3):**
   * **Modo Opções Eleita:** Estruturas automatizadas (#20 Iron Condor a Crédito, #01 Bull Call Spread, #02 Bear Put Spread).
   * **Gráfico Matemático de Payoff SVG:** Visualização interativa da curva de rendimento, ponto de equilíbrio (Break-Even) e zonas de lucro/prejuízo.
   * **Composição das Pernas:** Detalhamento com strikes, símbolos OCC, prêmio e Open Interest.
   * **Gatilhos Teóricos de Saída:** Regras claras de Take Profit (50%-60%), Stop Loss e Time Stop (7 DTE).
   * **Catálogo Oficial das 25 Estratégias (CME & OCC).**

4. **⚡ Painel Unificado: Barreiras de OI & Motor GEX:**
   * **Gamma Exposure Dashboard:** Barras de Call GEX (+) e Put GEX (-) por strike com linhas de Spot, Zero Gamma Flip e Max GEX Magnet.
   * **Distribuição de Volume & OI:** Gráfico espelhado horizontal de Puts vs Calls e tabelas das Top 5 Call/Put Walls.
   * **Smile de Volatilidade (IV Skew):** Curva de volatilidade implícita em tempo real.

5. **🔍 Rastreador de Tendências do S&P 500:**
   * Filtros dinâmicos por quantidade (Top 50, Top 100, Top 250, Todos) e por setor da economia.
   * Classificação em ALTA, BAIXA e LATERAL com busca instantânea.

6. **🤖 Consultor IA em Tempo Real:**
   * Chat integrado para tirar dúvidas técnicas, de fundamentos e de opções sobre qualquer ativo.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
* **Estilização:** Tailwind CSS & Lucide React Icons
* **Testes:** Vitest (100% de cobertura nos motores de cálculo)
* **API de Derivativos:** Tastytrade API (OAuth2 / DXLink Streamer)

---

## 🚀 Como Executar

### 1. Clonar o Repositório:
\`\`\`bash
git clone https://github.com/jrveloso8-ai/tastyradar.git
cd tastyradar
\`\`\`

### 2. Instalar Dependências:
\`\`\`bash
npm install
\`\`\`

### 3. Configurar Variáveis de Ambiente:
Copie o arquivo de exemplo e insira suas credenciais da Tastytrade:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Edite o arquivo \`.env.local\`:
\`\`\`env
CLIENT_ID=seu_client_id_tastytrade
CLIENT_SECRET=seu_client_secret_tastytrade
REFRESH_TOKEN=seu_refresh_token_tastytrade
ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 4. Iniciar o Sistema:
No Windows, execute diretamente o arquivo \`iniciar.bat\` ou via terminal:
\`\`\`bash
npm run dev
\`\`\`
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🔒 Segurança e Privacidade

* Nenhuma chave de API ou credencial sensível é versionada no repositório.
* Todas as variáveis de ambiente (\`.env*\`, tokens de sessão e certificados) estão estritamente protegidas no \`.gitignore\`.
`;

fs.writeFileSync(target, readmeContent.trim(), 'utf8');
console.log('Created README.md');
