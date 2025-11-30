# 🧪 Guía Completa de Testing - Módulo de Gamificación

**Fecha:** 30 de Noviembre, 2025
**Tiempo estimado:** 15-20 minutos

---

## 📋 Prerequisitos

- ✅ Servicios corriendo: `docker-compose ps`
- ✅ Usuario registrado en la aplicación
- ✅ Navegador con DevTools habilitado

---

## 🚀 OPCIÓN 1: Testing Visual (RECOMENDADO)

### Paso 1: Preparación (1 min)

```bash
# Terminal 1: Monitorear logs en tiempo real
./monitor-gamification.sh
```

### Paso 2: Login y Dashboard (1 min)

1. Abrir navegador: `http://localhost:3000`
2. Hacer login con tu usuario
3. Deberías ver el Dashboard con:
   - ✅ Widget de XP/Nivel en el header (esquina superior derecha)
   - ✅ Botón "🎯 Misiones"
   - ✅ Botón "🏆 Ranking"
   - ✅ Calculadoras de electricidad/transporte/residuos

**📸 Screenshot esperado:**
```
┌─────────────────────────────────────────────────┐
│ EcoEstudiante  [🎯 Misiones] [🏆 Ranking] [🌱 Nivel 1 - 45 XP] [👤 usuario] [Logout] │
└─────────────────────────────────────────────────┘
```

---

### Paso 3: Probar Otorgamiento Automático de XP (3 min)

#### A. Antes del cálculo
1. Anota tu XP actual (visible en el widget del header)
   - Ejemplo: `🌱 Nivel 1 - 45 XP`

#### B. Realizar un cálculo
1. Haz clic en "Registrar Consumo Eléctrico"
2. Completa el formulario:
   ```
   kWh: 100
   País: Chile
   Período: 2025-11
   Electrodomésticos: Refrigerador, Computadora
   ```
3. Haz clic en "Calcular Huella de Carbono"

#### C. Verificaciones
**✅ En Terminal (logs):**
```
XP otorgado exitosamente para cálculo de electricidad - userId: xxxxx
```

**✅ En Navegador:**
- El widget de XP debería actualizarse automáticamente
- Nuevo valor: `🌱 Nivel 1 - 55 XP` (+10 XP)
- La animación del widget debería mostrarse

**✅ En la respuesta del formulario:**
- Deberías ver el resultado del cálculo de CO₂
- El cálculo debería guardarse en el historial

#### D. Repetir con otras categorías
1. Probar con Transporte (+10 XP)
2. Probar con Residuos (+10 XP)
3. Verificar que cada cálculo otorga 10 XP

**🎯 Resultado esperado:** Después de 3 cálculos → +30 XP total

---

### Paso 4: Probar Sistema de Misiones (5 min)

#### A. Ver misiones disponibles
1. Haz clic en "🎯 Misiones" en el header
2. Deberías ver dos columnas:
   ```
   ┌────────────────────┬──────────────────────────────┐
   │  Perfil Gamif.     │  Misiones Activas/Disponibles│
   │                    │                              │
   │  🌱 Nivel 1        │  📋 Misiones Activas (0)    │
   │  45 XP             │  ╔════════════════════╗       │
   │  ▓▓░░░░ 45%        │  ║ Misión Fácil       ║       │
   │                    │  ║ Reducir 5kg CO₂    ║       │
   │  🔥 Racha: 1       │  ║ Recompensa: 50 XP  ║       │
   │  🏆 Mejor: 3       │  ║ [Aceptar Misión]   ║       │
   │                    │  ╚════════════════════╝       │
   │  📊 Estadísticas   │                              │
   │  Misiones: 0/12    │  📋 Misiones Disponibles     │
   │  XP Mensual: 45    │  [Lista de misiones...]      │
   └────────────────────┴──────────────────────────────┘
   ```

#### B. Aceptar una misión
1. Busca una misión de tipo FREQUENCY (ej: "Calcula 3 veces esta semana")
2. Haz clic en "Aceptar Misión"
3. **Verificar:**
   - ✅ La misión se mueve a "Misiones Activas"
   - ✅ Aparece una barra de progreso (0%)
   - ✅ Botón cambia a "Completar" (deshabilitado)

