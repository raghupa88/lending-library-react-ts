package com.lendinglibrary.service;

import com.lendinglibrary.application.service.NoopActivityQueryService;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class NoopActivityQueryServiceTest {

    @Test
    void recentFor_returnsEmptyList() {
        assertThat(new NoopActivityQueryService().recentFor(UUID.randomUUID())).isEmpty();
    }
}
