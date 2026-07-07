package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.application.service.BookingService;
import com.lendinglibrary.application.service.PaymentService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.*;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.BatchRepository;
import com.lendinglibrary.infrastructure.persistence.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock BatchRepository batchRepository;
    @Mock UserService userService;
    @Mock DomainEventPublisher events;
    @Mock PaymentService paymentService;
    @InjectMocks BookingService bookingService;

    private Course course;
    private Venue venue;
    private Batch batch;
    private User learner;

    @BeforeEach
    void setUp() {
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        venue = Venue.builder().id(UUID.randomUUID()).name("Suvadi Hall").city("Chennai").capacityDefault(20).build();
        batch = Batch.builder().id(UUID.randomUUID()).course(course).venue(venue).instructorName("Priya Raman")
                .startsOn(LocalDate.of(2026, 8, 1)).endsOn(LocalDate.of(2026, 8, 2))
                .scheduleText("Sat-Sun").capacity(1).fee(BigDecimal.ZERO).status(BatchStatus.PUBLISHED).build();
        learner = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
    }

    @Test
    void bookSeat_confirmsWhenCapacityAvailable() {
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(0L);
        when(paymentService.priceForUser(learner, BigDecimal.ZERO)).thenReturn(BigDecimal.ZERO);
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        var result = bookingService.bookSeat(batch.getId(), "member@example.com", null);

        assertThat(result.status()).isEqualTo("CONFIRMED");
        verify(events).publish(eq(Topics.COURSE_EVENTS), eq("batch.booked"), any(), any(Map.class));
    }

    @Test
    void bookSeat_waitlistsWhenFull_andDoesNotPublish() {
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(1L);
        when(paymentService.priceForUser(learner, BigDecimal.ZERO)).thenReturn(BigDecimal.ZERO);
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        var result = bookingService.bookSeat(batch.getId(), "member@example.com", null);

        assertThat(result.status()).isEqualTo("WAITLISTED");
        verify(events, never()).publish(any(), any(), any(), any());
    }

    @Test
    void bookSeat_alreadyBooked_throws() {
        Booking existing = Booking.builder().batch(batch).user(learner).status(BookingStatus.CONFIRMED).build();
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of(existing));

        assertThatThrownBy(() -> bookingService.bookSeat(batch.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already have a booking");
    }

    @Test
    void bookSeat_unpublishedBatch_throws() {
        batch.setStatus(BatchStatus.DRAFT);
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> bookingService.bookSeat(batch.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("isn't open for booking");
    }

    @Test
    void bookSeat_paidBatch_withoutPaymentDetails_throws() {
        batch.setFee(new BigDecimal("500.00"));
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(0L);
        when(paymentService.priceForUser(learner, new BigDecimal("500.00"))).thenReturn(new BigDecimal("500.00"));

        assertThatThrownBy(() -> bookingService.bookSeat(batch.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Payment details are required");
    }

    @Test
    void bookSeat_paidBatch_fullCapacity_rejectsWaitlisting() {
        batch.setFee(new BigDecimal("500.00"));
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(1L);
        when(paymentService.priceForUser(learner, new BigDecimal("500.00"))).thenReturn(new BigDecimal("500.00"));

        assertThatThrownBy(() -> bookingService.bookSeat(batch.getId(), "member@example.com", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("can't be waitlisted");
    }

    @Test
    void bookSeat_paidBatch_successfulPayment_confirms() {
        batch.setFee(new BigDecimal("500.00"));
        PaymentInput input = new PaymentInput("Test Member", "4242424242424242", "12", "2030", "123");
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(0L);
        when(paymentService.priceForUser(learner, new BigDecimal("500.00"))).thenReturn(new BigDecimal("500.00"));
        when(paymentService.charge(learner, PaymentPurpose.BATCH_BOOKING, batch.getId(),
                new BigDecimal("500.00"), input))
                .thenReturn(Payment.builder().status(PaymentStatus.SUCCEEDED).build());
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        var result = bookingService.bookSeat(batch.getId(), "member@example.com", input);

        assertThat(result.status()).isEqualTo("CONFIRMED");
        assertThat(result.amountPaid()).isEqualByComparingTo("500.00");
    }

    @Test
    void bookSeat_paidBatch_declinedPayment_throws() {
        batch.setFee(new BigDecimal("500.00"));
        PaymentInput input = new PaymentInput("Test Member", "4000000000000002", "12", "2030", "123");
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of());
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(0L);
        when(paymentService.priceForUser(learner, new BigDecimal("500.00"))).thenReturn(new BigDecimal("500.00"));
        when(paymentService.charge(learner, PaymentPurpose.BATCH_BOOKING, batch.getId(),
                new BigDecimal("500.00"), input))
                .thenReturn(Payment.builder().status(PaymentStatus.FAILED).failureReason("Your card was declined").build());

        assertThatThrownBy(() -> bookingService.bookSeat(batch.getId(), "member@example.com", input))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");
    }

    @Test
    void cancelBooking_confirmedSeat_promotesEarliestWaitlisted() {
        UUID bookingId = UUID.randomUUID();
        Booking confirmed = Booking.builder().id(bookingId).batch(batch).user(learner)
                .status(BookingStatus.CONFIRMED).build();
        User waitlistedUser = User.builder().id(UUID.randomUUID()).email("waitlisted@example.com")
                .role(Role.MEMBER).build();
        Booking waitlisted = Booking.builder().id(UUID.randomUUID()).batch(batch).user(waitlistedUser)
                .status(BookingStatus.WAITLISTED).build();

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(confirmed));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndStatusOrderByBookedAtAsc(batch, BookingStatus.WAITLISTED))
                .thenReturn(List.of(waitlisted));

        bookingService.cancelBooking(bookingId, "member@example.com");

        assertThat(confirmed.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(waitlisted.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(events).publish(eq(Topics.COURSE_EVENTS), eq("batch.booked"), any(), any(Map.class));
    }

    @Test
    void cancelBooking_noWaitlist_isANoOp() {
        UUID bookingId = UUID.randomUUID();
        Booking confirmed = Booking.builder().id(bookingId).batch(batch).user(learner)
                .status(BookingStatus.CONFIRMED).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(confirmed));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndStatusOrderByBookedAtAsc(batch, BookingStatus.WAITLISTED))
                .thenReturn(List.of());

        bookingService.cancelBooking(bookingId, "member@example.com");

        assertThat(confirmed.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(events, never()).publish(any(), any(), any(), any());
    }

    @Test
    void cancelBooking_wrongUser_throws() {
        UUID bookingId = UUID.randomUUID();
        User otherUser = User.builder().id(UUID.randomUUID()).email("other@example.com").role(Role.MEMBER).build();
        Booking confirmed = Booking.builder().id(bookingId).batch(batch).user(learner)
                .status(BookingStatus.CONFIRMED).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(confirmed));
        when(userService.findByEmail("other@example.com")).thenReturn(otherUser);

        assertThatThrownBy(() -> bookingService.cancelBooking(bookingId, "other@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("doesn't belong to you");
    }

    @Test
    void cancelBooking_alreadyCancelled_throws() {
        UUID bookingId = UUID.randomUUID();
        Booking cancelled = Booking.builder().id(bookingId).batch(batch).user(learner)
                .status(BookingStatus.CANCELLED).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(cancelled));
        when(userService.findByEmail("member@example.com")).thenReturn(learner);

        assertThatThrownBy(() -> bookingService.cancelBooking(bookingId, "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already cancelled");
    }
}
