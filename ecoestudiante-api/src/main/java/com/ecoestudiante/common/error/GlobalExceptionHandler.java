package com.ecoestudiante.common.error;

import com.ecoestudiante.common.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.stream.Collectors;
import java.util.UUID;

@ControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    logger.warn("Validation error: {}", ex.getMessage());
    var details = ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> new ErrorResponse.Detail(fe.getField(), fe.getDefaultMessage()))
        .collect(Collectors.toList());
    var body = new ErrorResponse.ErrorBody("VALIDATION_ERROR","Request validation failed", UUID.randomUUID().toString(), details);
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(new ErrorResponse(body));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegal(IllegalArgumentException ex) {
    logger.warn("Illegal argument: {}", ex.getMessage());
    var body = new ErrorResponse.ErrorBody("BAD_REQUEST", ex.getMessage(), UUID.randomUUID().toString(), java.util.List.of());
    return ResponseEntity.badRequest().body(new ErrorResponse(body));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
    logger.warn("Illegal state: {}", ex.getMessage());
    // Si el mensaje indica que no hay factor vigente, devolver 422 (Unprocessable Entity)
    if (ex.getMessage() != null && ex.getMessage().contains("No hay factor vigente")) {
      var body = new ErrorResponse.ErrorBody("FACTOR_NOT_FOUND", ex.getMessage(), UUID.randomUUID().toString(), java.util.List.of());
      return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(new ErrorResponse(body));
    }
    var body = new ErrorResponse.ErrorBody("BAD_REQUEST", ex.getMessage(), UUID.randomUUID().toString(), java.util.List.of());
    return ResponseEntity.badRequest().body(new ErrorResponse(body));
  }

  @ExceptionHandler(UnauthorizedException.class)
  public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
    logger.warn("Unauthorized: {}", ex.getMessage());
    var body = new ErrorResponse.ErrorBody("UNAUTHORIZED", ex.getMessage(), UUID.randomUUID().toString(), java.util.List.of());
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(body));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
    String correlationId = UUID.randomUUID().toString();
    logger.error("INTERNAL_ERROR [{}] - Unexpected error: {}", correlationId, ex.getMessage(), ex);
    logger.error("Stack trace:", ex);
    
    // En desarrollo, incluir más detalles del error
    String errorMessage = "Unexpected error";
    if (ex.getMessage() != null && !ex.getMessage().isEmpty()) {
      errorMessage = ex.getMessage();
    }
    
    var body = new ErrorResponse.ErrorBody("INTERNAL_ERROR", errorMessage, correlationId, java.util.List.of());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(body));
  }
}
