package com.lendinglibrary.infrastructure.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.ActivityEntry;
import com.lendinglibrary.domain.entity.ActivityEntryKey;
import com.lendinglibrary.domain.entity.ProcessedActivityEvent;
import com.lendinglibrary.infrastructure.persistence.ActivityRepository;
import com.lendinglibrary.infrastructure.persistence.BookBorrowCountRepository;
import com.lendinglibrary.infrastructure.persistence.ProcessedActivityEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Turns every user-scoped domain event into a row in Cassandra's
 * {@code activity_by_user} (see ADR-025) and increments
 * {@code book_borrow_counts} on {@code loan.created}. Uses its own
 * consumer group ("activity-feed", not NotificationConsumer's
 * "notifications") so both get an independent full copy of every topic
 * instead of competing for partitions within the same group.
 *
 * <p>The activity row write is naturally idempotent (its primary key is
 * the event's own id, so a redelivery just overwrites identical data) —
 * but the counter increment is not (a counter accumulates deltas, so a
 * redelivered {@code loan.created} would double-count a borrow without
 * the {@link ProcessedActivityEventRepository} guard below).
 */
@Component
@Profile("kafka & cassandra")
@RequiredArgsConstructor
@Slf4j
public class ActivityConsumer {

    private static final String GROUP = "activity-feed";

    private final ObjectMapper objectMapper;
    private final ProcessedActivityEventRepository processedActivityEventRepository;
    private final ActivityRepository activityRepository;
    private final BookBorrowCountRepository bookBorrowCountRepository;

    @KafkaListener(topics = Topics.LOAN_EVENTS, groupId = GROUP)
    public void onLoanEvent(String payload) {
        handle(payload, event -> {
            recordForUser(event, summarizeLoanEvent(event));
            if ("loan.created".equals(event.type())) {
                bookBorrowCountRepository.increment(UUID.fromString((String) event.data().get("bookId")));
            }
        });
    }

    @KafkaListener(topics = Topics.SUBSCRIPTION_EVENTS, groupId = GROUP)
    public void onSubscriptionEvent(String payload) {
        handle(payload, event -> recordForUser(event, summarizeSubscriptionEvent(event)));
    }

    @KafkaListener(topics = Topics.COURSE_EVENTS, groupId = GROUP)
    public void onCourseEvent(String payload) {
        handle(payload, event -> recordForUser(event, summarizeCourseEvent(event)));
    }

    @KafkaListener(topics = Topics.BOOK_EVENTS, groupId = GROUP)
    public void onBookEvent(String payload) {
        handle(payload, event -> {
            if (!"reservation.ready".equals(event.type())) {
                // book.updated is an admin catalog edit with no member to attribute it to.
                return;
            }
            recordForUser(event, "\"" + event.data().get("bookTitle") + "\" became ready for pickup");
        });
    }

    @KafkaListener(topics = Topics.USER_EVENTS, groupId = GROUP)
    public void onUserEvent(String payload) {
        handle(payload, event -> recordForUser(event, summarizeUserEvent(event)));
    }

    @KafkaListener(topics = Topics.PAYMENT_EVENTS, groupId = GROUP)
    public void onPaymentEvent(String payload) {
        handle(payload, event -> recordForUser(event, summarizePaymentEvent(event)));
    }

    private void handle(String payload, Consumer<DomainEvent> action) {
        DomainEvent event;
        try {
            event = objectMapper.readValue(payload, DomainEvent.class);
        } catch (Exception e) {
            log.error("Unparseable event on activity-feed topic, skipping: {}", e.getMessage());
            return;
        }
        processIdempotently(event, action);
    }

    @Transactional
    void processIdempotently(DomainEvent event, Consumer<DomainEvent> action) {
        if (processedActivityEventRepository.existsById(event.eventId())) {
            log.debug("Event {} already processed by activity-feed, skipping (at-least-once redelivery)", event.eventId());
            return;
        }
        action.accept(event);
        processedActivityEventRepository.save(ProcessedActivityEvent.builder().eventId(event.eventId()).build());
    }

    private void recordForUser(DomainEvent event, String summary) {
        String userIdStr = (String) event.data().get("userId");
        if (userIdStr == null) return;

        activityRepository.save(ActivityEntry.builder()
                .key(ActivityEntryKey.builder()
                        .userId(UUID.fromString(userIdStr))
                        .occurredAt(event.occurredAt().atZone(ZoneId.systemDefault()).toInstant())
                        .eventId(event.eventId())
                        .build())
                .type(event.type())
                .summary(summary)
                .build());
    }

    private String summarizeLoanEvent(DomainEvent event) {
        String bookTitle = (String) event.data().get("bookTitle");
        return switch (event.type()) {
            case "loan.created" -> "Borrowed \"" + bookTitle + "\"";
            case "loan.renewed" -> "Renewed \"" + bookTitle + "\"";
            default -> "Returned \"" + bookTitle + "\"";
        };
    }

    private String summarizeSubscriptionEvent(DomainEvent event) {
        String plan = (String) event.data().get("plan");
        return switch (event.type()) {
            case "subscription.paused" -> "Paused the " + plan + " subscription";
            case "subscription.resumed" -> "Resumed the " + plan + " subscription";
            default -> "Subscribed to the " + plan + " plan";
        };
    }

    private String summarizeCourseEvent(DomainEvent event) {
        String courseTitle = (String) event.data().get("courseTitle");
        return switch (event.type()) {
            case "course.enrolled" -> "Enrolled in \"" + courseTitle + "\"";
            case "test.passed" -> "Passed the test for \"" + courseTitle + "\" (" + event.data().get("scorePercent") + "%)";
            case "batch.booked" -> "Booked a seat for \"" + courseTitle + "\"";
            default -> event.type();
        };
    }

    private String summarizeUserEvent(DomainEvent event) {
        return switch (event.type()) {
            case "referral.credited" -> "Earned ₹" + event.data().get("creditAmount") + " in referral credit";
            case "gift.received" -> "Received a gifted " + event.data().get("plan") + " subscription";
            case "gift.redeemed" -> event.data().get("redeemedByName") + " redeemed your gifted "
                    + event.data().get("plan") + " subscription";
            default -> event.type();
        };
    }

    private String summarizePaymentEvent(DomainEvent event) {
        String amount = (String) event.data().get("amount");
        String purpose = ((String) event.data().get("purpose")).replace("_", " ").toLowerCase();
        return "payment.succeeded".equals(event.type())
                ? "Paid ₹" + amount + " for " + purpose
                : "A ₹" + amount + " payment for " + purpose + " failed";
    }
}
