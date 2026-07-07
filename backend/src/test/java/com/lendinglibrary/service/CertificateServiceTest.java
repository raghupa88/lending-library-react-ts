package com.lendinglibrary.service;

import com.lendinglibrary.application.service.CertificateService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.Certificate;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CertificateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock CertificateRepository certificateRepository;
    @Mock UserService userService;
    @InjectMocks CertificateService certificateService;

    private User user;
    private Course course;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com")
                .firstName("Priya").lastName("Raman").role(Role.MEMBER).build();
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
    }

    @Test
    void myCertificates_returnsList() {
        Certificate cert = Certificate.builder().id(UUID.randomUUID()).user(user).course(course)
                .issuedAt(LocalDateTime.now()).serial("SUV-ABCD1234").build();
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(certificateRepository.findByUserOrderByIssuedAtDesc(user)).thenReturn(List.of(cert));

        var result = certificateService.myCertificates("member@example.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).courseTitle()).isEqualTo("Money Foundations");
    }

    @Test
    void verify_knownSerial_returnsLearnerAndCourse() {
        Certificate cert = Certificate.builder().id(UUID.randomUUID()).user(user).course(course)
                .issuedAt(LocalDateTime.now()).serial("SUV-ABCD1234").build();
        when(certificateRepository.findBySerial("SUV-ABCD1234")).thenReturn(Optional.of(cert));

        var result = certificateService.verify("SUV-ABCD1234");

        assertThat(result.learnerName()).isEqualTo("Priya Raman");
        assertThat(result.courseTitle()).isEqualTo("Money Foundations");
    }

    @Test
    void verify_unknownSerial_throws() {
        when(certificateRepository.findBySerial("SUV-NOPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> certificateService.verify("SUV-NOPE"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
