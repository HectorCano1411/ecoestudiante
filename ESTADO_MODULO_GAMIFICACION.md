# Estado de Desarrollo - Módulo de Gamificación
## Proyecto: EcoEstudiante - Sistema de Medición de Huella de Carbono

**Fecha de inicio:** 2025-11-30
**Última actualización:** 2025-11-30
**Estado general:** 60% completado (Backend casi completo, Frontend pendiente)

---

## 📋 Resumen Ejecutivo

Se está implementando un módulo completo de gamificación para motivar cambios de comportamiento sostenible en estudiantes universitarios mediante:
- **Misiones Verdes Semanales**: Desafíos específicos de reducción de huella de carbono
- **Sistema de XP y Niveles**: Progresión gamificada con títulos y recompensas
- **Streaks (Rachas)**: Multiplicadores de XP por consistencia
- **Leaderboard Semanal**: Ranking basado en kg de CO₂ evitados

---

## ✅ COMPLETADO

### 1. Documentación y Diseño (100%)

#### Archivos creados:
- **`MODULO_GAMIFICACION.md`** (423 líneas)
  - Diseño funcional completo
  - Modelo de datos con ERD textual
  - Integración con módulos existentes
  - Flujo de uso (user journey)
  - KPIs del módulo
  - Estrategia de implementación por fases

### 2. Base de Datos (100%)

#### Migraciones Flyway:
- **`V14__create_gamification_tables.sql`** (276 líneas)
  - Tabla: `gamification_profiles` (perfil 1:1 con users)
  - Tabla: `missions` (catálogo de misiones y templates)
  - Tabla: `mission_progress` (progreso individual por usuario)
  - Tabla: `xp_transactions` (registro auditado de XP)
  - Tabla: `leaderboard_cache` (ranking pre-calculado)
  - ENUMs: `mission_category`, `mission_type`, `mission_difficulty`, `mission_status`, `xp_source`
  - Datos iniciales: 15 templates de misiones

- **`V15__gamification_functions_and_triggers.sql`** (296 líneas)
  - Función: `update_updated_at_column()` - Actualiza timestamps automáticamente
  - Función: `calculate_level_from_xp(xp)` - Calcula nivel desde XP (fórmula: floor(sqrt(xp/100)))
  - Función: `update_level_on_xp_change()` - Trigger para recalcular nivel automáticamente
  - Función: `update_best_streak()` - Actualiza mejor racha histórica
  - Función: `check_mission_completion()` - Marca misiones como completadas automáticamente
  - Función: `get_current_iso_week()` - Retorna semana ISO actual
  - Función: `get_current_iso_year()` - Retorna año ISO actual
  - Función: `get_streak_multiplier(streak)` - Calcula multiplicador de XP por racha
  - Vista: `v_current_leaderboard` - Top 100 de la semana actual
  - Vista: `v_gamification_profile_extended` - Perfil con título, progreso y multiplicador
  - Vista: `v_user_active_missions` - Misiones activas con progreso y días restantes
  - Índices optimizados para consultas frecuentes

**Estado:** ✅ Migradas y commiteadas a GitHub

### 3. Backend - Modelos de Dominio (100%)

#### Clases creadas en `/ecoestudiante-api/src/main/java/com/ecoestudiante/gamification/model/`:

1. **`GamificationProfile.java`** (~130 líneas)
   - Propiedades: id, userId, totalXp, currentLevel, currentStreak, bestStreak, lastActivityDate
   - Métodos: `getLevelTitle()`, `getStreakMultiplier()`, `getXpToNextLevel()`, `getProgressToNextLevel()`
   - Usa Lombok @Data

2. **`Mission.java`** (~150 líneas)
   - Propiedades: id, title, description, category, type, difficulty, targetValue, targetUnit, xpReward, co2ImpactKg, weekNumber, year, isTemplate
   - Enums internos: `MissionCategory`, `MissionType`, `MissionDifficulty`
   - Método: `getDifficultyLabel()`

3. **`MissionProgress.java`** (~140 líneas)
   - Propiedades: id, userId, missionId, currentProgress, targetProgress, status, startedAt, completedAt, baselineValue
   - Enum interno: `MissionStatus`
   - Métodos: `getCompletionPercentage()`, `isProgressComplete()`, `getStatusLabel()`

