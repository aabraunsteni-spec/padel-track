# REPO_MAP

## Rutas exactas de páginas y flujos

### Player profile page
- **Ruta URL**: `/jugador/[slug]`
- **Archivo**: `src/app/jugador/[slug]/page.tsx`
- **Qué hace**:
  - Lee `jugadores` por `slug`.
  - Lee `player_stats` para stats derivados.
  - Calcula posición de ranking ordenando por `elo_rating`.

### Match insert/create
- **Ruta principal de carga**: `/cargar`
- **Archivo**: `src/app/cargar/page.tsx`
- **Flujo de creación**:
  1. Validación en cliente (4 jugadores distintos, cantidad de sets por tipo, score válido por set).
  2. Si `type = viernes`, crea/obtiene sesión con `getOrCreateFridaySession`.
  3. Inserta `matches` en estado `draft`.
  4. Inserta `match_players` (4 filas) y `match_sets`.
  5. Finaliza vía RPC `finalize_match` (cuando corresponde) y borra vía RPC `delete_match`.

- **Ruta legacy/alias**: `/viernes-cargar`
- **Archivo**: `src/app/viernes-cargar/page.tsx`
- **Comportamiento**: redirige a `/cargar`.

### Historial de partidos
- **Ruta URL**: `/historial`
- **Archivo**: `src/app/historial/page.tsx`
- **Qué hace**: consulta `matches` + relaciones (`sessions`, `match_players`, `match_sets`) para mostrar resultados.

## Ubicación de queries y cliente Supabase

### Cliente Supabase (browser/client-side)
- `src/lib/supabase.ts`

### Cliente Supabase (server/service role)
- `src/lib/supabase-server.ts`

### Queries principales
- Home/ranking + últimos resultados: `src/app/page.tsx`
- Perfil jugador: `src/app/jugador/[slug]/page.tsx`
- Carga de partidos + RPC finalize/delete: `src/app/cargar/page.tsx`
- Historial: `src/app/historial/page.tsx`

## Ubicación de lógica winner/scoring

### Frontend (validación previa)
- `validateSetScore` en `src/lib/matches.ts`
- Reglas de BO1/BO3 en `src/app/cargar/page.tsx` (validación de cantidad de sets y sets ganados).

### Backend (source of truth)
- `is_valid_set_score` + trigger `validate_match_set_score` en migración:
  - `supabase/migrations/202602120001_rebuild_matches_v2.sql`
- RPC `finalize_match`:
  - Valida estructura del partido.
  - Determina `winner_team` según sets ganados.
  - Agrega games totales (`games_team1`, `games_team2`).
  - Aplica ELO y escribe `elo_history`.

## Ubicación de recompute

### Estado actual
- El recompute global fue eliminado.
- Endpoint API deprecado: `src/app/api/elo/recompute/route.ts` (HTTP 410, indica usar RPCs).
- Mensaje deprecado en `src/lib/elo.ts`.
- En DB se eliminaron funciones legacy de recompute en la migración v2 (`drop function ... recompute_elo...`).

### Modelo vigente
- Recompute implícito y transaccional por operación:
  - `finalize_match` para consolidar resultado + ELO.
  - `delete_match` para rollback del último match finalizado.
