package com.lendinglibrary.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.ActivityEntry;
import com.lendinglibrary.domain.entity.ProcessedActivityEvent;
import com.lendinglibrary.infrastructure.events.ActivityConsumer;
import com.lendinglibrary.infrastructure.events.DomainEvent;
import com.lendinglibrary.infrastructure.persistence.ActivityRepository;
import com.lendinglibrary.infrastructure.persistence.BookBorrowCountRepository;
import com.lendinglibrary.infrastructure.persistence.ProcessedActivityEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityConsumerTest {

    @Mock ProcessedActivityEventRepository processedActivityEventRepository;
    @Mock ActivityRepository activityRepository;
    @Mock BookBorrowCountRepository bookBorrowCountRepository;

    private ActivityConsumer consumer;
    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        consumer = new ActivityConsumer(
                new ObjectMapper().findAndRegisterModules(),
                processedActivityEventRepository, activityRepository, bookBorrowCountRepository);
    }

    private String payload(UUID eventId, String topicType, Map<String, Object> extra) throws Exception {
        var data = new java.util.HashMap<String, Object>();
        data.put("userId", userId.toString());
        data.put("userEmail", "member@example.com");
        data.putAll(extra);
        var event = new DomainEvent(eventId, topicType, "ref-1", LocalDateTime.now(), data);
        return new ObjectMapper().findAndRegisterModules().writeValueAsString(event);
    }

    @Test
    void onLoanEvent_created_recordsActivityAndIncrementsBorrowCount() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onLoanEvent(payload(eventId, "loan.created",
                Map.of("bookId", bookId.toString(), "bookTitle", "The Alchemist", "dueDate", "2026-08-01")));

        verify(activityRepository).save(argThat((ActivityEntry a) ->
                a.getKey().getUserId().equals(userId) && a.getKey().getEventId().equals(eventId)
                        && a.getType().equals("loan.created") && a.getSummary().contains("The Alchemist")));
        verify(bookBorrowCountRepository).increment(bookId);
        verify(processedActivityEventRepository).save(argThat((ProcessedActivityEvent p) -> p.getEventId().equals(eventId)));
    }

    @Test
    void onLoanEvent_returned_doesNotIncrementBorrowCount() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onLoanEvent(payload(eventId, "loan.returned",
                Map.of("bookId", bookId.toString(), "bookTitle", "The Alchemist")));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("Returned")));
        verifyNoInteractions(bookBorrowCountRepository);
    }

    @Test
    void onLoanEvent_redelivery_isANoOp() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(true);

        consumer.onLoanEvent(payload(eventId, "loan.created",
                Map.of("bookId", bookId.toString(), "bookTitle", "The Alchemist")));

        verifyNoInteractions(activityRepository, bookBorrowCountRepository);
        verify(processedActivityEventRepository, never()).save(any());
    }

    @Test
    void onSubscriptionEvent_changed_recordsActivity() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onSubscriptionEvent(payload(eventId, "subscription.changed", Map.of("plan", "PREMIUM")));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("PREMIUM")));
    }

    @Test
    void onCourseEvent_testPassed_includesScore() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onCourseEvent(payload(eventId, "test.passed",
                Map.of("courseTitle", "Money Foundations", "scorePercent", "100")));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("100")));
    }

    @Test
    void onBookEvent_bookUpdated_isSkipped() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onBookEvent(payload(eventId, "book.updated", Map.of("action", "updated", "title", "X", "author", "Y")));

        verifyNoInteractions(activityRepository);
        // Still marked processed so a redelivery doesn't keep re-evaluating it.
        verify(processedActivityEventRepository).save(any());
    }

    @Test
    void onBookEvent_reservationReady_recordsActivity() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onBookEvent(payload(eventId, "reservation.ready", Map.of("bookTitle", "The Alchemist")));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("The Alchemist")));
    }

    @Test
    void onUserEvent_referralCredited_recordsActivity() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onUserEvent(payload(eventId, "referral.credited", Map.of("creditAmount", "50.00")));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("50.00")));
    }

    @Test
    void onPaymentEvent_succeeded_recordsActivity() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onPaymentEvent(payload(eventId, "payment.succeeded",
                Map.of("amount", "199.00", "purpose", "COURSE_ENROLLMENT", "referenceId", UUID.randomUUID().toString())));

        verify(activityRepository).save(argThat((ActivityEntry a) ->
                a.getSummary().contains("199.00") && a.getSummary().contains("course enrollment")));
    }

    @Test
    void onPaymentEvent_failed_recordsActivity() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedActivityEventRepository.existsById(eventId)).thenReturn(false);

        consumer.onPaymentEvent(payload(eventId, "payment.failed",
                Map.of("amount", "199.00", "purpose", "BATCH_BOOKING", "referenceId", UUID.randomUUID().toString())));

        verify(activityRepository).save(argThat((ActivityEntry a) -> a.getSummary().contains("failed")));
    }
}