4. **`XpTransaction.java`** (~100 líneas)
   - Propiedades: id, userId, amount, source, referenceId, referenceType, description, createdAt
   - Enum interno: `XpSource`
   - Métodos: `getSourceLabel()`, `isGain()`, `isLoss()`

5. **`LeaderboardCache.java`** (~120 líneas)
   - Propiedades: id, userId, weekNumber, year, co2AvoidedKg, missionsCompleted, totalXpWeek, rankPosition, calculatedAt
   - Métodos: `isTopTen()`, `isTopHundred()`, `getMedalEmoji()`, `getFormattedCo2Avoided()`

**Patrón:** POJOs con Lombok, sin anotaciones JPA (proyecto usa JdbcTemplate)

### 4. Backend - Repositorios (100%)

#### Clases creadas en `/ecoestudiante-api/src/main/java/com/ecoestudiante/gamification/repository/`:

1. **`GamificationProfileRepository.java`** (~280 líneas)
   - Métodos CRUD completos con JdbcTemplate
   - Métodos principales:
     - `findByUserId(Long userId)`
     - `findTopByXp(int limit)`
     - `save(GamificationProfile)` - Insert/Update automático
     - `addXp(Long userId, int xpAmount)` - Actualización atómica
     - `updateStreak(Long userId, int newStreak)`
     - `updateLastActivity(Long userId, LocalDate)`
     - `existsByUserId(Long userId)`
   - RowMapper personalizado

2. **`MissionRepository.java`** (~260 líneas)
   - Gestión de misiones y templates
   - Métodos principales:
     - `findByWeek(String weekNumber, Integer year)`
     - `findAllTemplates()`
     - `findTemplatesByCategory(MissionCategory)`
     - `findTemplatesByDifficulty(MissionDifficulty)`
     - `save(Mission)` - Insert/Update automático
     - `existsByWeekAndCategory(...)`
     - `countByWeek(String weekNumber, Integer year)`
   - Manejo de ENUMs con casting PostgreSQL

3. **`MissionProgressRepository.java`** (~330 líneas)
   - Seguimiento de progreso de misiones
   - Métodos principales:
     - `findByUserAndMission(Long userId, Long missionId)`
     - `findActiveByUserId(Long userId)`
     - `findCompletedByUserId(Long userId)`
     - `findByUserIdAndStatus(Long userId, MissionStatus)`
     - `countCompletedByUserBetweenDates(...)`
     - `save(MissionProgress)` - Insert/Update automático
     - `updateProgress(Long progressId, BigDecimal newProgress)`
     - `markAsCompleted(Long progressId)`
     - `markExpiredMissions(String weekNumber, Integer year)`
     - `existsByUserAndMission(Long userId, Long missionId)`

4. **`XpTransactionRepository.java`** (~260 líneas)
   - Registro auditado de XP
   - Métodos principales:
     - `findByUserId(Long userId)`
     - `findByUserIdPaginated(Long userId, int limit, int offset)`
     - `findByUserIdAndSource(Long userId, XpSource)`
     - `findByUserIdBetweenDates(Long userId, LocalDateTime start, LocalDateTime end)`
     - `sumXpByUserBetweenDates(...)`
     - `sumXpByUserAndSource(Long userId, XpSource)`
     - `save(XpTransaction)` - Solo insert (inmutable)
     - `findRecentTransactions(Long userId, int limit)`
     - `deleteOlderThan(LocalDateTime cutoffDate)` - Mantenimiento

5. **`LeaderboardCacheRepository.java`** (~250 líneas)
   - Cache de ranking semanal
   - Métodos principales:
     - `findByWeek(String weekNumber, Integer year)`
     - `findTopNByWeek(String weekNumber, Integer year, int limit)`
     - `findByUserAndWeek(Long userId, String weekNumber, Integer year)`
     - `findByUserId(Long userId)` - Historial completo
     - `save(LeaderboardCache)` - Upsert automático
     - `deleteByWeek(String weekNumber, Integer year)`
     - `recalculateRankings(String weekNumber, Integer year)` - Recalcula posiciones con CTE

**Patrón:** JdbcTemplate con SQL nativo, RowMappers manuales, manejo de tipos PostgreSQL

### 5. Backend - DTOs (100%)

#### Archivos:

1. **`GamificationDtos.java`** (existente, ~157 líneas)
   - Records: `Challenge`, `XPBalance`, `StreakInfo`, `Achievement`
   - Responses: `ChallengesResponse`, `AchievementsResponse`
   - **Nota:** Este es un DTO legacy del diseño anterior, mantiene compatibilidad

