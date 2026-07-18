package com.interviewprep.backend.repository;

import com.interviewprep.backend.entity.Question;
import com.interviewprep.backend.entity.InterviewSession.DifficultyLevel;
import com.interviewprep.backend.entity.InterviewSession.InterviewType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByTypeAndDifficulty(InterviewType type, DifficultyLevel difficulty);
}
