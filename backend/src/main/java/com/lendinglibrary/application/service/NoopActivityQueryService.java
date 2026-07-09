package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.ActivityEntryResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/** Active whenever the {@code cassandra} profile isn't — see {@link ActivityQueryService}. */
@Service
@Profile("!cassandra")
public class NoopActivityQueryService implements ActivityQueryService {

    @Override
    public List<ActivityEntryResponse> recentFor(UUID userId) {
        return List.of();
    }
}
