# FEATURE_WORKFLOW

## Checklist de PR

- [ ] Confirmar si el cambio es **feature barata** (UI+query) o **core change** (modelo/consistencia/RPC).
- [ ] Identificar tablas/queries tocadas y verificar impacto en `matches`, `match_players`, `match_sets`, `elo_history`, `player_stats`.
- [ ] Si hay cambio de datos/reglas, agregar migración en `supabase/migrations/`.
- [ ] Mantener invariantes martes/viernes y draft/final.
- [ ] Evitar escrituras manuales de campos derivados (`winner_team`, games, elo).
- [ ] Validar lint + build.
- [ ] Si aplica, ejecutar SQL de verificación/escenarios de regresión.
- [ ] Actualizar docs (`REPO_MAP`, `DATA_CONTRACT`, esta guía) cuando cambie arquitectura.

## Guía: “feature barata” vs “core change”

### Feature barata (UI + query)
**Ejemplos**
- Nuevo filtro en historial.
- Mostrar más columnas en ranking.
- Ajuste visual de cards o tabla.

**Características**
- No cambia schema ni RPCs.
- Solo cambia componentes/páginas + selects de Supabase.
- Riesgo principal: romper render o tipado de datos.

**Flujo recomendado**
1. Cambiar UI/componente.
2. Ajustar query (`select`) y tipos TS si hace falta.
3. Verificar que campos leídos existan en tabla/view actual.
4. Correr lint/build.

### Core change (dominio/consistencia)
**Ejemplos**
- Nueva regla de scoring.
- Alterar cálculo ELO o borrado.
- Cambiar estructura de `matches`/`match_sets`/`player_stats`.

**Características**
- Afecta invariantes de negocio.
- Requiere cambios coordinados DB + app.
- Riesgo alto de inconsistencias históricas.

**Flujo recomendado**
1. Diseñar contrato de datos (source of truth vs derivado).
2. Implementar migración SQL (constraints, funciones, grants).
3. Adaptar frontend para respetar nuevas reglas.
4. Validar escenarios:
   - creación draft
   - finalización
   - rollback/delete
   - lectura de stats/historial
5. Correr lint/build y pruebas SQL de verificación.
6. Documentar impacto y plan de rollback en PR.

## Comandos para testear (lint/build)

```bash
npm run lint
npm run build
```

## Comandos útiles de soporte

```bash
# typecheck implícito en build (Next.js)
npm run build

# pruebas SQL/manuales de consistencia (si hay entorno DB conectado)
# revisar y ejecutar escenarios del archivo:
docs/db_verification.sql
```

## Criterios mínimos antes de merge

- Lint y build en verde.
- Sin escrituras directas a campos derivados fuera de RPCs.
- Sin romper queries de home, perfil jugador, cargar y historial.
- Si hubo core change, migración y documentación actualizadas.
