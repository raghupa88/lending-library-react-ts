-- Demo seed data (ported from the former data.sql).
-- Passwords are BCrypt of "password123".

INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'member@example.com',
   '$2b$10$9P3raAlJ/nPGMbF4zz01junv/DRJB5IvvxubR9NrVRxoNX1WzL5s.',
   'Member', 'User', 'MEMBER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-0000-0000-000000000002', 'admin@example.com',
   '$2b$10$9P3raAlJ/nPGMbF4zz01junv/DRJB5IvvxubR9NrVRxoNX1WzL5s.',
   'Admin', 'User', 'ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO subscriptions (id, user_id, plan, monthly_price, start_date, status, max_concurrent_loans, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'BASIC', 199.00, CURRENT_TIMESTAMP, 'ACTIVE', 3, CURRENT_TIMESTAMP),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   'ADMIN', 0.00, CURRENT_TIMESTAMP, 'ACTIVE', 2147483647, CURRENT_TIMESTAMP);

INSERT INTO books (id, title, author, isbn, description, total_copies, available_copies, purchase_price, category, language, page_count, rating, cover_url, published_year, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'The Alchemist', 'Paulo Coelho', '978-0062315007',
   'A story about following your dreams and listening to your heart.',
   5, 4, 9.99, 'Fiction', 'English', 208, 4.7,
   'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg', 1988, CURRENT_TIMESTAMP),
  ('c0000000-0000-0000-0000-000000000002',
   'Ponniyin Selvan', 'Kalki Krishnamurthy', '978-8183681452',
   'An epic historical novel set in the Chola dynasty of ancient Tamil Nadu.',
   3, 3, 14.99, 'Historical Fiction', 'Tamil', 2400, 4.9,
   'https://covers.openlibrary.org/b/isbn/9788183681452-L.jpg', 1955, CURRENT_TIMESTAMP),
  ('c0000000-0000-0000-0000-000000000003',
   'Sapiens', 'Yuval Noah Harari', '978-0062316097',
   'A brief history of humankind exploring how Homo sapiens came to rule the world.',
   4, 3, 12.99, 'Non-Fiction', 'English', 443, 4.5,
   'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg', 2011, CURRENT_TIMESTAMP),
  ('c0000000-0000-0000-0000-000000000004',
   'Atomic Habits', 'James Clear', '978-0735211292',
   'Tiny changes, remarkable results. Build good habits and break bad ones.',
   6, 5, 11.99, 'Self-Help', 'English', 320, 4.8,
   'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', 2018, CURRENT_TIMESTAMP),
  ('c0000000-0000-0000-0000-000000000005',
   'The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565',
   'A classic tale of the American Dream, wealth, and love in the Jazz Age.',
   4, 4, 8.99, 'Fiction', 'English', 180, 3.9,
   'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg', 1925, CURRENT_TIMESTAMP),
  ('c0000000-0000-0000-0000-000000000006',
   'Clean Code', 'Robert C. Martin', '978-0132350884',
   'A handbook of agile software craftsmanship for writing better code.',
   3, 2, 29.99, 'Technology', 'English', 431, 4.3,
   'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg', 2008, CURRENT_TIMESTAMP);

-- One active loan for the member user
INSERT INTO loans (id, user_id, book_id, borrowed_at, due_date, status, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14' DAY, 'ACTIVE', CURRENT_TIMESTAMP);

UPDATE books SET available_copies = 3 WHERE id = 'c0000000-0000-0000-0000-000000000001';
