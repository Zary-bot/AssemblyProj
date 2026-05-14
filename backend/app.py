from __future__ import annotations
import hashlib
import html
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
from decimal import Decimal
from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor, Json
from database import get_db_connection

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR.parent / "static"

app = FastAPI(
    title="Assembly PC Simulator",
    description="Educational PC Assembly Simulator with FastAPI",
    version="2.0.0"
)

# ============================================================
# MIDDLEWARE & CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add no-cache headers middleware
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ============================================================
# SERVE STATIC FILES
# ============================================================

try:
    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
except Exception as e:
    print(f"Warning: Could not mount static directory: {e}")


# ============================================================
# SMALL JSON HELPERS
# ============================================================

def to_jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    return value


# ============================================================
# DATABASE HELPERS
# ============================================================

def run_select(query: str, params: tuple | None = None) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return to_jsonable(cur.fetchall())
    finally:
        conn.close()


def run_select_one(query: str, params: tuple | None = None) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return to_jsonable(row) if row else None
    finally:
        conn.close()


def run_write(query: str, params: tuple | None = None) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            row = None
            try:
                row = cur.fetchone()
            except Exception:
                row = None
            conn.commit()
            return to_jsonable(row) if row else None
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ============================================================
# ADMIN AUTH
# ============================================================

ADMIN_COOKIE_NAME = "assemblypc_admin_session"
ADMIN_SESSION_SECONDS = 60 * 60 * 8
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "assemblypc-dev-secret-change-me")
ADMIN_ALLOWED_BACK_PATHS = {"/", "/simulator"}