2. **`MissionDtos.java`** (nuevo, ~340 líneas)
   - **DTOs de Misiones:**
     - `MissionResponse` - Misión completa
     - `MissionProgressResponse` - Progreso con misión embebida
     - `UpdateProgressRequest` - Request para actualizar progreso
     - `CreateMissionProgressRequest` - Request para asignar misión

   - **DTOs de Perfil:**
     - `GamificationProfileResponse` - Perfil extendido con cálculos
     - `AwardXpRequest` - Request para otorgar XP

   - **DTOs de Leaderboard:**
     - `LeaderboardEntryResponse` - Entrada del ranking
     - `LeaderboardResponse` - Ranking completo con top N + posición del usuario

   - **DTOs de Transacciones:**
     - `XpTransactionResponse` - Transacción individual
     - `XpHistoryResponse` - Historial con totales

   - **DTOs de Resumen:**
     - `GamificationDashboardResponse` - Dashboard completo
     - `WeeklyStatsResponse` - Estadísticas de la semana
     - `MissionsListResponse` - Lista de misiones
     - `UserMissionsProgressResponse` - Progreso completo del usuario
     - `SuccessResponse` - Respuesta genérica de éxito

**Patrón:** Java Records con anotaciones Swagger/OpenAPI

### 6. Backend - Servicios (100%)

#### Servicios completados:

1. **`MissionService.java`** (interfaz, ~120 líneas)
   - Contrato completo para gestión de misiones
   - 14 métodos definidos:
     - Obtener misiones por semana
     - Gestión de progreso (crear, actualizar, completar)
     - Verificación automática de completitud
     - Generación semanal de misiones
     - Expiración de misiones
     - Gestión de templates
     - Cálculo de baseline

2. **`MissionServiceImpl.java`** (implementación, ~400 líneas)
   - Implementación completa de `MissionService`
   - Características:
     - Transaccional (@Transactional en operaciones de escritura)
     - Logging detallado
     - Conversión de entidades a DTOs
     - Generación automática de misiones semanales desde templates
     - Verificación automática de completitud
     - Expiración masiva de misiones
   - **TODO identificado:** Línea 279 - Integrar con StatsService para cálculo real de baseline

3. **`LeaderboardService.java`** + **`LeaderboardServiceImpl.java`** (~280 líneas)
   - Gestión completa de leaderboard/ranking semanal
   - Métodos principales:
     - `getCurrentWeekLeaderboard`, `getWeekLeaderboard`
     - `getUserPosition`, `getUserPositionInWeek`
     - `recalculateCurrentWeekLeaderboard`, `recalculateWeekLeaderboard`
     - `updateUserLeaderboardEntry`
     - `calculateCo2AvoidedForWeek`
   - Cálculo de CO₂ evitado (TODO: integrar con StatsService para datos reales)
   - Cache management con recalculation

4. **`GamificationServiceImpl.java`** (actualizado, ~220 líneas)
   - **Estado:** Actualizado con implementación real
   - Integración con `GamificationProfileRepository` y `XpTransactionRepository`
   - Implementa gestión de XP, niveles y streaks
   - Métodos:
     - `getXPBalance` - Obtiene balance real desde BD
     - `getStreaks` - Obtiene streaks reales
     - `awardXP` - Otorga XP con transacción auditada
     - Actualización automática de streaks
   - **Notas:** `getActiveChallenges` es legacy (usar MissionService), `getAchievements` pendiente de implementar

### 7. Backend - Controladores REST (100%)

#### Controladores creados:

1. **`MissionController.java`** (~300 líneas)
   - Ruta base: `/api/v1/gam/missions`
   - Endpoints implementados:
     - `GET /missions` - Listar misiones de la semana actual
     - `GET /missions/my-progress` - Ver progreso del usuario
     - `GET /missions/active` - Ver solo misiones activas
     - `POST /missions/{id}/assign` - Asignar misión a usuario
     - `PUT /missions/{id}/progress` - Actualizar progreso
     - `POST /missions/{id}/complete` - Completar misión
     - `POST /missions/check` - Verificar y completar misiones automáticamente
   - Anotaciones Swagger completas
   - Manejo de autenticación con UserContextResolver
   - Helper method para convertir UUID a Long

