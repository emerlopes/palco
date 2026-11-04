# Palco

Apresentações em HTML, vídeos MP4 e slides únicos gerados a partir de um roteiro em JSON, com movimento em código e a mesma régua de qualidade em todos os formatos.

- **Apresentação:** um `deck.html` único, que abre offline em qualquer navegador, com tela cheia, modo apresentador (notas, próximo slide, cronômetro) e exportação para PDF.
- **Vídeo:** o mesmo deck tocando sozinho, renderizado quadro a quadro em MP4 1920×1080 60 fps, com transição neon e trilha opcional sintetizada em código (−14 LUFS).
- **Slide único:** PNG 1920×1080 ou 3840×2160 no estado final.
- **Componentes:** capa, indicadores com variação e meta, diagrama de arquitetura com fluxo animado, linha do tempo de evolução.

Requisitos: Node 22 ou mais recente. Para vídeo e PNG, também ffmpeg e o Playwright (`npm install && npx playwright install chromium`, uma vez). Depois de instalado, nada acessa a rede.

## Uso

```bash
node build-deck.mjs exemplos/status-semanal/deck.json
```

```bash
open exemplos/status-semanal/deck.html
```

| Tecla | Ação |
|---|---|
| → · espaço · PageDown | Avançar (anima) |
| ← · PageUp | Voltar (slide pronto) |
| F | Tela cheia |
| P | Janela do apresentador |
| R | Repetir a animação do slide |
| Home · End | Primeiro · último |

Prévia do vídeo sem renderizar: `deck.html?play`.

```bash
node render.mjs exemplos/status-semanal/deck.json --check          # conferência + folha de contato
node render.mjs exemplos/status-semanal/deck.json --video --draft  # rascunho rápido
node render.mjs exemplos/status-semanal/deck.json --video          # final
node render.mjs exemplos/status-semanal/deck.json --png --slides 3 # slide único
```

Saídas em `out/` ao lado do `deck.json`.

Clique na metade direita ou esquerda e passador de slides (PageUp/PageDown) também funcionam. PDF: Imprimir → Salvar como PDF, com gráficos de plano de fundo.

## Estrutura

```
build-deck.mjs          gera o deck.html (valida o deck.json e embute tudo)
render.mjs              MP4, PNG e conferência (--check), via Playwright + ffmpeg
lib/audio/              trilha sintetizada e master de loudness
lib/runtime.js          navegação, apresentador, contrato seek(i, t)
lib/components/         title, kpi, diagram, timeline
lib/motion.js           molas em forma fechada
themes/claro.json       tema padrão (themes/local/ fica fora do git)
exemplos/               decks fictícios
conteudo/               trabalho real (fora do git)
CLAUDE.md               regras do estúdio
GERAR-APRESENTACAO.md   ordens de serviço para o agente
GERAR-VIDEO.md
GERAR-SLIDE.md
docs/deck-spec.md       campos do deck.json
docs/fases.md           roadmap
```

## Com o Claude Code

Abrir a pasta e mandar *"Siga GERAR-APRESENTACAO.md"* (ou `GERAR-VIDEO.md`, `GERAR-SLIDE.md`) com o modelo de pedido do fim do arquivo.
