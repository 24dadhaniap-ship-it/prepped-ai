package com.interviewprep.backend.service;

import com.interviewprep.backend.dto.QuestionDto;
import com.interviewprep.backend.dto.SessionCreateRequest;
import com.interviewprep.backend.dto.SessionResponse;
import com.interviewprep.backend.entity.InterviewSession;
import com.interviewprep.backend.entity.Question;
import com.interviewprep.backend.entity.SessionQuestion;
import com.interviewprep.backend.entity.User;
import com.interviewprep.backend.repository.InterviewSessionRepository;
import com.interviewprep.backend.repository.QuestionRepository;
import com.interviewprep.backend.repository.SessionQuestionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class SessionService {

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final SessionQuestionRepository sessionQuestionRepository;
    private final GeminiService geminiService;
    private final EvaluationService evaluationService;

    public SessionService(InterviewSessionRepository sessionRepository,
                          QuestionRepository questionRepository,
                          SessionQuestionRepository sessionQuestionRepository,
                          GeminiService geminiService,
                          EvaluationService evaluationService) {
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.sessionQuestionRepository = sessionQuestionRepository;
        this.geminiService = geminiService;
        this.evaluationService = evaluationService;
    }

    @Transactional
    public SessionResponse createSession(SessionCreateRequest request, User user, String clientApiKey) {
        int questionsCount = request.getQuestionsCount() != null ? request.getQuestionsCount() : -1;
        log.info("Creating session for user {} - Type: {}, Role: {}, Diff: {}, Count: {}", 
                user.getEmail(), request.getType(), request.getRole(), request.getDifficulty(), questionsCount);

        InterviewSession session = InterviewSession.builder()
                .user(user)
                .type(request.getType())
                .role(request.getRole())
                .difficulty(request.getDifficulty())
                .status(InterviewSession.SessionStatus.ACTIVE)
                .startedAt(LocalDateTime.now())
                .questionsCount(questionsCount)
                .geminiApiKey(clientApiKey)
                .build();

        InterviewSession savedSession = sessionRepository.save(session);

        // If endless (-1), generate 10 initial questions. Otherwise generate questionsCount.
        int initialCount = (questionsCount == -1) ? 10 : questionsCount;
        List<Map<String, String>> rawQuestions = geminiService.generateQuestions(
                request.getRole(),
                request.getDifficulty().name(),
                request.getType().name(),
                user.getExperienceLevel() != null ? user.getExperienceLevel() : "Mid-Level",
                initialCount,
                new ArrayList<>(), // No existing questions at start
                clientApiKey
        );

        List<SessionQuestion> sessionQuestions = new ArrayList<>();
        int index = 0;
        for (Map<String, String> rawQ : rawQuestions) {
            Question question = Question.builder()
                    .text(rawQ.get("text"))
                    .topic(rawQ.get("topic"))
                    .difficulty(request.getDifficulty())
                    .type(request.getType())
                    .build();

            Question savedQ = questionRepository.save(question);

            SessionQuestion sq = SessionQuestion.builder()
                    .session(savedSession)
                    .question(savedQ)
                    .orderIndex(index++)
                    .build();

            sessionQuestions.add(sessionQuestionRepository.save(sq));
        }

        return mapToResponse(savedSession, sessionQuestions);
    }

    @Transactional(readOnly = true)
    public SessionResponse getSession(UUID sessionId, User user) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized access to session data.");
        }

        List<SessionQuestion> sqs = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session);
        return mapToResponse(session, sqs);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getUserSessions(User user) {
        List<InterviewSession> sessions = sessionRepository.findByUserOrderByStartedAtDesc(user);
        return sessions.stream().map(s -> {
            List<SessionQuestion> sqs = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(s);
            return mapToResponse(s, sqs);
        }).toList();
    }

    @Transactional
    public SessionResponse submitAnswer(UUID sessionId, UUID questionId, String userAnswer, User user) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized access to session data.");
        }

        if (session.getStatus() == InterviewSession.SessionStatus.COMPLETED) {
            throw new IllegalStateException("Cannot submit answers to a completed session.");
        }

        List<SessionQuestion> sqs = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session);
        
        SessionQuestion targetSq = sqs.stream()
                .filter(sq -> sq.getQuestion().getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question not found in session: " + questionId));

        // Update user answer
        targetSq.setUserAnswer(userAnswer);
        sessionQuestionRepository.save(targetSq);

        // Trigger Async Evaluation using EvaluationService
        evaluationService.evaluateAnswerAsync(targetSq.getId(), userAnswer);

        // If endless, pre-generate next batch of questions asynchronously when running low (remaining <= 5)
        if (session.getQuestionsCount() == -1) {
            int nextOrderIndex = sqs.size();
            int currentOrderIndex = targetSq.getOrderIndex();
            
            if (nextOrderIndex - currentOrderIndex <= 5) {
                // Collect existing questions to prevent duplicates
                List<String> existingQuestions = sqs.stream()
                        .map(sq -> sq.getQuestion().getText())
                        .toList();

                evaluationService.preGenerateQuestionsAsync(
                        session.getId(),
                        existingQuestions,
                        session.getGeminiApiKey()
                );
            }
        }

        // Refresh details (without waiting for async evaluation to complete)
        return mapToResponse(session, sqs);
    }

    @Transactional
    public SessionResponse completeSession(UUID sessionId, User user) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized access to session data.");
        }

        if (session.getStatus() == InterviewSession.SessionStatus.COMPLETED) {
            return mapToResponse(session, sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session));
        }

        List<SessionQuestion> sqs = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session);

        // Compute average score of all answered questions
        int totalScore = 0;
        int evaluatedCount = 0;
        for (SessionQuestion sq : sqs) {
            if (sq.getScore() != null) {
                totalScore += sq.getScore();
                evaluatedCount++;
            }
        }

        session.setStatus(InterviewSession.SessionStatus.COMPLETED);
        session.setEndedAt(LocalDateTime.now());
        session.setOverallScore(evaluatedCount > 0 ? (totalScore / evaluatedCount) : 0);
        sessionRepository.save(session);

        log.info("Session {} manually completed by user. Average score: {}", sessionId, session.getOverallScore());

        return mapToResponse(session, sqs);
    }

    @Transactional
    public void deleteSession(UUID sessionId, User user) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized access to session data.");
        }

        List<SessionQuestion> sqs = sessionQuestionRepository.findBySessionOrderByOrderIndexAsc(session);
        sessionQuestionRepository.deleteAll(sqs);
        sessionRepository.delete(session);
        log.info("Session {} successfully deleted by user {}", sessionId, user.getEmail());
    }

    private SessionResponse mapToResponse(InterviewSession session, List<SessionQuestion> sqs) {
        List<QuestionDto> qDtos = sqs.stream().map(sq -> QuestionDto.builder()
                .id(sq.getQuestion().getId())
                .text(sq.getQuestion().getText())
                .topic(sq.getQuestion().getTopic())
                .difficulty(sq.getQuestion().getDifficulty().name())
                .type(sq.getQuestion().getType().name())
                .userAnswer(sq.getUserAnswer())
                .aiFeedback(sq.getAiFeedback())
                .score(sq.getScore())
                .build()
        ).toList();

        return SessionResponse.builder()
                .id(session.getId())
                .type(session.getType().name())
                .role(session.getRole())
                .difficulty(session.getDifficulty().name())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .overallScore(session.getOverallScore())
                .questionsCount(session.getQuestionsCount())
                .questions(qDtos)
                .build();
    }
}