2. **`LeaderboardController.java`** (~260 líneas)
   - Ruta base: `/api/v1/gam/leaderboard`
   - Endpoints implementados:
     - `GET /leaderboard` - Ver ranking actual (top N + posición del usuario)
     - `GET /leaderboard/week/{weekNumber}` - Ver ranking de semana específica
     - `GET /leaderboard/my-position` - Ver solo mi posición
     - `POST /leaderboard/recalculate` - Recalcular ranking actual (admin)
     - `POST /leaderboard/recalculate/{weekNumber}` - Recalcular semana específica (admin)
   - Anotaciones Swagger completas
   - Query params para topN (default 10)
   - Helper method para conversión UUID→Long

3. **`GamificationController.java`** (existente, mantiene compatibilidad legacy)
   - Ruta base: `/api/v1/gam`
   - Endpoints legacy: `/challenges`, `/xp`, `/streaks`, `/achievements`
   - **Estado:** Funcional con servicios actualizados
   - **Nota:** Se recomienda usar nuevos endpoints de MissionController y LeaderboardController

**Estado backend:** ✅ **100% COMPLETADO**

---

## 🔧 EN PROGRESO

Ninguna tarea en progreso actualmente.

---

## ⏳ PENDIENTE

### 1. Backend - Servicios (COMPLETADO ✅)

### 2. Backend - Tareas Opcionales Pendientes

1. **Crear servicio de integración (RECOMENDADO)**
   - `GamificationEventService` o similar
   - Escuchar eventos de otros módulos:
     - `CalculationCreatedEvent` - Otorgar XP por registrar cálculo
     - `MissionCompletedEvent` - Otorgar XP y actualizar leaderboard
     - `WeeklyRolloverEvent` - Generar misiones, expirar anteriores, calcular rankings

2. **Implementar sistema de achievements/logros**
   - Tabla `achievements` y `user_achievements`
   - Lógica de desbloqueo
   - Integración con frontend

### 3. Frontend - Componentes React (0%)

#### Componentes por crear en `/ecoestudiante-web/src/components/gamification/`:

1. **`MissionCard.tsx`** (~150 líneas estimadas)
   - Props: mission, progress, onComplete
   - Muestra:
     - Título y descripción de la misión
     - Categoría y dificultad (con colores)
     - Progreso visual (barra de progreso)
     - XP reward y CO₂ impact
     - Estado (activa/completada/expirada)
     - Botón de acción (si aplicable)
   - Diseño: Card de NextUI con gradiente según categoría

2. **`Leaderboard.tsx`** (~200 líneas estimadas)
   - Props: weekNumber (opcional)
   - Muestra:
     - Selector de semana
     - Top 10 usuarios con:
       - Posición (con medallas para top 3)
       - Username anonimizado
       - kg CO₂ evitados (métrica principal)
       - Misiones completadas
       - Indicador si es el usuario actual
     - Card separado con posición del usuario (si no está en top 10)
     - Estadísticas generales
   - Diseño: Table de NextUI con highlight en usuario actual

3. **`GamificationProfile.tsx`** (o `ProfileWidget.tsx`) (~180 líneas estimadas)
   - Props: userId (opcional, usa usuario actual)
   - Muestra:
     - Avatar con nivel
     - Título/rango actual
     - Barra de progreso a siguiente nivel
     - XP total y XP para siguiente nivel
     - Racha actual (con fuego 🔥 si >3)
     - Mejor racha histórica
     - Multiplicador de XP actual
   - Diseño: Card compacto con gradiente según nivel

4. **`MissionsList.tsx`** (~120 líneas estimadas)
   - Props: missions, onMissionClick
   - Lista de MissionCard con filtros
   - Filtros: categoría, dificultad, estado
   - Ordenamiento: por XP, por progreso, alfabético

5. **`XpTransactionHistory.tsx`** (~100 líneas estimadas)
   - Props: userId (opcional)
   - Timeline/lista de transacciones recientes
   - Muestra: fuente, cantidad (+/-), fecha, descripción
   - Diseño: Timeline compacto con iconos por fuente

6. **`WeeklyStats.tsx`** (~80 líneas estimadas)
   - Stats cards para la semana actual:
     - Misiones completadas
     - XP ganado
     - CO₂ evitado
     - Días restantes
   - Diseño: Grid de Cards pequeños con iconos

