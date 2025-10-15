package com.ecoestudiante.factors;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
class FactorsControllerTest {

  @Autowired
  MockMvc mvc;

  @Test
  void meta_returnsOk() throws Exception {
    mvc.perform(get("/api/v1/factors/meta"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].source_id").exists());
  }
}
