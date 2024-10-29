from dataclasses import asdict, dataclass, fields
from typing import Optional, Self

from wtforms import Form, IntegerField, StringField, validators
import sqlite3

DATABASE = "BookTracker.db"


def init_db():
    with sqlite3.connect(DATABASE) as conn:
        with open("./app/schema.sql") as f:
            cursor = conn.cursor()
            cursor.executescript(f.read())
        conn.commit()


class BookRepository:
    @staticmethod
    def get_connection():
        """Create a connection to the SQLite database."""
        return sqlite3.connect(DATABASE)

    @classmethod
    def save(cls, book):
        """Save a new book to the database."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            # Insert author if not exists
            cursor.execute(
                """
                INSERT OR IGNORE INTO authors (author_last, author_first)
                VALUES (?, ?)
            """,
                (book.author_last, book.author_first),
            )

            # Get author_id
            cursor.execute(
                """
                SELECT id 
                FROM authors 
                WHERE author_last = ? AND author_first = ?
            """,
                (book.author_last, book.author_first),
            )
            author_id = cursor.fetchone()[0]

            # Insert the book
            cursor.execute(
                """
                INSERT INTO books (title, author_id, series, volume, year, language, genre, isbn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    book.title,
                    author_id,
                    book.series,
                    book.volume,
                    book.year,
                    book.language,
                    book.genre,
                    book.isbn,
                ),
            )
            conn.commit()

    @classmethod
    def update(cls, book_id, book):
        """Update an existing book in the database."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            # Delete author entry if it was the only book of the author
            cursor.execute("SELECT author_id FROM books WHERE id = ?", (book_id,))
            old_author_id = cursor.fetchone()[0]
            cursor.execute(
                """
                    DELETE FROM authors 
                    WHERE id = ?
                    AND (
                        SELECT COUNT(*) 
                        FROM books 
                        WHERE author_id = ?
                    ) = 1;
            """,
                (old_author_id, old_author_id),
            )

            # Insert author if not exists
            cursor.execute(
                """
                INSERT OR IGNORE INTO authors (author_last, author_first)
                VALUES (?, ?)
            """,
                (book.author_last, book.author_first),
            )

            # Get author_id
            cursor.execute(
                """
                SELECT id 
                FROM authors 
                WHERE author_last = ? AND author_first = ?
            """,
                (book.author_last, book.author_first),
            )
            author_id = cursor.fetchone()[0]

            # Update the book
            cursor.execute(
                """
                UPDATE books
                SET title = ?, author_id = ?, series = ?, volume = ?, year = ?, language = ?, genre = ?, isbn = ?
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
                    book.isbn,
                    book_id,
                ),
            )

            conn.commit()

    @classmethod
    def find_by_id(cls, book_id):
        """Find a book by its ID."""
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
            if row:
                return dict(zip([column[0] for column in cursor.description], row))
            else:
                raise ValueError("Book not found")

    @classmethod
    def find_all(cls):
        """Retrieve all books from the database, ordered by author_last, author_first, and year."""
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
    def delete(cls, book_id):
        """Delete a book from the database and clean up unused authors."""
        with cls.get_connection() as conn:
            cursor = conn.cursor()

            # First, find the author_id of the book to be deleted
            cursor.execute("SELECT author_id FROM books WHERE id = ?", (book_id,))
            author_id = cursor.fetchone()[0]

            # Delete the book
            cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))

            # Check if the author has any remaining books
            cursor.execute(
                "SELECT COUNT(*) FROM books WHERE author_id = ?", (author_id,)
            )
            remaining_books = cursor.fetchone()[0]

            # If the author has no other books, delete the author
            if remaining_books == 0:
                cursor.execute("DELETE FROM authors WHERE id = ?", (author_id,))

            # Delete the read_status entry if it exists
            cursor.execute("DELETE FROM read_status WHERE book_id = ?", (book_id,))

            # Commit the changes
            conn.commit()

    @classmethod
    def edit_status(cls, book_id, status):
        with cls.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO read_status (book_id, status)
                VALUES (?, ?)
                ON CONFLICT(book_id) 
                DO UPDATE SET status = excluded.status
            """,
                (book_id, status),
            )
            conn.commit()


class BookForm(Form):
    title = StringField("Title", [validators.DataRequired()])
    author_last = StringField("Author Last Name", [validators.DataRequired()])
    author_first = StringField("Author First Name", [validators.DataRequired()])
    series = StringField("Series", [validators.Optional()])
    volume = IntegerField(
        "Volume", [validators.Optional(), validators.NumberRange(min=0)]
    )
    year = IntegerField(
        "Year", [validators.Optional(), validators.NumberRange(min=1000, max=2100)]
    )
    language = StringField("Language", [validators.Optional()])
    genre = StringField("Genre", [validators.Optional()])
    isbn = IntegerField("ISBN", [validators.Optional()])

    def process(self, formdata=None, obj=None, data=None, **kwargs):
        """Override the process method to clean input data."""
        super().process(formdata, obj, data, **kwargs)

        for field in [self.title, self.series]:
            if field.data:
                field.data = field.data.strip()

        for field in [self.author_last, self.author_first, self.language, self.genre]:
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
    def from_form(cls, form_data) -> Self:
        """Create a book instance from form data with validation."""
        form = BookForm(form_data)
        if not form.validate():
            raise ValueError(f"Invalid form data: {form.errors}")
        return cls(**form.data)

    def to_dict(self) -> dict:
        """Convert a book instance to dictionary."""
        return asdict(self)

    def save(self) -> None:
        """Save a book in the repository."""
        try:
            BookRepository.save(self)
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
            BookRepository.edit_status(book_id, status)
        except Exception as e:
            raise RuntimeError(f"Failed to update status of book {book_id}: {e}")
