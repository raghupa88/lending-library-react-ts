package com.lendinglibrary.infrastructure.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.Notification;
import com.lendinglibrary.domain.entity.ProcessedEvent;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.infrastructure.persistence.NotificationRepository;
import com.lendinglibrary.infrastructure.persistence.ProcessedEventRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns loan/subscription events into an in-app notification row plus a
 * best-effort email. Kafka delivery is at-least-once, so every handler
 * checks {@link ProcessedEventRepository} first and is a no-op on replay —
 * this is what "idempotent consumer" means in practice, not just a phrase.
 */
@Component
@Profile("kafka")
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final ObjectMapper objectMapper;
    private final ProcessedEventRepository processedEventRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @KafkaListener(topics = Topics.LOAN_EVENTS, groupId = "notifications")
    public void onLoanEvent(String payload) {
        handle(payload, this::notifyForLoanEvent);
    }

    @KafkaListener(topics = Topics.SUBSCRIPTION_EVENTS, groupId = "notifications")
    public void onSubscriptionEvent(String payload) {
        handle(payload, this::notifyForSubscriptionEvent);
    }

    @KafkaListener(topics = Topics.COURSE_EVENTS, groupId = "notifications")
    public void onCourseEvent(String payload) {
        handle(payload, this::notifyForCourseEvent);
    }

    private void handle(String payload, java.util.function.Consumer<DomainEvent> action) {
        DomainEvent event;
        try {
            event = objectMapper.readValue(payload, DomainEvent.class);
        } catch (Exception e) {
            log.error("Unparseable event on notifications topic, skipping: {}", e.getMessage());
            return;
        }
        processIdempotently(event, action);
    }

    @Transactional
    void processIdempotently(DomainEvent event, java.util.function.Consumer<DomainEvent> action) {
        if (processedEventRepository.existsById(event.eventId())) {
            log.debug("Event {} already processed, skipping (at-least-once redelivery)", event.eventId());
            return;
        }
        action.accept(event);
        processedEventRepository.save(ProcessedEvent.builder().eventId(event.eventId()).build());
    }

    private void notifyForLoanEvent(DomainEvent event) {
        String userEmail = (String) event.data().get("userEmail");
        String bookTitle = (String) event.data().get("bookTitle");
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) return;

        String title;
        String body;
        if ("loan.created".equals(event.type())) {
            title = "You borrowed \"" + bookTitle + "\"";
            body = "Due back on " + event.data().get("dueDate") + ". Happy reading!";
        } else {
            title = "You returned \"" + bookTitle + "\"";
            body = "Thanks for returning it on time — browse the shelf for your next read.";
        }
        saveAndEmail(user, event.type(), title, body);
    }

    private void notifyForSubscriptionEvent(DomainEvent event) {
        String userEmail = (String) event.data().get("userEmail");
        String plan = (String) event.data().get("plan");
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) return;

        saveAndEmail(user, event.type(),
                "You're now on the " + plan + " plan",
                "Your subscription change is active immediately.");
    }

    private void notifyForCourseEvent(DomainEvent event) {
        String userEmail = (String) event.data().get("userEmail");
        String courseTitle = (String) event.data().get("courseTitle");
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) return;

        String title;
        String body;
        switch (event.type()) {
            case "course.enrolled" -> {
                title = "You're enrolled in \"" + courseTitle + "\"";
                body = "Head to Suvadi Learn to start your first lesson.";
            }
            case "test.passed" -> {
                title = "You passed the test for \"" + courseTitle + "\"!";
                body = "Scored " + event.data().get("scorePercent") + "%. Check your certificates on the dashboard.";
            }
            case "batch.booked" -> {
                title = "Seat confirmed for \"" + courseTitle + "\"";
                body = "You're booked into the in-person batch — see your dashboard for the schedule.";
            }
            default -> {
                log.warn("Unhandled course event type, skipping: {}", event.type());
                return;
            }
        }
        saveAndEmail(user, event.type(), title, body);
    }

    private void saveAndEmail(User user, String type, String title, String body) {
        notificationRepository.save(Notification.builder()
                .user(user).type(type).title(title).body(body).build());

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject(title);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            // Email is a best-effort side channel; the in-app notification above
            // is already durable, so a mail-server hiccup must not fail the consumer.
            log.warn("Failed to send notification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
