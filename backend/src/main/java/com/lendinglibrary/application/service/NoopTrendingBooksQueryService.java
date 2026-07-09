package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.TrendingBookResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;

/** Active whenever the {@code cassandra} profile isn't — see {@link TrendingBooksQueryService}. */
@Service
@Profile("!cassandra")
public class NoopTrendingBooksQueryService implements TrendingBooksQueryService {

    @Override
    public List<TrendingBookResponse> topN(int n) {
        return List.of();
    }
}
