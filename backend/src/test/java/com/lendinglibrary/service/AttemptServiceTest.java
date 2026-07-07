package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.AnswerInput;
import com.lendinglibrary.api.dto.AttemptSubmitRequest;
import com.lendinglibrary.application.service.AttemptService;
import com.lendinglibrary.application.service.TestService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.QuestionKind;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
class AttemptServiceTest {

    @Mock AttemptRepository attemptRepository;
    @Mock AnswerRepository answerRepository;
    @Mock QuestionRepository questionRepository;
    @Mock QuestionOptionRepository optionRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock CertificateRepository certificateRepository;
    @Mock TestService testService;
    @Mock UserService userService;
    @Mock DomainEventPublisher events;
    @InjectMocks AttemptService attemptService;

    private User user;
    private Course course;
    private LearnTest test;
    private Question question;
    private QuestionOption correctOption;
    private QuestionOption wrongOption;
    private Enrollment enrollment;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        test = LearnTest.builder().id(UUID.randomUUID()).course(course).title("Quiz")
                .passPercent(70).timeLimitMin(10).attemptsAllowed(2).build();
        question = Question.builder().id(UUID.randomUUID()).test(test)
                .prompt("2 + 2 = ?").kind(QuestionKind.SINGLE).sortOrder(0).build();
        correctOption = QuestionOption.builder().id(UUID.randomUUID()).question(question)
                .label("4").correct(true).sortOrder(0).build();
        wrongOption = QuestionOption.builder().id(UUID.randomUUID()).question(question)
                .label("3").correct(false).sortOrder(1).build();
        enrollment = Enrollment.builder().id(UUID.randomUUID()).user(user).course(course).build();
    }

    @Test
    void startAttempt_notEnrolled_throws() {
        when(testService.findTestOrThrow(test.getId())).thenReturn(test);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attemptService.startAttempt(test.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("enroll");
    }

    @Test
    void startAttempt_noQuestions_throws() {
        when(testService.findTestOrThrow(test.getId())).thenReturn(test);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(questionRepository.countByTest(test)).thenReturn(0);

        assertThatThrownBy(() -> attemptService.startAttempt(test.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no questions");
    }

    @Test
    void startAttempt_attemptsExhausted_throws() {
        when(testService.findTestOrThrow(test.getId())).thenReturn(test);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(questionRepository.countByTest(test)).thenReturn(1);
        when(attemptRepository.countByTestAndUser(test, user)).thenReturn(2);

        assertThatThrownBy(() -> attemptService.startAttempt(test.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("attempts");
    }

    @Test
    void startAttempt_success() {
        when(testService.findTestOrThrow(test.getId())).thenReturn(test);
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(questionRepository.countByTest(test)).thenReturn(1);
        when(attemptRepository.countByTestAndUser(test, user)).thenReturn(0);
        when(attemptRepository.save(any())).thenAnswer(inv -> {
            Attempt a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        var result = attemptService.startAttempt(test.getId(), "member@example.com");

        assertThat(result.testId()).isEqualTo(test.getId());
        assertThat(result.timeLimitMin()).isEqualTo(10);
    }

    private Attempt freshAttempt() {
        return Attempt.builder().id(UUID.randomUUID()).test(test).user(user).build();
    }

    @Test
    void submitAttempt_correctAnswer_passesAndIssuesCertificate() {
        Attempt attempt = freshAttempt();
        var req = new AttemptSubmitRequest(List.of(new AnswerInput(question.getId(), List.of(correctOption.getId()))));
        when(attemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(questionRepository.findByTestOrderBySortOrderAsc(test)).thenReturn(List.of(question));
        when(optionRepository.findByQuestionOrderBySortOrderAsc(question)).thenReturn(List.of(correctOption, wrongOption));
        when(certificateRepository.findByUserAndCourse(user, course)).thenReturn(Optional.empty());
        when(certificateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.countByTestAndUser(test, user)).thenReturn(1);

        var result = attemptService.submitAttempt(attempt.getId(), req, "member@example.com");

        assertThat(result.scorePercent()).isEqualTo(100);
        assertThat(result.passed()).isTrue();
        assertThat(result.certificateIssued()).isTrue();
        assertThat(result.certificateSerial()).isNotNull();
        verify(events).publish(eq(Topics.COURSE_EVENTS), eq("test.passed"), any(), any(Map.class));
    }

    @Test
    void submitAttempt_wrongAnswer_fails() {
        Attempt attempt = freshAttempt();
        var req = new AttemptSubmitRequest(List.of(new AnswerInput(question.getId(), List.of(wrongOption.getId()))));
        when(attemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(questionRepository.findByTestOrderBySortOrderAsc(test)).thenReturn(List.of(question));
        when(optionRepository.findByQuestionOrderBySortOrderAsc(question)).thenReturn(List.of(correctOption, wrongOption));

        var result = attemptService.submitAttempt(attempt.getId(), req, "member@example.com");

        assertThat(result.scorePercent()).isEqualTo(0);
        assertThat(result.passed()).isFalse();
        assertThat(result.certificateIssued()).isFalse();
        verify(events, never()).publish(any(), any(), any(), any());
    }

    @Test
    void submitAttempt_alreadyPassedCourse_doesNotDuplicateCertificate() {
        Attempt attempt = freshAttempt();
        var req = new AttemptSubmitRequest(List.of(new AnswerInput(question.getId(), List.of(correctOption.getId()))));
        Certificate existing = Certificate.builder().id(UUID.randomUUID()).user(user).course(course)
                .serial("SUV-EXISTING").build();
        when(attemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(questionRepository.findByTestOrderBySortOrderAsc(test)).thenReturn(List.of(question));
        when(optionRepository.findByQuestionOrderBySortOrderAsc(question)).thenReturn(List.of(correctOption, wrongOption));
        when(certificateRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(existing));
        when(attemptRepository.countByTestAndUser(test, user)).thenReturn(2);

        var result = attemptService.submitAttempt(attempt.getId(), req, "member@example.com");

        assertThat(result.certificateIssued()).isFalse();
        assertThat(result.certificateSerial()).isEqualTo("SUV-EXISTING");
        verify(certificateRepository, never()).save(any());
    }

    @Test
    void submitAttempt_wrongUser_throws() {
        Attempt attempt = freshAttempt();
        User otherUser = User.builder().id(UUID.randomUUID()).email("other@example.com").role(Role.MEMBER).build();
        when(attemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userService.findByEmail("other@example.com")).thenReturn(otherUser);

        assertThatThrownBy(() -> attemptService.submitAttempt(
                attempt.getId(), new AttemptSubmitRequest(List.of()), "other@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("doesn't belong to you");
    }

    @Test
    void submitAttempt_alreadySubmitted_throws() {
        Attempt attempt = freshAttempt();
        attempt.setSubmittedAt(java.time.LocalDateTime.now());
        when(attemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userService.findByEmail("member@example.com")).thenReturn(user);

        assertThatThrownBy(() -> attemptService.submitAttempt(
                attempt.getId(), new AttemptSubmitRequest(List.of()), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already been submitted");
    }
}
