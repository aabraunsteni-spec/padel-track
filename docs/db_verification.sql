-- 1) Friday requires session_id (should fail)
insert into public.matches(type, status) values ('viernes', 'draft');

-- 2) Tuesday forbids session_id (should fail)
with s as (
  insert into public.sessions(session_date, type)
  values (current_date, 'viernes')
  on conflict (session_date, type) do update set session_date = excluded.session_date
  returning id
)
insert into public.matches(type, session_id, status)
select 'martes', id, 'draft' from s;

-- 3) Invalid set score (6-6) rejected by trigger (should fail)
with m as (
  insert into public.matches(type, status) values ('martes', 'draft') returning id
)
insert into public.match_sets(match_id, set_no, games_team1, games_team2)
select id, 1, 6, 6 from m;

-- 4) Valid match finalize -> status final, winner_team + 4 elo_history rows
-- Replace player ids with existing rows from jugadores.
with ids as (
  select array_agg(id order by nombre) as pids
  from public.jugadores
),
new_match as (
  insert into public.matches(type, status, played_at)
  values ('martes', 'draft', now())
  returning id
)
insert into public.match_players(match_id, player_id, team)
select m.id, p.player_id, p.team
from new_match m
cross join lateral (
  values
    ((select pids[1] from ids), 1),
    ((select pids[2] from ids), 1),
    ((select pids[3] from ids), 2),
    ((select pids[4] from ids), 2)
) as p(player_id, team);

with target as (
  select id from public.matches where status = 'draft' order by created_at desc limit 1
)
insert into public.match_sets(match_id, set_no, games_team1, games_team2)
select id, set_no, g1, g2
from target
cross join (values (1,6,4), (2,3,6), (3,6,2)) as s(set_no, g1, g2);

select public.finalize_match((select id from public.matches where status = 'draft' order by created_at desc limit 1));

select id, status, winner_team, games_team1, games_team2
from public.matches
order by created_at desc
limit 1;

select count(*) as elo_rows_for_match
from public.elo_history
where match_id = (select id from public.matches where status = 'final' order by played_at desc, created_at desc limit 1);

-- 5) Delete latest finalized -> ratings reverted and match removed
select public.delete_match((select id from public.matches where status = 'final' order by played_at desc, created_at desc limit 1));

select id
from public.matches
where status = 'final'
order by played_at desc, created_at desc
limit 1;
