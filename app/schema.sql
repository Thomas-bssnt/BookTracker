CREATE TABLE IF NOT EXISTS books
(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    author_id    INTEGER,
    series       TEXT,
    volume       INTEGER CHECK (volume IS NULL OR volume > 0),
    year         INTEGER CHECK (year >= 0),
    language     TEXT,
    genre        TEXT,
    written_form TEXT,
    publisher    TEXT,
    collection   TEXT,
    isbn         INTEGER UNIQUE,
    FOREIGN KEY (author_id) REFERENCES authors (id)
);

CREATE TABLE IF NOT EXISTS authors
(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    author_last  TEXT NOT NULL COLLATE NOCASE,
    author_first TEXT NOT NULL COLLATE NOCASE,
    UNIQUE (author_last, author_first)
);

CREATE TABLE IF NOT EXISTS read_status
(
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    status  TEXT    NOT NULL CHECK (status IN ('not_read', 'reading', 'read')),
    FOREIGN KEY (book_id) REFERENCES books (id),
    UNIQUE (book_id)
);
