from flask import current_app as app, jsonify
from flask import render_template, request

from .models import Book


@app.route("/index")
@app.route("/")
def index():
    books = Book.get_all()
    return render_template("library.html", books=books)


@app.route("/stats")
def stats():
    return render_template("stats.html")


@app.route("/add_book", methods=["POST"])
def add_book():
    try:
        book = Book.from_request(request.form)
        book.save()
        return jsonify(success=True)
    except ValueError as e:
        return jsonify(success=False, error=str(e)), 400


@app.route("/edit_book/<book_id>", methods=["POST"])
def edit_book(book_id):
    try:
        book = Book.from_request(request.form)
        book.update(book_id)
        return jsonify(success=True)
    except ValueError as e:
        return jsonify(success=False, error=str(e)), 400


@app.route("/read_book/<book_id>", methods=["GET"])
def read_book(book_id):
    try:
        book = Book.get_by_id(book_id)
        return jsonify(book.to_dict() | {"id": book_id})
    except ValueError as e:
        return jsonify(success=False, error=str(e)), 400


@app.route("/delete_book/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    try:
        Book.delete(book_id)
        return jsonify(success=True)
    except ValueError as e:
        return jsonify(success=False, error=str(e)), 400


@app.route("/set_status/<book_id>", methods=["POST"])
def set_status(book_id):
    status = request.form.get("status")
    try:
        Book.set_status(book_id, status)
        return jsonify(success=True)
    except ValueError as e:
        return jsonify(success=False, error=str(e)), 400
