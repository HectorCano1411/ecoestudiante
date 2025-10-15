package com.ecoestudiante.factors;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/factors")
@Tag(name="Factors", description="Metadatos de factores de emisión")
public class FactorsController {

  @GetMapping("/meta")
  @Operation(summary="Metadatos de factores disponibles (mock)")
  public List<Map<String,Object>> meta() {
    return List.of(
      Map.of("source_id","SEN-CL-2024","scope","national","region_level","comuna","year",2024,"unit","kgCO2e/kWh","valid_from","2024-01-01","valid_to","2024-12-31","hash","abc123"),
      Map.of("source_id","HUELLACHILE-2023","scope","national","region_level","region","year",2023,"unit","kgCO2e/km","valid_from","2023-01-01","valid_to","2023-12-31","hash","def456")
    );
  }
}