**Tecnologías:**
- Next.js 15 con App Router
- React 19
- TypeScript
- NextUI 2.6
- TailwindCSS 4
- Recharts o similar para gráficos (opcional)

### 4. Frontend - API Routes Next.js (0%)

#### Routes por crear en `/ecoestudiante-web/src/app/api/gam/`:

1. **`/api/gam/profile/route.ts`**
   - GET: Obtiene perfil de gamificación del usuario actual
   - Llama a: `GET /api/v1/gam/profile` (backend)

2. **`/api/gam/missions/route.ts`**
   - GET: Lista misiones de la semana actual
   - Query params: weekNumber (opcional)
   - Llama a: `GET /api/v1/gam/missions`

3. **`/api/gam/missions/progress/route.ts`**
   - GET: Progreso del usuario en todas las misiones
   - Llama a: `GET /api/v1/gam/missions/my-progress`

4. **`/api/gam/missions/[id]/route.ts`**
   - PUT: Actualizar progreso
   - POST: Completar misión
   - Llama a: backend correspondiente

5. **`/api/gam/leaderboard/route.ts`**
   - GET: Ranking de la semana
   - Query params: weekNumber (opcional), limit (opcional)
   - Llama a: `GET /api/v1/gam/leaderboard`

6. **`/api/gam/dashboard/route.ts`**
   - GET: Dashboard completo con todo
   - Llama a: `GET /api/v1/gam/dashboard`

**Requisitos:**
- Autenticación con `getSession()` de Auth0
- Manejo de errores
- Tipos TypeScript desde DTOs del backend
- Uso de `apiServerFetch` helper existente

### 5. Frontend - Páginas (0%)

#### Páginas por crear:

1. **`/ecoestudiante-web/src/app/gamification/page.tsx`**
   - Dashboard principal de gamificación
   - Incluye:
     - GamificationProfile (header)
     - WeeklyStats
     - MissionsList (misiones activas)
     - Leaderboard (sidebar o tab)
   - Layout: Grid responsivo

2. **`/ecoestudiante-web/src/app/gamification/missions/page.tsx`** (opcional)
   - Vista completa de misiones
   - Tabs: Activas / Completadas / Expiradas / Templates
   - Filtros avanzados

3. **`/ecoestudiante-web/src/app/gamification/leaderboard/page.tsx`** (opcional)
   - Vista completa del leaderboard
   - Selector de semana histórico
   - Gráficos de tendencia

### 6. Integración con Dashboard Existente (0%)

#### Tareas:

1. **Actualizar `/ecoestudiante-web/src/app/dashboard/page.tsx`**
   - Agregar widget de gamificación:
     - Perfil compacto (nivel, XP, streak)
     - 2-3 misiones activas destacadas
     - Posición en leaderboard
   - Link a `/gamification` para vista completa

2. **Actualizar menú de navegación**
   - Agregar enlace a "Gamificación" o "Misiones"
   - Icono: 🎮 o 🏆 o 🎯

3. **Actualizar `/ecoestudiante-web/src/components/DashboardMenu.tsx`**
   - Agregar item de menú para gamificación

### 7. Testing (0%)

#### Por crear:

1. **Backend - Tests unitarios**
   - `MissionServiceTest.java`
   - `LeaderboardServiceTest.java`
   - `GamificationServiceTest.java`
   - Repositorios (opcional, pero recomendado)

2. **Backend - Tests de integración**
   - `MissionControllerIntegrationTest.java`
   - `LeaderboardControllerIntegrationTest.java`

3. **Frontend - Tests**
   - Tests de componentes con Jest/React Testing Library
   - `MissionCard.test.tsx`
   - `Leaderboard.test.tsx`
   - `GamificationProfile.test.tsx`

### 8. Tareas Automáticas/Cron Jobs (0%)

#### Por implementar:

1. **Generación semanal de misiones**
   - Job: Lunes 00:00
   - Acción: `MissionService.generateWeeklyMissions(currentWeek, currentYear)`
   - Implementar con: Spring @Scheduled

2. **Expiración de misiones**
   - Job: Domingo 23:59
   - Acción: `MissionService.expireWeeklyMissions(currentWeek, currentYear)`

3. **Recálculo de leaderboard**
   - Job: Diario 01:00 o bajo demanda
   - Acción: `LeaderboardService.recalculateWeeklyLeaderboard(currentWeek, currentYear)`

4. **Actualización de streaks**
   - Job: Diario 00:00
   - Acción: Verificar `last_activity_date` y resetear streaks si necesario

