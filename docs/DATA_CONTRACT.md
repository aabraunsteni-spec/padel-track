# DATA_CONTRACT

## Tablas relevantes y source of truth

## 1) `jugadores`
- **Propósito**: catálogo de jugadores + rating actual.
- **Source of truth**:
  - Identidad/base profile: `id`, `slug`, `nombre` (más metadata de perfil/foto).
  - Rating actual operativo: `elo_rating`.
- **Nota**: existen columnas legacy (`partidos_jugados`, `partidos_ganados`, `games_favor`, `games_contra`, `puntos`) pero en el modelo actual se prioriza `player_stats` para estadísticas agregadas.

## 2) `sessions`
- **Propósito**: sesiones de viernes.
- **Source of truth**:
  - `session_date`, `type='viernes'` (única por fecha + tipo).

## 3) `matches`
- **Propósito**: cabecera de partido.
- **Source of truth**:
  - `id`, `played_at`, `type`, `session_id`, `status`.
  - Consistencia de tipo/sesión via constraint:
    - viernes => `session_id` obligatorio.
    - martes => `session_id` debe ser `null`.
- **Campos derivados (se completan al finalizar)**:
  - `winner_team`, `games_team1`, `games_team2`.

## 4) `match_players`
- **Propósito**: participantes de cada partido.
- **Source of truth**:
  - `(match_id, player_id)` y `team`.
- **Regla**:
  - Para finalizar, debe haber exactamente 2 jugadores por equipo y 4 jugadores distintos (validado en RPC).

## 5) `match_sets`
- **Propósito**: resultado set a set.
- **Source of truth**:
  - `(match_id, set_no, games_team1, games_team2)`.
- **Reglas de score**:
  - Válidos: 6-0..4, 7-5, 7-6 (trigger DB + validación frontend).

## 6) `elo_history`
- **Propósito**: ledger de cambios ELO por partido/jugador.
- **Source of truth**:
  - `match_id`, `player_id`, `rating_before`, `rating_after`, `delta`.
- **Garantía**:
  - único por `(match_id, player_id)`.

## 7) `player_stats` (view)
- **Propósito**: estadísticas derivadas por jugador.
- **Campos derivados**:
  - `matches_played`, `matches_won`, `games_favor`, `games_contra`.
- **Origen**:
  - Se computa desde `matches` finalizados + `match_players` + `match_sets`.

## Qué campos son derivados y cómo se recalculan hoy

- Derivados en `matches`:
  - `winner_team`, `games_team1`, `games_team2`.
  - **Cálculo**: RPC `finalize_match` suma games de sets y define ganador por sets.

- Derivados en estadísticas de jugador:
  - `matches_played`, `matches_won`, `games_favor`, `games_contra`.
  - **Cálculo**: view `player_stats` (no persistido por trigger en tablas legacy).

- Derivados de rating:
  - `jugadores.elo_rating` actual.
  - `elo_history` por match.
  - **Cálculo**:
    - `finalize_match`: aplica delta ELO (K=32 martes, K=16 viernes) y registra ledger.
    - `delete_match`: revierte ELO restando `delta` del match eliminado (solo último finalizado).

- Recompute global:
  - **No existe** endpoint/función activa de recompute full historical.
  - Se usa modelo transaccional por match (finalize/delete).

## Reglas para no romper consistencia

1. **No escribir manualmente campos derivados de `matches`**
   - No setear `winner_team/games_team1/games_team2` desde UI o scripts ad-hoc.
   - Finalizar solo mediante `finalize_match`.

2. **No mutar ELO por fuera de RPCs**
   - No actualizar `jugadores.elo_rating` manualmente para flujo normal.
   - Toda mutación de ELO debe quedar auditada en `elo_history`.

3. **Respetar semántica draft/final**
   - Crear partido como `draft` + cargar roster/sets.
   - Pasar a `final` exclusivamente con RPC.

4. **Respetar modelo martes/viernes**
   - Viernes: exactamente 1 set y `session_id` no nulo.
   - Martes: 2 o 3 sets y `session_id` nulo.

5. **Mantener integridad de roster**
   - Exactamente 4 jugadores por partido (2 por equipo, todos distintos).

6. **No confiar en columnas legacy de stats en `jugadores` para UI nueva**
   - Consumir `player_stats` como fuente de agregados.

7. **Borrado con rollback controlado**
   - Solo borrar el último partido `final` vía `delete_match` para preservar cadena de ELO.

8. **Cambios de esquema**
   - Toda modificación debe venir con migración SQL y, si impacta reglas, ajuste de validación frontend + RPC.
