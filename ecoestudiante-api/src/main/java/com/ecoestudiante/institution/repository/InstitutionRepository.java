package com.ecoestudiante.institution.repository;

import com.ecoestudiante.institution.model.Institution;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class InstitutionRepository {

    private final JdbcTemplate jdbc;

    public InstitutionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Institution> findAll() {
        String sql = """
            SELECT id, name, type, code, website, email, phone, address, city, region, country,
                   enabled, created_at, updated_at, created_by, updated_by
            FROM institution
            ORDER BY name
            """;
        return jdbc.query(sql, institutionRowMapper());
    }

    public List<Institution> findAll(int page, int size, String search, Institution.InstitutionType type, Boolean enabled) {
        int offset = page * size;
        StringBuilder sql = new StringBuilder("""
            SELECT id, name, type, code, website, email, phone, address, city, region, country,
                   enabled, created_at, updated_at, created_by, updated_by
            FROM institution
            WHERE 1=1
            """);
        
        List<Object> params = new java.util.ArrayList<>();
        
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(name) LIKE LOWER(?) OR LOWER(code) LIKE LOWER(?))");
            String searchPattern = "%" + search + "%";
            params.add(searchPattern);
            params.add(searchPattern);
        }
        
        if (type != null) {
            sql.append(" AND type = CAST(? AS institution_type)");
            params.add(type.name());
        }
        
        if (enabled != null) {
            sql.append(" AND enabled = ?");
            params.add(enabled);
        }
        
        // Asegurar espacio antes de ORDER BY
        sql.append(" ");
        sql.append("ORDER BY name LIMIT ? OFFSET ?");
        params.add(size);
        params.add(offset);
        
        return jdbc.query(sql.toString(), params.toArray(), institutionRowMapper());
    }

    public Long count(String search, Institution.InstitutionType type, Boolean enabled) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM institution WHERE 1=1");
        List<Object> params = new java.util.ArrayList<>();
        
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(name) LIKE LOWER(?) OR LOWER(code) LIKE LOWER(?))");
            String searchPattern = "%" + search + "%";
            params.add(searchPattern);
            params.add(searchPattern);
        }
        
        if (type != null) {
            sql.append(" AND type = CAST(? AS institution_type)");
            params.add(type.name());
        }
        
        if (enabled != null) {
            sql.append(" AND enabled = ?");
            params.add(enabled);
        }
        
        Long result = jdbc.queryForObject(sql.toString(), params.toArray(), Long.class);
        return result != null ? result : 0L;
    }

    public Optional<Institution> findById(UUID id) {
        String sql = """
            SELECT id, name, type, code, website, email, phone, address, city, region, country,
                   enabled, created_at, updated_at, created_by, updated_by
            FROM institution
            WHERE id = ?
            """;
        try {
            Institution institution = jdbc.queryForObject(sql, institutionRowMapper(), id);
            return Optional.ofNullable(institution);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Institution> findByCode(String code) {
        String sql = """
            SELECT id, name, type, code, website, email, phone, address, city, region, country,
                   enabled, created_at, updated_at, created_by, updated_by
            FROM institution
            WHERE code = ?
            """;
        try {
            Institution institution = jdbc.queryForObject(sql, institutionRowMapper(), code);
            return Optional.ofNullable(institution);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Institution save(Institution institution) {
        if (institution.getId() == null) {
            // Insert
            UUID id = UUID.randomUUID();
            String sql = """
                INSERT INTO institution (id, name, type, code, website, email, phone, address, city, region, country,
                                       enabled, created_at, updated_at, created_by, updated_by)
                VALUES (?, ?, ?::institution_type, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), ?, ?)
                """;
            jdbc.update(sql,
                id,
                institution.getName(),
                institution.getType().name(),
                institution.getCode(),
                institution.getWebsite(),
                institution.getEmail(),
                institution.getPhone(),
                institution.getAddress(),
                institution.getCity(),
                institution.getRegion(),
                institution.getCountry() != null ? institution.getCountry() : "Chile",
                institution.isEnabled(),
                institution.getCreatedBy(),
                institution.getUpdatedBy()
            );
            institution.setId(id);
            return institution;
        } else {
            // Update
            String sql = """
                UPDATE institution
                SET name = ?, type = ?::institution_type, code = ?, website = ?, email = ?, phone = ?,
                    address = ?, city = ?, region = ?, country = ?, enabled = ?, updated_at = now(), updated_by = ?
                WHERE id = ?
                """;
            jdbc.update(sql,
                institution.getName(),
                institution.getType().name(),
                institution.getCode(),
                institution.getWebsite(),
                institution.getEmail(),
                institution.getPhone(),
                institution.getAddress(),
                institution.getCity(),
                institution.getRegion(),
                institution.getCountry(),
                institution.isEnabled(),
                institution.getUpdatedBy(),
                institution.getId()
            );
            return institution;
        }
    }

    public void deleteById(UUID id) {
        // Soft delete: deshabilitar en lugar de eliminar
        String sql = "UPDATE institution SET enabled = false, updated_at = now() WHERE id = ?";
        jdbc.update(sql, id);
    }

    public int countCampusByInstitutionId(UUID institutionId) {
        String sql = "SELECT COUNT(*) FROM campus WHERE institution_id = ? AND enabled = true";
        Integer count = jdbc.queryForObject(sql, Integer.class, institutionId);
        return count != null ? count : 0;
    }

    private RowMapper<Institution> institutionRowMapper() {
        return (rs, rowNum) -> {
            Institution institution = new Institution();
            institution.setId(UUID.fromString(rs.getString("id")));
            institution.setName(rs.getString("name"));
            institution.setType(Institution.InstitutionType.valueOf(rs.getString("type")));
            institution.setCode(rs.getString("code"));
            institution.setWebsite(rs.getString("website"));
            institution.setEmail(rs.getString("email"));
            institution.setPhone(rs.getString("phone"));
            institution.setAddress(rs.getString("address"));
            institution.setCity(rs.getString("city"));
            institution.setRegion(rs.getString("region"));
            institution.setCountry(rs.getString("country"));
            institution.setEnabled(rs.getBoolean("enabled"));
            
            Timestamp createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                institution.setCreatedAt(createdAt.toLocalDateTime());
            }
            
            Timestamp updatedAt = rs.getTimestamp("updated_at");
            if (updatedAt != null) {
                institution.setUpdatedAt(updatedAt.toLocalDateTime());
            }
            
            String createdBy = rs.getString("created_by");
            if (createdBy != null) {
                institution.setCreatedBy(UUID.fromString(createdBy));
            }
            
            String updatedBy = rs.getString("updated_by");
            if (updatedBy != null) {
                institution.setUpdatedBy(UUID.fromString(updatedBy));
            }
            
            return institution;
        };
    }
}
