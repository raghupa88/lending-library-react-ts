package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.CourseRequest;
import com.lendinglibrary.api.dto.LessonRequest;
import com.lendinglibrary.api.dto.ModuleRequest;
import com.lendinglibrary.application.service.CourseService;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.CourseModule;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.enums.LessonKind;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CourseModuleRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock CourseRepository courseRepository;
    @Mock CourseModuleRepository courseModuleRepository;
    @Mock LessonRepository lessonRepository;
    @InjectMocks CourseService courseService;

    private Course draftCourse() {
        return Course.builder().id(UUID.randomUUID()).slug("equities-101")
                .title("Equities 101").track(CourseTrack.EQUITIES).level(CourseLevel.BEGINNER)
                .language("English").price(BigDecimal.ZERO).status(CourseStatus.DRAFT).build();
    }

    @Test
    void create_duplicateSlug_throws() {
        var req = new CourseRequest("equities-101", "Equities 101", CourseTrack.EQUITIES,
                CourseLevel.BEGINNER, "English", "summary", BigDecimal.ZERO);
        when(courseRepository.existsBySlug("equities-101")).thenReturn(true);

        assertThatThrownBy(() -> courseService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void create_success_defaultsToDraft() {
        var req = new CourseRequest("equities-101", "Equities 101", CourseTrack.EQUITIES,
                CourseLevel.BEGINNER, "English", "summary", BigDecimal.ZERO);
        when(courseRepository.existsBySlug("equities-101")).thenReturn(false);
        when(courseRepository.save(any())).thenAnswer(inv -> {
            Course c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        var result = courseService.create(req);

        assertThat(result.status()).isEqualTo("DRAFT");
        assertThat(result.slug()).isEqualTo("equities-101");
    }

    @Test
    void setPublished_true_flipsStatusToPublished() {
        Course course = draftCourse();
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(courseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = courseService.setPublished(course.getId(), true);

        assertThat(result.status()).isEqualTo("PUBLISHED");
    }

    @Test
    void setPublished_courseNotFound_throws() {
        UUID id = UUID.randomUUID();
        when(courseRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.setPublished(id, true))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addModule_appendsAtNextSortOrder() {
        Course course = draftCourse();
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(courseModuleRepository.countByCourse(course)).thenReturn(2);
        when(courseModuleRepository.save(any())).thenAnswer(inv -> {
            CourseModule m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        var result = courseService.addModule(course.getId(), new ModuleRequest("Module 3"));

        assertThat(result.sortOrder()).isEqualTo(2);
        assertThat(result.title()).isEqualTo("Module 3");
    }

    @Test
    void addLesson_moduleNotFound_throws() {
        UUID moduleId = UUID.randomUUID();
        when(courseModuleRepository.findById(moduleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.addLesson(
                moduleId, new LessonRequest("Lesson", LessonKind.ARTICLE, null, "body", 5)))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
