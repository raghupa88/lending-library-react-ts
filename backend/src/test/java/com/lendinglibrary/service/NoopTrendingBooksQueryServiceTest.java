package com.lendinglibrary.service;

import com.lendinglibrary.application.service.NoopTrendingBooksQueryService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NoopTrendingBooksQueryServiceTest {

    @Test
    void topN_returnsEmptyList() {
        assertThat(new NoopTrendingBooksQueryService().topN(5)).isEmpty();
    }
}
