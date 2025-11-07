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
}

