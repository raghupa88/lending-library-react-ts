package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.application.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
@Tag(name = "Books")
public class BookController {

    private final BookService bookService;

    @GetMapping
    @Operation(summary = "List all books with optional filters")
    public ResponseEntity<ApiResponse<PagedResponse<BookResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        // Accept both "category" and "genre" to match frontend filters
        String categoryFilter = category != null ? category : genre;
        return ResponseEntity.ok(ApiResponse.ok(
                bookService.list(search, categoryFilter, language, available, page, size)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a book by ID")
    public ResponseEntity<ApiResponse<BookResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookService.getById(id)));
    }
}
