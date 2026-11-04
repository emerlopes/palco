# Fases

| Fase | Entrega | Estado |
|---|---|---|
| 1 | Motor, tema claro, 4 componentes (capa, indicadores, diagrama, linha do tempo), `deck.html` autossuficiente com apresentador e PDF | Feita (2026-11-04) |
| 2 | `render.mjs`: MP4 16:9 (1920×1080, 60 fps, 4 subquadros), PNG de slide único e `--check`; transição neon; trilha "suave" sintetizada em compassos; master a −14 LUFS; `?play`; `GERAR-VIDEO.md` e `GERAR-SLIDE.md` | Feita (2026-11-04) |
| 3 | Vídeo com a voz do apresentador: `voz.wav` → transcrição local (whisper.cpp) → trocas de slide nas marcas do roteiro → legenda | Planejada |
| 4 | Tema da empresa em `themes/local/` (cores do brandbook, fonte licenciada), depois de liberação de marca e de compliance | Aguardando brandbook |

## Componentes candidatos

Gráfico de barras e de linha (série semanal), comparação antes × depois, lista com ícones, citação, slide de seção. Entram quando um deck real pedir.

## Pendências

- Copiar o `OFL.txt` oficial da Plus Jakarta Sans para `fonts/`.
- Janela do apresentador com miniatura do slide atual e do próximo.
- Vídeo vertical (9:16) e slide 4:5: os layouts são de 16:9; precisam de layouts próprios por componente, não de corte.
- Na transição, a 60 fps com 4 subquadros, a faixa neon ainda mostra degraus no quadro parado (some na reprodução). Se incomodar: 8 subquadros só no trecho da transição.

## Dependências

| Dependência | Versão | Uso | Rede |
|---|---|---|---|
| Node | 22+ | build e render | não |
| playwright | 1.64.1 (Chromium 1248) | render e conferência | só no `npx playwright install` |
| ffmpeg | do sistema (Homebrew) | codificação, loudness | não |
