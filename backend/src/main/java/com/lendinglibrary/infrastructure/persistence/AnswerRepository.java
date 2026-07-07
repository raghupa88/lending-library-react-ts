package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Answer;
import com.lendinglibrary.domain.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnswerRepository extends JpaRepository<Answer, UUID> {
    List<Answer> findByAttempt(Attempt attempt);
}
