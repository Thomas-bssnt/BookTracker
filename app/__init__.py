from flask import Flask

from .models import init_db


def create_app():
    app = Flask(__name__)

    with app.app_context():
        init_db()
        from . import routes

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
