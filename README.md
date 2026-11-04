# Palco

Apresentações em HTML, vídeos MP4 e slides únicos gerados a partir de um roteiro em JSON, com movimento em código e a mesma régua de qualidade em todos os formatos.

- **Apresentação:** um `deck.html` único, que abre offline em qualquer navegador, com tela cheia, modo apresentador (notas, próximo slide, cronômetro) e exportação para PDF.
- **Vídeo e slide único** (Fase 2): o mesmo deck renderizado quadro a quadro em MP4 ou congelado em PNG.
- **Componentes:** capa, indicadores com variação e meta, diagrama de arquitetura com fluxo animado, linha do tempo de evolução.

Sem dependências e sem rede na Fase 1: só Node 22 ou mais recente.

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

Clique na metade direita ou esquerda e passador de slides (PageUp/PageDown) também funcionam. PDF: Imprimir → Salvar como PDF, com gráficos de plano de fundo.

## Estrutura

```
build-deck.mjs          gera o deck.html (valida o deck.json e embute tudo)
lib/runtime.js          navegação, apresentador, contrato seek(i, t)
lib/components/         title, kpi, diagram, timeline
lib/motion.js           molas em forma fechada
themes/claro.json       tema padrão (themes/local/ fica fora do git)
exemplos/               decks fictícios
conteudo/               trabalho real (fora do git)
CLAUDE.md               regras do estúdio
GERAR-APRESENTACAO.md   ordem de serviço para o agente
docs/deck-spec.md       campos do deck.json
docs/fases.md           roadmap
```

## Com o Claude Code

Abrir a pasta e mandar *"Siga GERAR-APRESENTACAO.md"* com o modelo de pedido do fim do arquivo.
