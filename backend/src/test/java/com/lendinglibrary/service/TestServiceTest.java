package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.QuestionOptionInput;
import com.lendinglibrary.api.dto.QuestionRequest;
import com.lendinglibrary.api.dto.TestRequest;
import com.lendinglibrary.application.service.TestService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.QuestionKind;
import com.lendinglibrary.domain.enums.Role;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestServiceTest {

    @Mock LearnTestRepository testRepository;
    @Mock QuestionRepository questionRepository;
    @Mock QuestionOptionRepository optionRepository;
    @Mock CourseRepository courseRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock AttemptRepository attemptRepository;
    @Mock UserService userService;
    @InjectMocks TestService testService;

    private User user;
    private Course course;
    private LearnTest test;

    @BeforeEach
    void setUp() {
        user = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        test = LearnTest.builder().id(UUID.randomUUID()).course(course).title("Module 1 Quiz")
                .passPercent(70).timeLimitMin(10).attemptsAllowed(2).build();
    }

    @Test
    void createTest_success() {
        var req = new TestRequest("Module 1 Quiz", 70, 10, 2);
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(testRepository.save(any())).thenAnswer(inv -> {
            LearnTest t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        var result = testService.createTest(course.getId(), req);

        assertThat(result.title()).isEqualTo("Module 1 Quiz");
        assertThat(result.passPercent()).isEqualTo(70);
    }

    @Test
    void createTest_courseNotFound_throws() {
        UUID id = UUID.randomUUID();
        when(courseRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> testService.createTest(id, new TestRequest("x", 70, 10, 2)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addQuestion_appendsAtNextSortOrderWithOptions() {
        var req = new QuestionRequest("2 + 2 = ?", QuestionKind.SINGLE, List.of(
                new QuestionOptionInput("3", false),
                new QuestionOptionInput("4", true)
        ));
        when(testRepository.findById(test.getId())).thenReturn(Optional.of(test));
        when(questionRepository.countByTest(test)).thenReturn(0);
        when(questionRepository.save(any())).thenAnswer(inv -> {
            Question q = inv.getArgument(0);
            q.setId(UUID.randomUUID());
            return q;
        });
        when(optionRepository.countByQuestion(any())).thenReturn(0, 1);
        when(optionRepository.save(any())).thenAnswer(inv -> {
            QuestionOption o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        var result = testService.addQuestion(test.getId(), req);

        assertThat(result.prompt()).isEqualTo("2 + 2 = ?");
        assertThat(result.options()).hasSize(2);
        assertThat(result.options().get(1).correct()).isTrue();
    }

    @Test
    void listForLearner_notEnrolled_throws() {
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> testService.listForLearner(course.getId(), "member@example.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("enroll");
    }

    @Test
    void listForLearner_returnsAttemptStatusPerTest() {
        Enrollment enrollment = Enrollment.builder().id(UUID.randomUUID()).user(user).course(course).build();
        Attempt passedAttempt = Attempt.builder().scorePercent(80).passed(true).build();
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(testRepository.findByCourse(course)).thenReturn(List.of(test));
        when(attemptRepository.findByTestAndUser(test, user)).thenReturn(List.of(passedAttempt));

        var result = testService.listForLearner(course.getId(), "member@example.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).passed()).isTrue();
        assertThat(result.get(0).bestScorePercent()).isEqualTo(80);
        assertThat(result.get(0).attemptsUsed()).isEqualTo(1);
    }

    @Test
    void getForLearner_optionsExcludeCorrectFlag() {
        Enrollment enrollment = Enrollment.builder().id(UUID.randomUUID()).user(user).course(course).build();
        Question question = Question.builder().id(UUID.randomUUID()).test(test)
                .prompt("2 + 2 = ?").kind(QuestionKind.SINGLE).sortOrder(0).build();
        QuestionOption option = QuestionOption.builder().id(UUID.randomUUID()).question(question)
                .label("4").correct(true).sortOrder(0).build();
        when(testRepository.findById(test.getId())).thenReturn(Optional.of(test));
        when(userService.findByEmail("member@example.com")).thenReturn(user);
        when(enrollmentRepository.findByUserAndCourse(user, course)).thenReturn(Optional.of(enrollment));
        when(attemptRepository.countByTestAndUser(test, user)).thenReturn(0);
        when(questionRepository.findByTestOrderBySortOrderAsc(test)).thenReturn(List.of(question));
        when(optionRepository.findByQuestionOrderBySortOrderAsc(question)).thenReturn(List.of(option));

        var result = testService.getForLearner(test.getId(), "member@example.com");

        assertThat(result.questions()).hasSize(1);
        // OptionResponse has no `correct` field at all — this just proves the
        // learner-facing shape carries the option through without the answer key.
        assertThat(result.questions().get(0).options().get(0).label()).isEqualTo("4");
    }
}
