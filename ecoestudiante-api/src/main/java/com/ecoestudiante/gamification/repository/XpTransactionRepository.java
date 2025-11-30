package com.ecoestudiante.gamification.repository;

import com.ecoestudiante.gamification.model.XpTransaction;
import com.ecoestudiante.gamification.model.XpTransaction.XpSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.sql.Timestamp;

/**
 * Repositorio para el acceso a datos de Transacciones de XP.
 *
 * Utiliza JdbcTemplate para operaciones CRUD sobre la tabla xp_transactions.
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Repository
public class XpTransactionRepository {

    private final JdbcTemplate jdbc;

    public XpTransactionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Busca una transacción por ID
     */
    public Optional<XpTransaction> findById(Long id) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE id = ?
                """;

        try {
            XpTransaction transaction = jdbc.queryForObject(sql, transactionRowMapper(), id);
            return Optional.ofNullable(transaction);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Obtiene todas las transacciones de un usuario
     */
    public List<XpTransaction> findByUserId(UUID userId) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                """;

        return jdbc.query(sql, transactionRowMapper(), userId);
    }

    /**
     * Obtiene transacciones de un usuario con paginación
     */
    public List<XpTransaction> findByUserIdPaginated(UUID userId, int limit, int offset) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """;

        return jdbc.query(sql, transactionRowMapper(), userId, limit, offset);
    }

    /**
     * Obtiene transacciones de un usuario por fuente
     */
    public List<XpTransaction> findByUserIdAndSource(UUID userId, XpSource source) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE user_id = ? AND source = ?::xp_source
                ORDER BY created_at DESC
                """;

        return jdbc.query(sql, transactionRowMapper(), userId, source.name());
    }

    /**
     * Obtiene transacciones de un usuario en un rango de fechas
     */
    public List<XpTransaction> findByUserIdBetweenDates(UUID userId, LocalDateTime startDate, LocalDateTime endDate) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE user_id = ?
                  AND created_at BETWEEN ? AND ?
                ORDER BY created_at DESC
                """;

        return jdbc.query(sql, transactionRowMapper(), userId,
                java.sql.Timestamp.valueOf(startDate),
                java.sql.Timestamp.valueOf(endDate));
    }

    /**
     * Calcula el total de XP ganado por un usuario en un rango de fechas
     */
    public Integer sumXpByUserBetweenDates(UUID userId, LocalDateTime startDate, LocalDateTime endDate) {
        String sql = """
                SELECT COALESCE(SUM(amount), 0) FROM xp_transactions
                WHERE user_id = ?
                  AND created_at BETWEEN ? AND ?
                """;

        Integer total = jdbc.queryForObject(sql, Integer.class, userId,
                java.sql.Timestamp.valueOf(startDate),
                java.sql.Timestamp.valueOf(endDate));
        return total != null ? total : 0;
    }

    /**
     * Calcula el total de XP ganado por un usuario por fuente
     */
    public Integer sumXpByUserAndSource(UUID userId, XpSource source) {
        String sql = """
                SELECT COALESCE(SUM(amount), 0) FROM xp_transactions
                WHERE user_id = ? AND source = ?::xp_source
                """;

        Integer total = jdbc.queryForObject(sql, Integer.class, userId, source.name());
        return total != null ? total : 0;
    }

    /**
     * Guarda una nueva transacción de XP
     */
    public XpTransaction save(XpTransaction transaction) {
        String sql = """
                INSERT INTO xp_transactions
                (user_id, amount, source, reference_id, reference_type, description)
                VALUES (?, ?, ?::xp_source, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
            ps.setObject(1, transaction.getUserId());
            ps.setInt(2, transaction.getAmount());
            ps.setString(3, transaction.getSource().name());

            if (transaction.getReferenceId() != null) {
                ps.setLong(4, transaction.getReferenceId());
            } else {
                ps.setNull(4, java.sql.Types.BIGINT);
            }

            if (transaction.getReferenceType() != null) {
                ps.setString(5, transaction.getReferenceType());
            } else {
                ps.setNull(5, java.sql.Types.VARCHAR);
            }

            if (transaction.getDescription() != null) {
                ps.setString(6, transaction.getDescription());
            } else {
                ps.setNull(6, java.sql.Types.VARCHAR);
            }

            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
        transaction.setId(generatedId);

        return findById(generatedId).orElse(transaction);
    }

    /**
     * Obtiene el historial reciente de transacciones (últimas N)
     */
    public List<XpTransaction> findRecentTransactions(UUID userId, int limit) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """;

        return jdbc.query(sql, transactionRowMapper(), userId, limit);
    }

    /**
     * Cuenta el total de transacciones de un usuario
     */
    public int countByUserId(UUID userId) {
        String sql = "SELECT COUNT(*) FROM xp_transactions WHERE user_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    /**
     * Obtiene las últimas transacciones globales (para admin/monitoring)
     */
    public List<XpTransaction> findRecentGlobalTransactions(int limit) {
        String sql = """
                SELECT id, user_id, amount, source, reference_id, reference_type,
                       description, created_at
                FROM xp_transactions
                ORDER BY created_at DESC
                LIMIT ?
                """;

        return jdbc.query(sql, transactionRowMapper(), limit);
    }

    /**
     * Elimina transacciones antiguas (cleanup/maintenance)
     */
    public int deleteOlderThan(LocalDateTime cutoffDate) {
        String sql = "DELETE FROM xp_transactions WHERE created_at < ?";
        return jdbc.update(sql, java.sql.Timestamp.valueOf(cutoffDate));
    }

    /**
     * RowMapper para convertir ResultSet a XpTransaction
     */
    private RowMapper<XpTransaction> transactionRowMapper() {
        return (rs, rowNum) -> {
            XpTransaction transaction = new XpTransaction();

            transaction.setId(rs.getLong("id"));
            transaction.setUserId((UUID) rs.getObject("user_id"));
            transaction.setAmount(rs.getInt("amount"));
            transaction.setSource(XpSource.valueOf(rs.getString("source")));

            long referenceId = rs.getLong("reference_id");
            if (!rs.wasNull()) {
                transaction.setReferenceId(referenceId);
            }

            String referenceType = rs.getString("reference_type");
            if (referenceType != null) {
                transaction.setReferenceType(referenceType);
            }

            String description = rs.getString("description");
            if (description != null) {
                transaction.setDescription(description);
            }

            var createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                transaction.setCreatedAt(createdAt.toLocalDateTime());
            }

            return transaction;
        };
    }
}
