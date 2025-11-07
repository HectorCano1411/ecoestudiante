package com.ecoestudiante.auth;

import com.ecoestudiante.common.error.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserContextResolver {

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final TokenUtil tokenUtil;

  public UserContextResolver(TokenUtil tokenUtil) {
    this.tokenUtil = tokenUtil;
  }

  public UserContext resolve(HttpServletRequest request) {
    String authHeader = request.getHeader(AUTHORIZATION_HEADER);
    if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException("Authorization header missing or invalid");
    }

    String token = authHeader.substring(BEARER_PREFIX.length());
    String userId = tokenUtil.extractUserId(token);

    if (userId == null || userId.isBlank()) {
      throw new UnauthorizedException("Unable to extract userId from token");
    }

    UUID normalizedUserId = tokenUtil.normalizeUserIdToUuid(userId);
    return new UserContext(token, userId, normalizedUserId);
  }

  public String normalizeUserId(String userId) {
    if (userId == null || userId.isBlank()) {
      throw new IllegalArgumentException("userId cannot be null or blank");
    }
    return tokenUtil.normalizeUserIdToUuid(userId).toString();
  }
}

