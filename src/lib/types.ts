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
  elo_rating?: number | null;
  games_favor?: number | null;
  games_contra?: number | null;
  ataque?: number | null;
  defensa?: number | null;
  volea?: number | null;
  saque?: number | null;
  resistencia?: number | null;
};

export type Partido = {
  id: string;
  fecha: string;
  tipo_partido?: TipoPartido | null;
  equipo_1: string[];
  equipo_2: string[];
  equipo_1_ids?: string[] | null;
  equipo_2_ids?: string[] | null;
  sets_1: number[];
  sets_2: number[];
  games_1?: number | null;
  games_2?: number | null;
  grupo_viernes?: string | null;
};
