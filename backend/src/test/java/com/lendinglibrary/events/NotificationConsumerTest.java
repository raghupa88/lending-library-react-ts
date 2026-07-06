package com.lendinglibrary.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lendinglibrary.domain.entity.ProcessedEvent;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.infrastructure.events.DomainEvent;
import com.lendinglibrary.infrastructure.events.NotificationConsumer;
import com.lendinglibrary.infrastructure.persistence.NotificationRepository;
import com.lendinglibrary.infrastructure.persistence.ProcessedEventRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationConsumerTest {

    @Mock ProcessedEventRepository processedEventRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock JavaMailSender mailSender;

    private NotificationConsumer consumer;
    private User user;

    @BeforeEach
    void setUp() {
        // Real ObjectMapper: we want actual JSON (de)serialization behavior,
        // not a mock that can't parse anything.
        consumer = new NotificationConsumer(
                new ObjectMapper().findAndRegisterModules(),
                processedEventRepository, notificationRepository, userRepository, mailSender);
        user = User.builder().id(UUID.randomUUID()).email("member@example.com")
                .firstName("Test").lastName("Member").role(Role.MEMBER).build();
    }

    private String loanCreatedPayload(UUID eventId) throws Exception {
        var event = new DomainEvent(eventId, "loan.created", "loan-1", LocalDateTime.now(),
                Map.of("userEmail", user.getEmail(), "bookTitle", "The Alchemist", "dueDate", "2026-08-01"));
        return new ObjectMapper().findAndRegisterModules().writeValueAsString(event);
    }

    @Test
    void onLoanEvent_createsNotificationAndSendsEmail() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedEventRepository.existsById(eventId)).thenReturn(false);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        consumer.onLoanEvent(loanCreatedPayload(eventId));

        verify(notificationRepository).save(argThat(n ->
                n.getUser() == user && n.getType().equals("loan.created")
                        && n.getTitle().contains("The Alchemist")));
        verify(mailSender).send(any(SimpleMailMessage.class));
        verify(processedEventRepository).save(argThat((ProcessedEvent p) -> p.getEventId().equals(eventId)));
    }

    @Test
    void onLoanEvent_redelivery_isANoOp() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedEventRepository.existsById(eventId)).thenReturn(true);

        consumer.onLoanEvent(loanCreatedPayload(eventId));

        verifyNoInteractions(notificationRepository, mailSender);
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void onLoanEvent_mailFailure_stillPersistsTheNotification() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedEventRepository.existsById(eventId)).thenReturn(false);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        consumer.onLoanEvent(loanCreatedPayload(eventId));

        verify(notificationRepository).save(any());
        verify(processedEventRepository).save(any());
    }

    @Test
    void onLoanEvent_unknownUser_isSkippedWithoutError() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(processedEventRepository.existsById(eventId)).thenReturn(false);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.empty());

        consumer.onLoanEvent(loanCreatedPayload(eventId));

        verifyNoInteractions(notificationRepository, mailSender);
        // The event is still marked processed — retrying won't find the user either.
        verify(processedEventRepository).save(any());
    }
}