#### C. Completar la misión
1. Vuelve al Dashboard (botón "← Volver")
2. Realiza 3 cálculos (cualquier categoría)
3. Vuelve a "🎯 Misiones"
4. **Verificar:**
   - ✅ Barra de progreso: 33% → 66% → 100%
   - ✅ Badge de estado: "En Progreso" → "Completada"
   - ✅ Botón "Completar" se habilita

#### D. Reclamar recompensa
1. Haz clic en "Completar" en la misión al 100%
2. **Verificar:**
   - ✅ Alert/Toast: "¡Misión completada! 🎉 XP otorgado."
   - ✅ Tu XP aumenta (verificar en widget del header)
   - ✅ Misión desaparece de activas

**🎯 Resultado esperado:** Misión completada + XP bonus recibido

---

### Paso 5: Probar Leaderboard (2 min)

#### A. Abrir leaderboard
1. Haz clic en "🏆 Ranking" en el header
2. Deberías ver una tabla:
   ```
   ┌──────┬──────────┬────────────┬──────────┬────────┐
   │ Pos. │ Usuario  │ CO₂ Evit.  │ Misiones │   XP   │
   ├──────┼──────────┼────────────┼──────────┼────────┤
   │  🥇  │ usuario1 │ 125.5 kg   │    8     │  450   │
   │  🥈  │ usuario2 │  98.2 kg   │    6     │  320   │
   │  🥉  │ usuario3 │  75.0 kg   │    4     │  280   │
   │   4  │ tú ←---- │  25.0 kg   │    1     │   95   │ ← Destacado
   │   5  │ usuario5 │  12.5 kg   │    0     │   50   │
   └──────┴──────────┴────────────┴──────────┴────────┘
   ```

#### B. Verificaciones
**✅ Datos correctos:**
- CO₂ evitado coincide con tus cálculos
- Número de misiones completadas es correcto
- XP total es correcto

**✅ Funcionalidades:**
- Top 3 tiene medallas (🥇🥈🥉)
- Tu fila está destacada (background diferente)
- Usuarios ordenados por CO₂ evitado (DESC)

#### C. Selector de semanas (si está visible)
1. Cambiar a semana anterior
2. Ver ranking histórico
3. Volver a semana actual

**🎯 Resultado esperado:** Leaderboard muestra datos correctos y actualizados

---

### Paso 6: Verificar Perfil Completo (2 min)

#### A. Desde la vista de Misiones
1. Ir a "🎯 Misiones"
2. En el panel izquierdo (Perfil de Gamificación):

**✅ Verificar:**
- **Nivel y emoji:**
  - Nivel 1-2: 🌱 Aprendiz Verde
  - Nivel 3-5: 🛡️ Guardián Eco
  - Nivel 6-9: ⚡ Héroe Verde
  - Nivel 10-15: 🏆 Maestro Eco
  - Nivel 16+: 👑 Leyenda Verde

- **XP y progreso:**
  - XP actual es correcto
  - Barra de progreso al siguiente nivel
  - XP faltante para subir de nivel

- **Racha semanal:**
  - 🔥 Racha actual (semanas consecutivas con actividad)
  - 🏆 Mejor racha histórica

- **Estadísticas:**
  - Misiones completadas / Total
  - XP ganado este mes
  - Total de cálculos realizados

**🎯 Resultado esperado:** Todos los datos coinciden con tu actividad real

---

## 🔧 OPCIÓN 2: Testing con API (Avanzado)

### Preparación

1. **Obtener token JWT:**
   ```bash
   # En navegador (después de login):
   # DevTools (F12) → Application → Local Storage → http://localhost:3000
   # Copiar valor de 'token'
   ```

2. **Ejecutar script de testing:**
   ```bash
   ./test-gamification-api.sh "TU_TOKEN_JWT_AQUI"
   ```

### Tests Incluidos

El script prueba automáticamente:

