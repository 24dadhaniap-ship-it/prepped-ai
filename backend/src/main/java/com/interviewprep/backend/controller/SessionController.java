package com.interviewprep.backend.controller;

import com.interviewprep.backend.dto.SessionCreateRequest;
import com.interviewprep.backend.dto.SessionResponse;
import com.interviewprep.backend.dto.SubmitAnswerRequest;
import com.interviewprep.backend.entity.User;
import com.interviewprep.backend.repository.UserRepository;
import com.interviewprep.backend.security.RateLimiterService;
import com.interviewprep.backend.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interviews")
public class SessionController {

    private final SessionService sessionService;
    private final UserRepository userRepository;
    private final RateLimiterService rateLimiterService;

    public SessionController(SessionService sessionService,
                             UserRepository userRepository,
                             RateLimiterService rateLimiterService) {
        this.sessionService = sessionService;
        this.userRepository = userRepository;
        this.rateLimiterService = rateLimiterService;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found in database"));
    }

    @PostMapping
    public ResponseEntity<?> createSession(
            @Valid @RequestBody SessionCreateRequest request,
            @RequestHeader(value = "X-Gemini-Key", required = false) String clientApiKey) {
        User user = getCurrentUser();
        if (!rateLimiterService.isAllowed(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Rate limit exceeded. Please wait a moment before starting a new interview.");
        }
        return ResponseEntity.ok(sessionService.createSession(request, user, clientApiKey));
    }

    @GetMapping
    public ResponseEntity<List<SessionResponse>> getUserSessions() {
        User user = getCurrentUser();
        return ResponseEntity.ok(sessionService.getUserSessions(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getSession(@PathVariable UUID id) {
        User user = getCurrentUser();
        return ResponseEntity.ok(sessionService.getSession(id, user));
    }

    @PostMapping("/{id}/questions/{questionId}/answer")
    public ResponseEntity<?> submitAnswer(
            @PathVariable UUID id,
            @PathVariable UUID questionId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        User user = getCurrentUser();
        
        if (!rateLimiterService.isAllowed(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Rate limit exceeded. Please wait before submitting another answer.");
        }
        
        return ResponseEntity.ok(sessionService.submitAnswer(id, questionId, request.getAnswer(), user));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<SessionResponse> completeSession(@PathVariable UUID id) {
        User user = getCurrentUser();
        return ResponseEntity.ok(sessionService.completeSession(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSession(@PathVariable UUID id) {
        User user = getCurrentUser();
        sessionService.deleteSession(id, user);
        return ResponseEntity.ok().build();
    }
}
