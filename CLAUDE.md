# Regras do Palco

O Palco gera apresentações em HTML (slides), vídeos MP4 e slides únicos em PNG a partir de um roteiro em JSON (`deck.json`). Este arquivo diz **como** fazer; as ordens de serviço (`GERAR-*.md`) dizem o passo a passo de cada entrega. Responda em pt-BR.

Uso típico: arquitetura de sistemas, números semanais para a liderança, evolução de projeto e explicações gravadas.

## Dados e confidencialidade

- O repositório contém só o motor, temas neutros e exemplos **fictícios**. Conteúdo de trabalho fica em `conteudo/` (fora do git). Nunca versionar dados de empresa, nomes de clientes, números internos ou diagramas reais.
- Marca de empresa (cores oficiais, logo, fonte licenciada) fica em `themes/local/` (fora do git). Nunca colocar logo ou tema de empresa em `themes/`.
- Números no slide só dos dados fornecidos no pedido (CSV, JSON, texto). Nunca inventar valor, meta ou variação. Exemplo ilustrativo é marcado como "Dados fictícios" na fonte do slide.
- Lembrar que tudo o que o agente lê vai para a API do modelo. Conteúdo sensível só com o uso de IA aprovado pela empresa.

## Sem rede

- O deck é um HTML único e autossuficiente: fontes, estilos, ícones e script embutidos. Abre de `file://`, offline.
- Proibido: CDN, Google Fonts remoto, analytics, `fetch` para fora, imagem por URL externa. Dependência nova só se for instalada localmente e justificada em `docs/fases.md`.

## Contrato de render

- Cada slide é uma função pura do tempo: `window.palco.seek(i, t)` pinta o slide `i` no instante `t` (s). Ao vivo, o runtime chama `seek` a cada quadro; no render (`?render`), quem chama é o renderizador.
- Proibido no código de slide: transição CSS, `setTimeout`, `requestAnimationFrame`, estado guardado entre quadros, `Math.random`, data atual. Ruído só com semente (`mulberry32`).
- Esperar `document.fonts.ready` antes de montar: os componentes medem o texto.
- Slides inativos ficam com `visibility: hidden`, nunca `display: none` (o layout precisa existir para medir).
- Mesmo deck → mesmo quadro: conferir com o hash de dois renders do mesmo instante.

## Movimento

- Só molas em forma fechada (`lib/motion.js`): UI k=320 d=30; padrão k=170 d=26; pesado k=120 d=24, sem overshoot (texto grande, contadores).
- Cada tipo de entrada usa uma técnica: máscara por palavra (título), traço que se desenha (faixa, conexões, linha do tempo), crescer do centro (nós), deslize com mola (cartões), contador (valores), pacote neon percorrendo a conexão (fluxo). Fade sozinho não é técnica.
- Contador parte do valor anterior (`prev`) quando existe: a animação mostra a variação.
- Avançar anima; voltar mostra o slide pronto. `prefers-reduced-motion` mostra tudo pronto.

## Visual (tema claro, neon laranja)

- Fundo claro (projetor e PDF). Escuro só como tema extra, se pedido.
- O neon é **assinatura**, não decoração: faixa lateral, traço do rótulo e do título da capa, progresso da linha do tempo, nó em destaque e pacotes. Brilho nunca em texto.
- Uma cor de destaque (laranja). Texto em destaque usa `accent-strong` (contraste ≥ 4,5:1); o laranja neon puro não é cor de texto.
- Estado nunca só por cor: variação com seta e sinal, meta com ícone e texto, marcos com ícone e rótulo.
- Um título por slide, até 14 palavras (capa: 10), no máximo um `[[destaque]]`.
- Tamanhos mínimos em 1920×1080: título 64 px (capa 120), texto 28 px, rótulos e legendas 22 px. Se um texto não cabe, o runtime reduz até o mínimo e avisa em `window.palco.warnings`: encurtar o texto, nunca aceitar aviso.
- Ícones Lucide embutidos em `lib/icons.js`. Proibido: emoji, gradiente roxo/rosa, glassmorphism, título centralizado sobre gradiente, rótulos soltos nos cantos.

## Crítica antes de entregar

1. Renderizar cada slide no estado final e em 2 instantes da entrada; montar uma folha de contato e **olhar**.
2. Ser um diretor exigente. Nota de 1 a 10 em: clareza da mensagem do título, leitura no projetor (a 1/3 do tamanho), hierarquia, consistência entre slides, fidelidade aos dados, qualidade do movimento.
3. Registrar as notas e os 3 piores problemas em `conteudo/<id>/review_log.md`, corrigir e repetir até todas as notas serem 8 ou mais.
4. `window.palco.warnings` vazio, sem erro no console, determinismo conferido.

## Lições (Fase 1, 2026-11-04)

- Tamanhos de valores e rótulos são igualados no grupo (`fitGroup`): reduzir só um cartão quebra a hierarquia.
- Rótulo de conexão entre colunas vizinhas precisa de espaço: o diagrama deixa 132 px entre nós quando há rótulos; rótulo de conexão com cotovelo vai no trecho vertical.
- Na impressão, os pacotes somem (ficariam parados no meio da seta).
- A janela do apresentador é escrita direto pelo deck (`window.open` de `about:blank`): funciona em `file://` sem servidor.
