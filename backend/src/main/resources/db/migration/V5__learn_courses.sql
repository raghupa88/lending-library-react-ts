-- Suvadi Learn L1: course foundation. Course -> Module -> Lesson, plus
-- learner enrollments. Instructor authoring and paid enrollment are later
-- phases (see docs/plans/learning-platform.md); L1 authoring is ADMIN-only
-- and enrollment is free-course-only.

CREATE TABLE courses (
    id         UUID PRIMARY KEY,
    slug       VARCHAR(255)   NOT NULL,
    title      VARCHAR(255)   NOT NULL,
    track      VARCHAR(50)    NOT NULL,
    level      VARCHAR(20)    NOT NULL,
    language   VARCHAR(50)    NOT NULL,
    summary    TEXT,
    price      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status     VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP      NOT NULL,
    updated_at TIMESTAMP      NOT NULL,
    CONSTRAINT uq_courses_slug UNIQUE (slug)
);

CREATE TABLE course_modules (
    id         UUID PRIMARY KEY,
    course_id  UUID         NOT NULL,
    title      VARCHAR(255) NOT NULL,
    sort_order INTEGER      NOT NULL,
    CONSTRAINT fk_course_modules_course FOREIGN KEY (course_id) REFERENCES courses (id)
);

CREATE TABLE lessons (
    id          UUID PRIMARY KEY,
    module_id   UUID         NOT NULL,
    title       VARCHAR(255) NOT NULL,
    kind        VARCHAR(20)  NOT NULL,
    content_url VARCHAR(500),
    body        TEXT,
    est_minutes INTEGER,
    sort_order  INTEGER      NOT NULL,
    CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES course_modules (id)
);

CREATE TABLE enrollments (
    id           UUID PRIMARY KEY,
    user_id      UUID        NOT NULL,
    course_id    UUID        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    enrolled_at  TIMESTAMP   NOT NULL,
    CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (id),
    CONSTRAINT uq_enrollments_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX idx_courses_status ON courses (status);
CREATE INDEX idx_course_modules_course ON course_modules (course_id, sort_order);
CREATE INDEX idx_lessons_module ON lessons (module_id, sort_order);
CREATE INDEX idx_enrollments_user ON enrollments (user_id);
