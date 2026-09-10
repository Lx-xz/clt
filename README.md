# CLT — Coffee, Labor and Tears

> Sobreviva ao mês. Depois a gente vê.

Card game roguelike single player sobre atravessar um mês de trabalho formal sem
ficar no vermelho e sem surtar. Cada dia é uma rodada, cada semana é uma cobrança
do chefe, e o mês inteiro é uma run.

**Equipe:** Luiz Adolfo Frederico — CC4M

---

## Resumo

O jogador controla uma pessoa comum recém-contratada. Todo dia ela acorda com uma
quantidade limitada de energia, recebe uma mão de cartas de ação e um evento
inesperado, e precisa decidir o que fazer com o dia: produzir, descansar, aceitar
uma hora extra ou enrolar no corredor.

O detalhe que sustenta o jogo é que **o estresse não some sozinho**. A energia de
amanhã é o que sobrou da sua saúde mental hoje. Um dia mal administrado encolhe
todos os dias seguintes.

Vence quem chega ao fim das quatro semanas ainda empregado e com as contas pagas.

---

## Recursos

| Recurso | Como funciona |
|---|---|
| **Energia** | Reinicia todo dia. `Energia do dia = 10 − Estresse`. Gasta ao jogar cartas. |
| **Estresse** | Acumula entre os dias. Só cai no fim de semana ou com cartas específicas. Chegou a 10, é burnout. |
| **Produtividade** | Zera todo dia. É o que o chefe mede. Conta para a cota diária e para a meta semanal. |
| **Dinheiro** | Acumula durante o mês. Entra pelo salário, hora extra e freela. Sai nas contas de sexta. |

---

## Mecânicas básicas

### Os dois baralhos

- **Baralho de Ações** (do jogador): começa com 15 cartas. O jogador compra 5 por
  dia, joga o que quiser e puder pagar, e descarta o resto. Quando o baralho
  acaba, o descarte é reembaralhado.
- **Baralho de Eventos** (do jogo): 1 carta virada no início de cada dia,
  obrigatória. Não dá para recusar — no máximo reagir ao que ela fez.

### Loop do dia

1. **Acordar** — calcula a energia (`10 − Estresse`).
2. **Virar o evento** — aplica o efeito imediatamente.
3. **Comprar 5 cartas** de ação.
4. **Jogar** — quantas cartas quiser, enquanto houver energia.
5. **Fim do dia** — confere a cota de produtividade. Não bateu: `+2 Estresse` e
   o chefe anota.
6. Descarta a mão e avança para o próximo dia.

### Loop da semana

A semana tem 5 dias úteis. Na sexta, depois do expediente:

1. **Cobrança do chefe** — soma a produtividade dos 5 dias e compara com a meta
   semanal. Bateu: salário cheio. Não bateu: salário reduzido + 1 advertência.
2. **Contas** — desconta R$ 300 (aluguel + mercado). Se não tiver o valor, é
   derrota.
3. **Fim de semana** — `−3 Estresse`.
4. **Recompensa** — escolha 1 entre 3 cartas novas para adicionar ao baralho.

### Progressão do mês

| Semana | Cota diária | Meta semanal | Salário cheio | Salário reduzido |
|---|---|---|---|---|
| 1 | 3 | 16 | R$ 400 | R$ 250 |
| 2 | 3 | 18 | R$ 400 | R$ 250 |
| 3 | 4 | 22 | R$ 450 | R$ 280 |
| 4 | 4 | 25 | R$ 450 | R$ 280 |

O jogador começa com R$ 100.

### Vitória e derrota

**Vitória:** terminar as 4 semanas empregado e com todas as contas pagas.
A pontuação final é o dinheiro que sobrou.

**Derrota:**
- Estresse chega a 10 → burnout
- 3 advertências → demissão
- Não conseguir pagar as contas de sexta → despejo

---

## Cartas de Ação — baralho inicial (15 cartas)

| Qtd | Carta | Custo | Efeito |
|---|---|---|---|
| 4 | Tarefa Simples | 3 energia | +2 produtividade |
| 2 | Planilha Infinita | 2 energia | +1 produtividade |
| 2 | Reunião | 2 energia | +1 produtividade. Se for a 2ª reunião do dia: +1 estresse e nenhuma produtividade. |
| 2 | Café | 0 energia | +3 energia, +1 estresse |
| 2 | Hora Extra | 4 energia | +R$ 30, +2 estresse |
| 1 | Freela | 5 energia | +R$ 50 |
| 1 | Enrolar no Corredor | 1 energia | −1 estresse |
| 1 | Almoço Decente | 1 energia | +2 energia |

## Cartas de Ação — desbloqueáveis (escolha 1 de 3 por semana)

| Carta | Custo | Efeito |
|---|---|---|
| Atalho no Sistema | 3 energia | +3 produtividade |
| Delegar | 1 energia | +2 produtividade, +1 estresse (alguém vai reclamar) |
| Café Duplo | 0 energia | +5 energia, +2 estresse |
| Terapia | 2 energia | −3 estresse |
| Vale-Refeição | 0 energia | +R$ 20 |
| Home Office | 2 energia | +2 produtividade, −1 estresse |
| Foco Total | 4 energia | +4 produtividade, mas descarta o resto da mão |
| Puxar o Saco | 2 energia | Cancela 1 advertência (uma vez por run) |
| Freela Grande | 6 energia | +R$ 90, +2 estresse |
| Soneca no Banheiro | 1 energia | +2 energia, −1 estresse |
| Automatizar | 5 energia | +2 produtividade agora e +1 produtividade em todos os dias seguintes |
| Pedir Aumento | 3 energia | 50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse. |

