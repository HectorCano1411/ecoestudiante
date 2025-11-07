package com.ecoestudiante.gateway.util;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.time.Instant;
import java.util.Date;
import java.util.List;

/**
 * Utilidad para generar tokens JWT válidos en tests.
 * 
 * Esta clase crea tokens JWT firmados con RSA que simulan los tokens
 * que Auth0 emitiría en producción.
 */
public class JwtTestUtils {

    private static RSAKey rsaKey;
    private static final String DEFAULT_TEST_ISSUER = "https://dev-test.us.auth0.com/";
    private static final String TEST_AUDIENCE = "https://api.ecoestudiante.com";

    static {
        try {
            // Generar par de claves RSA para testing
            rsaKey = new RSAKeyGenerator(2048)
                    .keyID("test-key-id")
                    .generate();
        } catch (JOSEException e) {
            throw new RuntimeException("Error generando clave RSA para tests", e);
        }
    }

    /**
     * Obtiene la clave pública RSA para usar en JWKS endpoint mock.
     */
    public static RSAKey getPublicKey() {
        return rsaKey.toPublicJWK();
    }

    /**
     * Obtiene el JWKSet (conjunto de claves públicas) para mockear JWKS endpoint.
     */
    public static JWKSet getJWKSet() {
        return new JWKSet(getPublicKey());
    }

    /**
     * Genera un token JWT con los scopes especificados.
     * 
     * @param subject Subject del token (usuario)
     * @param scopes Lista de scopes (ej: ["read:carbon", "write:carbon"])
     * @return Token JWT firmado como String
     */
    public static String generateToken(String subject, List<String> scopes) {
        return generateToken(subject, scopes, DEFAULT_TEST_ISSUER);
    }

    /**
     * Genera un token JWT con los scopes especificados y issuer personalizado.
     * 
     * @param subject Subject del token (usuario)
     * @param scopes Lista de scopes (ej: ["read:carbon", "write:carbon"])
     * @param issuer Issuer del token (debe coincidir con el issuer-uri configurado)
     * @return Token JWT firmado como String
     */
    public static String generateToken(String subject, List<String> scopes, String issuer) {
        try {
            // Crear claims del token
            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                    .subject(subject)
                    .issuer(issuer)
                    .audience(TEST_AUDIENCE)
                    .issueTime(Date.from(Instant.now()))
                    .expirationTime(Date.from(Instant.now().plusSeconds(3600))) // 1 hora
                    .claim("scope", String.join(" ", scopes))
                    .build();

            // Crear header del token
            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                    .keyID(rsaKey.getKeyID())
                    .build();

            // Firmar el token
            SignedJWT signedJWT = new SignedJWT(header, claimsSet);
            signedJWT.sign(new RSASSASigner(rsaKey));

            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new RuntimeException("Error generando token JWT", e);
        }
    }

    // Métodos eliminados para evitar ambigüedad
    // Usar directamente generateToken() con todos los parámetros

    /**
     * Genera un token JWT expirado (para probar validación de expiración).
     * 
     * @param subject Subject del token
     * @param scopes Lista de scopes
     * @param issuer Issuer del token
     * @return Token JWT expirado como String
     */
    public static String generateExpiredToken(String subject, List<String> scopes, String issuer) {
        try {
            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                    .subject(subject)
                    .issuer(issuer)
                    .audience(TEST_AUDIENCE)
                    .issueTime(Date.from(Instant.now().minusSeconds(7200))) // Hace 2 horas
                    .expirationTime(Date.from(Instant.now().minusSeconds(3600))) // Hace 1 hora (expirado)
                    .claim("scope", String.join(" ", scopes))
                    .build();

            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                    .keyID(rsaKey.getKeyID())
                    .build();

            SignedJWT signedJWT = new SignedJWT(header, claimsSet);
            signedJWT.sign(new RSASSASigner(rsaKey));

            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new RuntimeException("Error generando token JWT expirado", e);
        }
    }
}

