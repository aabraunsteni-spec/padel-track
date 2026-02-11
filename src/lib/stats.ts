import type { TipoPartido } from "@/lib/types";

export type StatsJugador = {
  id: string;
  nombre: string;
};

export type StatsPartido = {
  id: string;
  fecha: string;
  tipo_partido?: TipoPartido | null;
  equipo_1?: string[] | null;
  equipo_2?: string[] | null;
  equipo_1_ids?: string[] | null;
  equipo_2_ids?: string[] | null;
  sets_1?: number[] | null;
  sets_2?: number[] | null;
  games_1?: number | null;
  games_2?: number | null;
};

type MatchResolutionError = {
  partidoId: string;
  reason: string;
  missingNames?: string[];
  missingIds?: string[];
};

export type RecomputeStatsResult = {
  updates: Map<string, { partidos_jugados: number; partidos_ganados: number; games_favor: number; games_contra: number }>;
};

export class RecomputeStatsError extends Error {
  details: MatchResolutionError[];

  constructor(message: string, details: MatchResolutionError[]) {
    super(message);
    this.name = "RecomputeStatsError";
    this.details = details;
  }
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase("es-AR");

const resolveTeamIds = (
  teamIds: string[] | null | undefined,
  teamNames: string[] | null | undefined,
  playersByName: Map<string, string>,
): { ids: string[]; missingNames: string[]; missingIds: string[] } => {
  if (teamIds && teamIds.length === 2 && teamIds.every(Boolean)) {
    return { ids: teamIds, missingNames: [], missingIds: [] };
  }

  if (!teamNames || teamNames.length < 2) {
    return { ids: [], missingNames: [], missingIds: [] };
  }

  const missingNames: string[] = [];
  const resolvedIds = teamNames.slice(0, 2).map((name) => {
    const id = playersByName.get(normalizeName(name));
    if (!id) {
      missingNames.push(name);
      return "";
    }
    return id;
  });

  return {
    ids: resolvedIds.filter(Boolean),
    missingNames,
    missingIds: [],
  };
};

const getOrInitStats = (
  statsByPlayer: Map<string, { partidos_jugados: number; partidos_ganados: number; games_favor: number; games_contra: number }>,
  playerId: string,
) => {
  const current = statsByPlayer.get(playerId);
  if (current) {
    return current;
  }

  const empty = { partidos_jugados: 0, partidos_ganados: 0, games_favor: 0, games_contra: 0 };
  statsByPlayer.set(playerId, empty);
  return empty;
};

export const recomputeStatsFromHistory = (players: StatsJugador[], matches: StatsPartido[]): RecomputeStatsResult => {
  const statsByPlayer = new Map<string, { partidos_jugados: number; partidos_ganados: number; games_favor: number; games_contra: number }>();
  const playersByName = new Map<string, string>(players.map((p) => [normalizeName(p.nombre), p.id]));
  const knownPlayerIds = new Set(players.map((p) => p.id));

  for (const player of players) {
    statsByPlayer.set(player.id, { partidos_jugados: 0, partidos_ganados: 0, games_favor: 0, games_contra: 0 });
  }

  const sortedMatches = [...matches].sort((a, b) => {
    const byDate = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  const details: MatchResolutionError[] = [];

  for (const match of sortedMatches) {
    const team1Resolution = resolveTeamIds(match.equipo_1_ids, match.equipo_1, playersByName);
    const team2Resolution = resolveTeamIds(match.equipo_2_ids, match.equipo_2, playersByName);

    const missingIds = [
      ...team1Resolution.ids.filter((id) => !knownPlayerIds.has(id)),
      ...team2Resolution.ids.filter((id) => !knownPlayerIds.has(id)),
    ];

    const team1Ids = team1Resolution.ids;
    const team2Ids = team2Resolution.ids;

    if (team1Ids.length !== 2 || team2Ids.length !== 2 || team1Resolution.missingNames.length > 0 || team2Resolution.missingNames.length > 0 || missingIds.length > 0) {
      details.push({
        partidoId: match.id,
        reason: "No se pudieron resolver los 4 jugadores del partido",
        missingNames: [...team1Resolution.missingNames, ...team2Resolution.missingNames],
        missingIds,
      });
      continue;
    }

    const uniquePlayers = new Set([...team1Ids, ...team2Ids]);
    if (uniquePlayers.size !== 4) {
      details.push({
        partidoId: match.id,
        reason: "El partido tiene jugadores repetidos o equipos incompletos",
      });
      continue;
    }

    const g1 = match.games_1;
    const g2 = match.games_2;
    if (g1 === null || g1 === undefined || g2 === null || g2 === undefined) {
      details.push({
        partidoId: match.id,
        reason: "El partido no tiene games_1/games_2 cargados. Backfillear esos totales antes de recomputar stats.",
      });
      continue;
    }

    let team1Won = false;
    let team2Won = false;

    if (match.tipo_partido === "viernes") {
      team1Won = g1 > g2;
      team2Won = g2 > g1;
    } else {
      const s1 = match.sets_1?.[0] ?? 0;
      const s2 = match.sets_2?.[0] ?? 0;
      team1Won = s1 > s2;
      team2Won = s2 > s1;
    }

    if (!team1Won && !team2Won) {
      details.push({
        partidoId: match.id,
        reason: "No se pudo determinar ganador",
      });
      continue;
    }

    for (const playerId of team1Ids) {
      const stats = getOrInitStats(statsByPlayer, playerId);
      stats.partidos_jugados += 1;
      stats.games_favor += g1;
      stats.games_contra += g2;
      if (team1Won) {
        stats.partidos_ganados += 1;
      }
    }

    for (const playerId of team2Ids) {
      const stats = getOrInitStats(statsByPlayer, playerId);
      stats.partidos_jugados += 1;
      stats.games_favor += g2;
      stats.games_contra += g1;
      if (team2Won) {
        stats.partidos_ganados += 1;
      }
    }
  }

  if (details.length > 0) {
    throw new RecomputeStatsError("No se pudieron recomputar estadísticas para todos los partidos", details);
  }

  return { updates: statsByPlayer };
};
