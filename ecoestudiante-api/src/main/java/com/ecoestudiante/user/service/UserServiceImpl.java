package com.ecoestudiante.user.service;

import com.ecoestudiante.auth.AppUser;
import com.ecoestudiante.auth.EmailService;
import com.ecoestudiante.auth.UserRepository;
import com.ecoestudiante.institution.repository.CampusRepository;
import com.ecoestudiante.institution.repository.InstitutionRepository;
import com.ecoestudiante.user.dto.UserDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    private static final int VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final InstitutionRepository institutionRepository;
    private final CampusRepository campusRepository;
    private final SecureRandom random = new SecureRandom();

    public UserServiceImpl(
            UserRepository userRepository,
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            InstitutionRepository institutionRepository,
            CampusRepository campusRepository
    ) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.institutionRepository = institutionRepository;
        this.campusRepository = campusRepository;
    }

    /**
     * Genera un token de verificación seguro
     */
    private String generateVerificationToken() {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    @Override
    public UserDtos.UserListResponse getUsers(
            int page,
            int size,
            String search,
            String role,
            Boolean enabled,
            Boolean emailVerified,
            UUID institutionId,
            UUID campusId
    ) {
        logger.debug("Obteniendo lista de usuarios - Page: {}, Size: {}, Search: {}, Role: {}, InstitutionId: {}, CampusId: {}", 
                    page, size, search, role, institutionId, campusId);

        // Construir query base con JOINs para obtener nombres de institución y campus
        StringBuilder sqlBuilder = new StringBuilder("""
            SELECT u.id, u.username, u.email, u.role, u.enabled, u.email_verified, u.carrera, u.jornada, 
                   u.auth_provider, u.institution_id, i.name as institution_name, 
                   u.campus_id, c.name as campus_name,
                   u.created_at, u.updated_at
            FROM app_user u
            LEFT JOIN institution i ON u.institution_id = i.id
            LEFT JOIN campus c ON u.campus_id = c.id
            WHERE 1=1
            """);

        // Construir query de conteo
        StringBuilder countSqlBuilder = new StringBuilder("""
            SELECT COUNT(*)
            FROM app_user u
            LEFT JOIN institution i ON u.institution_id = i.id
            LEFT JOIN campus c ON u.campus_id = c.id
            WHERE 1=1
            """);

        // Aplicar filtros
        if (search != null && !search.trim().isEmpty()) {
            sqlBuilder.append(" AND (u.username ILIKE ? OR u.email ILIKE ?)");
            countSqlBuilder.append(" AND (u.username ILIKE ? OR u.email ILIKE ?)");
        }
        if (role != null && !role.trim().isEmpty()) {
            sqlBuilder.append(" AND u.role = ?");
            countSqlBuilder.append(" AND u.role = ?");
        }
        if (enabled != null) {
            sqlBuilder.append(" AND u.enabled = ?");
            countSqlBuilder.append(" AND u.enabled = ?");
        }
        if (emailVerified != null) {
            sqlBuilder.append(" AND u.email_verified = ?");
            countSqlBuilder.append(" AND u.email_verified = ?");
        }
        if (institutionId != null) {
            sqlBuilder.append(" AND u.institution_id = ?");
            countSqlBuilder.append(" AND u.institution_id = ?");
        }
        if (campusId != null) {
            sqlBuilder.append(" AND u.campus_id = ?");
            countSqlBuilder.append(" AND u.campus_id = ?");
        }

        // Ordenar y paginar
        sqlBuilder.append(" ORDER BY u.created_at DESC LIMIT ? OFFSET ?");

        // Ejecutar conteo
        int totalElements;
        if (search != null && !search.trim().isEmpty()) {
            String searchPattern = "%" + search + "%";
            if (role != null && !role.trim().isEmpty()) {
                if (enabled != null && emailVerified != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, role, enabled, emailVerified
                    );
                } else if (enabled != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, role, enabled
                    );
                } else if (emailVerified != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, role, emailVerified
                    );
                } else {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, role
                    );
                }
            } else {
                if (enabled != null && emailVerified != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, enabled, emailVerified
                    );
                } else if (enabled != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, enabled
                    );
                } else if (emailVerified != null) {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern, emailVerified
                    );
                } else {
                    totalElements = jdbcTemplate.queryForObject(
                        countSqlBuilder.toString(),
                        Integer.class,
                        searchPattern, searchPattern
                    );
                }
            }
        } else {
            List<Object> params = new java.util.ArrayList<>();
            if (role != null && !role.trim().isEmpty()) {
                params.add(role);
            }
            if (enabled != null) {
                params.add(enabled);
            }
            if (emailVerified != null) {
                params.add(emailVerified);
            }
            totalElements = jdbcTemplate.queryForObject(
                countSqlBuilder.toString(),
                params.toArray(),
                Integer.class
            );
        }

        // Ejecutar query principal con parámetros dinámicos
        int offset = page * size;
        List<Object> queryParams = new java.util.ArrayList<>();
        
        if (search != null && !search.trim().isEmpty()) {
            String searchPattern = "%" + search + "%";
            queryParams.add(searchPattern);
            queryParams.add(searchPattern);
        }
        if (role != null && !role.trim().isEmpty()) {
            queryParams.add(role);
        }
        if (enabled != null) {
            queryParams.add(enabled);
        }
        if (emailVerified != null) {
            queryParams.add(emailVerified);
        }
        if (institutionId != null) {
            queryParams.add(institutionId);
        }
        if (campusId != null) {
            queryParams.add(campusId);
        }
        queryParams.add(size);
        queryParams.add(offset);
        
        List<UserDtos.UserDto> users = jdbcTemplate.query(
            sqlBuilder.toString(),
            queryParams.toArray(),
            (rs, rowNum) -> {
                String institutionIdStr = rs.getString("institution_id");
                UUID institutionIdUuid = institutionIdStr != null ? UUID.fromString(institutionIdStr) : null;
                
                String campusIdStr = rs.getString("campus_id");
                UUID campusIdUuid = campusIdStr != null ? UUID.fromString(campusIdStr) : null;
                
                return new UserDtos.UserDto(
                    UUID.fromString(rs.getString("id")),
                    rs.getString("username"),
                    rs.getString("email"),
                    rs.getString("role"),
                    rs.getBoolean("enabled"),
                    rs.getBoolean("email_verified"),
                    rs.getString("carrera"),
                    rs.getString("jornada"),
                    rs.getString("auth_provider"),
                    institutionIdUuid,
                    rs.getString("institution_name"),
                    campusIdUuid,
                    rs.getString("campus_name"),
                    rs.getTimestamp("created_at") != null ? 
                        rs.getTimestamp("created_at").toLocalDateTime() : null,
                    rs.getTimestamp("updated_at") != null ? 
                        rs.getTimestamp("updated_at").toLocalDateTime() : null
                );
            }
        );

        int totalPages = (int) Math.ceil((double) totalElements / size);
        boolean hasNext = page < totalPages - 1;
        boolean hasPrevious = page > 0;

        logger.info("Usuarios obtenidos: {} de {}", users.size(), totalElements);

        return new UserDtos.UserListResponse(
            users,
            totalElements,
            totalPages,
            page,
            size,
            hasNext,
            hasPrevious
        );
    }

    @Override
    public UserDtos.UserDto getUserById(UUID userId) {
        logger.debug("Obteniendo usuario por ID: {}", userId);
        
        AppUser user = userRepository.findByUsername("") // Necesitamos un método findById
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        // Buscar por ID usando query directa con JOINs
        String sql = """
            SELECT u.id, u.username, u.email, u.role, u.enabled, u.email_verified, u.carrera, u.jornada, 
                   u.auth_provider, u.institution_id, i.name as institution_name, 
                   u.campus_id, c.name as campus_name,
                   u.created_at, u.updated_at
            FROM app_user u
            LEFT JOIN institution i ON u.institution_id = i.id
            LEFT JOIN campus c ON u.campus_id = c.id
            WHERE u.id = ?
            """;
        
        try {
            return jdbcTemplate.queryForObject(sql, new Object[]{userId}, (rs, rowNum) -> {
                String institutionIdStr = rs.getString("institution_id");
                UUID institutionIdUuid = institutionIdStr != null ? UUID.fromString(institutionIdStr) : null;
                
                String campusIdStr = rs.getString("campus_id");
                UUID campusIdUuid = campusIdStr != null ? UUID.fromString(campusIdStr) : null;
                
                return new UserDtos.UserDto(
                    UUID.fromString(rs.getString("id")),
                    rs.getString("username"),
                    rs.getString("email"),
                    rs.getString("role"),
                    rs.getBoolean("enabled"),
                    rs.getBoolean("email_verified"),
                    rs.getString("carrera"),
                    rs.getString("jornada"),
                    rs.getString("auth_provider"),
                    institutionIdUuid,
                    rs.getString("institution_name"),
                    campusIdUuid,
                    rs.getString("campus_name"),
                    rs.getTimestamp("created_at") != null ? 
                        rs.getTimestamp("created_at").toLocalDateTime() : null,
                    rs.getTimestamp("updated_at") != null ? 
                        rs.getTimestamp("updated_at").toLocalDateTime() : null
                );
            });
        } catch (Exception e) {
            logger.error("Error al obtener usuario por ID: {}", userId, e);
            throw new IllegalArgumentException("Usuario no encontrado");
        }
    }

    @Override
    @Transactional
    public UserDtos.UserDto createUser(UserDtos.CreateUserRequest request, String currentUserRole) {
        logger.info("Creando usuario - Username: {}, Email: {}, Role: {}, CurrentUserRole: {}", 
                   request.username(), request.email(), request.role(), currentUserRole);

        // Validar permisos
        validateRolePermission(request.role(), currentUserRole, "crear");

        // Verificar si username ya existe
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new IllegalArgumentException("Username ya está en uso");
        }

        // Verificar si email ya existe
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email ya está en uso");
        }

        // Crear usuario
        AppUser user = new AppUser();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        
        // Campos opcionales - solo establecer si no son null y no están vacíos
        if (request.carrera() != null && !request.carrera().trim().isEmpty()) {
            user.setCarrera(request.carrera().trim());
        }
        if (request.jornada() != null && !request.jornada().trim().isEmpty()) {
            user.setJornada(request.jornada().trim());
        }
        
        // Validar y establecer institución y campus
        if (request.institutionId() != null) {
            var institution = institutionRepository.findById(request.institutionId())
                    .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada"));
            if (!institution.isEnabled()) {
                throw new IllegalArgumentException("La institución seleccionada no está disponible");
            }
            user.setInstitutionId(request.institutionId());
        }
        
        if (request.campusId() != null) {
            var campus = campusRepository.findById(request.campusId())
                    .orElseThrow(() -> new IllegalArgumentException("Campus no encontrado"));
            if (!campus.isEnabled()) {
                throw new IllegalArgumentException("El campus seleccionado no está disponible");
            }
            // Validar que el campus pertenezca a la institución si ambas están presentes
            if (request.institutionId() != null && !campus.getInstitutionId().equals(request.institutionId())) {
                throw new IllegalArgumentException("El campus seleccionado no pertenece a la institución seleccionada");
            }
            user.setCampusId(request.campusId());
        }
        
        // Campos booleanos - usar valores por defecto si son null
        user.setEnabled(request.enabled() != null ? request.enabled() : true);
        user.setEmailVerified(request.emailVerified() != null ? request.emailVerified() : false);
        user.setAuthProvider("local");

        AppUser savedUser = userRepository.save(user);

        logger.info("Usuario creado exitosamente - ID: {}, Username: {}", savedUser.getId(), savedUser.getUsername());

        return mapToDto(savedUser);
    }

    @Override
    @Transactional
    public UserDtos.UserDto updateUser(UUID userId, UserDtos.UpdateUserRequest request, String currentUserRole) {
        logger.info("Actualizando usuario - ID: {}, CurrentUserRole: {}", userId, currentUserRole);

        // Obtener usuario existente
        AppUser user = getUserEntityById(userId);

        // Validar permisos para cambiar rol
        if (request.role() != null && !request.role().equals(user.getRole())) {
            validateRolePermission(request.role(), currentUserRole, "asignar");
        }

        // Actualizar campos
        if (request.username() != null && !request.username().trim().isEmpty()) {
            // Verificar si el nuevo username ya existe (excepto para este usuario)
            userRepository.findByUsername(request.username())
                .ifPresent(existingUser -> {
                    if (!existingUser.getId().equals(userId)) {
                        throw new IllegalArgumentException("Username ya está en uso");
                    }
                });
            user.setUsername(request.username());
        }

        if (request.email() != null && !request.email().trim().isEmpty()) {
            // Verificar si el nuevo email ya existe (excepto para este usuario)
            userRepository.findByEmail(request.email())
                .ifPresent(existingUser -> {
                    if (!existingUser.getId().equals(userId)) {
                        throw new IllegalArgumentException("Email ya está en uso");
                    }
                });
            user.setEmail(request.email());
        }

        if (request.role() != null && !request.role().trim().isEmpty()) {
            user.setRole(request.role());
        }

        if (request.carrera() != null) {
            user.setCarrera(request.carrera());
        }

        if (request.jornada() != null) {
            user.setJornada(request.jornada());
        }

        // Actualizar institución y campus con validación
        if (request.institutionId() != null) {
            var institution = institutionRepository.findById(request.institutionId())
                    .orElseThrow(() -> new IllegalArgumentException("Institución no encontrada"));
            if (!institution.isEnabled()) {
                throw new IllegalArgumentException("La institución seleccionada no está disponible");
            }
            user.setInstitutionId(request.institutionId());
        }
        
        if (request.campusId() != null) {
            var campus = campusRepository.findById(request.campusId())
                    .orElseThrow(() -> new IllegalArgumentException("Campus no encontrado"));
            if (!campus.isEnabled()) {
                throw new IllegalArgumentException("El campus seleccionado no está disponible");
            }
            // Validar que el campus pertenezca a la institución si ambas están presentes
            UUID institutionIdToCheck = request.institutionId() != null ? request.institutionId() : user.getInstitutionId();
            if (institutionIdToCheck != null && !campus.getInstitutionId().equals(institutionIdToCheck)) {
                throw new IllegalArgumentException("El campus seleccionado no pertenece a la institución seleccionada");
            }
            user.setCampusId(request.campusId());
        }

        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }

        if (request.emailVerified() != null) {
            user.setEmailVerified(request.emailVerified());
        }

        AppUser updatedUser = userRepository.save(user);

        logger.info("Usuario actualizado exitosamente - ID: {}", updatedUser.getId());

        return mapToDto(updatedUser);
    }

    @Override
    @Transactional
    public UserDtos.UserOperationResponse updatePassword(UUID userId, UserDtos.UpdatePasswordRequest request, String currentUserRole) {
        logger.info("Actualizando contraseña de usuario - ID: {}, CurrentUserRole: {}", userId, currentUserRole);

        AppUser user = getUserEntityById(userId);

        // Validar permisos
        if (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No tienes permisos para actualizar contraseñas");
        }

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        logger.info("Contraseña actualizada exitosamente - ID: {}", userId);

        return new UserDtos.UserOperationResponse(
            "Contraseña actualizada exitosamente",
            userId,
            true
        );
    }

    @Override
    @Transactional
    public UserDtos.UserOperationResponse deleteUser(UUID userId, String currentUserRole) {
        logger.info("Eliminando usuario - ID: {}, CurrentUserRole: {}", userId, currentUserRole);

        AppUser user = getUserEntityById(userId);

        // Validar permisos
        if (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No tienes permisos para eliminar usuarios");
        }

        // No permitir eliminar SUPER_ADMIN (excepto si es SUPER_ADMIN)
        if ("SUPER_ADMIN".equals(user.getRole()) && !"SUPER_ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No puedes eliminar un usuario SUPER_ADMIN");
        }

        // Soft delete: deshabilitar usuario
        user.setEnabled(false);
        userRepository.save(user);

        logger.info("Usuario eliminado (deshabilitado) exitosamente - ID: {}", userId);

        return new UserDtos.UserOperationResponse(
            "Usuario eliminado exitosamente",
            userId,
            true
        );
    }

    @Override
    @Transactional
    public UserDtos.UserOperationResponse toggleUserEnabled(UUID userId, boolean enabled, String currentUserRole) {
        logger.info("Cambiando estado de usuario - ID: {}, Enabled: {}, CurrentUserRole: {}", 
                   userId, enabled, currentUserRole);

        AppUser user = getUserEntityById(userId);

        // Validar permisos
        if (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No tienes permisos para cambiar el estado de usuarios");
        }

        user.setEnabled(enabled);
        userRepository.save(user);

        logger.info("Estado de usuario actualizado - ID: {}, Enabled: {}", userId, enabled);

        return new UserDtos.UserOperationResponse(
            enabled ? "Usuario habilitado exitosamente" : "Usuario deshabilitado exitosamente",
            userId,
            true
        );
    }

    // Métodos auxiliares

    private AppUser getUserEntityById(UUID userId) {
        String sql = """
            SELECT id, username, email, password_hash, enabled, carrera, jornada,
                   email_verified, verification_token, verification_token_expiry,
                   reset_token, reset_token_expiry, google_id, auth_provider, picture_url, role,
                   institution_id, campus_id
            FROM app_user
            WHERE id = ?
            """;
        
        try {
            return jdbcTemplate.queryForObject(sql, new Object[]{userId}, (rs, rowNum) -> {
                AppUser user = new AppUser();
                user.setId(UUID.fromString(rs.getString("id")));
                user.setUsername(rs.getString("username"));
                user.setEmail(rs.getString("email"));
                user.setPasswordHash(rs.getString("password_hash"));
                user.setEnabled(rs.getBoolean("enabled"));
                user.setCarrera(rs.getString("carrera"));
                user.setJornada(rs.getString("jornada"));
                user.setEmailVerified(rs.getBoolean("email_verified"));
                user.setRole(rs.getString("role"));
                user.setAuthProvider(rs.getString("auth_provider"));
                
                String institutionIdStr = rs.getString("institution_id");
                if (institutionIdStr != null) {
                    user.setInstitutionId(UUID.fromString(institutionIdStr));
                }
                
                String campusIdStr = rs.getString("campus_id");
                if (campusIdStr != null) {
                    user.setCampusId(UUID.fromString(campusIdStr));
                }
                
                return user;
            });
        } catch (Exception e) {
            logger.error("Error al obtener usuario por ID: {}", userId, e);
            throw new IllegalArgumentException("Usuario no encontrado");
        }
    }

    private UserDtos.UserDto mapToDto(AppUser user) {
        // Obtener fechas de creación y actualización, y nombres de institución y campus
        String sql = """
            SELECT u.created_at, u.updated_at, i.name as institution_name, c.name as campus_name
            FROM app_user u
            LEFT JOIN institution i ON u.institution_id = i.id
            LEFT JOIN campus c ON u.campus_id = c.id
            WHERE u.id = ?
            """;
        
        try {
            return jdbcTemplate.queryForObject(sql, new Object[]{user.getId()}, (rs, rowNum) -> 
                new UserDtos.UserDto(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getRole(),
                    user.isEnabled(),
                    user.isEmailVerified(),
                    user.getCarrera(),
                    user.getJornada(),
                    user.getAuthProvider(),
                    user.getInstitutionId(),
                    rs.getString("institution_name"),
                    user.getCampusId(),
                    rs.getString("campus_name"),
                    rs.getTimestamp("created_at") != null ? 
                        rs.getTimestamp("created_at").toLocalDateTime() : null,
                    rs.getTimestamp("updated_at") != null ? 
                        rs.getTimestamp("updated_at").toLocalDateTime() : null
                )
            );
        } catch (Exception e) {
            logger.error("Error al mapear usuario a DTO: {}", user.getId(), e);
            // Retornar DTO básico si falla la consulta
            // Obtener nombres de institución y campus si existen
            // Usar arrays para hacer las variables efectivamente final para uso en lambdas
            final String[] institutionName = {null};
            final String[] campusName = {null};
            if (user.getInstitutionId() != null) {
                institutionRepository.findById(user.getInstitutionId())
                    .ifPresent(inst -> institutionName[0] = inst.getName());
            }
            if (user.getCampusId() != null) {
                campusRepository.findById(user.getCampusId())
                    .ifPresent(camp -> campusName[0] = camp.getName());
            }
            
            return new UserDtos.UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.isEmailVerified(),
                user.getCarrera(),
                user.getJornada(),
                user.getAuthProvider(),
                user.getInstitutionId(),
                institutionName[0],
                user.getCampusId(),
                campusName[0],
                null,
                null
            );
        }
    }

    @Override
    @Transactional
    public UserDtos.UserOperationResponse verifyUserEmail(UUID userId, String currentUserRole) {
        logger.info("Verificando email de usuario manualmente - ID: {}, CurrentUserRole: {}", userId, currentUserRole);

        // Validar permisos
        if (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No tienes permisos para verificar emails de usuarios");
        }

        AppUser user = getUserEntityById(userId);

        if (user.isEmailVerified()) {
            logger.info("Email ya estaba verificado - ID: {}", userId);
            return new UserDtos.UserOperationResponse(
                "El email ya estaba verificado",
                userId,
                true
            );
        }

        // Marcar email como verificado
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        logger.info("Email verificado manualmente - ID: {}, Email: {}", userId, user.getEmail());

        return new UserDtos.UserOperationResponse(
            "Email verificado exitosamente",
            userId,
            true
        );
    }

    @Override
    @Transactional
    public UserDtos.UserOperationResponse resendVerificationEmail(UUID userId, String currentUserRole) {
        logger.info("Reenviando email de verificación - ID: {}, CurrentUserRole: {}", userId, currentUserRole);

        // Validar permisos
        if (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole)) {
            throw new IllegalArgumentException("No tienes permisos para reenviar emails de verificación");
        }

        AppUser user = getUserEntityById(userId);

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("El email ya está verificado");
        }

        // Generar nuevo token de verificación
        String verificationToken = generateVerificationToken();
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(VERIFICATION_TOKEN_EXPIRY_HOURS);
        
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(tokenExpiry);
        userRepository.save(user);

        // Enviar email de verificación
        boolean emailSent = false;
        String errorMessage = null;
        try {
            if (emailService != null) {
                emailService.sendVerificationEmail(
                    user.getEmail(),
                    user.getUsername(),
                    verificationToken
                );
                emailSent = true;
                logger.info("Email de verificación reenviado exitosamente - ID: {}, Email: {}", userId, user.getEmail());
            } else {
                logger.warn("EmailService no está disponible - ID: {}, Email: {}", userId, user.getEmail());
                errorMessage = "EmailService no está configurado";
            }
        } catch (org.springframework.mail.MailAuthenticationException e) {
            logger.error("Error de autenticación al enviar email - ID: {}, Email: {}", userId, user.getEmail(), e);
            errorMessage = "Error de configuración de email. El token fue generado, pero el email no pudo ser enviado.";
        } catch (org.springframework.mail.MailException e) {
            logger.error("Error al enviar email de verificación - ID: {}, Email: {}", userId, user.getEmail(), e);
            errorMessage = "Error al enviar email. El token fue generado, pero el email no pudo ser enviado.";
        } catch (Exception e) {
            logger.error("Error inesperado al reenviar email de verificación - ID: {}, Email: {}", userId, user.getEmail(), e);
            errorMessage = "Error inesperado. El token fue generado, pero el email no pudo ser enviado.";
        }

        // Siempre retornamos éxito porque el token fue generado
        // El admin puede verificar manualmente si el email falla
        String message = emailSent 
            ? "Se ha enviado un nuevo email de verificación"
            : (errorMessage != null 
                ? errorMessage 
                : "Token de verificación generado. El email no pudo ser enviado, pero puedes verificar el email manualmente.");

        return new UserDtos.UserOperationResponse(
            message,
            userId,
            true
        );
    }

    private void validateRolePermission(String targetRole, String currentUserRole, String action) {
        // SUPER_ADMIN puede hacer todo
        if ("SUPER_ADMIN".equals(currentUserRole)) {
            return;
        }

        // ADMIN puede crear/actualizar ADMIN, PROFESOR, ESTUDIANTE
        if ("ADMIN".equals(currentUserRole)) {
            if ("SUPER_ADMIN".equals(targetRole)) {
                throw new IllegalArgumentException("No tienes permisos para " + action + " usuarios con rol SUPER_ADMIN");
            }
            return;
        }

        // Otros roles no pueden crear/actualizar usuarios
        throw new IllegalArgumentException("No tienes permisos para " + action + " usuarios");
    }
}

