package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.CourseDetailResponse;
import com.lendinglibrary.api.dto.CourseProgressResponse;
import com.lendinglibrary.api.dto.CourseSummaryResponse;
import com.lendinglibrary.api.dto.EnrollmentResponse;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.application.service.CourseService;
import com.lendinglibrary.application.service.EnrollmentService;
import com.lendinglibrary.application.service.LessonProgressService;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseTrack;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
}
