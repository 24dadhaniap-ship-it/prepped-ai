package com.interviewprep.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "session_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "user_answer", length = 4000)
    private String userAnswer;

    @Column(name = "ai_feedback", length = 4000)
    private String aiFeedback;

    private Integer score;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
}
