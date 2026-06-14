package com.lendinglibrary.controller;

import com.lendinglibrary.api.controller.BookController;
import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.application.service.BookService;
import com.lendinglibrary.infrastructure.security.JwtProvider;
import com.lendinglibrary.infrastructure.security.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean BookService bookService;
    @MockBean JwtProvider jwtProvider;
    @MockBean UserDetailsServiceImpl userDetailsService;

    @Test
    void getBooks_returns200WithPagedResponse() throws Exception {
        var book = new BookResponse(UUID.randomUUID(), "The Alchemist", "Paulo Coelho",
                "978-0062315007", "A story about dreams.", 5, 4, true,
                new BigDecimal("9.99"), "Fiction", "Fiction", "English",
                208, 4.7, "https://example.com/cover.jpg", 1988, LocalDateTime.now());

        var paged = new PagedResponse<>(List.of(book), 1, 1L, 0, 20, false, false);
        when(bookService.list(isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                .thenReturn(paged);

        mockMvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].title").value("The Alchemist"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }
}
