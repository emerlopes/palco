# Especificação do `deck.json`

O build valida tudo isto e para com mensagens em pt-BR apontando o campo (`slides[2].nodes[1].at: ...`).

## Deck

| Campo | Obrigatório | Descrição |
|---|---|---|
| `title` | sim | Título do deck (aba do navegador e rodapé padrão) |
| `footer` | não | Texto do rodapé de todos os slides |
| `theme` | não | Nome do tema em `themes/` ou `themes/local/` (padrão `claro`) |
| `slides` | sim | Lista de slides, na ordem |

Campos comuns a todo slide: `type`, `title` (com no máximo um `[[destaque]]`), `kicker` (rótulo curto acima do título), `subtitle`, `notes` (notas do apresentador, aparecem só na janela do apresentador).

## `title`: capa ou abertura de seção

| Campo | Descrição |
|---|---|
| `title` | Até 10 palavras |
| `subtitle` | Uma frase |
| `meta` | Linha de rodapé da capa: período, time, data |

## `kpi`: indicadores

| Campo | Descrição |
|---|---|
| `items` | De 1 a 6 indicadores (até 4 numa linha; 5 e 6 em duas linhas de 3) |
| `compareLabel` | Texto da comparação (padrão "vs. semana anterior") |
| `source` | Fonte dos números, embaixo dos cartões |

Cada item:

| Campo | Descrição |
|---|---|
| `label` | Nome do indicador |
| `value` | Valor atual (número). Em `brl`, **centavos inteiros** |
| `format` | `int` (padrão), `decimal`, `pct`, `ms`, `brl` |
| `decimals` | Casas decimais (0 a 3) para `decimal` e `pct` |
| `compact` | `true` abrevia (`1,3 mi`, `R$ 47,2 mi`) em `int` e `brl` |
| `prev` | Valor do período anterior: gera a variação (`pct` em p.p.; o resto, em %) e é o ponto de partida do contador |
| `better` | `up` (padrão) ou `down`: define se subir é bom (latência, erros: `down`) |
| `goal` | Meta: mostra "Meta X · atingida/não atingida" com ícone |
| `note` | Observação curta no cartão |

## `diagram`: arquitetura em grade

| Campo | Descrição |
|---|---|
| `cols`, `rows` | Grade (até 6×4). Com rótulos nas conexões, preferir até 4 colunas |
| `nodes` | `id`, `label`, `sub`, `icon` (nome em `lib/icons.js`), `at: [coluna, linha]` (começa em 0), `kind: "external"` (borda tracejada), `highlight: true` (borda neon: o que é novo ou o foco) |
| `groups` | `label`, `from: [c, l]`, `to: [c, l]`: caixa ao redor de células (VPC, domínio, nuvem) |
| `edges` | `from`, `to`, `label`, `flow: true` (pacote neon percorrendo), `style: "dashed"` (assíncrono, opcional) |

Roteamento: entre colunas diferentes, sai da lateral e faz cotovelo no meio; na mesma coluna, vertical. Nós da mesma coluna e conexões que cruzam nós devem ser evitados na escolha das células.

## `timeline`: evolução do projeto

| Campo | Descrição |
|---|---|
| `items` | De 2 a 6 marcos: `date` (ex.: "Ago", "Q3", "Sprint 12"), `label`, `detail` (até 3 linhas), `status` |
| `status` | `done` (Concluído), `doing` (Em andamento), `risk` (Em risco), `next` (Planejado) |

A linha de progresso vai até o último marco que não é `next`.
