package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.AttendanceInput;
import com.lendinglibrary.api.dto.BatchRequest;
import com.lendinglibrary.api.dto.SessionInput;
import com.lendinglibrary.application.service.BatchService;
import com.lendinglibrary.application.service.UserService;
import com.lendinglibrary.domain.entity.*;
import com.lendinglibrary.domain.enums.*;
import com.lendinglibrary.infrastructure.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchServiceTest {

    @Mock BatchRepository batchRepository;
    @Mock BatchSessionRepository sessionRepository;
    @Mock CourseRepository courseRepository;
    @Mock VenueRepository venueRepository;
    @Mock BookingRepository bookingRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock UserRepository userRepository;
    @Mock UserService userService;
    @InjectMocks BatchService batchService;

    private Course course;
    private Venue venue;
    private Batch batch;
    private User learner;

    @BeforeEach
    void setUp() {
        course = Course.builder().id(UUID.randomUUID()).slug("money-foundations")
                .title("Money Foundations").track(CourseTrack.MONEY_FOUNDATIONS).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.PUBLISHED).build();
        venue = Venue.builder().id(UUID.randomUUID()).name("Suvadi Hall").city("Chennai").capacityDefault(20).build();
        batch = Batch.builder().id(UUID.randomUUID()).course(course).venue(venue).instructorName("Priya Raman")
                .startsOn(LocalDate.of(2026, 8, 1)).endsOn(LocalDate.of(2026, 8, 2))
                .scheduleText("Sat-Sun, 10am-1pm").capacity(2).fee(BigDecimal.ZERO)
                .status(BatchStatus.PUBLISHED).build();
        learner = User.builder().id(UUID.randomUUID()).email("member@example.com").role(Role.MEMBER).build();
    }

    @Test
    void createBatch_savesBatchAndAllSessions() {
        var req = new BatchRequest(venue.getId(), "Priya Raman", LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 2), "Sat-Sun, 10am-1pm", 20, BigDecimal.ZERO,
                List.of(new SessionInput(LocalDate.of(2026, 8, 1), "Day 1"),
                        new SessionInput(LocalDate.of(2026, 8, 2), "Day 2")));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(venueRepository.findById(venue.getId())).thenReturn(Optional.of(venue));
        when(batchRepository.save(any())).thenAnswer(inv -> {
            Batch b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        var result = batchService.createBatch(course.getId(), req);

        assertThat(result.instructorName()).isEqualTo("Priya Raman");
        verify(sessionRepository, times(2)).save(any());
    }

    @Test
    void listForLearner_onlyReturnsPublishedBatchesWithSeatAvailability() {
        Batch draftBatch = Batch.builder().id(UUID.randomUUID()).course(course).venue(venue)
                .instructorName("x").startsOn(LocalDate.now()).endsOn(LocalDate.now())
                .scheduleText("x").capacity(5).fee(BigDecimal.ZERO).status(BatchStatus.DRAFT).build();
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(batchRepository.findByCourseOrderByStartsOnAsc(course)).thenReturn(List.of(batch, draftBatch));
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(1L);

        var result = batchService.listForLearner(course.getId(), null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).seatsAvailable()).isEqualTo(1);
        assertThat(result.get(0).myBookingStatus()).isNull();
    }

    @Test
    void listForLearner_reflectsTheCallersBookingStatus() {
        Booking booking = Booking.builder().id(UUID.randomUUID()).batch(batch).user(learner)
                .status(BookingStatus.WAITLISTED).build();
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(batchRepository.findByCourseOrderByStartsOnAsc(course)).thenReturn(List.of(batch));
        when(bookingRepository.countByBatchAndStatus(batch, BookingStatus.CONFIRMED)).thenReturn(2L);
        when(userService.findByEmail("member@example.com")).thenReturn(learner);
        when(bookingRepository.findByBatchAndUser(batch, learner)).thenReturn(List.of(booking));

        var result = batchService.listForLearner(course.getId(), "member@example.com");

        assertThat(result.get(0).myBookingStatus()).isEqualTo("WAITLISTED");
        assertThat(result.get(0).seatsAvailable()).isEqualTo(0);
    }

    @Test
    void markAttendance_createsRecordWhenNoneExists() {
        BatchSession session = BatchSession.builder().id(UUID.randomUUID()).batch(batch)
                .sessionDate(LocalDate.now()).topic("Day 1").build();
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(userRepository.findById(learner.getId())).thenReturn(Optional.of(learner));
        when(attendanceRepository.findBySessionAndUser(session, learner)).thenReturn(Optional.empty());

        batchService.markAttendance(session.getId(), new AttendanceInput(learner.getId(), true));

        verify(attendanceRepository).save(argThat(Attendance::isPresent));
    }
}
