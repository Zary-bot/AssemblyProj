# Assembly PC — Backend Setup

## How the system works

```
Browser → Flask (app.py) → database.py → PostgreSQL (pc_builder_simulation)
```

- `/simulator` serves the full drag-and-drop PC builder
- `/admin` serves the admin dashboard  
- `/api/components` returns all components from the database (CPU, MB, RAM, GPU, Storage, PSU, Case)
- `/api/compatibility` checks if selected parts are compatible
- `/api/builds` saves/loads builds to PostgreSQL

---

## Setup (do this once)

### 1. Make sure PostgreSQL is running
```
# Windows: open pgAdmin or Services and start PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### 2. Install Python packages
```bash
cd backend
pip install -r requirements.txt
```

### 3. Create database and load sample data
```bash
python setup_database.py
```

This will:
- Create the `pc_builder_simulation` database
- Create all tables (brands, cpus, motherboards, ram_modules, gpus, psus, storage_drives, pc_cases, saved_builds)
- Insert sample data (3 CPUs, 3 motherboards, 3 RAM kits, 3 GPUs, 3 PSUs, 3 drives, 2 cases)

### 4. Start the server
```bash
python app.py
```

### 5. Open in browser
- **Simulator**: http://127.0.0.1:5000/simulator
- **Admin**: http://127.0.0.1:5000/admin
- **DB Check**: http://127.0.0.1:5000/api/db-check
- **Components API**: http://127.0.0.1:5000/api/components

---

## Credentials (in .env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pc_builder_simulation
DB_USER=postgres
DB_PASSWORD=database
```

Change these if your PostgreSQL has a different password. The `.env` file is already created with these defaults.

---

## File structure

```
backend/
├── app.py               ← Flask app (serves pages + API)
├── database.py          ← PostgreSQL connection
├── schema.sql           ← Tables + sample data
├── setup_database.py    ← Run once to initialize DB
├── requirements.txt     ← Python packages
├── .env                 ← Your DB credentials
├── .env.example         ← Template for .env
└── templates/
    ├── assembly_pc_dynamic.html   ← Main simulator
    ├── assembly-pc-homepage.html  ← Homepage
    └── admin-dashboard.html       ← Admin panel

static/
├── css/style.css
└── js/simulator.js
```

---

## Troubleshooting

**"Failed to load PostgreSQL components"** in the sidebar:
- Run `python setup_database.py` first
- Check http://127.0.0.1:5000/api/db-check to see if the DB connection works

**"DB_PASSWORD is missing"**:
- Make sure `.env` exists in the `backend/` folder with `DB_PASSWORD=database`

**Port already in use**:
- Change the port in `app.py`: `app.run(debug=True, port=5001)`
