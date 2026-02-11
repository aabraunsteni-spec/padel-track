import type { TipoPartido } from "@/lib/types";

const BASE_ELO = 1500;

export type EloJugador = {
  id: string;
  nombre: string;
};

export type EloPartido = {
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

export type EloHistoryRow = {
  partido_id: string;
  jugador_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
};

const normalizeName = (name: string) => name.trim().toLocaleLowerCase("es-AR");

const getTeamIds = (
  ids: string[] | null | undefined,
  names: string[] | null | undefined,
  playersByName: Map<string, string>,
): string[] => {
  if (ids && ids.length === 2 && ids.every(Boolean)) {
    return ids;
  }

  if (!names || names.length < 2) {
    return [];
  }

  return names
    .slice(0, 2)
    .map((name) => playersByName.get(normalizeName(name)) ?? "")
    .filter(Boolean);
};

const expectedScore = (teamA: number, teamB: number) => 1 / (1 + 10 ** ((teamB - teamA) / 400));

export const recomputeEloFromHistory = (players: EloJugador[], matches: EloPartido[]) => {
  const ratings = new Map<string, number>(players.map((p) => [p.id, BASE_ELO]));
  const playersByName = new Map<string, string>(players.map((p) => [normalizeName(p.nombre), p.id]));
  const historyRows: EloHistoryRow[] = [];

  const sortedMatches = [...matches].sort((a, b) => {
    const byDate = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  for (const match of sortedMatches) {
    const team1Ids = getTeamIds(match.equipo_1_ids, match.equipo_1, playersByName);
    const team2Ids = getTeamIds(match.equipo_2_ids, match.equipo_2, playersByName);

    if (team1Ids.length !== 2 || team2Ids.length !== 2) {
      continue;
    }

    const unique = new Set([...team1Ids, ...team2Ids]);
    if (unique.size !== 4) {
      continue;
    }

    const team1Rating = (ratings.get(team1Ids[0])! + ratings.get(team1Ids[1])!) / 2;
    const team2Rating = (ratings.get(team2Ids[0])! + ratings.get(team2Ids[1])!) / 2;

    let team1Won = false;
    let team2Won = false;
    let kFactor = 24;
    let multiplier = 1;

    if (match.tipo_partido === "viernes") {
      kFactor = 16;
      const g1 = match.games_1 ?? null;
      const g2 = match.games_2 ?? null;
      if (g1 !== null && g2 !== null) {
        team1Won = g1 > g2;
        team2Won = g2 > g1;
      } else {
        const s1 = match.sets_1?.[0] ?? 0;
        const s2 = match.sets_2?.[0] ?? 0;
        team1Won = s1 > s2;
        team2Won = s2 > s1;
      }
    } else {
      const s1 = match.sets_1?.[0] ?? 0;
      const s2 = match.sets_2?.[0] ?? 0;
      team1Won = s1 > s2;
      team2Won = s2 > s1;

      if ((s1 === 2 && s2 === 0) || (s1 === 0 && s2 === 2)) {
        multiplier = 1.15;
      }
    }

    if (!team1Won && !team2Won) {
      continue;
    }

    const expectedTeam1 = expectedScore(team1Rating, team2Rating);
    const scoreTeam1 = team1Won ? 1 : 0;
    const deltaTeam1 = kFactor * multiplier * (scoreTeam1 - expectedTeam1);
    const deltaTeam2 = -deltaTeam1;

    for (const playerId of team1Ids) {
      const before = ratings.get(playerId)!;
      const after = before + deltaTeam1;
      ratings.set(playerId, after);
      historyRows.push({
        partido_id: match.id,
        jugador_id: playerId,
        rating_before: before,
        rating_after: after,
        delta: deltaTeam1,
      });
    }

    for (const playerId of team2Ids) {
      const before = ratings.get(playerId)!;
      const after = before + deltaTeam2;
      ratings.set(playerId, after);
      historyRows.push({
        partido_id: match.id,
        jugador_id: playerId,
        rating_before: before,
        rating_after: after,
        delta: deltaTeam2,
      });
    }
  }

  return { ratings, historyRows, baseRating: BASE_ELO };
};
