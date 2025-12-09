package com.ecoestudiante.user.service;

import com.ecoestudiante.user.dto.UserDtos;
import java.util.UUID;

/**
 * Servicio para gestión de usuarios
 */
public interface UserService {
    
    /**
     * Obtener lista paginada de usuarios con filtros
     */
    UserDtos.UserListResponse getUsers(
        int page,
        int size,
        String search,
        String role,
        Boolean enabled,
        Boolean emailVerified,
        UUID institutionId,
        UUID campusId
    );
    
    /**
     * Obtener usuario por ID
     */
    UserDtos.UserDto getUserById(UUID userId);
    
    /**
     * Crear nuevo usuario
     */
    UserDtos.UserDto createUser(UserDtos.CreateUserRequest request, String currentUserRole);
    
    /**
     * Actualizar usuario
     */
    UserDtos.UserDto updateUser(UUID userId, UserDtos.UpdateUserRequest request, String currentUserRole);
    
    /**
     * Actualizar contraseña de usuario
     */
    UserDtos.UserOperationResponse updatePassword(UUID userId, UserDtos.UpdatePasswordRequest request, String currentUserRole);
    
    /**
     * Eliminar usuario (soft delete)
     */
    UserDtos.UserOperationResponse deleteUser(UUID userId, String currentUserRole);
    
    /**
     * Habilitar/deshabilitar usuario
     */
    UserDtos.UserOperationResponse toggleUserEnabled(UUID userId, boolean enabled, String currentUserRole);
    
    /**
     * Verificar email de usuario manualmente (solo ADMIN/SUPER_ADMIN)
     */
    UserDtos.UserOperationResponse verifyUserEmail(UUID userId, String currentUserRole);
    
    /**
     * Reenviar email de verificación
     */
    UserDtos.UserOperationResponse resendVerificationEmail(UUID userId, String currentUserRole);
}

