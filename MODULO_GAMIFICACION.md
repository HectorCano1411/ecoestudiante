# Módulo de Gamificación - EcoEstudiante

## 1. Diseño Funcional Completo

### 1.1 Objetivo del Módulo

El módulo de gamificación tiene como objetivo **motivar cambios de comportamiento sostenible** en estudiantes universitarios mediante mecánicas de juego que:

- Generan engagement continuo con la plataforma
- Reconocen y premian acciones ecológicas
- Fomentan competencia sana basada en impacto ambiental real
- Mantienen motivación a través de metas semanales alcanzables
- Visualizan progreso individual y colectivo

### 1.2 Componentes del Sistema

#### A. Misiones Verdes Semanales

**Concepto**: Desafíos semanales automáticos que incentivan acciones específicas de reducción de huella de carbono.

**Generación de Misiones**:
```
Proceso semanal (cada lunes 00:00):
1. Sistema consulta historial del usuario (últimas 4 semanas)
2. Identifica categorías con mayor impacto (electricidad, transporte, residuos)
3. Genera 3-5 misiones personalizadas:
   - 2 misiones de categoría con mayor impacto
   - 1-2 misiones de categorías secundarias
   - 1 misión "bonus" (streak o challenge social)
```

**Tipos de Misiones**:

1. **Misiones de Reducción** (baseadas en historial)
   - "Reduce 10% tu consumo eléctrico esta semana"
   - "Disminuye 5kg CO₂ en transporte"

2. **Misiones de Frecuencia** (fomentan hábitos)
   - "Usa transporte público 3 veces"
   - "Clasifica residuos correctamente 5 días"

3. **Misiones de Descubrimiento** (educativas)
   - "Calcula tu primera huella de residuos"
   - "Explora el dashboard de analytics"

4. **Misiones Bonus** (engagement)
   - "Mantén tu streak por 7 días"
   - "Completa todas las misiones esta semana"

**Criterios de Completitud**:
```java
// Verificación automática cada vez que:
// - Usuario registra nuevo cálculo
// - Usuario completa acción en plataforma

if (mission.type == "REDUCTION") {
    // Compara baseline vs actual
    baseline = getAverageLastMonth(category);
    current = getCurrentWeekTotal(category);
    progress = (baseline - current) / baseline * 100;

    if (progress >= mission.targetPercentage) {
        completeMission();
    }
}

if (mission.type == "FREQUENCY") {
    // Cuenta acciones en la semana
    count = countActionsThisWeek(category);

    if (count >= mission.targetCount) {
        completeMission();
    }
}
```

#### B. Sistema de Experiencia (XP) y Niveles

**Mecánica de XP**:
```
XP Sources:
1. Completar misiones: +XP según dificultad
   - Fácil: 50 XP
   - Media: 100 XP
   - Difícil: 200 XP

2. Registrar cálculos: +10 XP por cálculo

3. Streak bonus: +20 XP por día consecutivo

4. Logros especiales: +50-500 XP

Formula de Nivel:
level = floor(sqrt(totalXP / 100))

Ejemplos:
- 100 XP → Nivel 1
- 400 XP → Nivel 2
- 900 XP → Nivel 3
- 2500 XP → Nivel 5
- 10000 XP → Nivel 10
```

**Títulos por Nivel**:
```
Nivel 1-2:   "Eco-Aprendiz"
Nivel 3-5:   "Guardián Verde"
Nivel 6-9:   "Héroe Sostenible"
Nivel 10-15: "Campeón del Planeta"
Nivel 16+:   "Leyenda Ecológica"
```

#### C. Sistema de Streaks (Rachas)

**Definición**:
```
Streak = número de semanas consecutivas con al menos 1 misión completada

Cálculo:
- Se incrementa cada semana que el usuario complete ≥1 misión
- Se resetea a 0 si pasa una semana completa sin misiones completadas
- Se guarda el "mejor streak" histórico

Beneficios:
- Semana 1-2: Multiplier 1.0x
- Semana 3-4: Multiplier 1.2x (+20% XP)
- Semana 5-7: Multiplier 1.5x (+50% XP)
- Semana 8+:  Multiplier 2.0x (+100% XP)
```

