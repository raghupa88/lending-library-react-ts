package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.events.DomainEventPublisher;
import com.lendinglibrary.infrastructure.events.Topics;
import com.lendinglibrary.infrastructure.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final AnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final TestService testService;
    private final UserService userService;
    private final DomainEventPublisher events;

    @Transactional
    public AttemptStartResponse startAttempt(UUID testId, String email) {
        LearnTest test = testService.findTestOrThrow(testId);
        User user = userService.findByEmail(email);
        enrollmentRepository.findByUserAndCourse(user, test.getCourse())
                .orElseThrow(() -> new BusinessException("You must enroll in this course first"));

        int questionCount = questionRepository.countByTest(test);
        if (questionCount == 0) {
            throw new BusinessException("This test has no questions yet");
        }
        int attemptsUsed = attemptRepository.countByTestAndUser(test, user);
        if (attemptsUsed >= test.getAttemptsAllowed()) {
            throw new BusinessException("You've used all your attempts for this test");
        }

        Attempt attempt = attemptRepository.save(Attempt.builder()
                .test(test).user(user).startedAt(LocalDateTime.now()).build());
        return AttemptStartResponse.from(attempt, test.getTimeLimitMin());
    }

    @Transactional
    public AttemptResultResponse submitAttempt(UUID attemptId, AttemptSubmitRequest req, String email) {
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));
        User user = userService.findByEmail(email);
        if (!attempt.getUser().getId().equals(user.getId())) {
            throw new BusinessException("This attempt doesn't belong to you");
        }
        if (attempt.getSubmittedAt() != null) {
            throw new BusinessException("This attempt has already been submitted");
        }

        LearnTest test = attempt.getTest();
        List<Question> questions = questionRepository.findByTestOrderBySortOrderAsc(test);
        Map<UUID, List<UUID>> submittedByQuestion = req.answers().stream()
                .collect(Collectors.toMap(AnswerInput::questionId,
                        a -> a.selectedOptionIds() == null ? List.of() : a.selectedOptionIds()));

        int correctCount = 0;
        List<QuestionResultResponse> results = new ArrayList<>();
        for (Question question : questions) {
            List<QuestionOption> allOptions = optionRepository.findByQuestionOrderBySortOrderAsc(question);
            Set<UUID> correctIds = allOptions.stream()
                    .filter(QuestionOption::isCorrect).map(QuestionOption::getId).collect(Collectors.toSet());
            List<UUID> selectedIds = submittedByQuestion.getOrDefault(question.getId(), List.of());
            Set<UUID> selectedSet = new HashSet<>(selectedIds);
            boolean questionCorrect = correctIds.equals(selectedSet);
            if (questionCorrect) correctCount++;

            Set<QuestionOption> selectedOptions = allOptions.stream()
                    .filter(o -> selectedSet.contains(o.getId())).collect(Collectors.toSet());
            answerRepository.save(Answer.builder()
                    .attempt(attempt).question(question).selectedOptions(selectedOptions).build());

            results.add(new QuestionResultResponse(
                    question.getId(), questionCorrect, List.copyOf(correctIds), List.copyOf(selectedSet)));
        }

        int scorePercent = Math.round(correctCount * 100f / questions.size());
        boolean passed = scorePercent >= test.getPassPercent();
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setScorePercent(scorePercent);
        attempt.setPassed(passed);
        attemptRepository.save(attempt);

        boolean certificateIssued = false;
        String certificateSerial = null;
        if (passed) {
            Course course = test.getCourse();
            Certificate certificate = certificateRepository.findByUserAndCourse(user, course).orElse(null);
            if (certificate == null) {
                certificate = certificateRepository.save(Certificate.builder()
                        .user(user).course(course).issuedAt(LocalDateTime.now())
                        .serial("SUV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                        .build());
                certificateIssued = true;
            }
            certificateSerial = certificate.getSerial();

            events.publish(Topics.COURSE_EVENTS, "test.passed", attempt.getId().toString(), Map.of(
                    "userId", user.getId().toString(),
                    "userEmail", user.getEmail(),
                    "courseId", course.getId().toString(),
                    "testId", test.getId().toString(),
                    "scorePercent", String.valueOf(scorePercent)
            ));
        }

        int attemptsUsed = attemptRepository.countByTestAndUser(test, user);
        return new AttemptResultResponse(
                attempt.getId(), scorePercent, passed, attemptsUsed, test.getAttemptsAllowed(),
                certificateIssued, certificateSerial, results
        );
    }
}
