package com.chat.controller;

import com.chat.dto.AuthRequest;
import com.chat.dto.AuthResponse;
import com.chat.dto.RegisterRequest;
import com.chat.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return ResponseEntity.ok(
                authService.register(request)
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody AuthRequest request) {

        return ResponseEntity.ok(
                authService.login(request)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            Authentication authentication) {

        authService.logout(authentication.getName());

        return ResponseEntity.ok("Logged out successfully");
    }
}