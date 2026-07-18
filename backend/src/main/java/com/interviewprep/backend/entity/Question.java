package com.interviewprep.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 1000)
    private String text;

    private String topic;

    @Enumerated(EnumType.STRING)
    private InterviewSession.DifficultyLevel difficulty;

    @Enumerated(EnumType.STRING)
    private InterviewSession.InterviewType type;
}
