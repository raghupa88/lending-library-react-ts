package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.ActivityEntryResponse;
import com.lendinglibrary.infrastructure.persistence.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@Profile("cassandra")
@RequiredArgsConstructor
public class CassandraActivityQueryService implements ActivityQueryService {

    private final ActivityRepository activityRepository;

    @Override
    public List<ActivityEntryResponse> recentFor(UUID userId) {
        return activityRepository.findFirst30ByKeyUserId(userId).stream()
                .map(ActivityEntryResponse::from)
                .toList();
    }
}
