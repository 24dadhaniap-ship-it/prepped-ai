package com.interviewprep.backend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private Double overallAverageScore;
    private Long totalSessions;
    private Integer currentStreak;
    private Map<String, Double> categoryAverages;
    private List<RecentSessionDto> recentSessions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSessionDto {
        private UUID id;
        private String type;
        private String role;
        private String difficulty;
        private Integer overallScore;
        private LocalDateTime endedAt;
    }
}
