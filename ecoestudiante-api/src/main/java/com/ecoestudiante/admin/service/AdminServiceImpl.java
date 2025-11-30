package com.ecoestudiante.admin.service;

import com.ecoestudiante.admin.dto.AdminDtos;
import com.ecoestudiante.auth.AppUser;
import com.ecoestudiante.auth.UserRepository;
import com.ecoestudiante.gamification.model.GamificationProfile;
import com.ecoestudiante.gamification.model.MissionProgress;
import com.ecoestudiante.gamification.repository.GamificationProfileRepository;
import com.ecoestudiante.gamification.repository.MissionProgressRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminServiceImpl.class);

    private final UserRepository userRepository;
    private final GamificationProfileRepository gamificationProfileRepository;
    private final MissionProgressRepository missionProgressRepository;
    private final JdbcTemplate jdbcTemplate;

    public AdminServiceImpl(
            UserRepository userRepository,
            GamificationProfileRepository gamificationProfileRepository,
            MissionProgressRepository missionProgressRepository,
            JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.gamificationProfileRepository = gamificationProfileRepository;
        this.missionProgressRepository = missionProgressRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public AdminDtos.DashboardOverview getDashboardOverview() {
        logger.info("Obteniendo resumen del dashboard de administración");

        // Total de estudiantes
        Long totalStudents = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM app_user WHERE enabled = true",
            Long.class
        );
        if (totalStudents == null) totalStudents = 0L;

        // Estudiantes activos (últimos 30 días)
        Long activeStudents = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(DISTINCT user_id) 
            FROM calculation 
            WHERE created_at >= NOW() - INTERVAL '30 days'
            """,
            Long.class
        );
        if (activeStudents == null) activeStudents = 0L;

        // Total de cálculos
        Long totalCalculations = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM calculation",
            Long.class
        );
        if (totalCalculations == null) totalCalculations = 0L;

        // Total de misiones completadas
        Long totalMissionsCompleted = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM mission_progress WHERE status = 'COMPLETED'",
            Long.class
        );
        if (totalMissionsCompleted == null) totalMissionsCompleted = 0L;

        // Total CO2
        Double totalKgCO2e;
        try {
            totalKgCO2e = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation",
                Double.class
            );
        } catch (Exception e) {
            logger.warn("Error obteniendo total CO2: {}", e.getMessage());
            totalKgCO2e = 0.0;
        }

        // Promedio de cálculos por estudiante
        Double avgCalculations = totalStudents > 0 ? 
            (double) totalCalculations / totalStudents : 0.0;

        // Tasa de participación
        Double participationRate = totalStudents > 0 ?
            (activeStudents.doubleValue() / totalStudents) * 100 : 0.0;

        // Top carreras
        List<AdminDtos.CareerStats> topCareers;
        try {
            topCareers = getTopCareers(5);
        } catch (Exception e) {
            logger.warn("Error obteniendo top carreras: {}", e.getMessage());
            topCareers = new ArrayList<>();
        }

        // Estadísticas mensuales
        AdminDtos.TimeSeriesStats monthlyStats;
        try {
            monthlyStats = getMonthlyStats(12);
        } catch (Exception e) {
            logger.warn("Error obteniendo estadísticas mensuales: {}", e.getMessage());
            monthlyStats = new AdminDtos.TimeSeriesStats(new ArrayList<>(), "month");
        }

        return new AdminDtos.DashboardOverview(
            totalStudents,
            activeStudents,
            totalCalculations,
            totalMissionsCompleted,
            totalKgCO2e != null ? totalKgCO2e : 0.0,
            avgCalculations,
            participationRate,
            topCareers,
            monthlyStats
        );
    }

    @Override
    public AdminDtos.StudentsListResponse getStudents(Integer page, Integer pageSize, String search, String career) {
        logger.info("Obteniendo lista de estudiantes - página: {}, tamaño: {}", page, pageSize);

        int offset = (page - 1) * pageSize;
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (search != null && !search.isEmpty()) {
            conditions.add("(LOWER(u.username) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))");
            String searchPattern = "%" + search + "%";
            params.add(searchPattern);
            params.add(searchPattern);
        }

        if (career != null && !career.isEmpty() && !career.equals("Todas")) {
            conditions.add("u.carrera = ?");
            params.add(career);
        }

        String whereClause = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        // Contar total
        String countSql = "SELECT COUNT(*) FROM app_user u" + whereClause;
        Long total = jdbcTemplate.queryForObject(countSql, params.toArray(), Long.class);
        if (total == null) total = 0L;

        // Obtener estudiantes
        String sql = """
            SELECT u.id, u.username, u.email, u.carrera, u.jornada, u.enabled,
                   COUNT(DISTINCT ch.id) as total_calculations,
                   COUNT(DISTINCT CASE WHEN mp.status = 'COMPLETED' THEN mp.id END) as completed_missions,
                   COUNT(DISTINCT mp.id) as total_missions,
                   COALESCE(gp.total_xp, 0) as xp_balance,
                   MAX(ch.created_at) as last_activity
            FROM app_user u
            LEFT JOIN calculation ch ON u.id = ch.user_id
            LEFT JOIN mission_progress mp ON u.id = mp.user_id
            LEFT JOIN gamification_profiles gp ON u.id = gp.user_id
            """ + whereClause + """
            GROUP BY u.id, u.username, u.email, u.carrera, u.jornada, u.enabled, gp.total_xp
            ORDER BY last_activity DESC NULLS LAST, u.username
            LIMIT ? OFFSET ?
            """;

        params.add(pageSize);
        params.add(offset);

        List<AdminDtos.StudentSummary> students = jdbcTemplate.query(sql, params.toArray(), (rs, rowNum) -> {
            UUID id = UUID.fromString(rs.getString("id"));
            return new AdminDtos.StudentSummary(
                id,
                rs.getString("username"),
                rs.getString("email"),
                rs.getString("carrera"),
                rs.getString("jornada"),
                rs.getLong("total_calculations"),
                rs.getLong("completed_missions"),
                rs.getLong("total_missions"),
                rs.getInt("xp_balance"),
                rs.getTimestamp("last_activity") != null ?
                    rs.getTimestamp("last_activity").toLocalDateTime() : null,
                rs.getBoolean("enabled")
            );
        });

        return new AdminDtos.StudentsListResponse(students, total, page, pageSize);
    }

    @Override
    public Optional<AdminDtos.StudentDetail> getStudentDetail(UUID studentId) {
        logger.info("Obteniendo detalle del estudiante: {}", studentId);

        // Obtener usuario directamente desde DB
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada, 
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, created_at
            FROM app_user
            WHERE id = ?
            """;
        
        AppUser user;
        try {
            user = jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                AppUser u = new AppUser();
                u.setId(UUID.fromString(rs.getString("id")));
                u.setUsername(rs.getString("username"));
                u.setEmail(rs.getString("email"));
                u.setPasswordHash(rs.getString("password_hash"));
                u.setEnabled(rs.getBoolean("enabled"));
                u.setCarrera(rs.getString("carrera"));
                u.setJornada(rs.getString("jornada"));
                u.setEmailVerified(rs.getBoolean("email_verified"));
                u.setAuthProvider(rs.getString("auth_provider") != null ? rs.getString("auth_provider") : "local");
                return u;
            }, studentId.toString());
        } catch (Exception e) {
            logger.warn("Usuario no encontrado: {}", studentId);
            return Optional.empty();
        }

        if (user == null) {
            return Optional.empty();
        }
        Optional<GamificationProfile> profileOpt = gamificationProfileRepository.findByUserId(studentId);

        // Estadísticas
        Long totalCalculations = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM calculation WHERE user_id = ?",
            Long.class,
            studentId.toString()
        );
        if (totalCalculations == null) totalCalculations = 0L;

        Long completedMissions = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM mission_progress WHERE user_id = ? AND status = 'COMPLETED'",
            Long.class,
            studentId.toString()
        );
        if (completedMissions == null) completedMissions = 0L;

        Long totalMissions = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM mission_progress WHERE user_id = ?",
            Long.class,
            studentId.toString()
        );
        if (totalMissions == null) totalMissions = 0L;

        Integer xpBalance = profileOpt.map(p -> p.getTotalXp() != null ? p.getTotalXp().intValue() : 0).orElse(0);
        Integer level = calculateLevel(xpBalance);

        Double totalKgCO2e;
        try {
            totalKgCO2e = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation WHERE user_id = ?",
                Double.class,
                studentId.toString()
            );
        } catch (Exception e) {
            logger.warn("Error obteniendo total CO2 para usuario {}: {}", studentId, e.getMessage());
            totalKgCO2e = 0.0;
        }

        AdminDtos.StudentStats stats = new AdminDtos.StudentStats(
            totalCalculations,
            completedMissions,
            totalMissions,
            xpBalance,
            level,
            totalKgCO2e != null ? totalKgCO2e : 0.0
        );

        // Últimos cálculos
        List<AdminDtos.RecentCalculation> recentCalculations;
        try {
            recentCalculations = jdbcTemplate.query(
                """
                SELECT id, category, NULL as subcategory, result_kg_co2e, created_at
                FROM calculation
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (rs, rowNum) -> {
                    try {
                        return new AdminDtos.RecentCalculation(
                            rs.getString("id"),
                            rs.getString("category"),
                            rs.getString("subcategory"), // NULL ya que no existe en la tabla
                            rs.getDouble("result_kg_co2e"),
                            rs.getTimestamp("created_at") != null ?
                                rs.getTimestamp("created_at").toLocalDateTime() :
                                LocalDateTime.now()
                        );
                    } catch (Exception e) {
                        logger.warn("Error procesando cálculo reciente: {}", e.getMessage());
                        return null;
                    }
                },
                studentId.toString()
            );
            if (recentCalculations == null) {
                recentCalculations = new ArrayList<>();
            } else {
                // Filtrar nulls si hay errores en el procesamiento
                recentCalculations = recentCalculations.stream()
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            logger.warn("Error obteniendo cálculos recientes: {}", e.getMessage());
            recentCalculations = new ArrayList<>();
        }

        // Progreso en misiones (simplificado - obtener desde DB directamente)
        List<AdminDtos.MissionProgress> missionProgressList;
        try {
            missionProgressList = jdbcTemplate.query(
                """
                SELECT mp.id, mp.mission_id, m.title, mp.status, mp.current_progress, mp.target_progress,
                       mp.started_at as assigned_at, mp.completed_at
                FROM mission_progress mp
                JOIN missions m ON mp.mission_id = m.id
                WHERE mp.user_id = ?
                ORDER BY mp.started_at DESC
                LIMIT 10
                """,
                (rs, rowNum) -> {
                    try {
                        String missionIdStr = String.valueOf(rs.getLong("mission_id"));
                        return new AdminDtos.MissionProgress(
                            missionIdStr,
                            rs.getString("title"),
                            rs.getString("status"),
                            (int) rs.getDouble("current_progress"),
                            (int) rs.getDouble("target_progress"),
                            rs.getTimestamp("assigned_at") != null ?
                                rs.getTimestamp("assigned_at").toLocalDateTime() : null,
                            rs.getTimestamp("completed_at") != null ?
                                rs.getTimestamp("completed_at").toLocalDateTime() : null
                        );
                    } catch (Exception e) {
                        logger.warn("Error procesando progreso de misión: {}", e.getMessage());
                        return null;
                    }
                },
                studentId.toString()
            );
            if (missionProgressList == null) {
                missionProgressList = new ArrayList<>();
            } else {
                // Filtrar nulls si hay errores en el procesamiento
                missionProgressList = missionProgressList.stream()
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            logger.warn("Error obteniendo progreso de misiones: {}", e.getMessage());
            missionProgressList = new ArrayList<>();
        }

        LocalDateTime lastActivity;
        try {
            lastActivity = jdbcTemplate.queryForObject(
                "SELECT MAX(created_at) FROM calculation WHERE user_id = ?",
                LocalDateTime.class,
                studentId.toString()
            );
        } catch (Exception e) {
            lastActivity = null;
        }

        LocalDateTime createdAt;
        try {
            createdAt = jdbcTemplate.queryForObject(
                "SELECT created_at FROM app_user WHERE id = ?",
                LocalDateTime.class,
                studentId.toString()
            );
        } catch (Exception e) {
            createdAt = null;
        }

        AdminDtos.StudentDetail detail = new AdminDtos.StudentDetail(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getCarrera(),
            user.getJornada(),
            user.isEmailVerified(),
            user.isEnabled(),
            user.getAuthProvider() != null ? user.getAuthProvider() : "local",
            createdAt,
            lastActivity,
            stats,
            recentCalculations,
            missionProgressList
        );

        return Optional.of(detail);
    }

    @Override
    public List<AdminDtos.CareerStats> getStatisticsByCareer(String career, Integer year) {
        String sql = """
            SELECT u.carrera,
                   COUNT(DISTINCT u.id) as student_count,
                   COUNT(DISTINCT ch.id) as total_calculations,
                   COALESCE(AVG(calc_count), 0) as avg_calculations,
                   COALESCE(SUM(ch.result_kg_co2e), 0) as total_co2
            FROM app_user u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as calc_count
                FROM calculation
                GROUP BY user_id
            ) calc_stats ON u.id = calc_stats.user_id
            LEFT JOIN calculation ch ON u.id = ch.user_id
            WHERE u.carrera IS NOT NULL
            """ + (career != null && !career.isEmpty() && !career.equals("Todas") ?
                " AND u.carrera = ?" : "") + """
            GROUP BY u.carrera
            ORDER BY total_calculations DESC
            """;

        List<Object> params = new ArrayList<>();
        if (career != null && !career.isEmpty() && !career.equals("Todas")) {
            params.add(career);
        }

        return jdbcTemplate.query(
            sql,
            params.toArray(),
            (rs, rowNum) -> new AdminDtos.CareerStats(
                rs.getString("carrera"),
                rs.getLong("student_count"),
                rs.getLong("total_calculations"),
                rs.getDouble("avg_calculations"),
                rs.getDouble("total_co2")
            )
        );
    }

    @Override
    public AdminDtos.TimeSeriesStats getTimeSeriesStatistics(Integer year) {
        String sql = """
            SELECT DATE_TRUNC('month', created_at) as month,
                   COUNT(*) as count,
                   COALESCE(SUM(result_kg_co2e), 0) as total_co2
            FROM calculation
            WHERE EXTRACT(YEAR FROM created_at) = ?
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month
            """;

        List<AdminDtos.TimePoint> data = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> new AdminDtos.TimePoint(
                rs.getTimestamp("month").toLocalDateTime()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM")),
                rs.getLong("count"),
                rs.getDouble("total_co2")
            ),
            year != null ? year : LocalDateTime.now().getYear()
        );

        return new AdminDtos.TimeSeriesStats(data, "month");
    }

    private List<AdminDtos.CareerStats> getTopCareers(int limit) {
        try {
            String sql = """
                SELECT u.carrera,
                       COUNT(DISTINCT u.id) as student_count,
                       COUNT(DISTINCT ch.id) as total_calculations,
                       COALESCE(AVG(calc_count), 0) as avg_calculations,
                       COALESCE(SUM(ch.result_kg_co2e), 0) as total_co2
                FROM app_user u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) as calc_count
                    FROM calculation
                    GROUP BY user_id
                ) calc_stats ON u.id = calc_stats.user_id
                LEFT JOIN calculation ch ON u.id = ch.user_id
                WHERE u.carrera IS NOT NULL
                GROUP BY u.carrera
                ORDER BY total_calculations DESC
                LIMIT ?
                """;

            List<AdminDtos.CareerStats> result = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new AdminDtos.CareerStats(
                    rs.getString("carrera"),
                    rs.getLong("student_count"),
                    rs.getLong("total_calculations"),
                    rs.getDouble("avg_calculations"),
                    rs.getDouble("total_co2")
                ),
                limit
            );
            return result != null ? result : new ArrayList<>();
        } catch (Exception e) {
            logger.error("Error en getTopCareers: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    private AdminDtos.TimeSeriesStats getMonthlyStats(int months) {
        try {
            // Usar CAST para evitar problemas con INTERVAL en PostgreSQL
            String sql = String.format("""
                SELECT DATE_TRUNC('month', created_at) as month,
                       COUNT(*) as count,
                       COALESCE(SUM(result_kg_co2e), 0) as total_co2
                FROM calculation
                WHERE created_at >= NOW() - INTERVAL '%d months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
                """, months);

            List<AdminDtos.TimePoint> data = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    try {
                        return new AdminDtos.TimePoint(
                            rs.getTimestamp("month").toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("yyyy-MM")),
                            rs.getLong("count"),
                            rs.getDouble("total_co2")
                        );
                    } catch (Exception e) {
                        logger.warn("Error procesando punto de tiempo: {}", e.getMessage());
                        return null;
                    }
                }
            );

            // Filtrar nulls si hay algún error en el procesamiento
            List<AdminDtos.TimePoint> validData = data != null ? 
                data.stream().filter(Objects::nonNull).collect(Collectors.toList()) : 
                new ArrayList<>();

            return new AdminDtos.TimeSeriesStats(validData, "month");
        } catch (Exception e) {
            logger.error("Error en getMonthlyStats: {}", e.getMessage(), e);
            return new AdminDtos.TimeSeriesStats(new ArrayList<>(), "month");
        }
    }

    private Integer calculateLevel(Integer xp) {
        // Nivel = sqrt(XP / 100) + 1
        return (int) Math.floor(Math.sqrt(xp / 100.0)) + 1;
    }
}




