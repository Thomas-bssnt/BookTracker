from http import HTTPStatus

from flask import current_app as app, jsonify, Response
from flask import render_template, request

from .models import Book


# View Routes


@app.route("/", methods=["GET"])
@app.route("/index", methods=["GET"])
def index() -> str:
    """Render the main library page."""
    try:
        books = Book.get_all()
        return render_template("library.html", books=books)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch books: {e}")


@app.route("/stats", methods=["GET"])
def stats() -> str:
    """Render the statistics page."""
    return render_template("stats.html")


# API Routes (RESTful API)


def make_response(status, data=None, message=None, code=None):
    """
    Creates a JSend-compliant response for API responses.

    Parameters:
    - status (str): The status of the response ('success', 'fail', or 'error').
    - data (dict, optional): The payload or additional information (default: None).
    - message (str, optional): A human-readable message (default: None, required for 'error').
    - code (int, optional): An application-specific error code (default: None, optional for 'error').
    """
    response = {"status": status}

    if status == "success":
        response["data"] = data if data is not None else None

    elif status == "fail":
        response["data"] = data if data is not None else {}

    elif status == "error":
        if message is None:
            raise ValueError("Error responses require a 'message' parameter.")
        response["message"] = message
        if code is not None:
            response["code"] = code
        if data is not None:
            response["data"] = data

    else:
        raise ValueError("Invalid status. Expected 'success', 'fail', or 'error'.")

    return jsonify(response)


@app.route("/api/books", methods=["POST"])
def create_book() -> Response:
    """Create a new book."""
    try:
        book = Book.from_form(request.form)
        book.create()
        return make_response("success", data={"message": "Book created successfully"})
    except Exception as e:
        return make_response(
            "fail", data={"error": str(e)}, code=HTTPStatus.BAD_REQUEST
        )


@app.route("/api/books", methods=["GET"])
def read_books() -> Response:
    """Get all books."""
    try:
        books = Book.get_all()
        return make_response(
            "success",
            data={"books": books},
        )
    except Exception as e:
        return make_response(
            "error",
            message="Failed to retrieve books",
            data={"error": str(e)},
            code=HTTPStatus.INTERNAL_SERVER_ERROR,
        )


@app.route("/api/books/<book_id>", methods=["GET"])
def read_book(book_id) -> Response:
    """Get a book by ID."""
    try:
        book = Book.from_id(book_id)
        data = book.to_dict() | {"id": book_id}
        return make_response(
            "success",
            data={"book": data},
        )
    # TODO: Check if the `| {"id": book_id}` part is needed
    except Exception as e:
        return make_response(
            "fail",
            data={"error": str(e)},
            code=HTTPStatus.BAD_REQUEST,
        )


@app.route("/api/books/<book_id>", methods=["PUT"])
def update_book(book_id) -> Response:
    """Update an existing book."""
    try:
        book = Book.from_form(request.form)
        book.update(book_id)
        return make_response(
            "success",
            data={"message": "Book updated successfully"},
        )
    except Exception as e:
        return make_response(
            "fail",
            data={"error": str(e)},
            code=HTTPStatus.BAD_REQUEST,
        )


@app.route("/api/books/<book_id>", methods=["DELETE"])
def delete_book(book_id) -> Response:
    """Delete a book by ID."""
    try:
        Book.delete(book_id)
        return make_response(
            "success",
            data={"message": "Book deleted successfully"},
        )
    except Exception as e:
        return make_response(
            "fail",
            data={"error": str(e)},
            code=HTTPStatus.BAD_REQUEST,
        )


@app.route("/api/books/<book_id>/status", methods=["PATCH"])
def update_book_status(book_id) -> Response:
    """Update a book's status."""
    status = request.form.get("status")
    try:
        Book.update_status(book_id, status)
        return make_response(
            "success",
            data={"message": "Book status updated successfully"},
        )
    except Exception as e:
        return make_response(
            "fail",
            data={"error": str(e)},
            code=HTTPStatus.BAD_REQUEST,
        )
