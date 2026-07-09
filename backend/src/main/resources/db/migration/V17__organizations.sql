-- B2B tier (see docs/adr/ADR-024-b2b-tier.md): an owner buys N seats of a
-- plan for their school/company, paying for the whole block now via the
-- fake payment provider; members redeem the org's shareable join code to
-- get that plan — at registration if they're new, or via the Organization
-- page's join form if they're already a member. A member belongs to at
-- most one organization at a time.
CREATE TABLE organizations (
    id            UUID           PRIMARY KEY,
    name          VARCHAR(255)   NOT NULL,
    owner_id      UUID           NOT NULL,
    plan          VARCHAR(20)    NOT NULL,
    billing_cycle VARCHAR(20)    NOT NULL,
    seats_total   INTEGER        NOT NULL,
    seats_used    INTEGER        NOT NULL DEFAULT 0,
    join_code     VARCHAR(20)    NOT NULL,
    amount_paid   NUMERIC(10, 2) NOT NULL,
    created_at    TIMESTAMP      NOT NULL,
    CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX idx_organizations_join_code ON organizations (join_code);
CREATE UNIQUE INDEX idx_organizations_owner ON organizations (owner_id);

CREATE TABLE organization_members (
    id              UUID      PRIMARY KEY,
    organization_id UUID      NOT NULL,
    user_id         UUID      NOT NULL,
    joined_at       TIMESTAMP NOT NULL,
    CONSTRAINT fk_org_members_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX idx_org_members_user ON organization_members (user_id);
CREATE INDEX idx_org_members_organization ON organization_members (organization_id);
