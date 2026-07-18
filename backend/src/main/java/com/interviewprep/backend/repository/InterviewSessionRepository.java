package com.interviewprep.backend.repository;

import com.interviewprep.backend.entity.InterviewSession;
import com.interviewprep.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {
    List<InterviewSession> findByUserOrderByStartedAtDesc(User user);
}
