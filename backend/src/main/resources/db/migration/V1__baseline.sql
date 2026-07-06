-- Baseline schema, hand-written from the JPA entities.
-- Portable SQL: runs on PostgreSQL and on H2 in PostgreSQL mode (dev/tests).

CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(255) NOT NULL,
    last_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(32)  NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    phone         VARCHAR(255),
    address       VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE books (
    id               UUID PRIMARY KEY,
    title            VARCHAR(255)   NOT NULL,
    author           VARCHAR(255)   NOT NULL,
    isbn             VARCHAR(255)   NOT NULL,
    description      TEXT,
    total_copies     INTEGER        NOT NULL,
    available_copies INTEGER        NOT NULL,
    purchase_price   NUMERIC(10, 2) NOT NULL,
    category         VARCHAR(255),
    language         VARCHAR(255),
    page_count       INTEGER,
    rating           DOUBLE PRECISION,
    cover_url        VARCHAR(255),
    published_year   INTEGER,
    created_at       TIMESTAMP      NOT NULL,
    CONSTRAINT uq_books_isbn UNIQUE (isbn)
);

CREATE TABLE subscriptions (
    id                   UUID PRIMARY KEY,
    user_id              UUID           NOT NULL,
    plan                 VARCHAR(32)    NOT NULL,
    monthly_price        NUMERIC(10, 2) NOT NULL,
    start_date           TIMESTAMP      NOT NULL,
    end_date             TIMESTAMP,
    status               VARCHAR(32)    NOT NULL,
    max_concurrent_loans INTEGER        NOT NULL,
    created_at           TIMESTAMP      NOT NULL,
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE loans (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL,
    book_id     UUID        NOT NULL,
    borrowed_at TIMESTAMP   NOT NULL,
    due_date    TIMESTAMP   NOT NULL,
    returned_at TIMESTAMP,
    status      VARCHAR(32) NOT NULL,
    created_at  TIMESTAMP   NOT NULL,
    CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books (id)
);

CREATE TABLE orders (
    id           UUID PRIMARY KEY,
    user_id      UUID           NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status       VARCHAR(32)    NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMP      NOT NULL,
    updated_at   TIMESTAMP      NOT NULL,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Query paths used by the services
CREATE INDEX idx_loans_user_status ON loans (user_id, status);
CREATE INDEX idx_loans_book ON loans (book_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_books_category ON books (category);
