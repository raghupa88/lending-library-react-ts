package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.BookingResponse;
import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.domain.entity.Batch;
import com.lendinglibrary.domain.entity.Booking;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.BookingStatus;
import com.lendinglibrary.domain.enums.PaymentPurpose;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.BatchRepository;
import com.lendinglibrary.infrastructure.persistence.BookingRepository;
import com.lendinglibrary.domain.enums.BatchStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BatchRepository batchRepository;
    private final UserService userService;
    private final DomainEventPublisher events;
    private final PaymentService paymentService;

    @Transactional
    public BookingResponse bookSeat(UUID batchId, String email, PaymentInput paymentInput) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
        if (batch.getStatus() != BatchStatus.PUBLISHED) {
            throw new BusinessException("This batch isn't open for booking");
        }

        User user = userService.findByEmail(email);
        boolean alreadyBooked = bookingRepository.findByBatchAndUser(batch, user).stream()
                .anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED);
        if (alreadyBooked) {
            throw new BusinessException("You already have a booking for this batch");
        }

        long confirmedCount = bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED);
        BookingStatus status = confirmedCount < batch.getCapacity()
                ? BookingStatus.CONFIRMED : BookingStatus.WAITLISTED;

        BigDecimal amountDue = paymentService.priceForUser(user, batch.getFee());
        if (amountDue.compareTo(BigDecimal.ZERO) > 0) {
            // Paid batches can't be waitlisted yet — charging for a seat that
            // isn't guaranteed would need a hold/refund flow this phase
            // doesn't build (docs/adr/ADR-013-learn-l5-scope.md).
            if (status == BookingStatus.WAITLISTED) {
                throw new BusinessException("This batch is full — paid batches can't be waitlisted yet");
            }
            if (paymentInput == null) {
                throw new BusinessException("Payment details are required for this batch");
            }
            Payment payment = paymentService.charge(
                    user, PaymentPurpose.BATCH_BOOKING, batch.getId(), amountDue, paymentInput);
            if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
                throw new BusinessException(payment.getFailureReason());
            }
        }

        Booking booking = bookingRepository.save(Booking.builder()
                .batch(batch).user(user).status(status).bookedAt(LocalDateTime.now()).amountPaid(amountDue).build());

        if (status == BookingStatus.CONFIRMED) {
            publishBatchBooked(booking, user);
        }

        return BookingResponse.from(booking);
    }

    @Transactional
    public void cancelBooking(UUID bookingId, String email) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        User user = userService.findByEmail(email);
        if (!booking.getUser().getId().equals(user.getId())) {
            throw new BusinessException("This booking doesn't belong to you");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BusinessException("This booking is already cancelled");
        }

        boolean wasConfirmed = booking.getStatus() == BookingStatus.CONFIRMED;
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        if (wasConfirmed) {
            promoteFromWaitlist(booking.getBatch());
        }
    }

    private void promoteFromWaitlist(Batch batch) {
        List<Booking> waitlisted = bookingRepository
                .findByBatchAndStatusOrderByBookedAtAsc(batch, BookingStatus.WAITLISTED);
        if (waitlisted.isEmpty()) return;

        Booking next = waitlisted.get(0);
        next.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(next);
        publishBatchBooked(next, next.getUser());
    }

    private void publishBatchBooked(Booking booking, User user) {
        events.publish(Topics.COURSE_EVENTS, "batch.booked", booking.getId().toString(), Map.of(
                "userId", user.getId().toString(),
                "userEmail", user.getEmail(),
                "batchId", booking.getBatch().getId().toString(),
                "courseTitle", booking.getBatch().getCourse().getTitle()
        ));
    }

    public List<BookingResponse> myBookings(String email) {
        User user = userService.findByEmail(email);
        return bookingRepository.findByUserOrderByBookedAtDesc(user).stream()
                .map(BookingResponse::from).toList();
    }
}
