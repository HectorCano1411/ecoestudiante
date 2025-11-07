package com.ecoestudiante.auth;

import java.util.UUID;

/**
 * Representa al usuario autenticado extraído del token de autorización.
 */
public record UserContext(String token, String userId, UUID normalizedUserId) {

  public String normalizedUserIdAsString() {
    return normalizedUserId.toString();
  }
}

