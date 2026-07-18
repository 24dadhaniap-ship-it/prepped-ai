package com.interviewprep.backend.dto;

import com.interviewprep.backend.entity.InterviewSession.DifficultyLevel;
import com.interviewprep.backend.entity.InterviewSession.InterviewType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionCreateRequest {
    @NotNull
    private InterviewType type;

    @NotBlank
    private String role;

    @NotNull
    private DifficultyLevel difficulty;

    private Integer questionsCount;
}
