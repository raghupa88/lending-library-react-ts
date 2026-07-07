-- Suvadi Learn L3: per-course tests with timed, scored attempts and
-- certificate issuance on a passing attempt. See
-- docs/plans/learning-platform.md and docs/adr/ADR-011-learn-l3-scope.md.

CREATE TABLE tests (
    id               UUID PRIMARY KEY,
    course_id        UUID         NOT NULL,
    title            VARCHAR(255) NOT NULL,
    pass_percent     INTEGER      NOT NULL,
    time_limit_min   INTEGER      NOT NULL,
    attempts_allowed INTEGER      NOT NULL,
    CONSTRAINT fk_tests_course FOREIGN KEY (course_id) REFERENCES courses (id)
);

CREATE TABLE questions (
    id         UUID PRIMARY KEY,
    test_id    UUID        NOT NULL,
    prompt     TEXT        NOT NULL,
    kind       VARCHAR(20) NOT NULL,
    sort_order INTEGER     NOT NULL,
    CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests (id)
);

CREATE TABLE question_options (
    id          UUID PRIMARY KEY,
    question_id UUID         NOT NULL,
    label       VARCHAR(500) NOT NULL,
    is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL,
    CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions (id)
);

CREATE TABLE attempts (
    id            UUID PRIMARY KEY,
    test_id       UUID      NOT NULL,
    user_id       UUID      NOT NULL,
    started_at    TIMESTAMP NOT NULL,
    submitted_at  TIMESTAMP,
    score_percent INTEGER,
    passed        BOOLEAN,
    CONSTRAINT fk_attempts_test FOREIGN KEY (test_id) REFERENCES tests (id),
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE answers (
    id          UUID PRIMARY KEY,
    attempt_id  UUID NOT NULL,
    question_id UUID NOT NULL,
    CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES attempts (id),
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id),
    CONSTRAINT uq_answers_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE TABLE answer_options (
    answer_id UUID NOT NULL,
    option_id UUID NOT NULL,
    PRIMARY KEY (answer_id, option_id),
    CONSTRAINT fk_answer_options_answer FOREIGN KEY (answer_id) REFERENCES answers (id),
    CONSTRAINT fk_answer_options_option FOREIGN KEY (option_id) REFERENCES question_options (id)
);

CREATE TABLE certificates (
    id        UUID PRIMARY KEY,
    user_id   UUID         NOT NULL,
    course_id UUID         NOT NULL,
    issued_at TIMESTAMP    NOT NULL,
    serial    VARCHAR(40)  NOT NULL,
    CONSTRAINT fk_certificates_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses (id),
    CONSTRAINT uq_certificates_serial UNIQUE (serial),
    CONSTRAINT uq_certificates_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX idx_questions_test ON questions (test_id, sort_order);
CREATE INDEX idx_question_options_question ON question_options (question_id, sort_order);
CREATE INDEX idx_attempts_test_user ON attempts (test_id, user_id);
CREATE INDEX idx_certificates_user ON certificates (user_id);