1. **GET /gam/xp-balance** - Balance de XP del usuario
   ```json
   {
     "userId": "...",
     "totalXp": 95,
     "currentLevel": 1,
     "currentLevelTitle": "🌱 Aprendiz Verde",
     "xpForNextLevel": 100,
     "xpProgress": 95
   }
   ```

2. **GET /gam/missions** - Misiones de la semana
   ```json
   [
     {
       "id": 1,
       "title": "Primera Medición",
       "category": "GENERAL",
       "missionType": "DISCOVERY",
       "difficulty": "EASY",
       "xpReward": 50,
       "weekNumber": "2025-W48"
     }
   ]
   ```

3. **GET /gam/missions/my-progress** - Progreso de misiones
   ```json
   {
     "activeMissions": [...],
     "completedMissions": [...],
     "availableMissions": [...]
   }
   ```

4. **GET /gam/leaderboard** - Ranking semanal
   ```json
   {
     "entries": [
       {
         "rank": 1,
         "username": "usuario1",
         "co2AvoidedKg": 125.5,
         "missionsCompleted": 8,
         "totalXp": 450
       }
     ]
   }
   ```

5. **GET /gam/streaks** - Rachas del usuario
   ```json
   {
     "currentWeekStreak": 1,
     "bestWeekStreak": 3,
     "streakMultiplier": 1.0
   }
   ```

**🎯 Resultado esperado:** Todos los endpoints responden 200 OK con datos válidos

---

## ⏰ OPCIÓN 3: Testing de Tareas Programadas

### Método 1: Modo Desarrollo (RECOMENDADO para testing)

#### A. Habilitar generación cada 5 minutos

1. **Editar archivo:**
   ```bash
   # ecoestudiante-api/src/main/java/com/ecoestudiante/gamification/GamificationScheduledTasks.java
   # Líneas 104-119
   ```

2. **Descomentar el método:**
   ```java
   @Scheduled(cron = "0 */5 * * * *") // Cada 5 minutos
   public void generateWeeklyMissionsDevMode() {
     // ... código ...
   }
   ```

3. **Recompilar y reiniciar:**
   ```bash
   # Desde raíz del proyecto
   cd ecoestudiante-api
   ./mvnw clean package -DskipTests
   cd ..
   docker-compose restart api
   ```

4. **Monitorear logs:**
   ```bash
   docker logs -f eco-api | grep "DEV MODE"

   # Deberías ver cada 5 minutos:
   # [DEV MODE] Generando misiones de prueba para semana 2025-W48...
   # [DEV MODE] Misiones generadas: 12
   ```

#### B. Verificar misiones generadas

1. **Opción A - Frontend:**
   - Ir a "🎯 Misiones"
   - Deberías ver nuevas misiones cada 5 minutos

2. **Opción B - API:**
   ```bash
   ./test-gamification-api.sh "TU_TOKEN" | jq '.[] | .title'
   ```

3. **Opción C - Base de datos:**
   ```bash
   # pgAdmin → Query Tool
   SELECT COUNT(*), week_number
   FROM missions
   WHERE is_template = false
   GROUP BY week_number
   ORDER BY week_number DESC;
   ```

**🎯 Resultado esperado:** Nuevas misiones aparecen cada 5 minutos

---

### Método 2: Esperar al Lunes 00:00

Si prefieres probar el comportamiento real:

1. **Configuración actual:**
   - Generación: Lunes 00:00 (America/Santiago)
   - Expiración: Lunes 00:05 (America/Santiago)

2. **Monitorear logs el próximo lunes:**
   ```bash
   # Dejar corriendo toda la noche del domingo
   docker logs -f eco-api | tee gamification-scheduled.log
   ```

