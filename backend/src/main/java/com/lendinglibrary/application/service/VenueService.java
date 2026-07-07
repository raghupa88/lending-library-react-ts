package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.VenueRequest;
import com.lendinglibrary.api.dto.VenueResponse;
import com.lendinglibrary.domain.entity.Venue;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;

    public List<VenueResponse> list() {
        return venueRepository.findAll().stream().map(VenueResponse::from).toList();
    }

    @Transactional
    public VenueResponse create(VenueRequest req) {
        Venue venue = venueRepository.save(Venue.builder()
                .name(req.name()).address(req.address()).city(req.city())
                .capacityDefault(req.capacityDefault()).build());
        return VenueResponse.from(venue);
    }

    @Transactional
    public VenueResponse update(UUID id, VenueRequest req) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + id));
        venue.setName(req.name());
        venue.setAddress(req.address());
        venue.setCity(req.city());
        venue.setCapacityDefault(req.capacityDefault());
        return VenueResponse.from(venueRepository.save(venue));
    }
}