#### D. Ranking Semanal (Leaderboard)

**Criterio de Ordenamiento**:
```
Métrica principal: CO₂ evitado en la semana (kg)

Cálculo:
co2_evitado = baseline_semanal - co2_actual_semana

Donde:
- baseline_semanal = promedio de las últimas 4 semanas
- co2_actual_semana = suma de emisiones de lunes a domingo
```

**Privacidad**:
```
- Solo se muestra nickname/username anonimizado
- Usuario ve su posición destacada
- Top 10 semanal público
- Opción de opt-out del ranking
```

**Estructura del Leaderboard**:
```json
{
  "week": "2025-W01",
  "top10": [
    {
      "rank": 1,
      "username": "eco_hero_***",
      "co2_avoided_kg": 45.3,
      "isCurrentUser": false
    }
  ],
  "currentUser": {
    "rank": 23,
    "username": "mi_usuario",
    "co2_avoided_kg": 12.5
  }
}
```

### 1.3 Integración con Módulos Existentes

#### Con Stats (Estadísticas)
```java
// Gamification consume datos de Stats
public class MissionService {
    @Autowired
    private StatsService statsService;

    public void checkMissionProgress(Long userId, Long missionId) {
        // Obtiene métricas actuales del usuario
        var stats = statsService.getUserWeeklyStats(userId);

        // Compara con objetivos de la misión
        // Actualiza progreso
    }
}
```

#### Con Calc (Cálculo de Emisiones)
```java
// Evento: Cada vez que se crea un cálculo
@EventListener
public void onCalculationCreated(CalculationCreatedEvent event) {
    // 1. Otorgar XP base (+10)
    gamificationService.addXP(event.getUserId(), 10);

    // 2. Verificar misiones activas
    gamificationService.checkAllActiveMissions(event.getUserId());

    // 3. Actualizar streak si aplica
    gamificationService.updateStreak(event.getUserId());
}
```

#### Con Auth (Autenticación)
```java
// Al crear usuario, crear perfil de gamificación
@EventListener
public void onUserCreated(UserCreatedEvent event) {
    var profile = new GamificationProfile();
    profile.setUserId(event.getUserId());
    profile.setTotalXP(0L);
    profile.setCurrentStreak(0);

    gamificationProfileRepository.save(profile);
}
```

### 1.4 Flujo de Uso (User Journey)

```
Semana 1 - Lunes:
1. Usuario hace login
2. Sistema muestra notificación: "¡Nuevas misiones disponibles!"
3. Usuario ve 3 misiones semanales en dashboard
4. Usuario completa cálculo de transporte
   → +10 XP
   → Progreso en misión "Usa transporte público 3 veces": 1/3

Semana 1 - Miércoles:
5. Usuario completa otro cálculo de transporte
   → Progreso: 2/3
6. Usuario ve su posición en leaderboard: Puesto #45

Semana 1 - Viernes:
7. Usuario completa tercer cálculo
   → ¡Misión completada! +100 XP
   → Nivel sube de 1 a 2
   → Nuevo título: "Guardián Verde"

Semana 2 - Lunes:
8. Nuevas misiones generadas
9. Streak incrementa a 2 semanas
10. Multiplier XP: 1.0x → 1.2x
```

### 1.5 KPIs del Módulo

**Engagement**:
- % usuarios con al menos 1 misión activa/semana
- Promedio de misiones completadas por usuario
- Tasa de retención semanal

**Impacto Ambiental**:
- Total kg CO₂ evitados por gamificación
- % reducción de huella vs baseline

**Progresión**:
- Distribución de usuarios por nivel
- Promedio de streaks activos
- % usuarios en Top 100 leaderboard

---

## 2. Modelo de Datos (PostgreSQL)

### 2.1 ERD Textual

