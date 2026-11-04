# Fases

| Fase | Entrega | Estado |
|---|---|---|
| 1 | Motor, tema claro, 4 componentes (capa, indicadores, diagrama, linha do tempo), `deck.html` autossuficiente com apresentador e PDF | Feita (2026-11-04) |
| 2 | `render.mjs`: MP4 (16:9 1920×1080, e 9:16 opcional) e PNG de slide único a partir do mesmo deck, via `?render` + Playwright + ffmpeg; `GERAR-VIDEO.md` e `GERAR-SLIDE.md`; trilha opcional sintetizada em código | Próxima |
| 3 | Vídeo com a voz do apresentador: `voz.wav` → transcrição local (whisper.cpp) → trocas de slide nas marcas do roteiro → legenda | Planejada |
| 4 | Tema da empresa em `themes/local/` (cores do brandbook, fonte licenciada), depois de liberação de marca e de compliance | Aguardando brandbook |

## Componentes candidatos

Gráfico de barras e de linha (série semanal), comparação antes × depois, lista com ícones, citação, slide de seção. Entram quando um deck real pedir.

## Pendências

- Copiar o `OFL.txt` oficial da Plus Jakarta Sans para `fonts/`.
- Janela do apresentador com miniatura do slide atual e do próximo.
- Dependências da Fase 2 (Playwright, ffmpeg) são locais; registrar versão aqui ao instalar.