def password_hash(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return salt, digest


def ensure_admin_users_table() -> None:
    run_write("""
        CREATE TABLE IF NOT EXISTS admin_users (
            admin_id SERIAL PRIMARY KEY,
            username VARCHAR(80) NOT NULL UNIQUE,
            password_salt VARCHAR(64) NOT NULL,
            password_hash VARCHAR(128) NOT NULL,
            display_name VARCHAR(120),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    existing = run_select_one("SELECT COUNT(*) AS count FROM admin_users;")
    if int(existing.get("count") or 0) == 0:
        salt, digest = password_hash("admin123")
        run_write(
            """
            INSERT INTO admin_users (username, password_salt, password_hash, display_name)
            VALUES (%s, %s, %s, %s);
            """,
            ("admin", salt, digest, "Administrator"),
        )


def verify_admin_credentials(username: str, password: str) -> dict[str, Any] | None:
    ensure_admin_users_table()
    user = run_select_one(
        """
        SELECT admin_id, username, password_salt, password_hash, display_name, is_active
        FROM admin_users
        WHERE username = %s;
        """,
        (username,),
    )
    if not user or not user.get("is_active"):
        return None
    _, digest = password_hash(password, user["password_salt"])
    if not hmac.compare_digest(digest, user["password_hash"]):
        return None
    return user


def sign_admin_session(username: str) -> str:
    expires = int(time.time()) + ADMIN_SESSION_SECONDS
    nonce = secrets.token_urlsafe(12)
    payload = f"{username}|{expires}|{nonce}"
    sig = hmac.new(ADMIN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}|{sig}"


def verify_admin_session(token: str | None) -> str | None:
    if not token:
        return None
    parts = token.split("|")
    if len(parts) != 4:
        return None
    username, expires, nonce, sig = parts
    payload = f"{username}|{expires}|{nonce}"
    expected = hmac.new(ADMIN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    if int(expires or 0) < int(time.time()):
        return None
    ensure_admin_users_table()
    user = run_select_one("SELECT username FROM admin_users WHERE username = %s AND is_active = TRUE;", (username,))
    return username if user else None


def require_admin(request: Request) -> str:
    username = verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME))
    if not username:
        raise HTTPException(status_code=401, detail={"error": "Admin login required"})
    return username


def safe_admin_back_url(raw_url: str | None, request: Request | None = None) -> str:
    if not raw_url:
        return "/"
    parsed = urllib.parse.urlparse(raw_url)
    if parsed.scheme or parsed.netloc:
        if not request or parsed.netloc != request.url.netloc:
            return "/"
    path = parsed.path or "/"
    if path not in ADMIN_ALLOWED_BACK_PATHS or path.startswith("/admin"):
        return "/"
    query = f"?{parsed.query}" if parsed.query else ""
    return f"{path}{query}"


def admin_login_url(back_url: str = "/") -> str:
    safe_back = safe_admin_back_url(back_url)
    return f"/admin/login?back={urllib.parse.quote(safe_back, safe='')}"


def admin_back_from_request(request: Request) -> str:
    requested_back = request.query_params.get("back") or request.query_params.get("next")
    referrer_back = request.headers.get("referer")
    return safe_admin_back_url(requested_back or referrer_back, request)


def render_admin_login(error: str = "", back_url: str = "/") -> str:
    error_html = f'<div class="error">{error}</div>' if error else ""
    safe_back = safe_admin_back_url(back_url)
    safe_back_attr = html.escape(safe_back, quote=True)
    login_action = html.escape(admin_login_url(safe_back), quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AssemblyPC Admin Login</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1b2e;font-family:Inter,sans-serif;color:#0f172a;padding:24px}}
.login{{width:min(380px,100%);background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.28)}}
.brand{{font-family:Sora,sans-serif;font-size:22px;font-weight:800;color:#0d1b2e;margin-bottom:4px}}
.brand span{{color:#3ecf5e}}
.sub{{font-size:13px;color:#64748b;margin-bottom:22px}}
label{{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#334155;margin:12px 0 5px}}
input{{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font-size:14px;font-family:Inter,sans-serif;outline:none}}
input:focus{{border-color:#3ecf5e;box-shadow:0 0 0 3px rgba(62,207,94,.14)}}
button{{width:100%;margin-top:18px;border:none;border-radius:8px;padding:11px 14px;background:#3ecf5e;color:#fff;font-weight:800;font-family:Sora,sans-serif;cursor:pointer}}
button:hover{{background:#28a745}}
.back{{display:inline-flex;align-items:center;gap:6px;color:#334155;text-decoration:none;font-size:13px;font-weight:700;margin-bottom:18px}}
.back:hover{{color:#3ecf5e}}
.error{{padding:10px 12px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:8px;font-size:12px;margin-bottom:12px}}
.hint{{font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.5}}
</style>
</head>
<body>
<form class="login" method="post" action="{login_action}">
  <a class="back" href="{safe_back_attr}">&larr; Back</a>
  <div class="brand">Assembly<span>PC</span></div>
  <div class="sub">Admin access required</div>
  {error_html}
  <label for="username">Username</label>
  <input id="username" name="username" autocomplete="username" required/>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required/>
  <button type="submit">Log In</button>
  <div class="hint">Default account after setup: admin / admin123. Add more users in the admin_users table.</div>
</form>
</body>
</html>"""


# ============================================================
# TEMPLATE RENDERING
# ============================================================

def read_and_process_template(template_name: str) -> str:
    """Read template file and process Jinja2-like placeholders."""
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_name}")
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace Flask url_for calls with static paths
    import re
    # Replace {{ url_for('static', filename='...') }} with /static/...
    content = re.sub(
        r"{{\s*url_for\('static',\s*filename='([^']+)'\)\s*}}",
        r"/static/\1",
        content
    )
    content = re.sub(
        r'{{\s*url_for\("static",\s*filename="([^"]+)"\)\s*}}',
        r"/static/\1",
        content
    )
    return content


# ============================================================
# PAGE ROUTES
# ============================================================

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the homepage."""
    try:
        return read_and_process_template("assembly-pc-homepage.html")
    except FileNotFoundError:
        # Fallback to simulator if homepage not found
        return await simulator()


@app.get("/simulator", response_class=HTMLResponse)
async def simulator():
    """Serve the main simulator (assembly_pc_dynamic.html)."""
    return read_and_process_template("assembly_pc_dynamic.html")


@app.get("/admin/login", response_class=HTMLResponse)
async def admin_login_page(request: Request):
    """Serve the admin login page."""
    if verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME)):
        return RedirectResponse("/admin", status_code=303)
    return render_admin_login(back_url=admin_back_from_request(request))


@app.post("/admin/login")
async def admin_login(request: Request):
    """Authenticate an admin user and create a signed session cookie."""
    back_url = admin_back_from_request(request)
    form = urllib.parse.parse_qs((await request.body()).decode("utf-8"))
    username = (form.get("username", [""])[0] or "").strip()
    password = form.get("password", [""])[0] or ""
    user = verify_admin_credentials(username, password)
    if not user:
        return HTMLResponse(render_admin_login("Invalid username or password.", back_url), status_code=401)
    response = RedirectResponse("/admin", status_code=303)
    response.set_cookie(
        ADMIN_COOKIE_NAME,
        sign_admin_session(user["username"]),
        max_age=ADMIN_SESSION_SECONDS,
        httponly=True,
        samesite="lax",
    )
    return response


@app.get("/admin/logout")
async def admin_logout():
    """Log out the current admin user."""
    response = RedirectResponse("/admin/login", status_code=303)
    response.delete_cookie(ADMIN_COOKIE_NAME)
    return response


@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request):
    """Serve the admin dashboard."""
    if not verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME)):
        return RedirectResponse(admin_login_url(admin_back_from_request(request)), status_code=303)
    return read_and_process_template("admin-dashboard.html")


@app.get("/profile", response_class=HTMLResponse)
async def profile():
    """Serve the user profile page."""
    return read_and_process_template("profile.html")


# ============================================================
# HEALTH & DB CHECK ROUTES
# ============================================================

@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "FastAPI backend is running",
        "framework": "FastAPI 2.0"
    }


@app.get("/api/db-check")
async def db_check():
    """Database connectivity check."""
    try:
        result = run_select_one("""
            SELECT
                current_database() AS database_name,
                current_user AS database_user,
                inet_server_port() AS server_port;
        """)
        return {"status": "connected", **result}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "details": str(e)}
        )


# ============================================================
# CATEGORY HELPERS
# ============================================================

def normalize_category(category: str | None) -> str | None:
    c = str(category or "").lower().strip()
    aliases = {
        "all": "all",
        "cpu": "cpu", "cpus": "cpu",
        "mb": "mb", "mobo": "mb", "motherboard": "mb", "motherboards": "mb",
        "ram": "ram", "rams": "ram", "memory": "ram", "ram_modules": "ram",
        "gpu": "gpu", "gpus": "gpu",
        "storage": "storage", "ssd": "storage", "hdd": "storage", "storage_drives": "storage",
        "psu": "psu", "psus": "psu",
        "case": "case", "cases": "case", "pc_case": "case", "pc_cases": "case",
        "cooler": "cooler", "coolers": "cooler", "fan": "cooler", "fans": "cooler",
    }
    return aliases.get(c)


def extract_numeric_id(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, dict):
        value = (
            value.get("dbId") or value.get("db_id") or value.get("id") or
            value.get("cpu_id") or value.get("motherboard_id") or value.get("ram_id") or
            value.get("gpu_id") or value.get("psu_id") or value.get("storage_id") or value.get("case_id")
        )
    if value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if text.isdigit():
        return int(text)
    match = re.search(r"(\d+)$", text)
    return int(match.group(1)) if match else None


def get_selected_id(data: dict[str, Any], *keys: str) -> int | None:
    sources = [data]
    if isinstance(data.get("components"), dict):
        sources.append(data["components"])
    if isinstance(data.get("selectedComponents"), dict):
        sources.append(data["selectedComponents"])
    for source in sources:
        for key in keys:
            selected_id = extract_numeric_id(source.get(key))
            if selected_id:
                return selected_id
    return None


ADMIN_TABLES = {
    "cpu": "admin_cpu",
    "gpu": "admin_gpu",
    "psu": "admin_psu",
    "ssd": "admin_ssd",
    "hdd": "admin_hdd",
    "fan": "admin_fan",
    "mobo": "admin_mobo",
    "ram": "admin_ram",
}


ADMIN_SCHEMAS: dict[str, dict[str, Any]] = {
    "cpu": {"fields": ["brand", "model", "family", "cores", "baseClock", "turboClock", "cache", "igpu", "tdp", "memSupport", "socket", "released"], "labels": ["Brand", "Model", "CPU Family", "Cores (P/E)", "Base Clock", "Turbo Clock", "Cache", "Integrated GPU", "TDP", "Memory Support", "Socket", "Date Released"], "brandKey": "brand", "modelKey": "model"},
    "gpu": {"fields": ["brand", "model", "memType", "memCapacity", "busWidth", "coreClock", "cudaCores", "tdp", "psu", "formFactor", "release"], "labels": ["Brand", "Model", "Memory Type", "Memory Capacity", "Bus Width", "Core Clock", "CUDA/Shader Cores", "TDP", "PSU Req.", "Form Factor", "Release Year"], "brandKey": "brand", "modelKey": "model"},
    "psu": {"fields": ["brand", "model", "powerOutput", "psuType", "efficiency", "inputVoltage", "frequency", "cooling", "modular", "mainPower", "cpuPower", "pcieConn", "sataConn", "warranty", "released"], "labels": ["Brand", "Model", "Power Output", "PSU Type", "Efficiency", "Input Voltage", "Frequency", "Cooling", "Modular Type", "Main Power", "CPU Power", "PCIe Connectors", "SATA Connectors", "Warranty", "Released"], "brandKey": "brand", "modelKey": "model"},
    "ssd": {"fields": ["brand", "model", "storageType", "interface", "formFactor", "capacity", "nand", "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", "cache", "endurance", "power", "encryption", "released"], "labels": ["Brand", "Model", "Storage Type", "Interface", "Form Factor", "Capacity", "NAND Type", "Read Speed", "Write Speed", "Read IOPS", "Write IOPS", "Cache", "Endurance", "Power", "Encryption", "Released"], "brandKey": "brand", "modelKey": "model"},
    "hdd": {"fields": ["brand", "model", "storageType", "interface", "formFactor", "capacity", "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", "cache", "power", "encryption", "released"], "labels": ["Brand", "Model", "Storage Type", "Interface", "Form Factor", "Capacity", "Read Speed", "Write Speed", "Read IOPS", "Write IOPS", "Cache", "Power", "Encryption", "Released"], "brandKey": "brand", "modelKey": "model"},
    "fan": {"fields": ["brand", "model", "dimensions", "speed", "airflow", "connector", "voltage", "released"], "labels": ["Brand", "Model", "Fan Dimensions", "Fan Speed", "Airflow (CFM)", "Connector Type", "Voltage", "Released"], "brandKey": "brand", "modelKey": "model"},
    "mobo": {"fields": ["brand", "model", "formFactor", "chipset", "socket", "memType", "dimms", "maxMem", "memSpeed", "pciSlots", "m2Slots", "usb", "tier", "released"], "labels": ["Brand", "Model", "Form Factor", "Chipset", "Socket", "Memory Type", "DIMM Slots", "Max Memory", "Memory Speed", "PCIe Slots", "M.2 Slots", "USB Ports", "Tier", "Released"], "brandKey": "brand", "modelKey": "model"},
    "ram": {"fields": ["brand", "model", "memType", "capacity", "config", "formFactor", "speed", "cas", "voltage", "pins", "ecc", "buffered", "xmp", "released"], "labels": ["Brand", "Model", "Memory Type", "Capacity", "Config", "Form Factor", "Speed", "CAS Latency", "Voltage", "Pins", "ECC Support", "Buffered", "XMP Support", "Released"], "brandKey": "brand", "modelKey": "model"},
}


def normalize_admin_category(category: str | None) -> str | None:
    c = str(category or "").lower().strip()
    aliases = {
        "cpu": "cpu", "processor": "cpu", "processors": "cpu",
        "gpu": "gpu", "graphics": "gpu", "graphics_card": "gpu",
        "psu": "psu", "power": "psu", "power_supply": "psu",
        "ssd": "ssd",
        "hdd": "hdd", "hard_drive": "hdd",
        "fan": "fan", "fans": "fan", "cooler": "fan", "coolers": "fan", "cooling": "fan",
        "mobo": "mobo", "mb": "mobo", "motherboard": "mobo", "motherboards": "mobo",
        "ram": "ram", "memory": "ram",
    }
    return aliases.get(c)


def quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def admin_fields(category: str) -> list[str]:
    return list(ADMIN_SCHEMAS[category]["fields"])


def admin_table_has_column(category: str, column: str) -> bool:
    table = ADMIN_TABLES.get(category)
    if not table:
        return False
    row = run_select_one(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
        ) AS exists;
        """,
        (table, column),
    )
    return bool(row and row.get("exists"))


