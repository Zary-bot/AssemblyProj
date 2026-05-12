import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='pc_buildersimulation_database',
    user='postgres'
)

cursor = conn.cursor()
cursor.execute('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s', ('components',))

for row in cursor.fetchall():
    print(f'{row[0]}: {row[1]}')

cursor.close()
conn.close()
