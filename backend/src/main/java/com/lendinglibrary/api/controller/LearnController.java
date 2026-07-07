package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.application.service.AttemptService;
import com.lendinglibrary.application.service.BatchService;
import com.lendinglibrary.application.service.BookingService;
import com.lendinglibrary.application.service.CertificateService;
import com.lendinglibrary.application.service.CourseService;
import com.lendinglibrary.application.service.EnrollmentService;
import com.lendinglibrary.application.service.LessonProgressService;
import com.lendinglibrary.application.service.TestService;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseTrack;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/learn")
@RequiredArgsConstructor
@Tag(name = "Learn")
public class LearnController {

    private final CourseService courseService;
    private final EnrollmentService enrollmentService;
    private final LessonProgressService lessonProgressService;
    private final TestService testService;
    private final AttemptService attemptService;
    private final CertificateService certificateService;
    private final BatchService batchService;
    private final BookingService bookingService;

    @GetMapping("/courses")
    @Operation(summary = "Browse published courses with optional filters")
    public ResponseEntity<ApiResponse<PagedResponse<CourseSummaryResponse>>> list(
            @RequestParam(required = false) CourseTrack track,
            @RequestParam(required = false) CourseLevel level,
            @RequestParam(required = false) String language,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                courseService.listPublished(track, level, language, page, size)));
    }

    @GetMapping("/courses/{slug}")
    @Operation(summary = "Get a published course's full syllabus by slug")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.getPublishedBySlug(slug)));
    }

    @PostMapping("/courses/{id}/enroll")
    @Operation(summary = "Enroll in a free course")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                enrollmentService.enroll(id, user.getUsername()), "Enrolled!"));
    }

    @GetMapping("/me/enrollments")
    @Operation(summary = "List the current user's course enrollments")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> myEnrollments(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(enrollmentService.myEnrollments(user.getUsername())));
    }

    @GetMapping("/courses/{id}/progress")
    @Operation(summary = "Get the current user's lesson-completion progress for an enrolled course")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> getProgress(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(lessonProgressService.getProgress(id, user.getUsername())));
    }

    @PostMapping("/lessons/{id}/complete")
    @Operation(summary = "Mark a lesson complete for the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> completeLesson(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                lessonProgressService.completeLesson(id, user.getUsername()), "Lesson completed"));
    }

    @GetMapping("/courses/{id}/tests")
    @Operation(summary = "List this course's tests with the current user's attempt status")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<TestListItemResponse>>> listTests(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(testService.listForLearner(id, user.getUsername())));
    }

    @GetMapping("/tests/{id}")
    @Operation(summary = "Get a test's questions for taking it (no answer key)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<TestForLearnerResponse>> getTest(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(testService.getForLearner(id, user.getUsername())));
    }

    @PostMapping("/tests/{id}/attempts")
    @Operation(summary = "Start a new attempt at a test")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<AttemptStartResponse>> startAttempt(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                attemptService.startAttempt(id, user.getUsername()), "Attempt started"));
    }

    @PostMapping("/attempts/{id}/submit")
    @Operation(summary = "Submit answers for an attempt and get the scored result")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<AttemptResultResponse>> submitAttempt(
            @PathVariable UUID id, @Valid @RequestBody AttemptSubmitRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                attemptService.submitAttempt(id, req, user.getUsername()), "Attempt submitted"));
    }

    @GetMapping("/me/certificates")
    @Operation(summary = "List the current user's earned certificates")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<CertificateResponse>>> myCertificates(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.myCertificates(user.getUsername())));
    }

    @GetMapping("/certificates/{serial}")
    @Operation(summary = "Publicly verify a certificate by its serial")
    public ResponseEntity<ApiResponse<CertificateVerifyResponse>> verifyCertificate(
            @PathVariable String serial) {
        return ResponseEntity.ok(ApiResponse.ok(certificateService.verify(serial)));
    }

    @GetMapping("/courses/{id}/batches")
    @Operation(summary = "List a course's upcoming published in-person batches")
    public ResponseEntity<ApiResponse<List<BatchForLearnerResponse>>> listBatches(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        String email = user == null ? null : user.getUsername();
        return ResponseEntity.ok(ApiResponse.ok(batchService.listForLearner(id, email)));
    }

    @PostMapping("/batches/{id}/book")
    @Operation(summary = "Book a seat in a batch (waitlisted automatically once full)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<BookingResponse>> bookSeat(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                bookingService.bookSeat(id, user.getUsername()), "Seat booked!"));
    }

    @DeleteMapping("/bookings/{id}")
    @Operation(summary = "Cancel a booking (promotes the next waitlisted learner if this seat was confirmed)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> cancelBooking(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails user) {
        bookingService.cancelBooking(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null, "Booking cancelled"));
    }

    @GetMapping("/me/bookings")
    @Operation(summary = "List the current user's batch bookings")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> myBookings(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.myBookings(user.getUsername())));
    }
}