def fetch_admin_components(category: str) -> list[dict[str, Any]]:
    category = normalize_admin_category(category) or category
    if category not in ADMIN_TABLES:
        return []
    fields = ["id", *admin_fields(category)]
    if admin_table_has_column(category, "price"):
        fields.append("price")
    select_list = ", ".join(quote_ident(field) for field in fields)
    rows = run_select(f"SELECT {select_list} FROM {ADMIN_TABLES[category]} ORDER BY id;")
    for row in rows:
        row.setdefault("price", 0)
    return rows


def fetch_all_admin_components_grouped() -> dict[str, list[dict[str, Any]]]:
    return {category: fetch_admin_components(category) for category in ADMIN_TABLES}


def validate_admin_payload(category: str, payload: dict[str, Any]) -> dict[str, Any]:
    if category not in ADMIN_TABLES:
        raise HTTPException(status_code=400, detail={"error": "Invalid admin category"})
    cleaned = {field: str(payload.get(field) or "").strip() for field in admin_fields(category)}
    if not cleaned.get("brand") or not cleaned.get("model"):
        raise HTTPException(status_code=400, detail={"error": "Brand and Model are required"})
    if "price" in payload:
        try:
            cleaned["price"] = float(payload.get("price") or 0)
        except (TypeError, ValueError):
            cleaned["price"] = 0
    return cleaned


def insert_admin_component(category: str, payload: dict[str, Any]) -> dict[str, Any]:
    category = normalize_admin_category(category) or category
    data = validate_admin_payload(category, payload)
    fields = [*admin_fields(category)]
    if "price" in data and admin_table_has_column(category, "price"):
        fields.append("price")
    columns = ", ".join(quote_ident(field) for field in fields)
    placeholders = ", ".join(["%s"] * len(fields))
    return_fields = ["id", *admin_fields(category)]
    if admin_table_has_column(category, "price"):
        return_fields.append("price")
    returning = ", ".join(quote_ident(field) for field in return_fields)
    values = tuple(data.get(field, "") for field in fields)
    return run_write(f"INSERT INTO {ADMIN_TABLES[category]} ({columns}) VALUES ({placeholders}) RETURNING {returning};", values) or {}


