from csv import reader
from dataclasses import asdict, dataclass, fields
from typing import Optional, Self
from pathlib import Path

import requests

from wtforms import Form, IntegerField, StringField, validators
import sqlite3

DATABASE_PATH = Path("BookTracker.db")
SCHEMA_PATH = Path("./app/schema.sql")


def init_db():
    with sqlite3.connect(DATABASE_PATH) as conn, open(SCHEMA_PATH) as f:
        cursor = conn.cursor()
        cursor.executescript(f.read())

        cursor.execute("SELECT * FROM books")
        if not cursor.fetchone():
            import_data("data.csv")

        conn.commit()


def import_data(filename):

    with open(filename) as f:
        r = reader(f, delimiter=";")
        next(r)
        for row in r:

            title = row[0]

            try:
                author_last, author_first = row[1].split("\n")[0].split(", ")
            except ValueError:
                author_last = row[1]
                author_first = ""

            if row[2]:
                series, volume = row[2].split(" #")
            else:
                series = None
                volume = None

            if row[3]:
                year = row[3]
            else:
                year = None

            if row[7]:
                language = row[7]
            else:
                language = None

            if row[5]:
                genre = row[5]
            else:
                genre = None

            if row[4]:
                written_form = row[4]
            else:
                written_form = None

            if row[6]:
                text = row[6].split(" - ")
                publisher = text[0]
                if len(text) > 1:
                    collection = ", ".join(text[1:])
            else:
                publisher = None
                collection = None

            isbn = None

            if row[8] == "Oui":
                status = "read"
            else:
                status = "not_read"

            book = Book(
                title=title,
                author_last=author_last,
                author_first=author_first,
                series=series,
                volume=volume,
                year=year,
                language=language,
                genre=genre,
                written_form=written_form,
                publisher=publisher,
                collection=collection,
                isbn=isbn,
            )

            try:
                book_id = BookRepository.create(book)
                BookRepository.update_reading_status(book_id, status)
            except Exception as e:
                print(f"Failed to import {title}: {e}")
                print(book)


class BookRepository:
    """Repository for managing book records in the SQLite database."""

    # Database connection
    @staticmethod
    def get_connection():
        """Create a connection to the SQLite database."""
        return sqlite3.connect(DATABASE_PATH)

    # Core CRUD operations
    @classmethod
    def create(cls, book):
        """Create a new book record and return its ID."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            author_id = cls._ensure_author_exists(
                cursor, book.author_last, book.author_first
            )
            cursor.execute(
                """
                INSERT INTO books (
                    title, 
                    author_id, 
                    series, 
                    volume, 
                    year, 
                    language, 
                    genre, 
                    written_form, 
                    publisher,
                    collection,
                    isbn
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    book.title,
                    author_id,
                    book.series,
                    book.volume,
                    book.year,
                    book.language,
                    book.genre,
                    book.written_form,
                    book.publisher,
                    book.collection,
                    book.isbn,
                ),
            )

            book_id = cursor.lastrowid
            conn.commit()

            return book_id

    @classmethod
    def find_all(cls):
        """Retrieve all books, ordered by author and year."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT books.*, authors.author_first, authors.author_last, read_status.status
                FROM books
                JOIN authors ON books.author_id = authors.id
                LEFT JOIN read_status ON books.id = read_status.book_id
                ORDER BY authors.author_last, authors.author_first, books.year
            """
            )

            rows = cursor.fetchall()
            return [
                dict(zip([column[0] for column in cursor.description], row))
                for row in rows
            ]

    @classmethod
    def find_by_id(cls, book_id):
        """Retrieve a single book by its ID."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT books.*, authors.author_first, authors.author_last 
                FROM books
                JOIN authors ON books.author_id = authors.id
                WHERE books.id = ?
            """,
                (book_id,),
            )

            row = cursor.fetchone()
            return dict(zip([column[0] for column in cursor.description], row))

    @classmethod
    def update(cls, book_id, book):
        """Update an existing book record."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            cls._remove_unused_author(cursor, book_id)
            author_id = cls._ensure_author_exists(
                cursor, book.author_last, book.author_first
            )
            cursor.execute(
                """
                UPDATE books
                SET title = ?, 
                    author_id = ?, 
                    series = ?, 
                    volume = ?, 
                    year = ?, 
                    language = ?, 
                    genre = ?, 
                    written_form = ?,
                    publisher = ?,
                    collection = ?, 
                    isbn = ?
                WHERE id = ?
            """,
                (
                    book.title,
                    author_id,
                    book.series,
                    book.volume,
                    book.year,
                    book.language,
                    book.genre,
                    book.written_form,
                    book.publisher,
                    book.collection,
                    book.isbn,
                    book_id,
                ),
            )

            conn.commit()

    @classmethod
    def delete(cls, book_id):
        """Delete a book record and clean up related data."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            cls._remove_unused_author(cursor, book_id)
            cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))
            cursor.execute("DELETE FROM read_status WHERE book_id = ?", (book_id,))

            conn.commit()

    # Status management
    @classmethod
    def update_reading_status(cls, book_id, status):
        """Update the reading status of a book."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO read_status (book_id, status)
                VALUES (?, ?)
                ON CONFLICT(book_id) DO UPDATE SET status = excluded.status
            """,
                (book_id, status),
            )

            conn.commit()

    # Author management helpers
    @classmethod
    def _ensure_author_exists(cls, cursor, author_last, author_first):
        """Ensure author exists and return their ID."""
        cursor.execute(
            """
            INSERT OR IGNORE INTO authors (author_last, author_first)
            VALUES (?, ?)
            """,
            (author_last, author_first),
        )
        cursor.execute(
            """
            SELECT id FROM authors 
            WHERE author_last = ? AND author_first = ?
            """,
            (author_last, author_first),
        )
        return cursor.fetchone()[0]

    @classmethod
    def _remove_unused_author(cls, cursor, book_id):
        """Remove author if they have no other books."""
        cursor.execute("SELECT author_id FROM books WHERE id = ?", (book_id,))
        author_id = cursor.fetchone()[0]
        cursor.execute(
            """
                DELETE FROM authors 
                WHERE id = ?
                AND (SELECT COUNT(*) FROM books WHERE author_id = ?) = 1;
        """,
            (author_id, author_id),
        )