```
┌─────────────────────────────────────┐
│         USERS (existente)           │
├─────────────────────────────────────┤
│ PK │ id                             │
│    │ username                       │
│    │ email                          │
│    │ ...                            │
└──────────────┬──────────────────────┘
               │ 1:1
               │
┌──────────────▼──────────────────────┐
│      GAMIFICATION_PROFILES          │
├─────────────────────────────────────┤
│ PK │ id                             │
│ FK │ user_id → users.id             │
│    │ total_xp                       │
│    │ current_level                  │
│    │ current_streak                 │
│    │ best_streak                    │
│    │ last_activity_date             │
│    │ created_at                     │
│    │ updated_at                     │
└──────────────┬──────────────────────┘
               │ 1:N
               │
┌──────────────▼──────────────────────┐
│         MISSIONS                    │
├─────────────────────────────────────┤
│ PK │ id                             │
│    │ title                          │
│    │ description                    │
│    │ category (TRANSPORT, etc)      │
│    │ type (REDUCTION, FREQUENCY)    │
│    │ difficulty (EASY, MEDIUM, HARD)│
│    │ target_value                   │
│    │ target_unit                    │
│    │ xp_reward                      │
│    │ co2_impact_kg                  │
│    │ week_number (2025-W01)         │
│    │ year                           │
│    │ is_template (boolean)          │
│    │ created_at                     │
└──────────────┬──────────────────────┘
               │ N:M
               │
┌──────────────▼──────────────────────┐
│       MISSION_PROGRESS              │
├─────────────────────────────────────┤
│ PK │ id                             │
│ FK │ user_id → users.id             │
│ FK │ mission_id → missions.id       │
│    │ current_progress               │
│    │ target_progress                │
│    │ status (ACTIVE, COMPLETED, etc)│
│    │ started_at                     │
│    │ completed_at                   │
│    │ baseline_value                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      LEADERBOARD_CACHE              │
├─────────────────────────────────────┤
│ PK │ id                             │
│ FK │ user_id → users.id             │
│    │ week_number                    │
│    │ year                           │
│    │ co2_avoided_kg                 │
│    │ rank_position                  │
│    │ calculated_at                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      XP_TRANSACTIONS                │
├─────────────────────────────────────┤
│ PK │ id                             │
│ FK │ user_id → users.id             │
│    │ amount                         │
│    │ source (MISSION, CALC, STREAK) │
│    │ reference_id                   │
│    │ created_at                     │
└─────────────────────────────────────┘
```

### 2.2 Descripción de Tablas

#### `gamification_profiles`
Perfil de gamificación de cada usuario. Relación 1:1 con `users`.

#### `missions`
Catálogo de misiones. Puede ser:
- Templates (`is_template = true`): Plantillas reutilizables
- Instancias (`is_template = false`): Misiones asignadas a semanas específicas

#### `mission_progress`
Progreso individual de cada usuario en cada misión asignada.

#### `leaderboard_cache`
Cache pre-calculado del ranking semanal para optimizar consultas.

#### `xp_transactions`
Registro auditado de todas las transacciones de XP (para análisis y debugging).

---

## 3. Estrategia de Implementación

### Fase 1: Backend (Sprint 1 - 1 semana)
- ✅ Scripts Flyway
- ✅ Entidades JPA
- ✅ Repositorios
- ✅ Servicios core
- ✅ API REST

### Fase 2: Frontend (Sprint 2 - 1 semana)
- ✅ Componentes UI
- ✅ API Routes
- ✅ Integración con dashboard

### Fase 3: Testing (Sprint 3 - 3 días)
- ✅ Tests unitarios
- ✅ Tests de integración
- ✅ Contract tests

### Fase 4: Documentación (Sprint 4 - 2 días)
- ✅ Swagger/OpenAPI
- ✅ README técnico
- ✅ Documentación académica

---

## 4. Consideraciones Técnicas

### Performance
- Leaderboard cacheado (recalcula 1 vez/día)
- Índices en `week_number`, `user_id`, `status`
- Paginación en endpoints de misiones

### Seguridad
- Solo el usuario puede ver su propio progreso completo
- Leaderboard anonimizado
- Rate limiting en endpoints de completar misiones

### Escalabilidad
- Jobs asíncronos para generar misiones semanales
- Cache de Redis para leaderboard
- Eventos desacoplados (Spring Events)

---

Este documento sirve como especificación completa del módulo de gamificación.