def update_admin_component(category: str, component_id: Any, payload: dict[str, Any]) -> dict[str, Any]:
    category = normalize_admin_category(category) or category
    component_id = extract_numeric_id(component_id)
    if not component_id:
        raise HTTPException(status_code=400, detail={"error": "Invalid component id"})
    data = validate_admin_payload(category, payload)
    fields = [*admin_fields(category)]
    if "price" in data and admin_table_has_column(category, "price"):
        fields.append("price")
    assignments = ", ".join(f"{quote_ident(field)} = %s" for field in fields)
    return_fields = ["id", *admin_fields(category)]
    if admin_table_has_column(category, "price"):
        return_fields.append("price")
    returning = ", ".join(quote_ident(field) for field in return_fields)
    values = tuple(data.get(field, "") for field in fields) + (component_id,)
    row = run_write(f"UPDATE {ADMIN_TABLES[category]} SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING {returning};", values)
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Component not found"})
    return row


def delete_admin_component(category: str, component_id: Any) -> dict[str, Any]:
    category = normalize_admin_category(category) or category
    if category not in ADMIN_TABLES:
        raise HTTPException(status_code=400, detail={"error": "Invalid admin category"})
    component_id = extract_numeric_id(component_id)
    if not component_id:
        raise HTTPException(status_code=400, detail={"error": "Invalid component id"})
    row = run_write(f"DELETE FROM {ADMIN_TABLES[category]} WHERE id = %s RETURNING id;", (component_id,))
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Component not found"})
    return {"success": True, "id": row["id"]}


def first_number(value: Any, default: int = 0) -> int:
    match = re.search(r"(\d+(?:\.\d+)?)", str(value or ""))
    return int(float(match.group(1))) if match else default


def capacity_to_gb(value: Any) -> int:
    text = str(value or "").lower()
    number = first_number(text, 0)
    return number * 1000 if "tb" in text else number


def parse_boolish(value: Any) -> bool:
    return str(value or "").lower().strip() in {"1", "true", "yes", "y", "supported", "full", "semi", "modular", "fully modular", "semi-modular"}


def parse_ram_sticks(config: Any) -> int:
    match = re.search(r"(\d+)\s*x", str(config or "").lower())
    return int(match.group(1)) if match else 1


def admin_cpu_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    cores = first_number(row.get("cores"))
    threads_match = re.search(r"/\s*(\d+)", str(row.get("cores") or ""))
    threads = int(threads_match.group(1)) if threads_match else cores
    return {**row, "dbId": row["id"], "cat": "cpu", "category": "cpu", "name": row.get("model") or "CPU", "cpu_name": row.get("model") or "CPU", "sub": f"{row.get('cores') or 'N/A'} · {row.get('socket') or 'N/A'}", "cores": cores, "threads": threads, "base_clock": first_number(row.get("baseClock")), "boost_clock": first_number(row.get("turboClock")), "tdp_watts": first_number(row.get("tdp")), "integrated_graphics": bool(row.get("igpu") and str(row.get("igpu")).lower() not in {"none", "no", "false"}), "price": float(row.get("price") or 0)}


def admin_mobo_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "dbId": row["id"], "cat": "mb", "category": "mb", "name": row.get("model") or "Motherboard", "motherboard_name": row.get("model") or "Motherboard", "sub": f"{row.get('chipset') or 'N/A'} · {row.get('socket') or 'N/A'} · {row.get('memType') or 'N/A'}", "ram_type": row.get("memType") or "", "max_ram_gb": capacity_to_gb(row.get("maxMem")), "form_factor": row.get("formFactor") or "", "pcie_x16_slots": max(first_number(row.get("pciSlots")), 1 if "x16" in str(row.get("pciSlots") or "").lower() else 0), "m2_slots": first_number(row.get("m2Slots")), "price": float(row.get("price") or 0)}


def admin_ram_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "dbId": row["id"], "cat": "ram", "category": "ram", "name": row.get("model") or "RAM", "ram_name": row.get("model") or "RAM", "sub": f"{row.get('capacity') or 'N/A'} · {row.get('memType') or 'N/A'} · {row.get('speed') or 'N/A'}", "ram_type": row.get("memType") or "", "capacity_gb": capacity_to_gb(row.get("capacity")), "speed_mhz": first_number(row.get("speed")), "sticks": parse_ram_sticks(row.get("config")), "price": float(row.get("price") or 0)}


def admin_gpu_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "dbId": row["id"], "cat": "gpu", "category": "gpu", "name": row.get("model") or "GPU", "gpu_name": row.get("model") or "GPU", "sub": f"{row.get('memCapacity') or 'N/A'} VRAM · {row.get('busWidth') or 'N/A'}", "vram_gb": capacity_to_gb(row.get("memCapacity")), "interface": "PCIe x16", "recommended_psu_watts": first_number(row.get("psu")), "length_mm": 0, "tdp_watts": first_number(row.get("tdp")), "price": float(row.get("price") or 0)}


def admin_storage_to_sim(row: dict[str, Any], storage_kind: str) -> dict[str, Any]:
    sim_id = int(row["id"]) + (100000 if storage_kind == "hdd" else 0)
    return {**row, "id": sim_id, "dbId": sim_id, "sourceDbId": row["id"], "cat": "storage", "category": "storage", "sourceCategory": storage_kind, "name": row.get("model") or storage_kind.upper(), "storage_name": row.get("model") or storage_kind.upper(), "sub": f"{row.get('capacity') or 'N/A'} · {row.get('interface') or 'N/A'}", "storage_type": row.get("storageType") or storage_kind.upper(), "capacity_gb": capacity_to_gb(row.get("capacity")), "interface": row.get("interface") or "", "price": float(row.get("price") or 0)}


def admin_psu_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "dbId": row["id"], "cat": "psu", "category": "psu", "name": row.get("model") or "PSU", "psu_name": row.get("model") or "PSU", "sub": f"{row.get('powerOutput') or 'N/A'} · {row.get('efficiency') or 'N/A'}", "wattage": first_number(row.get("powerOutput")), "efficiency_rating": row.get("efficiency") or "", "modular": parse_boolish(row.get("modular")), "price": float(row.get("price") or 0)}


