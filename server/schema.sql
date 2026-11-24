-- QueuSC database (MariaDB / MySQL). `npm run db:setup` runs this, then loads the sample data.

CREATE TABLE IF NOT EXISTS programs (
  code           VARCHAR(12)  PRIMARY KEY,  -- e.g. BSIS
  name           VARCHAR(120) NOT NULL,     -- BS Information Systems
  degree         VARCHAR(160) NOT NULL,     -- Bachelor of Science in Information Systems
  effective_year SMALLINT     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students, faculty and registrar staff. Program and year level apply to students only.
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(16)  PRIMARY KEY,
  email         VARCHAR(120) NOT NULL UNIQUE,
  first_name    VARCHAR(60)  NOT NULL,
  middle_name   VARCHAR(60)  NOT NULL DEFAULT '',
  last_name     VARCHAR(60)  NOT NULL,
  color         CHAR(7)      NOT NULL DEFAULT '#8A5A4A',
  role          ENUM('student', 'faculty', 'registrar') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  program_code  VARCHAR(12)  NULL,
  year_level    TINYINT      NULL,
  FOREIGN KEY (program_code) REFERENCES programs(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Only a hash of each session token is stored, so a leaked table can't be used to sign in.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64)    PRIMARY KEY,
  user_id    VARCHAR(16) NOT NULL,
  expires_at DATETIME    NOT NULL,
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS courses (
  code  VARCHAR(20)  PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  units TINYINT      NOT NULL,
  color CHAR(7)      NOT NULL DEFAULT '#5C9DFF'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Where each course sits in a program's curriculum. sort_order keeps curriculum order.
CREATE TABLE IF NOT EXISTS prospectus (
  program_code VARCHAR(12) NOT NULL,
  course_code  VARCHAR(20) NOT NULL,
  year_level   TINYINT     NOT NULL,
  term         ENUM('1st', '2nd', 'Summer') NOT NULL,
  sort_order   SMALLINT    NOT NULL,
  standing     TINYINT     NULL,  -- year standing required, e.g. 3 for "3rd year standing"
  PRIMARY KEY (program_code, course_code),
  FOREIGN KEY (program_code) REFERENCES programs(code) ON DELETE CASCADE,
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prerequisites (
  course_code   VARCHAR(20) NOT NULL,
  requires_code VARCHAR(20) NOT NULL,
  PRIMARY KEY (course_code, requires_code),
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE,
  FOREIGN KEY (requires_code) REFERENCES courses(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Final grades on the 1.0 (highest) to 5.0 scale. 3.0 or better passes.
CREATE TABLE IF NOT EXISTS grades (
  user_id     VARCHAR(16)  NOT NULL,
  course_code VARCHAR(20)  NOT NULL,
  term_key    VARCHAR(20)  NOT NULL,
  grade       DECIMAL(2,1) NOT NULL,
  PRIMARY KEY (user_id, course_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rooms (
  code     VARCHAR(40) PRIMARY KEY,  -- e.g. "LB446 TC"
  building VARCHAR(80) NOT NULL DEFAULT '',
  capacity SMALLINT    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Class groups offered in a term. enrolled goes up as students enroll.
CREATE TABLE IF NOT EXISTS sections (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  term_key    VARCHAR(20)  NOT NULL,
  course_code VARCHAR(20)  NOT NULL,
  group_no    TINYINT      NOT NULL,
  days        VARCHAR(16)  NOT NULL,  -- e.g. "M W" or "T Th"
  start_time  CHAR(5)      NOT NULL,  -- "07:30"
  end_time    CHAR(5)      NOT NULL,
  room_code   VARCHAR(40)  NOT NULL,
  faculty     VARCHAR(120) NOT NULL DEFAULT 'TBA',
  faculty_id  VARCHAR(16)  NULL,  -- set when the teacher has a QueuSC account
  capacity    SMALLINT     NOT NULL,
  enrolled    SMALLINT     NOT NULL DEFAULT 0,
  UNIQUE (term_key, course_code, group_no),
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE,
  FOREIGN KEY (room_code) REFERENCES rooms(code) ON UPDATE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blocks (
  id           INT         AUTO_INCREMENT PRIMARY KEY,
  term_key     VARCHAR(20) NOT NULL,
  program_code VARCHAR(12) NOT NULL,
  year_level   TINYINT     NOT NULL,
  label        CHAR(1)     NOT NULL,
  capacity     SMALLINT    NOT NULL,
  enrolled     SMALLINT    NOT NULL DEFAULT 0,
  UNIQUE (term_key, program_code, year_level, label),
  FOREIGN KEY (program_code) REFERENCES programs(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS block_sections (
  block_id   INT NOT NULL,
  section_id INT NOT NULL,
  PRIMARY KEY (block_id, section_id),
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enrollment window for each year level in a term.
CREATE TABLE IF NOT EXISTS windows (
  term_key   VARCHAR(20) NOT NULL,
  year_level TINYINT     NOT NULL,
  opens_at   DATETIME    NOT NULL,
  closes_at  DATETIME    NOT NULL,
  PRIMARY KEY (term_key, year_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id        INT           AUTO_INCREMENT PRIMARY KEY,
  user_id   VARCHAR(16)   NOT NULL,
  term_key  VARCHAR(20)   NOT NULL,
  kind      ENUM('downpayment', 'tuition') NOT NULL DEFAULT 'downpayment',
  amount    DECIMAL(10,2) NOT NULL,
  reference VARCHAR(40)   NOT NULL UNIQUE,
  channel   VARCHAR(80)   NOT NULL,
  paid_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, term_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The courses a student advised for a term. Saved before they pick groups.
CREATE TABLE IF NOT EXISTS advising (
  user_id      VARCHAR(16) NOT NULL,
  term_key     VARCHAR(20) NOT NULL,
  submitted_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, term_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS advising_courses (
  user_id     VARCHAR(16) NOT NULL,
  term_key    VARCHAR(20) NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, term_key, course_code),
  FOREIGN KEY (user_id, term_key) REFERENCES advising(user_id, term_key) ON DELETE CASCADE,
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One enrollment per student per term.
CREATE TABLE IF NOT EXISTS enrollments (
  id         INT         AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(16) NOT NULL,
  term_key   VARCHAR(20) NOT NULL,
  label      VARCHAR(20) NOT NULL,  -- "Block A" or "Non-block"
  block_id   INT         NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, term_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES blocks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enrollment_sections (
  enrollment_id INT NOT NULL,
  section_id    INT NOT NULL,
  PRIMARY KEY (enrollment_id, section_id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The enrollment line. Students wait here until a turn opens, then have a few minutes to enroll.
CREATE TABLE IF NOT EXISTS queue (
  user_id     VARCHAR(16) NOT NULL,
  term_key    VARCHAR(20) NOT NULL,
  joined_at   DATETIME(3) NOT NULL,
  last_seen   DATETIME(3) NOT NULL,
  admitted_at DATETIME(3) NULL,
  expires_at  DATETIME(3) NULL,
  PRIMARY KEY (user_id, term_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registrar settings, such as how many students may enroll at once.
CREATE TABLE IF NOT EXISTS settings (
  name  VARCHAR(40)  PRIMARY KEY,
  value VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
