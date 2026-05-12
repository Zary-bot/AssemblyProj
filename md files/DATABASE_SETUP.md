# PostgreSQL & Xampp Setup Guide

## Setup Instructions

### 1. Configure Your Xampp PostgreSQL Connection

Edit the `.env` file in your project root:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assembly_db
DB_USER=postgres
DB_PASSWORD=<your_xampp_postgresql_password>
```

### 2. Find Your Xampp PostgreSQL Credentials

**If you're unsure about your credentials:**

1. Open **Xampp Control Panel**
2. Look for **PostgreSQL** module
3. Click **Admin** button next to PostgreSQL (opens pgAdmin or phpPgAdmin)
4. Check the connection details shown there
5. The password was set during Xampp installation (check your installation notes)
6. Default username is typically `postgres`

Alternatively, you can access PostgreSQL via command line if installed:
```powershell
# Open command prompt and connect to PostgreSQL
psql -U postgres -h localhost
```

### 3. Create the Database

**Option A: Using pgAdmin (GUI)**
1. Click **Admin** button next to PostgreSQL in Xampp Control Panel
2. Log in with your PostgreSQL credentials
3. Navigate to **Databases** in the left panel
4. Right-click on **Databases** → **Create** → **Database**
5. Enter name: `assembly_db`
6. Click **Save**

**Option B: Using phpPgAdmin (GUI)**
1. Click **Admin** button next to PostgreSQL in Xampp Control Panel
2. Log in with your PostgreSQL credentials
3. Select **Database** → **Create** from the menu
4. Enter name: `assembly_db`
5. Click **Create**

**Option C: Using Command Line**
```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost

# In the psql prompt, run:
CREATE DATABASE assembly_db;
\q
```

### 4. Install Python Dependencies

```powershell
# Navigate to your project directory
cd "c:\Users\Jan Marius\Documents\New folder (2)\AssemblyProj"

# Install required packages
pip install -r requirements.txt
```

### 5. Initialize Database Schema

```powershell
# Run the setup script to create tables
python setup_database.py
```

You should see:
```
✓ Components table created
✓ Builds table created
✓ Build_components table created
✓ Compatibility_issues table created
✓ Indexes created
✓ Database setup completed successfully!
```

### 6. Test the Connection

```powershell
python -c "from db_connection import test_connection; test_connection()"
```

Expected output:
```
✓ Successfully connected to PostgreSQL
  Version: PostgreSQL X.X on ...
```

## File Structure

- **`.env`** - Your local database credentials (DO NOT commit to git)
- **`.env.example`** - Template for .env file
- **`config.py`** - Database configuration loader
- **`db_connection.py`** - Connection pooling and query execution
- **`setup_database.py`** - Schema initialization script

## Using the Database in Your Application

### Example 1: Direct Query Execution
```python
from db_connection import DatabaseConnection

# Get all components
results = DatabaseConnection.execute_query(
    "SELECT * FROM components WHERE category = %s",
    ('cpu',)
)

for row in results:
    print(row)
```

### Example 2: Update Records
```python
from db_connection import DatabaseConnection

rows_affected = DatabaseConnection.execute_update(
    "INSERT INTO components (component_id, category, name, price) VALUES (%s, %s, %s, %s)",
    ('cpu_new_001', 'cpu', 'Intel Core i9', 589.99)
)
```

### Example 3: Connection Pooling (Automatic)
```python
# Connections are automatically pooled and reused
from db_connection import DatabaseConnection

try:
    connection = DatabaseConnection.get_connection()
    cursor = connection.cursor()
    # Your database operations
    cursor.close()
finally:
    DatabaseConnection.release_connection(connection)
```

## Troubleshooting

### Error: "could not connect to server: Connection refused"
- Ensure Xampp PostgreSQL is running (check Xampp Control Panel - should have green indicator)
- Start PostgreSQL by clicking **Start** button next to PostgreSQL module
- Verify DB_HOST and DB_PORT in .env are correct (usually localhost:5432)
- Check firewall settings

### Error: "database assembly_db does not exist"
- Run the creation steps again using pgAdmin or phpPgAdmin
- Verify you created it with the correct name (case-sensitive)
- Check that you're connected to the correct PostgreSQL server

### Error: "password authentication failed"
- Double-check DB_PASSWORD in .env
- Verify it matches your PostgreSQL installation password
- Try connecting via pgAdmin directly to confirm credentials work

### Error: "role postgres does not exist"
- Use the correct username from your PostgreSQL installation
- Default in Xampp is usually 'postgres'
- Check available users in pgAdmin or phpPgAdmin

### PostgreSQL won't start in Xampp
- Check Windows Event Viewer for PostgreSQL errors
- Ensure port 5432 is not in use by another application
- Try stopping and restarting the PostgreSQL service in Xampp

## Next Steps

1. Update [main.py](main.py) to use PostgreSQL instead of JSON
2. Migrate your existing JSON data to PostgreSQL
3. Implement database models using SQLAlchemy (optional but recommended)
4. Add database migrations using Alembic

## Security Reminders

- **NEVER** commit `.env` file to git (already in `.gitignore`)
- Keep `.env.example` updated as a template for others
- Use strong passwords in production
- Never hardcode database credentials
- Change `SECRET_KEY` for production environments
