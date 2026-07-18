package com.interviewprep.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.backend.entity.SessionQuestion;
import com.interviewprep.backend.entity.InterviewSession;
import com.interviewprep.backend.repository.SessionQuestionRepository;
import com.interviewprep.backend.repository.InterviewSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class EvaluationService {

    private final GeminiService geminiService;
    private final SessionQuestionRepository sessionQuestionRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final ObjectMapper objectMapper;

    public EvaluationService(GeminiService geminiService,
                             SessionQuestionRepository sessionQuestionRepository,
                             InterviewSessionRepository interviewSessionRepository,
                             ObjectMapper objectMapper) {
        this.geminiService = geminiService;
        this.sessionQuestionRepository = sessionQuestionRepository;
        this.interviewSessionRepository = interviewSessionRepository;
        this.objectMapper = objectMapper;
    }

    @Async
    @Transactional
    public void evaluateAnswerAsync(UUID sessionQuestionId, String userAnswer) {
        log.info("Starting async evaluation for SessionQuestion: {}", sessionQuestionId);
        try {
            SessionQuestion sq = sessionQuestionRepository.findById(sessionQuestionId)
                    .orElseThrow(() -> new RuntimeException("SessionQuestion not found: " + sessionQuestionId));

            String feedbackJson = geminiService.evaluateAnswer(
                    sq.getQuestion().getText(),
                    userAnswer,
                    sq.getSession().getRole(),
                    sq.getSession().getDifficulty().name(),
                    sq.getSession().getType().name(),
                    sq.getSession().getGeminiApiKey()
            );

            // Parse score from feedbackJson
            int score = 70; // Default fallback score
            try {
                JsonNode root = objectMapper.readTree(feedbackJson);
                if (root.has("score")) {
                    score = root.path("score").asInt();
                }
            } catch (Exception e) {
                log.warn("Failed to parse score from feedback JSON, using default. Error: {}", e.getMessage());
            }

            sq.setUserAnswer(userAnswer);
            sq.setAiFeedback(feedbackJson);
            sq.setScore(score);
            sessionQuestionRepository.save(sq);
            log.info("Async evaluation completed for SessionQuestion: {}. Score: {}", sessionQuestionId, score);

            // Check if all questions in the session are now evaluated to close the session
            checkAndCompleteSession(sq.getSession().getId());

        } catch (Exception e) {
            log.error("Error evaluating answer asynchronously for SessionQuestion: {}", sessionQuestionId, e);
        }
    }

    @Transactional
    public void checkAndCompleteSession(UUID sessionId) {
        InterviewSession session = interviewSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        List<SessionQuestion> questions = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session);
        
        boolean allAnswered = true;
        boolean allEvaluated = true;
        int totalScore = 0;
        int count = 0;

        for (SessionQuestion sq : questions) {
            if (sq.getUserAnswer() == null || sq.getUserAnswer().trim().isEmpty()) {
                allAnswered = false;
            }
            if (sq.getScore() == null) {
                allEvaluated = false;
            } else {
                totalScore += sq.getScore();
                count++;
            }
        }

        // If all questions are answered and evaluated, complete the session
        if (allAnswered && allEvaluated && count > 0) {
            session.setStatus(InterviewSession.SessionStatus.COMPLETED);
            session.setEndedAt(LocalDateTime.now());
            session.setOverallScore(totalScore / count);
            interviewSessionRepository.save(session);
            log.info("Session {} has been completed automatically with overall score: {}", sessionId, session.getOverallScore());
        }
    }
}
