package com.interviewprep.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewType type;

    @Column(nullable = false)
    private String role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DifficultyLevel difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "overall_score")
    private Integer overallScore;

    @Column(name = "questions_count", nullable = false)
    @Builder.Default
    private Integer questionsCount = 3;

    @Column(name = "gemini_api_key")
    private String geminiApiKey;

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
        if (status == null) {
            status = SessionStatus.CREATED;
        }
    }

    public enum InterviewType {
        TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, HR
    }

    public enum DifficultyLevel {
        EASY, MEDIUM, HARD
    }

    public enum SessionStatus {
        CREATED, ACTIVE, COMPLETED
    }
}
