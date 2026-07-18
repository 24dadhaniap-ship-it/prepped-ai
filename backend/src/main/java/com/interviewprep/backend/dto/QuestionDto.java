package com.interviewprep.backend.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDto {
    private UUID id;
    private String text;
    private String topic;
    private String difficulty;
    private String type;
    private String userAnswer;
    private String aiFeedback;
    private Integer score;
}
