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


class Book:
    def __init__(
        self,
        *,
        title,
        author_last,
        author_first,
        series,
        volume,
        year,
        language,
        genre,
        isbn,
        **kwargs,
    ):
        self.title = title
        self.author_last = author_last
        self.author_first = author_first
        self.series = series
        self.volume = volume
        self.year = year
        self.language = language
        self.genre = genre
        self.isbn = isbn
        self.status = None

    def to_dict(self):
        """"""
        return {
            "title": self.title,
            "author_last": self.author_last,
            "author_first": self.author_first,
            "series": self.series,
            "volume": self.volume,
            "year": self.year,
            "language": self.language,
            "genre": self.genre,
            "isbn": self.isbn,
        }

    def save(self):
        """Save the book to the database."""
        BookRepository.save(self)

    def update(self, book_id):
        """Update an existing book."""
        BookRepository.update(book_id, self)

    @classmethod
    def get_by_id(cls, book_id):
        """Fetch a book by its ID."""
        book_data = BookRepository.find_by_id(book_id)
        return cls(**book_data)

    @classmethod
    def from_request(cls, form_data):
        """Create a book instance from a request's form data."""
        form = BookForm(form_data)
        if not form.validate():
            raise ValueError(f"Invalid form data: {form.errors}")
        return cls(**form.data)

    @staticmethod
    def delete(book_id):
        """Delete a book by its ID."""
        BookRepository.delete(book_id)

    @staticmethod
    def get_all():
        """Fetch all books."""
        return BookRepository.find_all()

    @staticmethod
    def set_status(book_id, status):
        """Update the status of a book."""
        BookRepository.edit_status(book_id, status)
