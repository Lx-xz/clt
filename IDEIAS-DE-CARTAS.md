# Ideias de cartas

Rascunho para o autor escolher. Nada disto está no jogo: carta só entra pelo
`/lab/cartas`, com o motivo escrito. Toda carta daqui é montável **com as
ações que o editor já tem**. A que precisaria de ação nova diz isso.

> **De onde vêm os números:** da última cópia das cartas que estava no código
> (v0.38). O banco pode estar diferente: lá há uma lendária só, e no código
> eram duas (Automatizar e Pedir Aumento). Para este documento bater com o
> jogo no ar, o "Baixar arquivo" do Lab › Simulador resolve.

---

## Onde o baralho está hoje

| Raridade | Cartas | Teto de cópias |
|---|---|---|
| Comum (inclui as 8 iniciais) | 24 | 5 |
| Incomum | 15 | 4 |
| **Rara** | **2** (Café Duplo, Puxar o Saco) | 3 |
| Épica | 5 | 2 |
| Lendária | 1 ou 2 | 1 |

Por naipe: Tarefa 12, Descanso 12, Social 12, **Grana 9**, neutras 3.

O buraco maior não é a lendária: é a **rara**. Com só duas, o envelope e a
máquina quase nunca têm rara para dar, e o sorteio cai para a incomum. A
escada fica com um degrau faltando entre "incomum" e "épica". Grana também
anda curta: com 9 cartas, um baralho de Grana chega no mínimo de naipe mas
não tem por onde variar.

### O que cada raridade quer dizer

Uma régua para decidir onde cada carta mora:

- **Comum:** troca simples, um recurso por outro.
- **Incomum:** duas coisas, ou uma condição.
- **Rara:** muda o plano do DIA. Recompensa o embalo, a ordem ou o momento.
- **Épica:** decide uma SEMANA.
- **Lendária:** muda o resto da RUN. Uma cópia só, e dá vontade de montar o
  baralho em volta dela.

---

## Revisão: cartas que podem mudar de raridade

Automatizar, Terapia e Plantão ficam como estão (decisão do autor).

| Carta | Hoje | Proposta | Por quê |
|---|---|---|---|
| Canalizar a Raiva | incomum | **rara** | É a carta mais eficiente do jogo (1 de energia por −3 de estresse e +4 de produtividade) e virou a saída da espiral. Rara limita a 3 cópias e a deixa mais difícil de juntar. |
| Foco Total | incomum | **rara** | Muda o plano do dia inteiro: joga tudo numa carta e esvazia a mão. É a definição de rara. |
| Prazo Apertado | incomum | **rara** | Recompensa a ORDEM (ser a 1ª do dia). |
| Vender as Férias | incomum | **rara** | +R$ 120 por zero energia é o maior pagamento de uma carta só. |
| Café Duplo | rara | **incomum** | É troca simples (+5 energia, +2 estresse): não muda plano nenhum. |
| Investimento | épica | **lendária** | "+R$ 40 toda sexta pelo resto da run" é exatamente a régua da lendária. |
| Pedir Aumento | lendária? | conferir | Se é ela que deixou de ser lendária no banco, volta a ser candidata quando o efeito for "pelo resto da run". |

Com essas trocas: **rara 5, épica 4, lendária 2 ou 3**, sem nenhuma carta
nova. Mudar a raridade não mexe no que a carta faz, então o simulador nem
muda; muda só o que sai das recompensas.

---

## Cartas novas

Notação das ações: `recurso(qual, n)`, `se(condição) entao / senao`,
`amanha[...]`, `recorrente(qual, n, cada, duração)`, `escolha[...]`.

### Raras (o que mais falta)

**Planilha Dinâmica** · Tarefa · 2 de energia
> +2 produtividade. Se já jogou outra Tarefa hoje: +4.

`se(classeJogadaHoje tarefa) entao recurso(produtividade, 4) senao recurso(produtividade, 2)`,
a mesma pergunta da Reunião que Podia Ser E-mail. Paga o naipe montado sem
ser forte sozinha, e somada ao embalo fecha a cota numa jogada.

**Comissão** · Grana · 2 de energia
> Se já bateu a cota hoje: +R$ 70. Senão: +R$ 20.

`se(cotaBatida) entao recurso(dinheiro, 70) senao recurso(dinheiro, 20)`.
Diz "trabalhe primeiro, cobre depois": é a ordem, que é o assunto da rara.

**Bater o Ponto Cedo** · Tarefa · 1 de energia
> Só como a 1ª carta do dia: +3 produtividade e +1 energia.

Restrição `exige: cartasJogadasHoje ≤ 0`. Uma carta de manhã, irmã do
Prazo Apertado.

**Networking** · Social · 2 de energia
> Compre 1. Se já jogou outra Social hoje: −2 estresse e compre mais 1.

