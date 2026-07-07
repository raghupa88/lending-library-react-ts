package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Question;
import com.lendinglibrary.domain.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {
    List<QuestionOption> findByQuestionOrderBySortOrderAsc(Question question);
    int countByQuestion(Question question);
}
