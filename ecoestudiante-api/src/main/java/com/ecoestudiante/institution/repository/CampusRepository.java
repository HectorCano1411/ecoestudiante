package com.ecoestudiante.institution.repository;

import com.ecoestudiante.institution.model.Campus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CampusRepository {

    private final JdbcTemplate jdbc;

    public CampusRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Campus> findAll() {
        String sql = """
            SELECT id, institution_id, name, code, address, city, region, latitude, longitude,
                   phone, email, enabled, created_at, updated_at, created_by, updated_by
            FROM campus
            ORDER BY name
            """;
        return jdbc.query(sql, campusRowMapper());
    }

    public List<Campus> findByInstitutionId(UUID institutionId) {
        String sql = """
            SELECT id, institution_id, name, code, address, city, region, latitude, longitude,
                   phone, email, enabled, created_at, updated_at, created_by, updated_by
            FROM campus
            WHERE institution_id = ?
            ORDER BY name
            """;
        return jdbc.query(sql, campusRowMapper(), institutionId);
    }

    public List<Campus> findAll(int page, int size, UUID institutionId, String search, Boolean enabled) {
        int offset = page * size;
        StringBuilder sql = new StringBuilder("""
            SELECT c.id, c.institution_id, c.name, c.code, c.address, c.city, c.region, 
                   c.latitude, c.longitude, c.phone, c.email, c.enabled, 
                   c.created_at, c.updated_at, c.created_by, c.updated_by
            FROM campus c
            WHERE 1=1
            """);
        
        List<Object> params = new java.util.ArrayList<>();
        
        if (institutionId != null) {
            sql.append(" AND c.institution_id = ?");
            params.add(institutionId);
        }
        
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(c.name) LIKE LOWER(?) OR LOWER(c.code) LIKE LOWER(?))");
            String searchPattern = "%" + search + "%";
            params.add(searchPattern);
            params.add(searchPattern);
        }
        
        if (enabled != null) {
            sql.append(" AND c.enabled = ?");
            params.add(enabled);
        }
        
        sql.append(" ORDER BY c.name LIMIT ? OFFSET ?");
        params.add(size);
        params.add(offset);
        
        return jdbc.query(sql.toString(), params.toArray(), campusRowMapper());
    }

    public Long count(UUID institutionId, String search, Boolean enabled) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM campus WHERE 1=1");
        List<Object> params = new java.util.ArrayList<>();
        
        if (institutionId != null) {
            sql.append(" AND institution_id = ?");
            params.add(institutionId);
        }
        
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(name) LIKE LOWER(?) OR LOWER(code) LIKE LOWER(?))");
            String searchPattern = "%" + search + "%";
            params.add(searchPattern);
            params.add(searchPattern);
        }
        
        if (enabled != null) {
            sql.append(" AND enabled = ?");
            params.add(enabled);
        }
        
        Long result = jdbc.queryForObject(sql.toString(), params.toArray(), Long.class);
        return result != null ? result : 0L;
    }

    public Optional<Campus> findById(UUID id) {
        String sql = """
            SELECT id, institution_id, name, code, address, city, region, latitude, longitude,
                   phone, email, enabled, created_at, updated_at, created_by, updated_by
            FROM campus
            WHERE id = ?
            """;
        try {
            Campus campus = jdbc.queryForObject(sql, campusRowMapper(), id);
            return Optional.ofNullable(campus);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Campus> findByInstitutionIdAndCode(UUID institutionId, String code) {
        String sql = """
            SELECT id, institution_id, name, code, address, city, region, latitude, longitude,
                   phone, email, enabled, created_at, updated_at, created_by, updated_by
            FROM campus
            WHERE institution_id = ? AND code = ?
            """;
        try {
            Campus campus = jdbc.queryForObject(sql, campusRowMapper(), institutionId, code);
            return Optional.ofNullable(campus);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Campus save(Campus campus) {
        if (campus.getId() == null) {
            // Insert
            UUID id = UUID.randomUUID();
            String sql = """
                INSERT INTO campus (id, institution_id, name, code, address, city, region, 
                                   latitude, longitude, phone, email, enabled, created_at, updated_at, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), ?, ?)
                """;
            jdbc.update(sql,
                id,
                campus.getInstitutionId(),
                campus.getName(),
                campus.getCode(),
                campus.getAddress(),
                campus.getCity(),
                campus.getRegion(),
                campus.getLatitude(),
                campus.getLongitude(),
                campus.getPhone(),
                campus.getEmail(),
                campus.isEnabled(),
                campus.getCreatedBy(),
                campus.getUpdatedBy()
            );
            campus.setId(id);
            return campus;
        } else {
            // Update
            String sql = """
                UPDATE campus
                SET name = ?, code = ?, address = ?, city = ?, region = ?, latitude = ?, longitude = ?,
                    phone = ?, email = ?, enabled = ?, updated_at = now(), updated_by = ?
                WHERE id = ?
                """;
            jdbc.update(sql,
                campus.getName(),
                campus.getCode(),
                campus.getAddress(),
                campus.getCity(),
                campus.getRegion(),
                campus.getLatitude(),
                campus.getLongitude(),
                campus.getPhone(),
                campus.getEmail(),
                campus.isEnabled(),
                campus.getUpdatedBy(),
                campus.getId()
            );
            return campus;
        }
    }

    public void deleteById(UUID id) {
        // Soft delete: deshabilitar en lugar de eliminar
        String sql = "UPDATE campus SET enabled = false, updated_at = now() WHERE id = ?";
        jdbc.update(sql, id);
    }

    private RowMapper<Campus> campusRowMapper() {
        return (rs, rowNum) -> {
            Campus campus = new Campus();
            campus.setId(UUID.fromString(rs.getString("id")));
            campus.setInstitutionId(UUID.fromString(rs.getString("institution_id")));
            campus.setName(rs.getString("name"));
            campus.setCode(rs.getString("code"));
            campus.setAddress(rs.getString("address"));
            campus.setCity(rs.getString("city"));
            campus.setRegion(rs.getString("region"));
            
            java.math.BigDecimal lat = rs.getBigDecimal("latitude");
            if (lat != null) {
                campus.setLatitude(lat);
            }
            
            java.math.BigDecimal lon = rs.getBigDecimal("longitude");
            if (lon != null) {
                campus.setLongitude(lon);
            }
            
            campus.setPhone(rs.getString("phone"));
            campus.setEmail(rs.getString("email"));
            campus.setEnabled(rs.getBoolean("enabled"));
            
            Timestamp createdAt = rs.getTimestamp("created_at");
            if (createdAt != null) {
                campus.setCreatedAt(createdAt.toLocalDateTime());
            }
            
            Timestamp updatedAt = rs.getTimestamp("updated_at");
            if (updatedAt != null) {
                campus.setUpdatedAt(updatedAt.toLocalDateTime());
            }
            
            String createdBy = rs.getString("created_by");
            if (createdBy != null) {
                campus.setCreatedBy(UUID.fromString(createdBy));
            }
            
            String updatedBy = rs.getString("updated_by");
            if (updatedBy != null) {
                campus.setUpdatedBy(UUID.fromString(updatedBy));
            }
            
            return campus;
        };
    }
}
