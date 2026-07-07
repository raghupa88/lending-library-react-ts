package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Attempt;
import com.lendinglibrary.domain.entity.LearnTest;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttemptRepository extends JpaRepository<Attempt, UUID> {
    List<Attempt> findByTestAndUser(LearnTest test, User user);
    int countByTestAndUser(LearnTest test, User user);
}
