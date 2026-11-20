CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL, birthday TEXT NOT NULL, gender TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL CHECK(year BETWEEN 1 AND 6),
  CHECK(email <> '' OR phone <> '')
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE NOT NULL,
  started_on TEXT NOT NULL, ended_on TEXT,
  CHECK(ended_on IS NULL OR ended_on >= started_on)
);
CREATE TABLE IF NOT EXISTS enrollments (
  course_id INTEGER REFERENCES courses(id), student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY(course_id,student_id)
);
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL, teacher TEXT NOT NULL DEFAULT '',
  UNIQUE(course_id,name), UNIQUE(course_id,id)
);
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL, subject_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 2 AND 5), graded_on TEXT NOT NULL,
  FOREIGN KEY(course_id,student_id) REFERENCES enrollments(course_id,student_id) ON DELETE CASCADE,
  FOREIGN KEY(course_id,subject_id) REFERENCES subjects(course_id,id)
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
