package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.BookRequest;
import com.lendinglibrary.api.dto.BookResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/books")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Books")
@SecurityRequirement(name = "bearerAuth")
public class AdminBookController {

    private final BookService bookService;

    @PostMapping
    @Operation(summary = "Create a new book")
    public ResponseEntity<ApiResponse<BookResponse>> create(@Valid @RequestBody BookRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookService.create(req), "Book created"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a book")
    public ResponseEntity<ApiResponse<BookResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody BookRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(bookService.update(id, req), "Book updated"));
    }
}
