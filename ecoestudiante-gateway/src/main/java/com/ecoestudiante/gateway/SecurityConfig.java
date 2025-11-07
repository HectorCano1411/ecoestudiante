package com.ecoestudiante.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .authorizeExchange(exchanges -> exchanges
                // Health checks públicos
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                // Rutas de cálculo requieren SCOPE_read:carbon
                .pathMatchers("/api/calc/**").hasAuthority("SCOPE_read:carbon")
                // Rutas de reportes requieren SCOPE_report:write
                .pathMatchers("/api/reportes/**").hasAuthority("SCOPE_report:write")
                // Rutas de stats requieren SCOPE_read:carbon
                .pathMatchers("/api/stats/**").hasAuthority("SCOPE_read:carbon")
                // Todas las demás requieren autenticación
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(reactiveJwtAuthenticationConverter())
                )
            );

        return http.build();
    }

    /**
     * Converter reactivo para JWT que extrae scopes y los convierte a authorities.
     * 
     * Auth0 devuelve scopes como un string separado por espacios: "read:carbon write:carbon"
     * Este converter los convierte a authorities con prefijo "SCOPE_"
     */
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> reactiveJwtAuthenticationConverter() {
        return new ReactiveJwtConverter();
    }

    /**
     * Clase interna que implementa el converter reactivo con tipos explícitos.
     * 
     * Esto es necesario porque Spring necesita poder determinar los tipos genéricos,
     * lo cual no es posible con lambdas.
     */
    private static class ReactiveJwtConverter implements Converter<Jwt, Mono<AbstractAuthenticationToken>> {
        @Override
        public Mono<AbstractAuthenticationToken> convert(Jwt jwt) {
            // Extraer scopes del claim "scope" (string separado por espacios)
            Collection<GrantedAuthority> authorities = extractAuthoritiesFromJwt(jwt);
            
            // Crear JwtAuthenticationToken con las authorities extraídas
            JwtAuthenticationToken authenticationToken = new JwtAuthenticationToken(jwt, authorities);
            
            return Mono.just(authenticationToken);
        }

        private Collection<GrantedAuthority> extractAuthoritiesFromJwt(Jwt jwt) {
            // Auth0 devuelve scopes como un string separado por espacios: "read:carbon write:carbon"
            String scopeClaim = jwt.getClaimAsString("scope");
            Collection<String> scopes = Collections.emptyList();
            
            if (scopeClaim != null && !scopeClaim.isBlank()) {
                // Dividir el string de scopes por espacios
                scopes = List.of(scopeClaim.split(" "));
            }
            
            // Si no hay scopes en el claim "scope", intentar con "permissions" (lista)
            if (scopes.isEmpty()) {
                Collection<String> permissions = jwt.getClaimAsStringList("permissions");
                if (permissions != null && !permissions.isEmpty()) {
                    scopes = permissions;
                }
            }
            
            // Convertir scopes a authorities con prefijo "SCOPE_"
            return scopes.stream()
                .map(scope -> "SCOPE_" + scope)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        }
    }


    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.addAllowedOrigin("http://localhost:3000");
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsWebFilter(source);
    }
}

