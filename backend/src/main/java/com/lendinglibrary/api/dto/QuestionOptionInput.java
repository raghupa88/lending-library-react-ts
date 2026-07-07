package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotBlank;

public record QuestionOptionInput(@NotBlank String label, boolean correct) {}
