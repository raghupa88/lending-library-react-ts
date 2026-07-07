package com.lendinglibrary.api.controller;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.api.envelope.ApiResponse;
import com.lendinglibrary.application.service.AnalyticsService;
import com.lendinglibrary.application.service.BatchService;
import com.lendinglibrary.application.service.CourseService;
import com.lendinglibrary.application.service.TestService;
import com.lendinglibrary.application.service.VenueService;
import com.lendinglibrary.domain.enums.BatchStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/learn")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Learn")
@SecurityRequirement(name = "bearerAuth")
public class AdminLearnController {

    private final CourseService courseService;
    private final TestService testService;
    private final VenueService venueService;
    private final BatchService batchService;
    private final AnalyticsService analyticsService;

    @GetMapping("/courses")
    @Operation(summary = "List all courses, any status")
    public ResponseEntity<ApiResponse<List<CourseSummaryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(courseService.listAllForAdmin()));
    }

    @GetMapping("/courses/{id}")
    @Operation(summary = "Get a course's full syllabus for editing, any status")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.getByIdForAdmin(id)));
    }

    @PostMapping("/courses")
    @Operation(summary = "Create a draft course")
    public ResponseEntity<ApiResponse<CourseSummaryResponse>> create(@Valid @RequestBody CourseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(courseService.create(req), "Course created"));
    }

    @PutMapping("/courses/{id}")
    @Operation(summary = "Update a course's fields")
    public ResponseEntity<ApiResponse<CourseSummaryResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody CourseRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.update(id, req), "Course updated"));
    }

    @PutMapping("/courses/{id}/publish")
    @Operation(summary = "Publish a course, making it visible to learners")
    public ResponseEntity<ApiResponse<CourseSummaryResponse>> publish(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.setPublished(id, true), "Course published"));
    }

    @PutMapping("/courses/{id}/unpublish")
    @Operation(summary = "Revert a course to draft")
    public ResponseEntity<ApiResponse<CourseSummaryResponse>> unpublish(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.setPublished(id, false), "Course unpublished"));
    }

    @PostMapping("/courses/{id}/modules")
    @Operation(summary = "Append a module to a course")
    public ResponseEntity<ApiResponse<ModuleResponse>> addModule(
            @PathVariable UUID id, @Valid @RequestBody ModuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(courseService.addModule(id, req), "Module added"));
    }

    @PostMapping("/modules/{moduleId}/lessons")
    @Operation(summary = "Append a lesson to a module")
    public ResponseEntity<ApiResponse<LessonResponse>> addLesson(
            @PathVariable UUID moduleId, @Valid @RequestBody LessonRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(courseService.addLesson(moduleId, req), "Lesson added"));
    }

    @GetMapping("/courses/{id}/tests")
    @Operation(summary = "List a course's tests, with question counts")
    public ResponseEntity<ApiResponse<List<AdminTestSummaryResponse>>> listTests(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(testService.listForAdmin(id)));
    }

    @GetMapping("/tests/{id}")
    @Operation(summary = "Get a test's full question bank, including the answer key")
    public ResponseEntity<ApiResponse<AdminTestDetailResponse>> getTest(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(testService.getForAdmin(id)));
    }

    @PostMapping("/courses/{id}/tests")
    @Operation(summary = "Create a test for a course")
    public ResponseEntity<ApiResponse<AdminTestSummaryResponse>> createTest(
            @PathVariable UUID id, @Valid @RequestBody TestRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(testService.createTest(id, req), "Test created"));
    }

    @PostMapping("/tests/{id}/questions")
    @Operation(summary = "Append a question (with its options) to a test")
    public ResponseEntity<ApiResponse<AdminQuestionResponse>> addQuestion(
            @PathVariable UUID id, @Valid @RequestBody QuestionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(testService.addQuestion(id, req), "Question added"));
    }

    @GetMapping("/venues")
    @Operation(summary = "List all venues")
    public ResponseEntity<ApiResponse<List<VenueResponse>>> listVenues() {
        return ResponseEntity.ok(ApiResponse.ok(venueService.list()));
    }

    @PostMapping("/venues")
    @Operation(summary = "Create a venue")
    public ResponseEntity<ApiResponse<VenueResponse>> createVenue(@Valid @RequestBody VenueRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(venueService.create(req), "Venue created"));
    }

    @PutMapping("/venues/{id}")
    @Operation(summary = "Update a venue")
    public ResponseEntity<ApiResponse<VenueResponse>> updateVenue(
            @PathVariable UUID id, @Valid @RequestBody VenueRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(venueService.update(id, req), "Venue updated"));
    }

    @GetMapping("/courses/{id}/batches")
    @Operation(summary = "List a course's in-person batches, with roster counts")
    public ResponseEntity<ApiResponse<List<AdminBatchSummaryResponse>>> listBatches(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(batchService.listForAdmin(id)));
    }

    @GetMapping("/batches/{id}")
    @Operation(summary = "Get a batch's sessions and full roster")
    public ResponseEntity<ApiResponse<AdminBatchDetailResponse>> getBatch(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(batchService.getForAdmin(id)));
    }

    @PostMapping("/courses/{id}/batches")
    @Operation(summary = "Schedule a batch (with its sessions) for a course")
    public ResponseEntity<ApiResponse<AdminBatchSummaryResponse>> createBatch(
            @PathVariable UUID id, @Valid @RequestBody BatchRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(batchService.createBatch(id, req), "Batch scheduled"));
    }

    @PutMapping("/batches/{id}/publish")
    @Operation(summary = "Publish a batch, opening it for booking")
    public ResponseEntity<ApiResponse<AdminBatchSummaryResponse>> publishBatch(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(batchService.setStatus(id, BatchStatus.PUBLISHED), "Batch published"));
    }

    @PutMapping("/batches/{id}/cancel")
    @Operation(summary = "Cancel a batch")
    public ResponseEntity<ApiResponse<AdminBatchSummaryResponse>> cancelBatch(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(batchService.setStatus(id, BatchStatus.CANCELLED), "Batch cancelled"));
    }

    @PutMapping("/sessions/{id}/attendance")
    @Operation(summary = "Mark a learner present/absent for a session")
    public ResponseEntity<ApiResponse<Void>> markAttendance(
            @PathVariable UUID id, @Valid @RequestBody AttendanceInput req) {
        batchService.markAttendance(id, req);
        return ResponseEntity.ok(ApiResponse.ok(null, "Attendance recorded"));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Enrollment/completion/revenue/attendance aggregates across all courses")
    public ResponseEntity<ApiResponse<AdminAnalyticsResponse>> getAnalytics() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getAnalytics()));
    }
}
