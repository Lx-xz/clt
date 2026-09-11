-- CLT — limpar o banco para começar do zero.
--
-- ATENÇÃO: isto APAGA TUDO — jogadores, saves, runs, feedbacks e as contas
-- do Supabase Auth. Não há desfazer. Rode no SQL Editor do projeto só quando
-- a intenção for mesmo recomeçar os testes do zero, e logo depois rode o
-- `schema.sql` inteiro para recriar a estrutura.

-- ------------------------------------------------------------- gatilhos
-- o gatilho de auth.users precisa sair antes das funções que ele chama
drop trigger if exists ao_criar_usuario on auth.users;

-- ------------------------------------------------------------- tabelas
-- cascade leva junto as políticas, os índices e as funções que dependem
drop table if exists public.cartas_antigas       cascade;
drop table if exists public.cartas_evento        cascade;
drop table if exists public.cartas               cascade;
drop table if exists public.baralho              cascade;
drop table if exists public.notificacoes        cascade;
drop table if exists public.feedback_comentarios cascade;
drop table if exists public.feedbacks           cascade;
drop table if exists public.runs                cascade;
drop table if exists public.saves               cascade;
drop table if exists public.players             cascade;

-- ------------------------------------------------------------- funções
-- as que sobrevivem ao `cascade` acima por não dependerem de tabela nenhuma
drop function if exists public.ao_criar_usuario();
drop function if exists public.sou_admin();
drop function if exists public.eh_convidado(uuid);
drop function if exists public.meu_perfil();
drop function if exists public.nick_livre(text);
drop function if exists public.completar_perfil(text, text, boolean);
drop function if exists public.criar_convidado(text);
drop function if exists public.find_player(text);
drop function if exists public.create_player(text);
drop function if exists public.estatisticas_gerais();
drop function if exists public.cartas_jogadas();
drop function if exists public.cartas_fatais();
drop function if exists public.escolhas_de_evento();
drop function if exists public.estresse_por_dia();
drop function if exists public.cartas_encalhadas();
drop function if exists public.estatisticas_nerds();
drop function if exists public.ranking();
drop function if exists public.meus_jogos(uuid);
drop function if exists public.jogo_detalhe(bigint, uuid);
drop function if exists public.listar_feedbacks(text, text);
drop function if exists public.feedback_detalhe(bigint);
drop function if exists public.comentarios_do_feedback(bigint);
drop function if exists public.feedbacks_parecidos(text, text);
drop function if exists public.criar_feedback(text, text, text, text);
drop function if exists public.editar_feedback(bigint, text, text, text);
drop function if exists public.excluir_feedback(bigint);
drop function if exists public.comentar_feedback(bigint, text);
drop function if exists public.admin_atualizar_feedback(bigint, text, text, smallint);
drop function if exists public.minhas_notificacoes();
drop function if exists public.marcar_notificacoes_lidas();

-- --------------------------------------------------------------- contas
-- As contas do Auth não caem com as tabelas acima: elas vivem no schema
-- `auth`. Sem apagá-las, um e-mail já cadastrado continua cadastrado (e sem
-- perfil, porque a tabela players foi embora).
delete from auth.users;

notify pgrst, 'reload schema';
