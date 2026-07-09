package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.Organization;
import com.lendinglibrary.domain.entity.OrganizationMember;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    List<OrganizationMember> findByOrganizationOrderByJoinedAt(Organization organization);

    Optional<OrganizationMember> findByOrganizationAndUser(Organization organization, User user);

    boolean existsByUser(User user);
}
