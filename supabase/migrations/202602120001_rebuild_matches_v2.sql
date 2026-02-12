begin;

-- A.0 reset jugadores legacy counters/elo baseline
update public.jugadores
set
  elo_rating = 1000,
  puntos = 0,
  partidos_jugados = 0,
  partidos_ganados = 0,
  games_favor = 0,
  games_contra = 0;

-- A.1 drop old objects

drop trigger if exists trg_partidos_recompute_elo on public.partidos;
drop trigger if exists trg_partidos_stats on public.partidos;
drop function if exists public.recompute_elo();
drop function if exists public.recompute_elo_from_history();
drop function if exists public.update_jugador_stats_from_partido();

drop table if exists public.partidos cascade;
drop table if exists public.viernes_sesiones cascade;
drop table if exists public.elo_history cascade;

-- A.2 normalized schema
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  type text not null check (type = 'viernes'),
  created_at timestamptz not null default now(),
  unique (session_date, type)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null default now(),
  type text not null check (type in ('martes', 'viernes')),
  session_id uuid null references public.sessions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  winner_team smallint null check (winner_team in (1, 2)),
  games_team1 int null,
  games_team2 int null,
  created_at timestamptz not null default now(),
  constraint matches_session_type_ck check (
    (type = 'viernes' and session_id is not null)
    or
    (type = 'martes' and session_id is null)
  )
);

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.jugadores(id) on delete restrict,
  team smallint not null check (team in (1, 2)),
  primary key (match_id, player_id)
);

create table if not exists public.match_sets (
  match_id uuid not null references public.matches(id) on delete cascade,
  set_no smallint not null check (set_no between 1 and 3),
  games_team1 smallint not null check (games_team1 between 0 and 7),
  games_team2 smallint not null check (games_team2 between 0 and 7),
  primary key (match_id, set_no)
);

create table if not exists public.elo_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.jugadores(id) on delete cascade,
  rating_before numeric not null,
  rating_after numeric not null,
  delta numeric not null,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists idx_matches_played_at on public.matches(played_at desc, created_at desc);
create index if not exists idx_matches_status on public.matches(status, played_at desc);
create index if not exists idx_match_players_match_team on public.match_players(match_id, team);
create index if not exists idx_match_sets_match on public.match_sets(match_id, set_no);
create index if not exists idx_elo_history_match on public.elo_history(match_id);

-- A.3 set score validation
create or replace function public.is_valid_set_score(a int, b int)
returns boolean
language sql
immutable
as $$
  select
    (
      (a = 6 and b between 0 and 4)
      or (b = 6 and a between 0 and 4)
      or (a = 7 and b in (5, 6))
      or (b = 7 and a in (5, 6))
    );
$$;

create or replace function public.validate_match_set_score()
returns trigger
language plpgsql
as $$
begin
  if not public.is_valid_set_score(new.games_team1, new.games_team2) then
    raise exception 'Set inválido: %-% (válidos: 6-0..4, 7-5, 7-6)', new.games_team1, new.games_team2;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_match_set_score on public.match_sets;
create trigger trg_validate_match_set_score
before insert or update on public.match_sets
for each row
execute function public.validate_match_set_score();

-- A.4 finalize RPC
create or replace function public.finalize_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_team1_ids uuid[];
  v_team2_ids uuid[];
  v_set_count int;
  v_sets_team1 int;
  v_sets_team2 int;
  v_games_team1 int;
  v_games_team2 int;
  v_winner_team smallint;
  v_k numeric;
  v_r1 numeric;
  v_r2 numeric;
  v_expected1 numeric;
  v_score1 numeric;
  v_delta1 numeric;
  v_p1_before numeric;
  v_p2_before numeric;
  v_p3_before numeric;
  v_p4_before numeric;
