package com.ecoestudiante.auth;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AppUser {
    private UUID id;
    private String username;
    private String email;
    private String passwordHash;
    private boolean enabled;
    private String carrera;
    private String jornada;
    private boolean emailVerified;
    private String verificationToken;
    private LocalDateTime verificationTokenExpiry;
    private String resetToken;
    private LocalDateTime resetTokenExpiry;
    private String googleId;
    private String authProvider; // 'local', 'google'
    private String pictureUrl;
    private String role; // 'STUDENT', 'ADMIN', 'MODERATOR'
    private UUID institutionId; // ID de la institución educativa
    private UUID campusId; // ID del campus/sede

    /**
     * Verifica si el usuario tiene rol de administrador
     */
    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(this.role);
    }

    /**
     * Verifica si el usuario tiene rol de moderador
     */
    public boolean isModerator() {
        return "MODERATOR".equalsIgnoreCase(this.role);
    }
}