`comprar(1)` + `se(classeJogadaHoje social) entao [recurso(estresse, −2), comprar(1)]`.
Social que vira motor de carta.

**Revisão de Metas** · Neutra · 1 de energia
> Escolha: a cota de hoje −1, ou compre 2.

`escolha[ cota(−1) | comprar(2) ]`. A carta pergunta, como o evento
ambíguo. Neutra, então quebra o embalo, e esse é o preço.

**Salário Adiantado** · Grana · 0 de energia
> +R$ 100 agora. Nesta sexta: −R$ 130.

`recurso(dinheiro, 100)` + bloco com gatilho `fimDaSemana`:
`recurso(dinheiro, −130)`. Empréstimo: salva uma sexta e cobra juros na
mesma semana. É a primeira carta que pode causar o DESPEJO, a derrota que
nunca acontece.

**Almoço Estendido** · Descanso · 1 de energia
> +3 energia. Amanhã: cota +1.

`recurso(energia, 3)` + `amanha[cota(1)]`. Empurra o problema para amanhã,
como a Deixar pra Amanhã, mas pelo lado da energia.

**Pix Errado** · Grana · 0 de energia
> 50%: +R$ 90. 50%: −R$ 30 e +1 estresse.

`sorteio(50%) entao recurso(dinheiro, 90) senao [recurso(dinheiro, −30), recurso(estresse, 1)]`.
Grana de risco: Grana hoje não tem nenhuma carta de sorte.

### Épicas

**Cliente Grande** · Grana · 4 de energia
> +R$ 160, +3 estresse. Amanhã: cota +2.

Um dia de dinheiro que cobra a semana inteira. Grana precisa de épica: hoje
tem só Investimento e Plantão.

**Semana Produtiva** · Tarefa · 3 de energia
> +1 produtividade por dia até o fim da semana.

`recorrente(produtividade, 1, dia, semana)`. Um Automatizar curto: jogada
na segunda vale 5, na quinta vale 2. A ordem da semana passa a importar.

**Desconectar** · Descanso · 2 de energia, uma vez por run
> −4 estresse. Amanhã: −2 energia.

Restrição `umaVezPorRun`. Uma saída da espiral que não depende de estresse
alto, ao contrário da Grito no Travesseiro.

### Lendárias

**Estabilidade** · Social · 4 de energia, uma vez por run
> Pelo resto da run: −1 estresse toda sexta.

`recorrente(estresse, −1, semana, run)`. O fim de semana passa a tirar 4.
Ataca justamente a espiral do estresse, e jogada na semana 1 vale 4.

**Rotina Saudável** · Descanso · 3 de energia, uma vez por run
> Pelo resto da run: +1 energia todo dia.

`recorrente(energia, 1, dia, run)`. A irmã de Descanso do Automatizar.
Cuidado: +1 de energia por dia é muito. O simulador decide se fica em +1
ou se vira "só nas próximas 2 semanas" (`duração: 10`).

**Plano de Carreira** · Tarefa · 5 de energia, uma vez por run · *precisa de ação nova*
> Pelo resto da run: a cota de cada dia é 1 menor.

Hoje o `recorrente` só mexe em recurso, e a cota não é recurso. Pediria uma
ação nova (ou o `recorrente` aceitar `cota`). Fica como ideia.

---

## O baralho em 30 cartas?

**Hoje, não.** Num jogo de compra de cartas, baralho maior quase sempre é
baralho mais FRACO: com a mão de 5, cada carta a mais dilui as melhores, e
quem monta bem fica no mínimo, não no máximo. O teto de 25 só pesa para
quem quer colocar mais cartas do que cabe, e isso só acontece quando há
muitas cartas boas que ninguém quer deixar de fora.

O teto começa a fazer sentido quando:

- a coleção passar de umas 60 cartas, e um baralho de um naipe só (por
  exemplo, só Grana) precisar de espaço para variar;
- existirem cartas que contam o tamanho do baralho ou o descarte, que hoje
  não existem.

**Se o problema é o jogo estar fácil** (o baralho do admin ganha tudo), a
alavanca é a outra ponta: **subir o MÍNIMO** (de 15 para 18 ou 20). Isso
obriga a pôr cartas fracas e dilui o combo. As duas mudanças dá para medir
antes de decidir: no `/lab/regras` muda-se o número, e o simulador com o
arquivo do Lab mede o baralho de verdade.

---

## Próximo passo sugerido

1. Exportar o arquivo do Lab › Simulador, para conferir as raridades no ar.
2. Trocar as raridades da revisão (não muda o jogo, só as recompensas).
3. Criar as 8 raras no `/lab/cartas` e medir com o simulador antes de
   liberar as épicas e as lendárias.