3. **Logs esperados:**
   ```
   2025-11-30 00:00:00 ========================================
   2025-11-30 00:00:00 Iniciando generación automática de misiones semanales
   2025-11-30 00:00:00 Semana: 2025-W48
   2025-11-30 00:00:00 ========================================
   2025-11-30 00:00:15 Generación de misiones completada exitosamente
   2025-11-30 00:00:15 Total de misiones generadas: 12
   2025-11-30 00:00:15 ========================================

   2025-11-30 00:05:00 ========================================
   2025-11-30 00:05:00 Marcando misiones de la semana pasada como expiradas
   2025-11-30 00:05:00 Semana: 2025-W47
   2025-11-30 00:05:00 ========================================
   2025-11-30 00:05:05 Expiración de misiones completada
   2025-11-30 00:05:05 Total de misiones expiradas: 8
   2025-11-30 00:05:05 ========================================
   ```

**🎯 Resultado esperado:** Tasks se ejecutan automáticamente a la hora programada

---

## 💾 OPCIÓN 4: Verificación en Base de Datos

### Acceso a pgAdmin

```
URL: http://localhost:5050
Email: admin@ecoestudiante.com
Password: admin123

Servidor: PostgreSQL
Host: postgres
Port: 5432
Database: ecoestudiante
Username: ecoestudiante
Password: ecoestudiante123
```

### Queries de Verificación

Usa el archivo `test-scheduled-jobs.sql` que incluye:

1. ✅ Ver misiones de la semana actual
2. ✅ Ver cuántas misiones hay por semana
3. ✅ Ver templates disponibles
4. ✅ Ver progreso de misiones de un usuario
5. ✅ Estadísticas de XP de usuarios
6. ✅ Ver últimas transacciones de XP
7. ✅ Ver leaderboard actual

**Ejemplo de ejecución:**
```sql
-- 1. Ver tus transacciones de XP recientes
SELECT
    xt.xp_amount,
    xt.source,
    xt.description,
    xt.created_at
FROM xp_transactions xt
WHERE xt.user_id = 'TU_USER_ID'
ORDER BY xt.created_at DESC
LIMIT 10;

-- Deberías ver:
-- +10 | CALCULATION | Cálculo de electricidad | 2025-11-30 14:30:00
-- +10 | CALCULATION | Cálculo de transporte   | 2025-11-30 14:25:00
-- +50 | MISSION     | Misión completada: ...  | 2025-11-30 14:20:00
```

---

## 📊 OPCIÓN 5: Monitoreo en Tiempo Real

### Script de Monitoreo

```bash
./monitor-gamification.sh
```

Este script filtra los logs del API para mostrar solo eventos de gamificación:
- ✅ XP otorgado
- ✅ Generación de misiones
- ✅ Expiración de misiones
- ✅ Completitud de misiones
- ✅ Errores relacionados

### Uso Recomendado

**Terminal 1 (Monitoreo):**
```bash
./monitor-gamification.sh
```

**Terminal 2 (Uso de la app):**
```bash
# Abrir navegador y usar la aplicación
# Los logs aparecerán en Terminal 1
```

**Logs Esperados:**

Cuando haces un cálculo:
```
2025-11-30 14:30:15 DEBUG CalcServiceImpl - XP otorgado exitosamente para cálculo de electricidad - userId: abc123
```

Cuando completas una misión:
```
2025-11-30 14:35:20 INFO MissionServiceImpl - Misión completada automáticamente - missionId: 5, userId: abc123
```

Cuando se generan misiones (lunes 00:00):
```
2025-12-02 00:00:05 INFO GamificationScheduledTasks - Generación de misiones completada exitosamente
2025-12-02 00:00:05 INFO GamificationScheduledTasks - Total de misiones generadas: 12
```

---

## ✅ Checklist de Validación

Marca cada item cuando lo hayas probado exitosamente:

### Funcionalidades Core
- [ ] Otorgamiento automático de XP (+10 por cálculo)
- [ ] XP visible en widget del header
- [ ] Actualización en tiempo real del XP
- [ ] Cálculo correcto de nivel según XP

### Sistema de Misiones
- [ ] Ver misiones disponibles de la semana
- [ ] Aceptar una misión
- [ ] Ver progreso de misión en tiempo real
- [ ] Completar una misión automáticamente
- [ ] Recibir XP de recompensa por misión
- [ ] Ver misiones activas vs completadas

