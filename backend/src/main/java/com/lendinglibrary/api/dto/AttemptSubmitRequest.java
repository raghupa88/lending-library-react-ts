package com.lendinglibrary.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AttemptSubmitRequest(@NotEmpty @Valid List<AnswerInput> answers) {}
