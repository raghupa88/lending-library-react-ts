package com.lendinglibrary.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GiftRedeemRequest(@NotBlank String giftCode) {
}
