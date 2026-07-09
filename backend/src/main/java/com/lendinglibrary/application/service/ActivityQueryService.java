package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.ActivityEntryResponse;

import java.util.List;
import java.util.UUID;

/**
 * Reads a user's recent activity feed. Backed by Cassandra when the
 * {@code cassandra} profile is active, or a no-op empty list otherwise —
 * see {@link NoopActivityQueryService} and ADR-025. This mirrors the
 * project's existing stance on optional infrastructure (e.g. mail being a
 * best-effort side channel): dev/CI/test never need a Cassandra cluster
 * just to call this endpoint.
 */
public interface ActivityQueryService {
    List<ActivityEntryResponse> recentFor(UUID userId);
}
