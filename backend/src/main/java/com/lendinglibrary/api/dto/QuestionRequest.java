package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.enums.QuestionKind;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record QuestionRequest(
        @NotBlank String prompt,
        @NotNull QuestionKind kind,
        @NotEmpty @Valid List<QuestionOptionInput> options
) {}
