package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.*;
import com.lendinglibrary.api.envelope.PagedResponse;
import com.lendinglibrary.domain.entity.Course;
import com.lendinglibrary.domain.entity.CourseModule;
import com.lendinglibrary.domain.entity.Lesson;
import com.lendinglibrary.domain.enums.CourseLevel;
import com.lendinglibrary.domain.enums.CourseStatus;
import com.lendinglibrary.domain.enums.CourseTrack;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.CourseModuleRepository;
import com.lendinglibrary.infrastructure.persistence.CourseRepository;
import com.lendinglibrary.infrastructure.persistence.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Course authoring + catalog. L1 scope: ADMIN-only authoring (no
 * INSTRUCTOR role yet — see docs/plans/learning-platform.md), append-only
 * module/lesson builder (no reordering/deletion yet).
 */
@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseModuleRepository courseModuleRepository;
    private final LessonRepository lessonRepository;

    // --- Learner-facing (published only) ---

    public PagedResponse<CourseSummaryResponse> listPublished(
            CourseTrack track, CourseLevel level, String language, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var result = courseRepository.findPublished(CourseStatus.PUBLISHED, track, level, language, pageable);
        return PagedResponse.from(result.map(this::toSummary));
    }

    public CourseDetailResponse getPublishedBySlug(String slug) {
        Course course = courseRepository.findBySlugAndStatus(slug, CourseStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + slug));
        return toDetail(course);
    }

    // --- Admin authoring (any status) ---

    public List<CourseSummaryResponse> listAllForAdmin() {
        return courseRepository.findAll().stream().map(this::toSummary).toList();
    }

    public CourseDetailResponse getByIdForAdmin(UUID id) {
        return toDetail(findOrThrow(id));
    }

    @Transactional
    public CourseSummaryResponse create(CourseRequest req) {
        if (courseRepository.existsBySlug(req.slug())) {
            throw new BusinessException("A course with slug '" + req.slug() + "' already exists");
        }
        Course course = Course.builder()
                .slug(req.slug()).title(req.title()).track(req.track()).level(req.level())
                .language(req.language()).summary(req.summary()).price(req.price())
                .status(CourseStatus.DRAFT)
                .build();
        return toSummary(courseRepository.save(course));
    }

    @Transactional
    public CourseSummaryResponse update(UUID id, CourseRequest req) {
        Course course = findOrThrow(id);
        course.setSlug(req.slug());
        course.setTitle(req.title());
        course.setTrack(req.track());
        course.setLevel(req.level());
        course.setLanguage(req.language());
        course.setSummary(req.summary());
        course.setPrice(req.price());
        return toSummary(courseRepository.save(course));
    }

    @Transactional
    public CourseSummaryResponse setPublished(UUID id, boolean published) {
        Course course = findOrThrow(id);
        course.setStatus(published ? CourseStatus.PUBLISHED : CourseStatus.DRAFT);
        return toSummary(courseRepository.save(course));
    }

    @Transactional
    public ModuleResponse addModule(UUID courseId, ModuleRequest req) {
        Course course = findOrThrow(courseId);
        int nextOrder = courseModuleRepository.countByCourse(course);
        CourseModule module = courseModuleRepository.save(CourseModule.builder()
                .course(course).title(req.title()).sortOrder(nextOrder).build());
        return ModuleResponse.from(module, List.of());
    }

    @Transactional
    public LessonResponse addLesson(UUID moduleId, LessonRequest req) {
        CourseModule module = courseModuleRepository.findById(moduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Module not found: " + moduleId));
        int nextOrder = lessonRepository.countByModule(module);
        Lesson lesson = lessonRepository.save(Lesson.builder()
                .module(module).title(req.title()).kind(req.kind())
                .contentUrl(req.contentUrl()).body(req.body()).estMinutes(req.estMinutes())
                .sortOrder(nextOrder).build());
        return LessonResponse.from(lesson);
    }

    public Course findOrThrow(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private CourseSummaryResponse toSummary(Course course) {
        int moduleCount = courseModuleRepository.countByCourse(course);
        long lessonCount = lessonRepository.countByModuleCourse(course);
        return CourseSummaryResponse.from(course, moduleCount, lessonCount);
    }

    private CourseDetailResponse toDetail(Course course) {
        var modules = courseModuleRepository.findByCourseOrderBySortOrderAsc(course).stream()
                .map(m -> ModuleResponse.from(m,
                        lessonRepository.findByModuleOrderBySortOrderAsc(m).stream()
                                .map(LessonResponse::from).toList()))
                .toList();
        return CourseDetailResponse.from(course, modules);
    }
}