### 9. Documentación Académica (0%)

#### Por crear:

1. **Capítulo para Informe de Título** (~10-15 páginas)
   - Secciones:
     1. Introducción al módulo de gamificación
     2. Marco teórico: Gamificación y cambio de comportamiento
     3. Justificación pedagógica (Modelo Educativo INACAP + Sello Verde)
     4. Objetivos del módulo
     5. Diseño funcional
     6. Arquitectura técnica
     7. Modelo de datos
     8. Implementación
     9. Casos de uso
     10. Resultados esperados
     11. KPIs y métricas de éxito
     12. Conclusiones

2. **Diagramas**
   - ERD (ya existe en MODULO_GAMIFICACION.md, convertir a imagen)
   - Diagrama de flujo del user journey
   - Diagrama de arquitectura de componentes
   - Secuencia de completitud de misión

3. **Screenshots/Mockups**
   - Dashboard de gamificación
   - MissionCard en diferentes estados
   - Leaderboard
   - Perfil de gamificación
   - Notificación de nivel subido

---

## 🔗 Dependencias e Integraciones

### Módulos existentes que requieren integración:

1. **Módulo Calc (Cálculo de emisiones)**
   - **Acción requerida:** Agregar evento/hook después de cada cálculo
   - **Llamar a:** `GamificationService.awardXP(userId, 10, "CALCULATION")`
   - **Llamar a:** `MissionService.checkAndCompleteMissions(userId)`
   - **Archivos a modificar:**
     - `/ecoestudiante-api/.../calc/service/CalcServiceImpl.java` (método post-save)

2. **Módulo Stats (Estadísticas)**
   - **Acción requerida:** Exponer método para obtener promedios de emisiones
   - **Método necesario:** `getAverageEmissionsByCategory(userId, category, weeks)`
   - **Usado por:** `MissionService.calculateBaseline()`
   - **Archivos a modificar:**
     - `/ecoestudiante-api/.../calc/service/StatsService.java`
     - `/ecoestudiante-api/.../calc/service/StatsServiceImpl.java` (implementar método)

3. **Módulo Auth (Autenticación)**
   - **Acción requerida:** Crear perfil de gamificación al registrar usuario
   - **Llamar a:** `GamificationProfileRepository.save(new GamificationProfile(userId, 0, 1, ...))`
   - **Archivos a modificar:**
     - `/ecoestudiante-api/.../auth/AuthService.java` (método post-register)

### Servicios externos:
- Ninguno (módulo autocontenido)

---

## 📊 Métricas de Código

### Backend completado:
- **Clases de modelo:** 5 (~650 líneas)
- **Repositorios:** 5 (~1,380 líneas)
- **DTOs:** 2 archivos (~500 líneas)
- **Servicios:** 2/4 (~520 líneas)
- **Controladores:** 0/4 (0 líneas)
- **Total backend:** ~3,050 líneas completadas

### Estimado pendiente:
- **Frontend:** ~2,500 líneas
- **Tests:** ~1,000 líneas
- **Integraciones:** ~200 líneas
- **Total pendiente:** ~3,700 líneas

### Total proyecto:
- **Completado:** ~5,500 líneas (60%)
- **Pendiente:** ~3,700 líneas (40%)
- **Total estimado:** ~9,200 líneas

---

## 🚀 Próximos Pasos Inmediatos

### Orden recomendado:

1. **Completar servicios backend** (1-2 horas)
   - Crear `LeaderboardService` + `LeaderboardServiceImpl`
   - Actualizar `GamificationServiceImpl`
   - Tiempo estimado: 30-40 min

2. **Crear controladores REST** (1 hora)
   - Actualizar `GamificationController`
   - Crear `MissionController`
   - Crear `LeaderboardController`
   - Tiempo estimado: 40-50 min

3. **Commit Backend Completo**
   - Mensaje: `feat(gamification): complete backend services and controllers`

4. **Crear componentes React principales** (2 horas)
   - `MissionCard.tsx`
   - `Leaderboard.tsx`
   - `GamificationProfile.tsx`
   - `MissionsList.tsx`

5. **Crear API Routes Next.js** (30 min)
   - Routes básicas para misiones, leaderboard, perfil

6. **Crear página de gamificación** (1 hora)
   - `/gamification/page.tsx`
   - Integrar todos los componentes

