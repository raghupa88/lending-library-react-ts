package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.VenueRequest;
import com.lendinglibrary.application.service.VenueService;
import com.lendinglibrary.domain.entity.Venue;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VenueServiceTest {

    @Mock VenueRepository venueRepository;
    @InjectMocks VenueService venueService;

    @Test
    void create_success() {
        var req = new VenueRequest("Suvadi Hall", "12 MG Road", "Chennai", 20);
        when(venueRepository.save(any())).thenAnswer(inv -> {
            Venue v = inv.getArgument(0);
            v.setId(UUID.randomUUID());
            return v;
        });

        var result = venueService.create(req);

        assertThat(result.name()).isEqualTo("Suvadi Hall");
        assertThat(result.capacityDefault()).isEqualTo(20);
    }

    @Test
    void update_notFound_throws() {
        UUID id = UUID.randomUUID();
        when(venueRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> venueService.update(id, new VenueRequest("x", null, "Chennai", 10)))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
