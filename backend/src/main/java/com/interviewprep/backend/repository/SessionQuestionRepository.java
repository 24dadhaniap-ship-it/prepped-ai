package com.interviewprep.backend.repository;

import com.interviewprep.backend.entity.InterviewSession;
import com.interviewprep.backend.entity.SessionQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SessionQuestionRepository extends JpaRepository<SessionQuestion, UUID> {
    List<SessionQuestion> findBySessionOrderByOrderIndexAsc(InterviewSession session);
}
