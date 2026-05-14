# AssemblyPC Backend

FastAPI serves the pages and APIs. PostgreSQL is the only source of component data.

## Run

```bash
cd backend
pip install -r requirements.txt
python setup_database.py
python app.py
```

## Pages

- Home: http://127.0.0.1:5000/
- Simulator: http://127.0.0.1:5000/simulator
- Admin: http://127.0.0.1:5000/admin
- API docs: http://127.0.0.1:5000/docs

## Main Files

- `app.py`: FastAPI routes and PostgreSQL API mapping
- `database.py`: PostgreSQL connection
- `database_schema_fixed.sql`: admin component tables and seed data
- `setup_database.py`: creates database and loads schema
- `templates/admin-dashboard.html`: admin CRUD UI
- `../static/js/simulator.js`: simulator component loader and drag/drop logic

## Database Tables

- `admin_cpu`
- `admin_gpu`
- `admin_psu`
- `admin_ssd`
- `admin_hdd`
- `admin_fan`
- `admin_mobo`
- `admin_ram`
- `saved_builds`
