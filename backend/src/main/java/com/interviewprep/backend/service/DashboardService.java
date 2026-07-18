package com.interviewprep.backend.service;

import com.interviewprep.backend.dto.DashboardStatsResponse;
import com.interviewprep.backend.entity.InterviewSession;
import com.interviewprep.backend.entity.User;
import com.interviewprep.backend.repository.InterviewSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final InterviewSessionRepository sessionRepository;

    public DashboardService(InterviewSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(User user) {
        List<InterviewSession> allSessions = sessionRepository.findByUserOrderByStartedAtDesc(user);
        
        List<InterviewSession> completedSessions = allSessions.stream()
                .filter(s -> s.getStatus() == InterviewSession.SessionStatus.COMPLETED && s.getOverallScore() != null)
                .toList();

        // 1. Overall average score
        double avgScore = completedSessions.stream()
                .mapToInt(InterviewSession::getOverallScore)
                .average()
                .orElse(0.0);
        
        avgScore = Math.round(avgScore * 10.0) / 10.0;

        // 2. Total Sessions
        long totalSessions = allSessions.size();

        // 3. Category Averages
        Map<String, Double> categoryAverages = completedSessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getType().name(),
                        Collectors.averagingDouble(InterviewSession::getOverallScore)
                ));

        categoryAverages.forEach((key, val) -> categoryAverages.put(key, Math.round(val * 10.0) / 10.0));

        // 4. Streak Calculation
        int streak = calculateStreak(completedSessions);

        // 5. Recent Sessions DTO mapping
        List<DashboardStatsResponse.RecentSessionDto> recentList = allSessions.stream()
                .limit(5)
                .map(s -> DashboardStatsResponse.RecentSessionDto.builder()
                        .id(s.getId())
                        .type(s.getType().name())
                        .role(s.getRole())
                        .difficulty(s.getDifficulty().name())
                        .overallScore(s.getOverallScore())
                        .endedAt(s.getEndedAt())
                        .build()
                ).toList();

        return DashboardStatsResponse.builder()
                .overallAverageScore(avgScore)
                .totalSessions(totalSessions)
                .currentStreak(streak)
                .categoryAverages(categoryAverages)
                .recentSessions(recentList)
                .build();
    }

    private int calculateStreak(List<InterviewSession> sessions) {
        if (sessions.isEmpty()) {
            return 0;
        }

        // Get unique completion dates sorted descending
        Set<LocalDate> dates = sessions.stream()
                .filter(s -> s.getEndedAt() != null)
                .map(s -> s.getEndedAt().toLocalDate())
                .collect(Collectors.toCollection(() -> new TreeSet<LocalDate>(Comparator.reverseOrder())));

        if (dates.isEmpty()) {
            return 0;
        }

        int streak = 0;
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // If the most recent completion is neither today nor yesterday, the streak is 0
        LocalDate firstDate = dates.iterator().next();
        if (!firstDate.equals(today) && !firstDate.equals(yesterday)) {
            return 0;
        }

        LocalDate expected = firstDate;
        for (LocalDate date : dates) {
            if (date.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else {
                break;
            }
        }

        return streak;
    }
}
