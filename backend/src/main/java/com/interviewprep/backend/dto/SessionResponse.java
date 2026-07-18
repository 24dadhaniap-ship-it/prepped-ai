package com.interviewprep.backend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    private UUID id;
    private String type;
    private String role;
    private String difficulty;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer overallScore;
    private Integer questionsCount;
    private List<QuestionDto> questions;
}