def admin_fan_to_sim(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "dbId": row["id"], "cat": "cooler", "category": "cooler", "name": row.get("model") or "Cooling Fan", "sub": f"{row.get('dimensions') or 'N/A'} · {row.get('airflow') or 'N/A'} CFM", "price": float(row.get("price") or 0)}


# ============================================================
# COMPONENT QUERIES — matches your exact schema
# ============================================================

def get_cpus():
    return [admin_cpu_to_sim(row) for row in fetch_admin_components("cpu")]
    return run_select("""
        SELECT
            c.cpu_id AS id,
            c.cpu_id,
            c.cpu_id AS "dbId",
            'cpu' AS cat,
            'cpu' AS category,
            b.brand_name AS brand,
            b.brand_name,
            c.cpu_name AS name,
            c.cpu_name,
            c.socket,
            c.cores,
            c.threads,
            c.base_clock::float AS base_clock,
            c.boost_clock::float AS boost_clock,
            c.tdp_watts,
            c.integrated_graphics,
            c.price::float AS price,
            CONCAT(c.cores, 'C/', c.threads, 'T · ', c.socket) AS sub
        FROM cpus c
        LEFT JOIN brands b ON b.brand_id = c.brand_id
        ORDER BY c.cpu_id;
    """)


def get_motherboards():
    return [admin_mobo_to_sim(row) for row in fetch_admin_components("mobo")]
    return run_select("""
        SELECT
            m.motherboard_id AS id,
            m.motherboard_id,
            m.motherboard_id AS "dbId",
            'mb' AS cat,
            'mb' AS category,
            b.brand_name AS brand,
            b.brand_name,
            m.motherboard_name AS name,
            m.motherboard_name,
            m.socket,
            m.chipset,
            m.ram_type,
            m.max_ram_gb,
            m.form_factor,
            m.pcie_x16_slots,
            m.m2_slots,
            m.price::float AS price,
            CONCAT(COALESCE(m.chipset, 'N/A'), ' · ', m.socket, ' · ', m.ram_type) AS sub
        FROM motherboards m
        LEFT JOIN brands b ON b.brand_id = m.brand_id
        ORDER BY m.motherboard_id;
    """)


def get_rams():
    return [admin_ram_to_sim(row) for row in fetch_admin_components("ram")]
    return run_select("""
        SELECT
            r.ram_id AS id,
            r.ram_id,
            r.ram_id AS "dbId",
            'ram' AS cat,
            'ram' AS category,
            b.brand_name AS brand,
            b.brand_name,
            r.ram_name AS name,
            r.ram_name,
            r.ram_type,
            r.capacity_gb,
            r.speed_mhz,
            r.sticks,
            r.price::float AS price,
            CONCAT(r.capacity_gb, 'GB · ', r.ram_type, ' · ', r.speed_mhz, 'MHz') AS sub
        FROM ram_modules r
        LEFT JOIN brands b ON b.brand_id = r.brand_id
        ORDER BY r.ram_id;
    """)


def get_gpus():
    return [admin_gpu_to_sim(row) for row in fetch_admin_components("gpu")]
    return run_select("""
        SELECT
            g.gpu_id AS id,
            g.gpu_id,
            g.gpu_id AS "dbId",
            'gpu' AS cat,
            'gpu' AS category,
            b.brand_name AS brand,
            b.brand_name,
            g.gpu_name AS name,
            g.gpu_name,
            g.vram_gb,
            g.interface,
            g.recommended_psu_watts,
            g.length_mm,
            g.price::float AS price,
            CONCAT(g.vram_gb, 'GB VRAM · ', COALESCE(g.interface, 'N/A')) AS sub
        FROM gpus g
        LEFT JOIN brands b ON b.brand_id = g.brand_id
        ORDER BY g.gpu_id;
    """)


def get_psus():
    return [admin_psu_to_sim(row) for row in fetch_admin_components("psu")]
    return run_select("""
        SELECT
            p.psu_id AS id,
            p.psu_id,
            p.psu_id AS "dbId",
            'psu' AS cat,
            'psu' AS category,
            b.brand_name AS brand,
            b.brand_name,
            p.psu_name AS name,
            p.psu_name,
            p.wattage,
            p.efficiency_rating,
            p.modular,
            p.price::float AS price,
            CONCAT(p.wattage, 'W · ', COALESCE(p.efficiency_rating, 'N/A')) AS sub
        FROM psus p
        LEFT JOIN brands b ON b.brand_id = p.brand_id
        ORDER BY p.psu_id;
    """)


def get_storage_drives():
    return [
        *[admin_storage_to_sim(row, "ssd") for row in fetch_admin_components("ssd")],
        *[admin_storage_to_sim(row, "hdd") for row in fetch_admin_components("hdd")],
    ]
    return run_select("""
        SELECT
            s.storage_id AS id,
            s.storage_id,
            s.storage_id AS "dbId",
            'storage' AS cat,
            'storage' AS category,
            b.brand_name AS brand,
            b.brand_name,
            s.storage_name AS name,
            s.storage_name,
            s.storage_type,
            s.capacity_gb,
            s.interface,
            s.price::float AS price,
            CONCAT(s.capacity_gb, 'GB · ', COALESCE(s.interface, 'N/A')) AS sub
        FROM storage_drives s
        LEFT JOIN brands b ON b.brand_id = s.brand_id
        ORDER BY s.storage_id;
    """)


def get_cases():
    return []
    return run_select("""
        SELECT
            pc.case_id AS id,
            pc.case_id,
            pc.case_id AS "dbId",
            'case' AS cat,
            'case' AS category,
            b.brand_name AS brand,
            b.brand_name,
            pc.case_name AS name,
            pc.case_name,
            pc.form_factor_support,
            pc.max_gpu_length_mm,
            pc.price::float AS price,
            CONCAT('Supports: ', COALESCE(pc.form_factor_support, 'N/A')) AS sub
        FROM pc_cases pc
        LEFT JOIN brands b ON b.brand_id = pc.brand_id
        ORDER BY pc.case_id;
    """)


