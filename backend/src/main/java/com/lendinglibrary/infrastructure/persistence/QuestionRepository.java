package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.LearnTest;
import com.lendinglibrary.domain.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByTestOrderBySortOrderAsc(LearnTest test);
    int countByTest(LearnTest test);
}
