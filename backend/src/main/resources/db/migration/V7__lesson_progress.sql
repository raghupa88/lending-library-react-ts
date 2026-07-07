-- Suvadi Learn L2: lesson progress tracking, powering the lesson player's
-- "mark complete" action and the "continue where you left off" deep link
-- on the enrollment/dashboard views.

CREATE TABLE lesson_progress (
    id            UUID PRIMARY KEY,
    enrollment_id UUID      NOT NULL,
    lesson_id     UUID      NOT NULL,
    completed_at  TIMESTAMP NOT NULL,
    CONSTRAINT fk_lesson_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id),
    CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id),
    CONSTRAINT uq_lesson_progress_enrollment_lesson UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress (enrollment_id);
