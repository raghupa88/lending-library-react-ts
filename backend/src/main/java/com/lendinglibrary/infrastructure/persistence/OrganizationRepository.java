package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Organization;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByOwner(User owner);

    Optional<Organization> findByJoinCode(String joinCode);

    boolean existsByJoinCode(String joinCode);

    boolean existsByOwner(User owner);
}
