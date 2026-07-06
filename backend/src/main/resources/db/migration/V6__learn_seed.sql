-- Pilot course: free, bilingual-friendly "Money Foundations" — the
-- acquisition-funnel track from docs/plans/learning-platform.md.

INSERT INTO courses (id, slug, title, track, level, language, summary, price, status, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'money-foundations',
    'Money Foundations',
    'MONEY_FOUNDATIONS',
    'BEGINNER',
    'English',
    'The essentials before you invest a single rupee: saving vs investing, risk, compounding, and how mutual funds actually work. Free, and the best place to start.',
    0.00,
    'PUBLISHED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO course_modules (id, course_id, title, sort_order) VALUES
    ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Why bother investing?', 0),
    ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Understanding risk', 1),
    ('e1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Your first mutual fund', 2);

INSERT INTO lessons (id, module_id, title, kind, body, est_minutes, sort_order) VALUES
    ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
     'Saving vs. investing', 'ARTICLE',
     'Saving protects money from being spent; investing protects it from losing value to inflation. Both matter, but only one grows your wealth over decades.',
     8, 0),
    ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001',
     'The magic of compounding', 'ARTICLE',
     'A rupee invested today is worth more than a rupee invested next year — not because of luck, but because returns earn their own returns. Small, early, regular beats large and late.',
     10, 1),
    ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002',
     'What "risk" really means', 'ARTICLE',
     'Risk is not "losing all your money" — it is uncertainty in returns over your time horizon. Longer horizons can absorb more short-term volatility.',
     9, 0),
    ('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002',
     'Diversification in plain language', 'ARTICLE',
     'Not putting all your eggs in one basket is a cliché because it is true. Spreading investments across asset classes smooths the ride.',
     7, 1),
    ('e2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003',
     'SIPs: investing on autopilot', 'ARTICLE',
     'A Systematic Investment Plan invests a fixed amount on a fixed schedule, regardless of market mood — removing the temptation to time the market.',
     11, 0),
    ('e2000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000003',
     'Reading a fund factsheet', 'ARTICLE',
     'Expense ratio, exit load, benchmark, and category tell you more about a fund than its last-year returns ever will.',
     12, 1);