---

## Cartas de Evento (baralho do jogo)

### Negativas

| Carta | Efeito |
|---|---|
| Sistema Fora do Ar | Você não pode jogar cartas de Tarefa hoje |
| Reunião de Alinhamento | −3 energia |
| Chefe de Mau Humor | +2 estresse |
| Relatório de Última Hora | Sua cota do dia aumenta em +2 |
| Trânsito | −2 energia |
| Colega Faltou | Cota do dia +1, mas +R$ 20 |
| Ar-Condicionado Quebrado | Todas as cartas custam +1 energia hoje |
| Fofoca de Corredor | Descarte 1 carta da sua mão ao acaso |
| Internet Caiu | Descarte a mão e compre 3 cartas novas |
| Cobrança no Grupo do Zap | +1 estresse. Se você não bater a cota hoje: +2 estresse extra. |

### Positivas

| Carta | Efeito |
|---|---|
| Dormiu Bem | +3 energia |
| Bolo na Copa | −2 estresse |
| Sexta de Folga | Nenhuma cota hoje |
| Elogio do Chefe | −1 estresse, +1 produtividade |
| Reembolso Atrasado | +R$ 40 |
| Dia Tranquilo | Compre 2 cartas a mais hoje |

### Ambíguas (o jogador escolhe)

| Carta | Escolha |
|---|---|
| Hora Extra Não Solicitada | Aceitar: +R$ 40 e +3 estresse. Recusar: +1 advertência informal (2 informais = 1 advertência real). |
| Convite pro Happy Hour | Ir: −3 estresse e −3 energia amanhã. Não ir: +1 estresse. |
| Freela de Um Amigo | Aceitar: +R$ 60, mas sua cota de amanhã aumenta em +2. Recusar: nada. |
| Chamado de Madrugada | Atender: +R$ 25 e energia de amanhã −4. Ignorar: +2 estresse. |

---

## Balanceamento

Os valores acima são um ponto de partida jogável, não números finais. O jogo pode
ser testado no papel antes de qualquer implementação: um baralho comum, fichas
para energia e estresse, e papel para anotar produtividade e dinheiro.

Pontos que provavelmente vão precisar de ajuste depois dos primeiros testes:

- O custo/benefício do **Café** — se ele for sempre a jogada certa, o preço em
  estresse está baixo demais.
- A **carta Automatizar**, que é a única com efeito permanente e pode quebrar as
  semanas 3 e 4.
- O valor das **contas semanais** (R$ 300), que define se a hora extra é opcional
  ou obrigatória.

---

## Rodando o protótipo

Site em Next.js (App Router) + TypeScript + Sass (sintaxe indentada, `.sass`).
Não há back-end: o baralho e a run em andamento ficam no `localStorage`.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de produção (roda a checagem de tipos)
```

### Páginas

| Rota | O que faz |
|---|---|
| `/` | Capa com dois botões: **Jogar** e **Baralho** |
| `/baralho` | Cartas equipadas, não equipadas e bloqueadas. Clique para equipar/desequipar |
| `/jogar` | A run: evento do dia, mão, painel de recursos, sexta-feira, recompensa e diário |

### Estrutura

```
src/game/      regras puras (dados das cartas, motor, persistência) — sem React
  cards.ts     cartas de ação, progressão das semanas e constantes
  events.ts    baralho de eventos
  engine.ts    loop do dia/semana, efeitos, vitória e derrota
  storage.ts   leitura e escrita no localStorage
src/app/       páginas
src/components/Card.tsx
src/styles/    tokens de cor e botões
```

O motor é um conjunto de funções puras sobre `GameState`, então dá para simular
runs fora do navegador para checar balanceamento sem passar pela interface.

### Estado da persistência

- `clt:collection:v1` — cartas equipadas e desbloqueadas (persiste entre runs)
- `clt:run:v1` — a run em andamento (recomeçar limpa essa chave)

O botão **Desbloquear tudo (teste)** na página do baralho existe para testar as
cartas desbloqueáveis sem jogar quatro semanas.

### Deploy (GitHub Pages)

O site é totalmente client-side, então vai como export estático. O workflow
`.github/workflows/pages.yml` builda e publica a cada push no branch padrão, e
também pode ser rodado à mão em **Actions → Deploy no GitHub Pages**.

O `configure-pages` liga o Pages sozinho no primeiro deploy, então não houve
passo manual. Se algum dia o job falhar dizendo que o Pages não está
habilitado, ligue em **Settings → Pages → Source: GitHub Actions**.

O site fica em <https://lx-xz.github.io/clt/>.

Como uma página de projeto é servida em `https://<usuario>.github.io/clt/`, o
build de deploy usa `basePath`. Isso só vale quando `DEPLOY_TARGET=gh-pages`,
para o `npm run dev` continuar na raiz:

```bash
npm run build:pages   # gera out/ com basePath, igual ao CI
```

Para testar o resultado exatamente como o Pages serve (num subdiretório):

```bash
mkdir -p /tmp/site && cp -r out /tmp/site/clt
cd /tmp/site && python3 -m http.server 4000   # http://localhost:4000/clt/
```
