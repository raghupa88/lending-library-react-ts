package com.lendinglibrary.it;

import com.lendinglibrary.api.dto.PaymentInput;
import com.lendinglibrary.application.service.EnrollmentService;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.Payment;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.PaymentStatus;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.EnrollmentRepository;
import com.lendinglibrary.infrastructure.persistence.PaymentRepository;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ADR-013 claims {@code PaymentService.charge}'s {@code REQUIRES_NEW}
 * transaction lets a payment audit row survive the caller's rollback —
 * a claim Mockito-mocked unit tests can assert was *called* but can't
 * prove actually *commits independently* under a real transaction
 * manager. This runs the real enrollment flow against a real Postgres
 * transaction to prove it.
 */
@SpringBootTest
@Testcontainers
class PaymentAuditTransactionIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired EnrollmentService enrollmentService;
    @Autowired UserRepository userRepository;
    @Autowired CourseRepository courseRepository;
    @Autowired EnrollmentRepository enrollmentRepository;
    @Autowired PaymentRepository paymentRepository;

    @Test
    void declinedPayment_rollsBackEnrollment_butPaymentAuditRowSurvives() {
        User user = userRepository.save(User.builder()
                .email("it-declined@example.com").passwordHash("hash")
                .firstName("IT").lastName("Learner").build());
        Course course = courseRepository.save(Course.builder()
                .slug("it-paid-course-declined").title("IT Paid Course").track(CourseTrack.MONEY_FOUNDATIONS)
                .level(CourseLevel.BEGINNER).language("English").summary("Integration test fixture")
                .price(new BigDecimal("500.00")).status(CourseStatus.PUBLISHED).build());

        PaymentInput declinedCard = new PaymentInput("IT Learner", "4000000000000002", "12", "2030", "123");

        assertThatThrownBy(() -> enrollmentService.enroll(course.getId(), user.getEmail(), declinedCard))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("declined");

        assertThat(enrollmentRepository.findByUserAndCourse(user, course)).isEmpty();

        var payments = paymentRepository.findAll().stream()
                .filter(p -> p.getReferenceId().equals(course.getId()))
                .toList();
        assertThat(payments).hasSize(1);
        Payment payment = payments.get(0);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(payment.getFailureReason()).contains("declined");
    }

    @Test
    void successfulPayment_enrollsAndPersistsBothRows() {
        User user = userRepository.save(User.builder()
                .email("it-success@example.com").passwordHash("hash")
                .firstName("IT").lastName("Learner").build());
        Course course = courseRepository.save(Course.builder()
                .slug("it-paid-course-success").title("IT Paid Course Success").track(CourseTrack.MONEY_FOUNDATIONS)
                .level(CourseLevel.BEGINNER).language("English").summary("Integration test fixture")
                .price(new BigDecimal("400.00")).status(CourseStatus.PUBLISHED).build());

        PaymentInput validCard = new PaymentInput("IT Learner", "4242424242424242", "12", "2030", "123");

        var result = enrollmentService.enroll(course.getId(), user.getEmail(), validCard);

        assertThat(result.amountPaid()).isEqualByComparingTo("400.00");
        assertThat(enrollmentRepository.findByUserAndCourse(user, course)).isPresent();

        var payments = paymentRepository.findAll().stream()
                .filter(p -> p.getReferenceId().equals(course.getId()))
                .toList();
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
    }
}