### Leaderboard
- [ ] Ver ranking de usuarios
- [ ] Top 3 con medallas
- [ ] Mi posición destacada
- [ ] Datos correctos (CO₂, misiones, XP)
- [ ] Ordenamiento correcto

### Perfil de Gamificación
- [ ] Nivel y título correctos
- [ ] Emoji según nivel
- [ ] Barra de progreso al siguiente nivel
- [ ] Racha semanal
- [ ] Mejor racha histórica
- [ ] Estadísticas correctas

### Tareas Programadas (si probaste)
- [ ] Generación automática de misiones
- [ ] Expiración de misiones antiguas
- [ ] Logs informativos visibles
- [ ] Sin errores en ejecución

### Integración
- [ ] Frontend y backend comunicados correctamente
- [ ] Sin errores en consola del navegador
- [ ] Sin errores en logs del API
- [ ] Transiciones suaves entre vistas

---

## 🐛 Troubleshooting

### Problema: No se otorga XP al hacer un cálculo

**Verificar:**
1. Logs del API: `docker logs eco-api | grep "XP otorgado"`
2. Si aparece error: verificar que GamificationService está funcionando
3. Verificar en BD que existe el perfil de gamificación:
   ```sql
   SELECT * FROM gamification_profiles WHERE user_id = 'TU_USER_ID';
   ```
4. Si no existe, debería crearse automáticamente al primer login

**Solución:**
```sql
-- Crear perfil manualmente si no existe
INSERT INTO gamification_profiles (user_id, total_xp, current_level)
VALUES ('TU_USER_ID', 0, 1)
ON CONFLICT (user_id) DO NOTHING;
```

---

### Problema: No veo misiones disponibles

**Verificar:**
1. Si existen misiones en BD:
   ```sql
   SELECT COUNT(*) FROM missions
   WHERE week_number = TO_CHAR(CURRENT_DATE, 'IYYY-IW')
   AND is_template = false;
   ```

2. Si el resultado es 0, generar manualmente:
   - Descomentar método de desarrollo en `GamificationScheduledTasks.java`
   - Reiniciar API: `docker-compose restart api`
   - Esperar 5 minutos

**Alternativa:**
- Esperar al próximo lunes 00:00 para generación automática

---

### Problema: Leaderboard vacío o incorrecto

**Verificar:**
1. Cache de leaderboard:
   ```sql
   SELECT * FROM leaderboard_cache
   WHERE week_number = TO_CHAR(CURRENT_DATE, 'IYYY-IW');
   ```

2. Si está vacío, recalcular manualmente:
   ```bash
   curl -X POST "http://localhost:8888/api/v1/gam/leaderboard/recalculate" \
     -H "Authorization: Bearer TU_TOKEN"
   ```

---

### Problema: Scheduled tasks no se ejecutan

**Verificar:**
1. Que `@EnableScheduling` esté en `App.java`
2. Logs de Spring Boot al inicio:
   ```bash
   docker logs eco-api | grep "Scheduling"
   # Debería ver: "No scheduled tasks have been registered" o lista de tasks
   ```

3. Zona horaria del contenedor:
   ```bash
   docker exec eco-api date
   # Verificar que la hora sea correcta
   ```

**Solución:**
- Reiniciar API después de cambios en código scheduled

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs:**
   ```bash
   docker logs eco-api > api-logs.txt
   docker logs eco-gateway > gateway-logs.txt
   ```

2. **Verificar estado de servicios:**
   ```bash
   docker-compose ps
   docker stats --no-stream
   ```

3. **Reiniciar servicios:**
   ```bash
   docker-compose restart api gateway
   ```

---

## 🎓 Conclusión

Después de completar esta guía de testing, habrás verificado que:

✅ El módulo de gamificación funciona al 100%
✅ XP se otorga automáticamente
✅ Misiones se generan y expiran automáticamente
✅ Leaderboard muestra datos correctos
✅ Frontend está integrado correctamente
✅ Sistema es autónomo y no requiere intervención manual

---

**Happy Testing! 🚀**

*Generado por: Claude Code*
*Fecha: 30 de Noviembre, 2025*