def get_coolers():
    return [admin_fan_to_sim(row) for row in fetch_admin_components("fan")]


def fetch_all_components_grouped():
    return {
        "cpu": get_cpus(),
        "mb": get_motherboards(),
        "ram": get_rams(),
        "gpu": get_gpus(),
        "storage": get_storage_drives(),
        "psu": get_psus(),
        "case": get_cases(),
        "cooler": get_coolers(),
    }


def fetch_all_components_by_category(category: str):
    category = normalize_category(category)
    if category == "cpu": return get_cpus()
    if category == "mb": return get_motherboards()
    if category == "ram": return get_rams()
    if category == "gpu": return get_gpus()
    if category == "storage": return get_storage_drives()
    if category == "psu": return get_psus()
    if category == "case": return get_cases()
    if category == "cooler": return get_coolers()
    return []


def fetch_component(category: str, component_id: Any):
    category = normalize_category(category)
    component_id = extract_numeric_id(component_id)
    if not category or not component_id:
        return None
    for component in fetch_all_components_by_category(category):
        if int(component["id"]) == int(component_id):
            return component
    return None


# ============================================================
# COMPONENT API ROUTES
# ============================================================

@app.get("/api/components")
async def api_get_components():
    """Fetch all components grouped by category."""
    try:
        return fetch_all_components_grouped()
    except Exception as e:
        print("ERROR LOADING COMPONENTS FROM POSTGRESQL:", repr(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to load components from PostgreSQL",
                "details": str(e),
            }
        )


@app.get("/api/components/{category}")
async def api_get_components_by_category(category: str):
    """Fetch components by category."""
    normalized = normalize_category(category)
    if normalized == "all":
        return fetch_all_components_grouped()
    if not normalized:
        raise HTTPException(status_code=400, detail={"error": "Invalid category"})
    return fetch_all_components_by_category(normalized)


@app.get("/api/components/{category}/{component_id}")
async def api_get_component(category: str, component_id: str):
    """Fetch a specific component."""
    component = fetch_component(category, component_id)
    if not component:
        raise HTTPException(status_code=404, detail={"error": "Component not found"})
    return component


# ============================================================
# COMPATIBILITY AND STATS
# ============================================================

def build_report(data: dict[str, Any]) -> dict[str, Any]:
    cpu_id = get_selected_id(data, "cpu", "cpu_id", "cpuId")
    mb_id = get_selected_id(data, "mb", "motherboard", "motherboard_id", "motherboardId", "mb_id")
    ram_id = get_selected_id(data, "ram", "ram_id", "ramId")
    gpu_id = get_selected_id(data, "gpu", "gpu_id", "gpuId")
    storage_id = get_selected_id(data, "storage", "storage_id", "storageId")
    psu_id = get_selected_id(data, "psu", "psu_id", "psuId")
    case_id = get_selected_id(data, "case", "case_id", "caseId")

    selected = {
        "cpu": fetch_component("cpu", cpu_id) if cpu_id else None,
        "mb": fetch_component("mb", mb_id) if mb_id else None,
        "ram": fetch_component("ram", ram_id) if ram_id else None,
        "gpu": fetch_component("gpu", gpu_id) if gpu_id else None,
        "storage": fetch_component("storage", storage_id) if storage_id else None,
        "psu": fetch_component("psu", psu_id) if psu_id else None,
        "case": fetch_component("case", case_id) if case_id else None,
        "cooler": None,
    }

    cpu = selected["cpu"]
    mb = selected["mb"]
    ram = selected["ram"]
    gpu = selected["gpu"]
    storage = selected["storage"]
    psu = selected["psu"]
    pc_case = selected["case"]

    issues = []

    if cpu and mb and cpu.get("socket") != mb.get("socket"):
        issues.append(f"CPU socket {cpu.get('socket')} is not compatible with motherboard socket {mb.get('socket')}.")

    if mb and ram:
        if mb.get("ram_type") != ram.get("ram_type"):
            issues.append(f"RAM type {ram.get('ram_type')} is not compatible with motherboard RAM type {mb.get('ram_type')}.")
        if int(ram.get("capacity_gb") or 0) > int(mb.get("max_ram_gb") or 0):
            issues.append(f"RAM capacity {ram.get('capacity_gb')}GB exceeds motherboard maximum of {mb.get('max_ram_gb')}GB.")

    if mb and gpu and int(mb.get("pcie_x16_slots") or 0) < 1:
        issues.append("Motherboard does not have a PCIe x16 slot for the GPU.")

    if gpu and psu and int(psu.get("wattage") or 0) < int(gpu.get("recommended_psu_watts") or 0):
        issues.append(f"PSU wattage {psu.get('wattage')}W is lower than GPU recommended {gpu.get('recommended_psu_watts')}W.")

    if gpu and pc_case and int(gpu.get("length_mm") or 0) > int(pc_case.get("max_gpu_length_mm") or 0):
        issues.append(f"GPU length {gpu.get('length_mm')}mm exceeds case maximum {pc_case.get('max_gpu_length_mm')}mm.")

    if mb and storage:
        storage_interface = str(storage.get("interface", "")).lower()
        if "nvme" in storage_interface and int(mb.get("m2_slots") or 0) < 1:
            issues.append("NVMe storage requires at least one M.2 slot on the motherboard.")

    if mb and pc_case:
        motherboard_form = str(mb.get("form_factor", "")).lower()
        case_support = str(pc_case.get("form_factor_support", "")).lower()
        if motherboard_form and motherboard_form not in case_support:
            issues.append(f"Motherboard form factor {mb.get('form_factor')} is not supported by the selected case.")

    unique_parts = [cpu, mb, ram, gpu, storage, psu, pc_case]
    total_price = sum(float(part.get("price") or 0) for part in unique_parts if part)
    component_count = sum(1 for part in unique_parts if part)

    total_power = 0
    total_memory = 0
    gpu_memory = 0

    if cpu:
        total_power += int(cpu.get("tdp_watts") or 0)
    if mb:
        total_power += 50
    if ram:
        total_power += 5
        total_memory = int(ram.get("capacity_gb") or 0)
    if storage:
        total_power += 5
    if gpu:
        total_power += max(int(gpu.get("recommended_psu_watts") or 0) - 250, 75)
        gpu_memory = int(gpu.get("vram_gb") or 0)

    recommended_psu = total_power + 150
    if gpu:
        recommended_psu = max(recommended_psu, int(gpu.get("recommended_psu_watts") or 0))

    return {
        "compatible": len(issues) == 0,
        "issues": issues,
        "selectedParts": selected,
        "totalPrice": total_price,
        "totalCost": total_price,
        "totalPower": total_power,
        "recommendedPsu": recommended_psu,
        "totalMemory": total_memory,
        "gpuMemory": gpu_memory,
        "componentCount": component_count,
    }


