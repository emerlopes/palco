# Gerar uma apresentação: ordem de serviço para o agente

> **Para quem executa (Claude Code):** siga do começo ao fim, decidindo com os critérios daqui e do `CLAUDE.md`. Só pare para perguntar se faltar um dado que não pode ser inventado (um número, uma meta, um componente da arquitetura).
>
> **Como pedir:** abrir o Claude Code na pasta do Palco e mandar *"Siga GERAR-APRESENTACAO.md"* com o modelo de pedido do fim deste arquivo.

## Resultado esperado

Em `conteudo/<AAAA-MM-DD>-<id>/` (fora do git):

- `deck.json`: o roteiro;
- `deck.html`: a apresentação, um arquivo só, que abre offline em qualquer navegador;
- `review_log.md`: notas da crítica e o que mudou;
- `contact.png`: folha de contato dos slides.

## Passo 1: roteiro

1. Ler o `CLAUDE.md` e `docs/deck-spec.md` inteiros.
2. Uma ideia por slide. O título é a **conclusão** ("A latência caiu 15%"), não o assunto ("Latência").
3. Estrutura padrão: capa → contexto ou números → detalhe (arquitetura, linha do tempo) → pedido ou próximo passo. De 4 a 10 slides.
4. Escolher o componente pelo conteúdo: números com comparação → `kpi`; sistemas e fluxos → `diagram`; marcos e status → `timeline`; abertura e seções → `title`.
5. Escrever as `notes` de cada slide: o que falar em 2 ou 3 frases e o pedido para a plateia, se houver.
6. Conferir cada número contra os dados do pedido. Nada inventado.

## Passo 2: build

```bash
node build-deck.mjs conteudo/AAAA-MM-DD-ID/deck.json
```

Corrigir todos os erros de validação. Tema da empresa: `--theme <nome>` (arquivo em `themes/local/`).

## Passo 3: conferência visual

Abrir com Playwright em 1920×1080, `?render`, e para cada slide renderizar o estado final (`palco.seek(i, palco.duration(i) + 2)`) e dois instantes da entrada. Montar a folha de contato:

```bash
ffmpeg -y -pattern_type glob -i 'shots/*.png' -vf "scale=640:-1,tile=3x4" -frames:v 1 conteudo/AAAA-MM-DD-ID/contact.png
```

Ler `window.palco.warnings` (precisa estar vazio) e os erros do console. Fazer a crítica do `CLAUDE.md` até todas as notas serem 8 ou mais.

## Passo 4: entrega

Relatório curto: caminho do `deck.html`, atalhos (→ ← avançar e voltar, F tela cheia, P apresentador, R repetir), notas finais da crítica e o que não foi conferido.

Para PDF: abrir o `deck.html` no Chrome, Imprimir → Salvar como PDF, com "Gráficos de plano de fundo" ligado. Sai um slide por página, no estado final.

## Modelo de pedido

```text
Siga GERAR-APRESENTACAO.md.

Tema: [assunto e público, ex.: status semanal para a liderança]
Mensagem principal: [o que a plateia precisa sair sabendo]
Dados: [colar números com período anterior e metas, ou caminho de um CSV/JSON]
Arquitetura: [componentes e conexões, ou "não"]
Marcos: [datas, nomes e status, ou "não"]
Pedido final: [decisão ou ajuda que você quer, ou "nenhum"]
Tema visual: [claro (padrão) / nome do tema local]
```
