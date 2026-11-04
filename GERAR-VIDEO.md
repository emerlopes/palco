# Gerar um vídeo: ordem de serviço para o agente

> **Para quem executa (Claude Code):** siga do começo ao fim com os critérios daqui e do `CLAUDE.md`. Só pare para perguntar se faltar um dado que não pode ser inventado.
>
> **Como pedir:** *"Siga GERAR-VIDEO.md"* com o modelo de pedido do fim. Se já existe um deck, basta o caminho do `deck.json`.

## Resultado esperado

Em `conteudo/<AAAA-MM-DD>-<id>/out/` (fora do git):

- `video.mp4`: 1920×1080, 60 fps, H.264 yuv420p e, com trilha, AAC a −14 LUFS;
- `video-draft.mp4`: o rascunho usado na crítica;
- `check/contact.png` e `contact-video.png`: folhas de contato;
- `../review_log.md`: notas da crítica e o que mudou.

## Como o vídeo é montado

O vídeo é a apresentação tocando sozinha: cada slide entra com a própria animação, fica parado por `hold` segundos (padrão 3) e a faixa neon varre a tela para o próximo. Com `"music": "suave"`, cada slide dura um número inteiro de compassos (2 s a 120 BPM): as trocas caem no tempo forte e cada uma tem um sopro.

```json
"video": { "music": "suave", "hold": 3 }
```

Um slide que precisa de mais tempo de leitura ganha `"hold": 6` no próprio slide. Regra prática: 1 s de leitura para cada 3 palavras na tela, mais 2 s.

## Passos

1. **Roteiro:** passo 1 do `GERAR-APRESENTACAO.md`. No vídeo não há apresentador: o título e o texto contam a história sozinhos (o vídeo funciona sem som). As `notes` viram o texto da locução, se houver.
2. **Conferência dos slides:**

   ```bash
   node render.mjs conteudo/AAAA-MM-DD-ID/deck.json --check
   ```

   Precisa sair com avisos, erros e determinismo limpos. Olhar `out/check/contact.png`.
3. **Prévia do ritmo**, sem render: abrir `deck.html?play` no navegador.
4. **Rascunho** (cerca de 10 s de render para 30 s de vídeo):

   ```bash
   node render.mjs conteudo/AAAA-MM-DD-ID/deck.json --video --draft
   ```

   ```bash
   cd conteudo/AAAA-MM-DD-ID/out && ffmpeg -y -i video-draft.mp4 -vf "fps=2,scale=320:-1,tile=6x10" -frames:v 1 contact-video.png
   ```

5. **Crítica** do `CLAUDE.md`, mais duas notas: ritmo (tempo de leitura de cada slide) e transições. Corrigir até todas as notas serem 8 ou mais.
6. **Final** (cerca de 2,5× a duração do vídeo):

   ```bash
   node render.mjs conteudo/AAAA-MM-DD-ID/deck.json --video
   ```

7. **Conferência final**, registrada no `review_log.md`:

   ```bash
   ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -show_entries format=duration -of compact=p=0 conteudo/AAAA-MM-DD-ID/out/video.mp4
   ```

   - [ ] 1920×1080, 60 fps, h264, yuv420p; duração igual à do `--check`.
   - [ ] Com trilha: −14,0 LUFS medido no MP4 (o render imprime).
   - [ ] Determinismo: o mesmo trecho (`--from 10 --to 11 --mudo --out a.mp4`, depois `b.mp4`) com o mesmo `framemd5`.
   - [ ] Números conferidos contra os dados do pedido.

## Relatório

Caminho do MP4, duração, notas finais da crítica e o que não foi verificado. O agente não ouve: a trilha é conferida pela grade de compassos e pela medição de loudness.

## Modelo de pedido

```text
Siga GERAR-VIDEO.md.

Deck: [caminho do deck.json existente, ou os campos do modelo de GERAR-APRESENTACAO.md]
Trilha: [suave / nenhuma]
Tempo por slide: [padrão 3 s parado depois da animação, ou outro]
```
