-- Referral credits (see docs/adr/ADR-021-referral-credits.md): every member
-- gets a shareable code, and successfully referring a new signup credits
-- the referrer's balance, auto-applied on their next subscribe.
ALTER TABLE users ADD COLUMN referral_code VARCHAR(20);
ALTER TABLE users ADD COLUMN referred_by_id UUID;
ALTER TABLE users ADD COLUMN referral_credit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE users ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by_id) REFERENCES users (id);
CREATE UNIQUE INDEX idx_users_referral_code ON users (referral_code);

-- Backfill the seed users so they can refer others too.
UPDATE users SET referral_code = 'MEMBERSEED01' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE users SET referral_code = 'ADMINSEED001' WHERE id = 'a0000000-0000-0000-0000-000000000002';