class BookForm(Form):
    title = StringField("Title", [validators.DataRequired()])
    author_last = StringField("Author Last Name", [validators.DataRequired()])
    author_first = StringField("Author First Name", [validators.Optional()])
    series = StringField("Series", [validators.Optional()])
    volume = IntegerField(
        "Volume",
        [validators.Optional(), validators.NumberRange(min=0)],
    )
    year = IntegerField(
        "Year",
        [validators.Optional(), validators.NumberRange(min=1000, max=2100)],
    )
    language = StringField("Language", [validators.Optional()])
    genre = StringField("Genre", [validators.Optional()])
    written_form = StringField("Written Form", [validators.Optional()])
    publisher = StringField("Publisher", [validators.Optional()])
    collection = StringField("Collection", [validators.Optional()])
    isbn = IntegerField("ISBN", [validators.Optional()])

    def process(self, formdata=None, obj=None, data=None, **kwargs):
        """Override the process method to clean input data."""
        super().process(formdata, obj, data, **kwargs)

        for field in (self.title, self.series):
            if field.data:
                field.data = field.data.strip()

        for field in (self.author_last, self.author_first, self.language, self.genre):
            if field.data:
                field.data = field.data.strip().capitalize()


@dataclass
class Book:
    title: str
    author_last: str
    author_first: str
    series: Optional[str] = None
    volume: Optional[int] = None
    year: Optional[int] = None
    language: Optional[str] = None
    genre: Optional[str] = None
    written_form: Optional[str] = None
    publisher: Optional[str] = None
    collection: Optional[str] = None
    isbn: Optional[int] = None

    def __init__(self, **kwargs) -> None:
        """Initialize a book with provided field values."""
        for field_name in {f.name for f in fields(self)}:
            if field_name in kwargs:
                setattr(self, field_name, kwargs[field_name])

    @classmethod
    def from_id(cls, book_id) -> Self:
        """Create a book instance from repository by ID."""
        try:
            book_data = BookRepository.find_by_id(book_id)
            return cls(**book_data)
        except Exception as e:
            raise RuntimeError(f"Failed to fetch book {book_id}: {e}")

    @classmethod
    def from_isbn(cls, isbn) -> Self:
        """Create a book instance from Google Books API by ISBN."""
        api_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
        response = requests.get(api_url)

        try:
            data = response.json()
            if "items" in data:
                book_info = data["items"][0]["volumeInfo"]

                authors = book_info.get("authors", [""])
                author = authors[0].split(" ")

                industry_identifiers = book_info.get("industryIdentifiers", [])
                for identifier in industry_identifiers:
                    if identifier["type"] == "ISBN_13":
                        isbn = identifier["identifier"]
                        break
                    elif identifier["type"] == "ISBN_10":
                        isbn = identifier["identifier"]

                return cls(
                    title=book_info.get("title", ""),
                    author_last=" ".join(author[:-1]),
                    author_first=author[-1],
                    series=None,
                    volume=None,
                    year=book_info.get("publishedDate", None),
                    language=book_info.get("language", None),
                    genre=None,
                    written_form=None,
                    publisher=book_info.get("publisher", None),
                    collection=None,
                    isbn=isbn,
                )
        except Exception as e:
            raise RuntimeError(f"Failed to fetch book isbn: {isbn}: {e}")

    @classmethod
    def from_form(cls, form_data) -> Self:
        """Create a book instance from form data with validation."""
        form = BookForm(form_data)
        if not form.validate():
            raise ValueError(f"Invalid form data: {form.errors}")
        return cls(**form.data)

    def to_dict(self) -> dict:
        """Convert a book instance to dictionary."""
        return asdict(self)

    def create(self) -> None:
        """Save a book in the repository."""
        try:
            BookRepository.create(self)
        except Exception as e:
            raise RuntimeError(f"Failed to save book: {e}")

    def update(self, book_id) -> None:
        """Update a book in the repository."""
        try:
            BookRepository.update(book_id, self)
        except Exception as e:
            raise RuntimeError(f"Failed to update book {book_id}: {e}")

    @staticmethod
    def get_all() -> list[dict]:
        """Retrieve all books from repository."""
        try:
            return BookRepository.find_all()
        except Exception as e:
            raise RuntimeError(f"Failed to fetch books: {e}")

    @staticmethod
    def delete(book_id) -> None:
        """Remove a book from repository by ID."""
        try:
            BookRepository.delete(book_id)
        except Exception as e:
            raise RuntimeError(f"Failed to delete book {book_id}: {e}")

    @staticmethod
    def update_status(book_id, status) -> None:
        """Update a book's status in repository."""
        try:
            BookRepository.update_reading_status(book_id, status)
        except Exception as e:
            raise RuntimeError(f"Failed to update status of book {book_id}: {e}")
