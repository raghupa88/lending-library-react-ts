-- Gift subscriptions (see docs/adr/ADR-022-gift-subscriptions.md): a member
-- buys a plan for someone else and pays for it now via the fake payment
-- provider; the recipient redeems the resulting code — at registration if
-- they're new, or from the Gift page's Redeem tab if they're already a member.
CREATE TABLE gift_subscriptions (
    id              UUID           PRIMARY KEY,
    purchaser_id    UUID           NOT NULL,
    recipient_email VARCHAR(255)   NOT NULL,
    plan            VARCHAR(20)    NOT NULL,
    billing_cycle   VARCHAR(20)    NOT NULL,
    gift_code       VARCHAR(20)    NOT NULL,
    amount_paid     NUMERIC(10, 2) NOT NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    redeemed_by_id  UUID,
    purchased_at    TIMESTAMP      NOT NULL,
    redeemed_at     TIMESTAMP,
    CONSTRAINT fk_gift_subscriptions_purchaser FOREIGN KEY (purchaser_id) REFERENCES users (id),
    CONSTRAINT fk_gift_subscriptions_redeemed_by FOREIGN KEY (redeemed_by_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX idx_gift_subscriptions_gift_code ON gift_subscriptions (gift_code);
CREATE INDEX idx_gift_subscriptions_purchaser ON gift_subscriptions (purchaser_id);
