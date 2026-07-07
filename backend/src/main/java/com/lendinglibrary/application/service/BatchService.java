package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.BatchStatus;
import com.lendinglibrary.domain.enums.BookingStatus;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BatchService {

    private final BatchRepository batchRepository;
    private final BatchSessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final VenueRepository venueRepository;
    private final BookingRepository bookingRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional
    public AdminBatchSummaryResponse createBatch(UUID courseId, BatchRequest req) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        Venue venue = venueRepository.findById(req.venueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + req.venueId()));

        Batch batch = batchRepository.save(Batch.builder()
                .course(course).venue(venue).instructorName(req.instructorName())
                .startsOn(req.startsOn()).endsOn(req.endsOn()).scheduleText(req.scheduleText())
                .capacity(req.capacity()).fee(req.fee()).build());

        for (SessionInput s : req.sessions()) {
            sessionRepository.save(BatchSession.builder()
                    .batch(batch).sessionDate(s.sessionDate()).topic(s.topic()).build());
        }

        return AdminBatchSummaryResponse.from(batch, 0, 0);
    }

    public List<AdminBatchSummaryResponse> listForAdmin(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        return batchRepository.findByCourseOrderByStartsOnAsc(course).stream()
                .map(b -> AdminBatchSummaryResponse.from(b,
                        bookingRepository.countByBatchAndStatus(b, BookingStatus.CONFIRMED),
                        bookingRepository.countByBatchAndStatus(b, BookingStatus.WAITLISTED)))
                .toList();
    }

    public AdminBatchDetailResponse getForAdmin(UUID batchId) {
        Batch batch = findBatchOrThrow(batchId);
        List<SessionResponse> sessions = sessionRepository.findByBatchOrderBySessionDateAsc(batch).stream()
                .map(SessionResponse::from).toList();
        return AdminBatchDetailResponse.from(batch, sessions, rosterFor(batch));
    }

    private List<RosterEntryResponse> rosterFor(Batch batch) {
        return List.of(BookingStatus.CONFIRMED, BookingStatus.WAITLISTED, BookingStatus.CANCELLED).stream()
                .flatMap(status -> bookingRepository.findByBatchAndStatusOrderByBookedAtAsc(batch, status).stream())
                .map(RosterEntryResponse::from)
                .toList();
    }

    @Transactional
    public AdminBatchSummaryResponse setStatus(UUID batchId, BatchStatus status) {
        Batch batch = findBatchOrThrow(batchId);
        batch.setStatus(status);
        batchRepository.save(batch);
        return AdminBatchSummaryResponse.from(batch,
                bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED),
                bookingRepository.countByBatchAndStatus(batch, BookingStatus.WAITLISTED));
    }

    public List<BatchForLearnerResponse> listForLearner(UUID courseId, String emailOrNull) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
        User user = emailOrNull == null ? null : userService.findByEmail(emailOrNull);

        return batchRepository.findByCourseOrderByStartsOnAsc(course).stream()
                .filter(b -> b.getStatus() == BatchStatus.PUBLISHED)
                .map(b -> {
                    long confirmed = bookingRepository.countByBatchAndStatus(b, BookingStatus.CONFIRMED);
                    int seatsAvailable = (int) Math.max(0, b.getCapacity() - confirmed);
                    String myStatus = user == null ? null : bookingRepository.findByBatchAndUser(b, user).stream()
                            .filter(bk -> bk.getStatus() != BookingStatus.CANCELLED)
                            .map(bk -> bk.getStatus().name())
                            .findFirst().orElse(null);
                    return BatchForLearnerResponse.from(b, seatsAvailable, myStatus);
                })
                .toList();
    }

    @Transactional
    public void markAttendance(UUID sessionId, AttendanceInput req) {
        BatchSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        User user = userRepository.findById(req.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + req.userId()));

        Attendance attendance = attendanceRepository.findBySessionAndUser(session, user)
                .orElse(Attendance.builder().session(session).user(user).build());
        attendance.setPresent(req.present());
        attendanceRepository.save(attendance);
    }

    public Batch findBatchOrThrow(UUID batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
    }
}
