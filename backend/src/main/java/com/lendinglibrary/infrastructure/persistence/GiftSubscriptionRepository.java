package com.lendinglibrary.infrastructure.persistence;

import com.lendinglibrary.domain.entity.GiftSubscription;
import com.lendinglibrary.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GiftSubscriptionRepository extends JpaRepository<GiftSubscription, UUID> {

    Optional<GiftSubscription> findByGiftCode(String giftCode);

    boolean existsByGiftCode(String giftCode);

    List<GiftSubscription> findByPurchaserOrderByPurchasedAtDesc(User purchaser);
}
