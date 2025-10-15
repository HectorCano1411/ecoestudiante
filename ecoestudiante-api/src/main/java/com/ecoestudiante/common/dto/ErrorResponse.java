package com.ecoestudiante.common.dto;

import java.util.List;

public record ErrorResponse(ErrorBody error) {
  public static record ErrorBody(String code, String message, String correlationId, List<Detail> details) {}
  public static record Detail(String field, String issue) {}
}