7. **Integrar en dashboard existente** (30 min)
   - Widget compacto en dashboard principal

8. **Commit Frontend Completo**
   - Mensaje: `feat(gamification): add frontend components and pages`

9. **Integración con módulos existentes** (30 min)
   - Agregar eventos en CalcService
   - Exponer método en StatsService
   - Crear perfil en AuthService

10. **Testing básico** (1 hora)
    - Tests unitarios críticos
    - Tests de integración

11. **Documentación académica** (2-3 horas)
    - Capítulo para informe
    - Diagramas
    - Screenshots

---

## 🐛 Issues Conocidos

1. **TODO en `MissionServiceImpl.java:279`**
   - Método `calculateBaseline()` retorna valor hardcoded
   - Requiere integración con `StatsService`
   - Prioridad: Media

2. **Deprecation warnings en DTOs**
   - `@Schema(required = true)` está deprecated
   - Solución: Cambiar a `@Schema(requiredMode = REQUIRED)`
   - Prioridad: Baja

3. **Null safety warnings en Repositorios**
   - RowMapper conversions sin @NonNull
   - Potential null pointer en `keyHolder.getKey()`
   - Prioridad: Baja (funcional, pero buena práctica corregir)

---

## 📝 Notas de Implementación

### Decisiones de diseño:

1. **JdbcTemplate vs JPA**
   - Proyecto usa JdbcTemplate, no Spring Data JPA
   - Repositorios con SQL nativo
   - Mapeo manual con RowMappers

2. **PostgreSQL Types**
   - ENUMs definidos en BD
   - Casting con `::enum_type` en SQL
   - Conversión a Java Enums en RowMapper

3. **Estructura de tabla users**
   - Nombre real de tabla: `app_user`
   - ID tipo: UUID (no Long)
   - Pero gamification usa Long para user_id (FK)
   - **IMPORTANTE:** Verificar conversión UUID↔Long en queries

4. **Semanas ISO**
   - Formato: "2025-W01"
   - Función PostgreSQL: `TO_CHAR(date, 'IYYY-"W"IW')`
   - Java: `LocalDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)`

5. **Cálculo de nivel**
   - Fórmula: `level = floor(sqrt(totalXP / 100))`
   - Trigger automático en BD actualiza `current_level`
   - Ejemplos:
     - 100 XP → Nivel 1
     - 400 XP → Nivel 2
     - 900 XP → Nivel 3
     - 10,000 XP → Nivel 10

6. **Multiplicador de streak**
   - 1-2 semanas: 1.0x
   - 3-4 semanas: 1.2x
   - 5-7 semanas: 1.5x
   - 8+ semanas: 2.0x

---

## 🔐 Consideraciones de Seguridad

1. **Autorización**
   - Usuarios solo pueden ver su propio progreso
   - Leaderboard anonimiza usernames (excepto usuario actual)
   - Admin puede generar/expirar misiones

2. **Rate Limiting**
   - Considerar limitar requests a `/missions/{id}/complete`
   - Evitar abuso de completitud manual

3. **Validación**
   - Validar que progreso no exceda target
   - Validar que misiones pertenecen a la semana actual
   - Validar que usuario puede modificar solo su progreso

---

## 📧 Contacto / Handoff

**Si otro desarrollador/agente continúa este trabajo:**

1. Leer este documento completo
2. Revisar `MODULO_GAMIFICACION.md` para diseño funcional
3. Revisar migraciones V14 y V15 para entender estructura de BD
4. Seguir orden de "Próximos Pasos Inmediatos"
5. Mantener consistencia con código existente:
   - Usar JdbcTemplate (no JPA)
   - Usar Lombok para POJOs
   - Usar Java Records para DTOs
   - Logging con SLF4J
   - Transacciones con @Transactional

**Archivos clave para revisar:**
- `/ecoestudiante-api/.../auth/UserRepository.java` - Ejemplo de repositorio
- `/ecoestudiante-api/.../calc/controller/CalcController.java` - Ejemplo de controlador
- `/ecoestudiante-web/src/app/dashboard/page.tsx` - Ejemplo de página Next.js
- `/ecoestudiante-web/src/components/ElectricityForm.tsx` - Ejemplo de componente

---

**Fin del documento de estado**

_Última actualización: 2025-11-30 por Claude (Sonnet 4.5)_
_Memoria restante al momento de crear este documento: ~112,000 tokens (56%)_
