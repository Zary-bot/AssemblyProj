import psycopg2


def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="pc_builder_simulation",
        user="postgres",
        password="database",
        port="5432"
    )
    return conn