@app.post("/api/compatibility")
async def api_compatibility(request: Request):
    """Check build compatibility."""
    data = await request.json()
    report = build_report(data)
    return {
        "compatible": report["compatible"],
        "issues": report["issues"],
        "totalPower": report["totalPower"],
        "recommendedPsu": report["recommendedPsu"],
    }


@app.post("/api/stats")
async def api_stats(request: Request):
    """Get build statistics."""
    data = await request.json()
    return build_report(data)


# ============================================================
# SAVED BUILDS — PostgreSQL only
# ============================================================

def ensure_saved_builds_table():
    run_write("""
        CREATE TABLE IF NOT EXISTS saved_builds (
            build_id SERIAL PRIMARY KEY,
            build_name VARCHAR(150) NOT NULL,
            build_data JSONB NOT NULL,
            total_price DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)


@app.get("/api/builds")
async def api_get_builds():
    """Fetch all saved builds."""
    ensure_saved_builds_table()
    return run_select("""
        SELECT
            build_id AS id,
            build_id,
            build_name AS name,
            build_name,
            build_data,
            total_price::float AS "totalPrice",
            total_price::float AS budget,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM saved_builds
        ORDER BY build_id DESC;
    """)


@app.post("/api/builds")
async def api_save_build(request: Request):
    """Save a new build."""
    ensure_saved_builds_table()
    data = await request.json()
    build_name = data.get("buildName") or data.get("build_name") or data.get("name") or "Untitled Build"
    report = build_report(data)
    data_to_save = dict(data)
    data_to_save["stats"] = report

    result = run_write("""
        INSERT INTO saved_builds (build_name, build_data, total_price)
        VALUES (%s, %s, %s)
        RETURNING build_id;
    """, (build_name, Json(data_to_save), report["totalPrice"]))

    return {"success": True, "id": result["build_id"] if result else None}


@app.get("/api/builds/{build_id}")
async def api_get_build(build_id: int):
    """Fetch a specific saved build."""
    ensure_saved_builds_table()
    build = run_select_one("""
        SELECT
            build_id AS id,
            build_id,
            build_name AS name,
            build_name,
            build_data,
            total_price::float AS "totalPrice",
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM saved_builds
        WHERE build_id = %s;
    """, (build_id,))

    if not build:
        raise HTTPException(status_code=404, detail={"error": "Build not found"})

    build_data = build.get("build_data") or {}
    build["components"] = build_data.get("components", {})
    build["stats"] = build_data.get("stats", {})
    return build


@app.delete("/api/builds/{build_id}")
async def api_delete_build(build_id: int):
    """Delete a saved build."""
    ensure_saved_builds_table()
    deleted = run_write("""
        DELETE FROM saved_builds
        WHERE build_id = %s
        RETURNING build_id;
    """, (build_id,))
    
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": "Build not found"})
    
    return {"success": True}


# ============================================================
# ADMIN DASHBOARD SCHEMA & METADATA
# ============================================================

def get_schemas_metadata() -> dict[str, Any]:
    """Return schema metadata for admin dashboard."""
    return ADMIN_SCHEMAS
    return {
        "cpu": {
            "fields": ["brand", "model", "family", "cores", "baseClock", "turboClock", "cache", "igpu", "tdp", "memSupport", "socket", "released"],
            "labels": ["Brand", "Model", "CPU Family", "Cores (P/E)", "Base Clock", "Turbo Clock", "Cache", "Integrated GPU", "TDP", "Memory Support", "Socket", "Date Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "gpu": {
            "fields": ["brand", "model", "memType", "memCapacity", "busWidth", "coreClock", "cudaCores", "tdp", "psu", "formFactor", "release"],
            "labels": ["Brand", "Model", "Memory Type", "Memory Capacity", "Bus Width", "Core Clock", "CUDA/Shader Cores", "TDP", "PSU Req.", "Form Factor", "Release Year"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "psu": {
            "fields": ["brand", "model", "powerOutput", "psuType", "efficiency", "inputVoltage", "frequency", "cooling", "modular", "mainPower", "cpuPower", "pcieConn", "sataConn", "warranty", "released"],
            "labels": ["Brand", "Model", "Power Output", "PSU Type", "Efficiency", "Input Voltage", "Frequency", "Cooling", "Modular Type", "Main Power", "CPU Power", "PCIe Connectors", "SATA Connectors", "Warranty", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "ssd": {
            "fields": ["brand", "model", "storageType", "interface", "formFactor", "capacity", "nand", "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", "cache", "endurance", "power", "encryption", "released"],
            "labels": ["Brand", "Model", "Storage Type", "Interface", "Form Factor", "Capacity", "NAND Type", "Read Speed", "Write Speed", "Read IOPS", "Write IOPS", "Cache", "Endurance", "Power", "Encryption", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "hdd": {
            "fields": ["brand", "model", "storageType", "interface", "formFactor", "capacity", "readSpeed", "writeSpeed", "readIOPS", "writeIOPS", "cache", "power", "encryption", "released"],
            "labels": ["Brand", "Model", "Storage Type", "Interface", "Form Factor", "Capacity", "Read Speed", "Write Speed", "Read IOPS", "Write IOPS", "Cache", "Power", "Encryption", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "fan": {
            "fields": ["brand", "model", "dimensions", "speed", "airflow", "connector", "voltage", "released"],
            "labels": ["Brand", "Model", "Fan Dimensions", "Fan Speed", "Airflow (CFM)", "Connector Type", "Voltage", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "mobo": {
            "fields": ["brand", "model", "formFactor", "chipset", "socket", "memType", "dimms", "maxMem", "memSpeed", "pciSlots", "m2Slots", "usb", "tier", "released"],
            "labels": ["Brand", "Model", "Form Factor", "Chipset", "Socket", "Memory Type", "DIMM Slots", "Max Memory", "Memory Speed", "PCIe Slots", "M.2 Slots", "USB Ports", "Tier", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
        "ram": {
            "fields": ["brand", "model", "memType", "capacity", "config", "formFactor", "speed", "cas", "voltage", "pins", "ecc", "buffered", "xmp", "released"],
            "labels": ["Brand", "Model", "Memory Type", "Capacity", "Config", "Form Factor", "Speed", "CAS Latency", "Voltage", "Pins", "ECC Support", "Buffered", "XMP Support", "Released"],
            "brandKey": "brand",
            "modelKey": "model",
        },
    }


def get_category_info() -> dict[str, Any]:
    """Return category metadata for admin dashboard."""
    return {
        "cpu": {"name": "Processor (CPU)", "subtitle": "Manage CPU specifications and details", "pill": "pill-cpu", "icon": "cat-cpu"},
        "gpu": {"name": "Graphics Card (GPU)", "subtitle": "Manage GPU specifications and details", "pill": "pill-gpu", "icon": "cat-gpu"},
        "psu": {"name": "Power Supply (PSU)", "subtitle": "Manage PSU specifications and details", "pill": "pill-psu", "icon": "cat-psu"},
        "ssd": {"name": "Storage (SSD)", "subtitle": "Manage SSD specifications and details", "pill": "pill-ssd", "icon": "cat-ssd"},
        "hdd": {"name": "Storage (HDD)", "subtitle": "Manage HDD specifications and details", "pill": "pill-hdd", "icon": "cat-hdd"},
        "fan": {"name": "Cooling Fans", "subtitle": "Manage cooling fan specifications", "pill": "pill-fan", "icon": "cat-fan"},
        "mobo": {"name": "Motherboard", "subtitle": "Manage motherboard specifications", "pill": "pill-mobo", "icon": "cat-mobo"},
        "ram": {"name": "Memory (RAM)", "subtitle": "Manage RAM specifications and details", "pill": "pill-ram", "icon": "cat-ram"},
    }


@app.get("/api/admin/schemas")
async def api_get_schemas(request: Request):
    """Fetch admin dashboard schemas."""
    require_admin(request)
    return get_schemas_metadata()


@app.get("/api/admin/categories")
async def api_get_categories(request: Request):
    """Fetch admin dashboard category info."""
    require_admin(request)
    return get_category_info()


@app.get("/api/admin/components")
async def api_get_admin_components(request: Request):
    """Fetch all components grouped by category for admin dashboard."""
    require_admin(request)
    try:
        return fetch_all_admin_components_grouped()
    except Exception as e:
        print("ERROR LOADING COMPONENTS FOR ADMIN:", repr(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to load components from PostgreSQL",
                "details": str(e),
            }
        )


@app.get("/api/admin/components/{category}")
async def api_get_admin_components_by_category(category: str, request: Request):
    """Fetch components by category for admin dashboard."""
    require_admin(request)
    normalized = normalize_admin_category(category)
    if str(category).lower().strip() == "all":
        return fetch_all_admin_components_grouped()
    if not normalized:
        raise HTTPException(status_code=400, detail={"error": "Invalid category"})
    return fetch_admin_components(normalized)


@app.post("/api/admin/components/{category}")
async def api_create_admin_component(category: str, request: Request):
    """Create a component row from the admin dashboard."""
    require_admin(request)
    payload = await request.json()
    return insert_admin_component(category, payload)


@app.put("/api/admin/components/{category}/{component_id}")
async def api_update_admin_component(category: str, component_id: int, request: Request):
    """Update a component row from the admin dashboard."""
    require_admin(request)
    payload = await request.json()
    return update_admin_component(category, component_id, payload)


@app.patch("/api/admin/components/{category}/{component_id}")
async def api_patch_admin_component(category: str, component_id: int, request: Request):
    """Patch a component row from the admin dashboard."""
    require_admin(request)
    payload = await request.json()
    existing = next((row for row in fetch_admin_components(category) if int(row["id"]) == int(component_id)), None)
    if not existing:
        raise HTTPException(status_code=404, detail={"error": "Component not found"})
    existing.update(payload)
    return update_admin_component(category, component_id, existing)


@app.delete("/api/admin/components/{category}/{component_id}")
async def api_delete_admin_component(category: str, component_id: int, request: Request):
    """Delete a component row from the admin dashboard."""
    require_admin(request)
    return delete_admin_component(category, component_id)


@app.get("/api/admin/users")
async def api_get_admin_users(request: Request):
    """List admin accounts."""
    require_admin(request)
    ensure_admin_users_table()
    return run_select("""
        SELECT
            admin_id,
            username,
            display_name,
            is_active,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM admin_users
        ORDER BY admin_id;
    """)


@app.post("/api/admin/users")
async def api_create_admin_user(request: Request):
    """Create another admin account."""
    require_admin(request)
    ensure_admin_users_table()
    payload = await request.json()
    username = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "")
    display_name = str(payload.get("display_name") or payload.get("displayName") or username).strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail={"error": "Username and password are required"})
    salt, digest = password_hash(password)
    try:
        row = run_write(
            """
            INSERT INTO admin_users (username, password_salt, password_hash, display_name)
            VALUES (%s, %s, %s, %s)
            RETURNING admin_id, username, display_name, is_active, created_at::text AS created_at;
            """,
            (username, salt, digest, display_name),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"error": "Could not create admin user", "details": str(exc)})
    return row


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "details": str(exc)}
    )


# ============================================================
# STARTUP MESSAGE
# ============================================================

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("Assembly PC - FastAPI Backend")
    print("=" * 60)
    print(f"  DB: postgresql://postgres@localhost/pc_builder_simulation")
    print(f"  Run System Here:  http://127.0.0.1:5000/")
    print(f"  Simulator:        http://127.0.0.1:5000/simulator")
    print(f"  Admin:            http://127.0.0.1:5000/admin")
    print(f"  API Docs:         http://127.0.0.1:5000/docs")
    print(f"  Redoc:            http://127.0.0.1:5000/redoc")
    print(f"  Components:       http://127.0.0.1:5000/api/components")
    print("=" * 60)


# ============================================================
# MAIN - FOR RUNNING WITH: python app.py
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
