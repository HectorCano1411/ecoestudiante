package com.ecoestudiante;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {

  @GetMapping({"/healthz","/api/v1/healthz"})
  public Map<String, Object> health() {
    return Map.of("ok", true, "service", "ecoestudiante-api", "version", "0.1.0");
  }
}
