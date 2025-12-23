-- Create test user for development
-- Password: testpass123 (SHA-256 hash)

INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'test-user-001',
  'test@example.com',
  '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c',
  'Test User',
  'user',
  datetime('now'),
  datetime('now')
);

-- Create admin user for development
-- Password: adminpass123 (SHA-256 hash)

INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  'admin-user-001',
  'admin@example.com',
  'fc8252c8dc55839967c58b9ad755a59b61b67c13227ddae4bd3f78a38bf394f7',
  'Admin User',
  'admin',
  datetime('now'),
  datetime('now')
);

-- Create sample project

INSERT INTO projects (id, name, description, location, start_date, status, user_id, created_at, updated_at)
VALUES (
  'project-001',
  'サンプル工事案件',
  'これはテスト用のサンプル案件です',
  '東京都渋谷区',
  datetime('now'),
  'planned',
  'test-user-001',
  datetime('now'),
  datetime('now')
);
