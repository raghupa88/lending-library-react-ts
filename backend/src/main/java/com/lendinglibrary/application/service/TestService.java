package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TestService {

    private final LearnTestRepository testRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttemptRepository attemptRepository;
    private final UserService userService;

    @Transactional
    public AdminTestSummaryResponse createTest(UUID courseId, TestRequest req) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        LearnTest test = testRepository.save(LearnTest.builder()
                .course(course).title(req.title()).passPercent(req.passPercent())
                .timeLimitMin(req.timeLimitMin()).attemptsAllowed(req.attemptsAllowed())
                .build());
        return AdminTestSummaryResponse.from(test, 0);
    }

    @Transactional
    public AdminQuestionResponse addQuestion(UUID testId, QuestionRequest req) {
        LearnTest test = findTestOrThrow(testId);
        int nextOrder = questionRepository.countByTest(test);
        Question question = questionRepository.save(Question.builder()
                .test(test).prompt(req.prompt()).kind(req.kind()).sortOrder(nextOrder).build());

        List<AdminOptionResponse> options = req.options().stream().map(input -> {
            QuestionOption saved = optionRepository.save(QuestionOption.builder()
                    .question(question).label(input.label()).correct(input.correct())
                    .sortOrder(optionRepository.countByQuestion(question)).build());
            return AdminOptionResponse.from(saved);
        }).toList();

        return AdminQuestionResponse.from(question, options);
    }

    public List<AdminTestSummaryResponse> listForAdmin(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        return testRepository.findByCourse(course).stream()
                .map(t -> AdminTestSummaryResponse.from(t, questionRepository.countByTest(t)))
                .toList();
    }

    public AdminTestDetailResponse getForAdmin(UUID testId) {
        LearnTest test = findTestOrThrow(testId);
        List<AdminQuestionResponse> questions = questionRepository.findByTestOrderBySortOrderAsc(test).stream()
                .map(q -> AdminQuestionResponse.from(q,
                        optionRepository.findByQuestionOrderBySortOrderAsc(q).stream()
                                .map(AdminOptionResponse::from).toList()))
                .toList();
        return AdminTestDetailResponse.from(test, questions);
    }

    public List<TestListItemResponse> listForLearner(UUID courseId, String email) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        User user = requireEnrolledUser(course, email);
        return testRepository.findByCourse(course).stream()
                .map(t -> {
                    List<Attempt> attempts = attemptRepository.findByTestAndUser(t, user);
                    Integer bestScore = attempts.stream()
                            .map(Attempt::getScorePercent).filter(s -> s != null)
                            .max(Integer::compareTo).orElse(null);
                    boolean passed = attempts.stream().anyMatch(a -> Boolean.TRUE.equals(a.getPassed()));
                    return TestListItemResponse.from(t, attempts.size(), bestScore, passed);
                })
                .toList();
    }

    public TestForLearnerResponse getForLearner(UUID testId, String email) {
        LearnTest test = findTestOrThrow(testId);
        User user = requireEnrolledUser(test.getCourse(), email);
        int attemptsUsed = attemptRepository.countByTestAndUser(test, user);
        List<QuestionResponse> questions = questionRepository.findByTestOrderBySortOrderAsc(test).stream()
                .map(q -> QuestionResponse.from(q,
                        optionRepository.findByQuestionOrderBySortOrderAsc(q).stream()
                                .map(OptionResponse::from).toList()))
                .toList();
        return TestForLearnerResponse.from(test, attemptsUsed, questions);
    }

    public LearnTest findTestOrThrow(UUID testId) {
        return testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));
    }

    private User requireEnrolledUser(Course course, String email) {
        User user = userService.findByEmail(email);
        enrollmentRepository.findByUserAndCourse(user, course)
                .orElseThrow(() -> new BusinessException("You must enroll in this course first"));
        return user;
    }
}
