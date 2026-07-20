package com.interviewprep.backend.controller;

import com.interviewprep.backend.dto.AuthResponse;
import com.interviewprep.backend.dto.LoginRequest;
import com.interviewprep.backend.dto.SignUpRequest;
import com.interviewprep.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignUpRequest signUpRequest) {
        return ResponseEntity.ok(authService.signup(signUpRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody java.util.Map<String, String> body) {
        String credential = body.get("credential");
        if (credential == null || credential.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Google credential is required.");
        }
        try {
            String[] parts = credential.split("\\.");
            if (parts.length < 2) {
                return ResponseEntity.badRequest().body("Invalid Google token.");
            }
            
            String payloadB64 = parts[1];
            byte[] decodedBytes = java.util.Base64.getUrlDecoder().decode(payloadB64);
            String payloadJson = new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8);
            
            com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode payload = objectMapper.readTree(payloadJson);
            
            String email = payload.path("email").asText();
            String name = payload.path("name").asText();
            
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Email not found in Google token.");
            }
            
            return ResponseEntity.ok(authService.loginOrRegisterGoogleUser(email, name));
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to process Google login: " + e.getMessage());
        }
    }
}
