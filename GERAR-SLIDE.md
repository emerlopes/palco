# Gerar um slide único (PNG): ordem de serviço para o agente

> Para um slide avulso: anexo de e-mail, post interno, capa de documento, imagem para colar em outra apresentação.

## Resultado esperado

`conteudo/<AAAA-MM-DD>-<id>/out/slide-NN.png`, em 1920×1080 (ou 3840×2160 com `--scale 2`), no estado final da animação e sem os pacotes do fluxo.

## Passos

1. Escrever um `deck.json` com um slide só (ou usar um deck existente e escolher o slide). Mesmas regras de roteiro do `GERAR-APRESENTACAO.md`: o título é a conclusão.
2. Conferir:

   ```bash
   node render.mjs conteudo/AAAA-MM-DD-ID/deck.json --check
   ```

3. Gerar:

   ```bash
   node render.mjs conteudo/AAAA-MM-DD-ID/deck.json --png --slides 1
   ```

   Em alta resolução, para impressão ou telão: `--scale 2`.

4. Olhar o PNG e fazer a crítica do `CLAUDE.md`. Sem rodapé de paginação útil num slide avulso: usar `"footer"` com o contexto (time, data).

## Modelo de pedido

```text
Siga GERAR-SLIDE.md.

Conteúdo: [indicadores / arquitetura / marcos / capa, com os dados]
Mensagem (título): [a conclusão, ou "proponha"]
Resolução: [1920×1080 / 3840×2160]
```
