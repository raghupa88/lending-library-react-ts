package com.lendinglibrary.api.dto;

import com.lendinglibrary.domain.entity.Venue;

import java.util.UUID;

public record VenueResponse(UUID id, String name, String address, String city, int capacityDefault) {
    public static VenueResponse from(Venue v) {
        return new VenueResponse(v.getId(), v.getName(), v.getAddress(), v.getCity(), v.getCapacityDefault());
    }
}
