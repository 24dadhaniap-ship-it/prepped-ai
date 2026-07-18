package com.interviewprep.backend.service;

import com.interviewprep.backend.dto.AuthResponse;
import com.interviewprep.backend.dto.LoginRequest;
import com.interviewprep.backend.dto.SignUpRequest;
import com.interviewprep.backend.entity.User;
import com.interviewprep.backend.repository.UserRepository;
import com.interviewprep.backend.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(loginRequest.getEmail());
        
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .targetRole(user.getTargetRole())
                .experienceLevel(user.getExperienceLevel())
                .build();
    }

    public AuthResponse signup(SignUpRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new IllegalArgumentException("Email address already in use!");
        }

        User user = User.builder()
                .email(signUpRequest.getEmail())
                .passwordHash(passwordEncoder.encode(signUpRequest.getPassword()))
                .name(signUpRequest.getName())
                .targetRole(signUpRequest.getTargetRole())
                .experienceLevel(signUpRequest.getExperienceLevel())
                .build();

        User savedUser = userRepository.save(user);
        String jwt = tokenProvider.generateToken(savedUser.getEmail());

        return AuthResponse.builder()
                .token(jwt)
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .name(savedUser.getName())
                .targetRole(savedUser.getTargetRole())
                .experienceLevel(savedUser.getExperienceLevel())
                .build();
    }

    @Transactional
    public AuthResponse loginOrRegisterGoogleUser(String email, String name) {
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .name(name != null ? name : "Google User")
                    .passwordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .targetRole("Software Engineer")
                    .experienceLevel("Mid-Level")
                    .build();
            return userRepository.save(newUser);
        });

        String jwt = tokenProvider.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .targetRole(user.getTargetRole())
                .experienceLevel(user.getExperienceLevel())
                .build();
    }
}
