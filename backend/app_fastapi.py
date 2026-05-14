"""Compatibility entrypoint.

The project now keeps the FastAPI app and PostgreSQL data flow in app.py.
Importing it here keeps older commands like `python app_fastapi.py` working.
"""

from app import app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
