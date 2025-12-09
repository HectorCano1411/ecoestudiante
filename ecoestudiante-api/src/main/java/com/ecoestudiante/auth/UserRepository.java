package com.ecoestudiante.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<AppUser> findByUsername(String username) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE username = ?
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), username);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findByEmail(String email) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE email = ?
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), email);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findByGoogleId(String googleId) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE google_id = ?
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), googleId);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findByVerificationToken(String token) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE verification_token = ? AND verification_token_expiry > now()
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), token);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findByVerificationTokenOnly(String token) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE verification_token = ?
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), token);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findByResetToken(String token) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE reset_token = ?
            """;
        try {
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), token);
            return Optional.ofNullable(user);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<AppUser> findById(UUID id) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE id = ?
            """;
        try {
            // Intentar primero con UUID directo (como en save() UPDATE)
            AppUser user = jdbc.queryForObject(sql, userRowMapper(), id);
            return Optional.ofNullable(user);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            // Si no se encuentra, retornar empty
            return Optional.empty();
        } catch (Exception e) {
            // Si hay otro error (por ejemplo, problema de tipo), intentar con string
            try {
                String sqlString = """
                    SELECT id, username, email, password_hash, enabled, carrera, jornada,
                           email_verified, verification_token, verification_token_expiry,
                           reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                           institution_id, campus_id
                    FROM app_user
                    WHERE id::text = ?
                    """;
                AppUser user = jdbc.queryForObject(sqlString, userRowMapper(), id.toString());
                return Optional.ofNullable(user);
            } catch (Exception e2) {
                return Optional.empty();
            }
        }
    }

    public AppUser save(AppUser user) {
        if (user.getId() == null) {
            // Insert
            UUID id = UUID.randomUUID();
            String sql = """
                INSERT INTO app_user (id, username, email, password_hash, enabled, carrera, jornada, 
                                      email_verified, verification_token, verification_token_expiry,
                                      reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                                      institution_id, campus_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
            jdbc.update(sql, 
                id, 
                user.getUsername(), 
                user.getEmail(), 
                user.getPasswordHash(), 
                user.isEnabled(),
                user.getCarrera(),
                user.getJornada(),
                user.isEmailVerified(),
                user.getVerificationToken(),
                user.getVerificationTokenExpiry() != null ? Timestamp.valueOf(user.getVerificationTokenExpiry()) : null,
                user.getResetToken(),
                user.getResetTokenExpiry() != null ? Timestamp.valueOf(user.getResetTokenExpiry()) : null,
                user.getGoogleId(),
                user.getAuthProvider() != null ? user.getAuthProvider() : "local",
                user.getPictureUrl(),
                user.getRole() != null ? user.getRole() : "ESTUDIANTE",
                user.getInstitutionId(),
                user.getCampusId()
            );
            return findByUsername(user.getUsername()).orElseThrow();
        } else {
            // Update
            String sql = """
                UPDATE app_user
                SET username = ?, email = ?, password_hash = ?, enabled = ?, carrera = ?, jornada = ?,
                    email_verified = ?, verification_token = ?, verification_token_expiry = ?,
                    reset_token = ?, reset_token_expiry = ?, google_id = ?, auth_provider = ?, 
                    picture_url = ?, role = ?, institution_id = ?, campus_id = ?, updated_at = now()
                WHERE id = ?
                """;
            jdbc.update(sql, 
                user.getUsername(), 
                user.getEmail(), 
                user.getPasswordHash(), 
                user.isEnabled(),
                user.getCarrera(),
                user.getJornada(),
                user.isEmailVerified(),
                user.getVerificationToken(),
                user.getVerificationTokenExpiry() != null ? Timestamp.valueOf(user.getVerificationTokenExpiry()) : null,
                user.getResetToken(),
                user.getResetTokenExpiry() != null ? Timestamp.valueOf(user.getResetTokenExpiry()) : null,
                user.getGoogleId(),
                user.getAuthProvider() != null ? user.getAuthProvider() : "local",
                user.getPictureUrl(),
                user.getRole() != null ? user.getRole() : "ESTUDIANTE",
                user.getInstitutionId(),
                user.getCampusId(),
                user.getId()
            );
            return findByUsername(user.getUsername()).orElseThrow();
        }
    }

    private RowMapper<AppUser> userRowMapper() {
        return (rs, rowNum) -> {
            AppUser user = new AppUser();
            user.setId(UUID.fromString(rs.getString("id")));
            user.setUsername(rs.getString("username"));
            user.setEmail(rs.getString("email"));
            user.setPasswordHash(rs.getString("password_hash"));
            user.setEnabled(rs.getBoolean("enabled"));

            // Nuevos campos (pueden ser null)
            if (rs.getString("carrera") != null) {
                user.setCarrera(rs.getString("carrera"));
            }
            if (rs.getString("jornada") != null) {
                user.setJornada(rs.getString("jornada"));
            }
            user.setEmailVerified(rs.getBoolean("email_verified"));

            if (rs.getString("verification_token") != null) {
                user.setVerificationToken(rs.getString("verification_token"));
            }

            Timestamp expiry = rs.getTimestamp("verification_token_expiry");
            if (expiry != null) {
                user.setVerificationTokenExpiry(expiry.toLocalDateTime());
            }

            if (rs.getString("reset_token") != null) {
                user.setResetToken(rs.getString("reset_token"));
            }

            Timestamp resetExpiry = rs.getTimestamp("reset_token_expiry");
            if (resetExpiry != null) {
                user.setResetTokenExpiry(resetExpiry.toLocalDateTime());
            }

            if (rs.getString("google_id") != null) {
                user.setGoogleId(rs.getString("google_id"));
            }

            if (rs.getString("auth_provider") != null) {
                user.setAuthProvider(rs.getString("auth_provider"));
            } else {
                user.setAuthProvider("local");
            }

            if (rs.getString("picture_url") != null) {
                user.setPictureUrl(rs.getString("picture_url"));
            }

            // Mapear el campo role (normalizar a mayúsculas para consistencia)
            if (rs.getString("role") != null) {
                String role = rs.getString("role").toUpperCase().trim();
                user.setRole(role);
            } else {
                user.setRole("ESTUDIANTE");  // Rol por defecto si no existe
            }

            // Mapear institution_id y campus_id
            String institutionIdStr = rs.getString("institution_id");
            if (institutionIdStr != null) {
                user.setInstitutionId(UUID.fromString(institutionIdStr));
            }

            String campusIdStr = rs.getString("campus_id");
            if (campusIdStr != null) {
                user.setCampusId(UUID.fromString(campusIdStr));
            }

            return user;
        };
    }
}