begin
  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match no encontrado: %', p_match_id;
  end if;

  if v_match.status <> 'draft' then
    raise exception 'Solo se puede finalizar un match en draft';
  end if;

  select array_agg(player_id order by player_id) into v_team1_ids
  from public.match_players
  where match_id = p_match_id and team = 1;

  select array_agg(player_id order by player_id) into v_team2_ids
  from public.match_players
  where match_id = p_match_id and team = 2;

  if coalesce(array_length(v_team1_ids, 1), 0) <> 2 or coalesce(array_length(v_team2_ids, 1), 0) <> 2 then
    raise exception 'El match debe tener exactamente 2 jugadores por equipo';
  end if;

  if (select count(distinct p) from unnest(v_team1_ids || v_team2_ids) as p) <> 4 then
    raise exception 'Los 4 jugadores del match deben ser distintos';
  end if;

  select count(*),
         coalesce(sum(case when games_team1 > games_team2 then 1 else 0 end), 0),
         coalesce(sum(case when games_team2 > games_team1 then 1 else 0 end), 0),
         coalesce(sum(games_team1), 0),
         coalesce(sum(games_team2), 0)
    into v_set_count, v_sets_team1, v_sets_team2, v_games_team1, v_games_team2
  from public.match_sets
  where match_id = p_match_id;

  if v_match.type = 'viernes' then
    if v_set_count <> 1 then
      raise exception 'Un match de viernes debe tener exactamente 1 set';
    end if;
    if greatest(v_sets_team1, v_sets_team2) <> 1 then
      raise exception 'Un match de viernes requiere 1 set ganador';
    end if;
  else
    if v_set_count not in (2, 3) then
      raise exception 'Un match de martes debe tener 2 o 3 sets';
    end if;
    if greatest(v_sets_team1, v_sets_team2) <> 2 then
      raise exception 'Un match de martes requiere 2 sets ganados';
    end if;
  end if;

  v_winner_team := case when v_sets_team1 > v_sets_team2 then 1 else 2 end;

  -- lock players and snapshot ratings
  select elo_rating into v_p1_before from public.jugadores where id = v_team1_ids[1] for update;
  select elo_rating into v_p2_before from public.jugadores where id = v_team1_ids[2] for update;
  select elo_rating into v_p3_before from public.jugadores where id = v_team2_ids[1] for update;
  select elo_rating into v_p4_before from public.jugadores where id = v_team2_ids[2] for update;

  v_r1 := (v_p1_before + v_p2_before) / 2.0;
  v_r2 := (v_p3_before + v_p4_before) / 2.0;
  v_k := case when v_match.type = 'martes' then 32 else 16 end;
  v_expected1 := 1 / (1 + power(10, (v_r2 - v_r1) / 400.0));
  v_score1 := case when v_winner_team = 1 then 1 else 0 end;
  v_delta1 := v_k * (v_score1 - v_expected1);

  update public.matches
  set
    games_team1 = v_games_team1,
    games_team2 = v_games_team2,
    winner_team = v_winner_team,
    status = 'final'
  where id = p_match_id;

  insert into public.elo_history(match_id, player_id, rating_before, rating_after, delta)
  values
    (p_match_id, v_team1_ids[1], v_p1_before, v_p1_before + v_delta1, v_delta1),
    (p_match_id, v_team1_ids[2], v_p2_before, v_p2_before + v_delta1, v_delta1),
    (p_match_id, v_team2_ids[1], v_p3_before, v_p3_before - v_delta1, -v_delta1),
    (p_match_id, v_team2_ids[2], v_p4_before, v_p4_before - v_delta1, -v_delta1);

  update public.jugadores set elo_rating = v_p1_before + v_delta1 where id = v_team1_ids[1];
  update public.jugadores set elo_rating = v_p2_before + v_delta1 where id = v_team1_ids[2];
  update public.jugadores set elo_rating = v_p3_before - v_delta1 where id = v_team2_ids[1];
  update public.jugadores set elo_rating = v_p4_before - v_delta1 where id = v_team2_ids[2];
end;
$$;

-- A.5 delete RPC
create or replace function public.delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest_id uuid;
  v_status text;
  v_deleted int;
begin
  select status into v_status from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match no encontrado: %', p_match_id;
  end if;
  if v_status <> 'final' then
    raise exception 'Solo se pueden borrar matches finalizados';
  end if;

  select id into v_latest_id
  from public.matches
  where status = 'final'
  order by played_at desc, created_at desc
  limit 1;

  if v_latest_id is null then
    raise exception 'No hay matches finalizados para borrar';
  end if;

  if v_latest_id <> p_match_id then
    raise exception 'Solo se puede borrar el último match finalizado';
  end if;

  update public.jugadores j
  set elo_rating = j.elo_rating - h.delta
  from public.elo_history h
  where h.match_id = p_match_id and h.player_id = j.id;

  delete from public.matches where id = p_match_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'No se pudo borrar el match %', p_match_id;
  end if;
end;
$$;

-- A.6 derived stats view
create or replace view public.player_stats as
with match_participants as (
  select mp.player_id,
         mp.match_id,
         mp.team,
         m.winner_team,
         m.status
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where m.status = 'final'
),
games_by_player as (
  select mp.player_id,
         sum(case when mp.team = 1 then ms.games_team1 else ms.games_team2 end)::int as games_favor,
         sum(case when mp.team = 1 then ms.games_team2 else ms.games_team1 end)::int as games_contra
  from public.match_players mp
  join public.matches m on m.id = mp.match_id and m.status = 'final'
  join public.match_sets ms on ms.match_id = mp.match_id
  group by mp.player_id
)
select
  j.id as player_id,
  coalesce(count(distinct mp.match_id), 0)::int as matches_played,
  coalesce(sum(case when mp.winner_team = mp.team then 1 else 0 end), 0)::int as matches_won,
  coalesce(g.games_favor, 0) as games_favor,
  coalesce(g.games_contra, 0) as games_contra
from public.jugadores j
left join match_participants mp on mp.player_id = j.id
left join games_by_player g on g.player_id = j.id
group by j.id, g.games_favor, g.games_contra;

grant select on public.player_stats to anon, authenticated;
grant execute on function public.finalize_match(uuid) to anon, authenticated;
grant execute on function public.delete_match(uuid) to anon, authenticated;

commit;
