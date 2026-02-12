export type TipoPartido = 'martes' | 'viernes';

export type Jugador = {
  id: string;
  slug: string;
  nombre: string;
  foto_url?: string | null;
  apodo?: string | null;
  barrio?: string | null;
  perfil?: string | null;
  parecido_a?: string | null;
  bio?: string | null;
  partidos_jugados?: number | null;
  partidos_ganados?: number | null;
  puntos?: number | null;
  elo_rating?: number | null;
  games_favor?: number | null;
  games_contra?: number | null;
  ataque?: number | null;
  defensa?: number | null;
  volea?: number | null;
  saque?: number | null;
  resistencia?: number | null;
};

export type MatchSet = {
  set_no: number;
  games_team1: number;
  games_team2: number;
};

export type MatchPlayer = {
  team: 1 | 2;
  player_id: string;
  jugadores?: Pick<Jugador, 'id' | 'nombre'> | null;
};

export type MatchRow = {
  id: string;
  played_at: string;
  type: TipoPartido;
  session_id: string | null;
  status: 'draft' | 'final';
  winner_team: 1 | 2 | null;
  games_team1: number | null;
  games_team2: number | null;
  created_at: string;
  sessions?: { session_date: string } | null;
  match_players?: MatchPlayer[];
  match_sets?: MatchSet[];
};
