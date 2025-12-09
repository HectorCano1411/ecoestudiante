package com.ecoestudiante.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTOs para gestión de usuarios
 */
public class UserDtos {

    /**
     * DTO para respuesta de usuario (sin información sensible)
     */
    public record UserDto(
            UUID id,
            String username,
            String email,
            String role,
            boolean enabled,
            boolean emailVerified,
            String carrera,
            String jornada,
            String authProvider,
            UUID institutionId,
            String institutionName,
            UUID campusId,
            String campusName,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    /**
     * DTO para crear usuario
     */
    public record CreateUserRequest(
            @NotBlank(message = "Username es requerido")
            @Size(min = 3, max = 50, message = "Username debe tener entre 3 y 50 caracteres")
            String username,

            @NotBlank(message = "Email es requerido")
            @Email(message = "Email debe ser válido")
            String email,

            @NotBlank(message = "Password es requerido")
            @Size(min = 8, message = "Password debe tener al menos 8 caracteres")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
                message = "Password debe contener al menos: una mayúscula, una minúscula, un número y un símbolo"
            )
            String password,

            @NotBlank(message = "Rol es requerido")
            @Pattern(
                regexp = "^(SUPER_ADMIN|ADMIN|PROFESOR|ESTUDIANTE)$",
                message = "Rol debe ser: SUPER_ADMIN, ADMIN, PROFESOR o ESTUDIANTE"
            )
            String role,

            String carrera,
            String jornada,

            UUID institutionId,
            UUID campusId,

            Boolean enabled,
            Boolean emailVerified
    ) {}

    /**
     * DTO para actualizar usuario
     */
    public record UpdateUserRequest(
            @Size(min = 3, max = 50, message = "Username debe tener entre 3 y 50 caracteres")
            String username,

            @Email(message = "Email debe ser válido")
            String email,

            @Pattern(
                regexp = "^(SUPER_ADMIN|ADMIN|PROFESOR|ESTUDIANTE)$",
                message = "Rol debe ser: SUPER_ADMIN, ADMIN, PROFESOR o ESTUDIANTE"
            )
            String role,

            String carrera,
            String jornada,

            UUID institutionId,
            UUID campusId,

            Boolean enabled,
            Boolean emailVerified
    ) {}

    /**
     * DTO para actualizar contraseña
     */
    public record UpdatePasswordRequest(
            @NotBlank(message = "Password es requerido")
            @Size(min = 8, message = "Password debe tener al menos 8 caracteres")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
                message = "Password debe contener al menos: una mayúscula, una minúscula, un número y un símbolo"
            )
            String password
    ) {}

    /**
     * DTO para respuesta de lista paginada
     */
    public record UserListResponse(
            java.util.List<UserDto> users,
            int totalElements,
            int totalPages,
            int currentPage,
            int pageSize,
            boolean hasNext,
            boolean hasPrevious
    ) {}

    /**
     * DTO para respuesta de operación
     */
    public record UserOperationResponse(
            String message,
            UUID userId,
            boolean success
    ) {}

    /**
     * DTO para respuesta de error
     */
    public record ErrorResponse(
            String error,
            String message
    ) {}
}

