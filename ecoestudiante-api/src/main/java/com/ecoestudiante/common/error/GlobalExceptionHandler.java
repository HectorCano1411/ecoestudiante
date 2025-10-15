package com.ecoestudiante.common.error;

import com.ecoestudiante.common.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.stream.Collectors;
import java.util.UUID;

@ControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    var details = ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> new ErrorResponse.Detail(fe.getField(), fe.getDefaultMessage()))
        .collect(Collectors.toList());
    var body = new ErrorResponse.ErrorBody("VALIDATION_ERROR","Request validation failed", UUID.randomUUID().toString(), details);
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(new ErrorResponse(body));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegal(IllegalArgumentException ex) {
    var body = new ErrorResponse.ErrorBody("BAD_REQUEST", ex.getMessage(), UUID.randomUUID().toString(), java.util.List.of());
    return ResponseEntity.badRequest().body(new ErrorResponse(body));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
    var body = new ErrorResponse.ErrorBody("INTERNAL_ERROR","Unexpected error", UUID.randomUUID().toString(), java.util.List.of());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(body));
  }
}
