from __future__ import annotations

import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_file, redirect, render_template
from psycopg2.extras import RealDictCursor, Json

from database import get_db_connection

BASE_DIR = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR.parent / "static"),
)


@app.after_request
def disable_cache_and_allow_local_dev(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


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
# PAGE ROUTES
# ============================================================

@app.route("/")
def home():
    """Serve the homepage."""
    try:
        return render_template("assembly-pc-homepage.html")
    except Exception:
        return redirect("/simulator")


@app.route("/simulator")
def simulator():
    """Serve the main simulator (assembly_pc_dynamic.html)."""
    return render_template("assembly_pc_dynamic.html")


@app.route("/admin")
def admin():
    """Serve the admin dashboard."""
    return render_template("admin-dashboard.html")


@app.route("/profile")
def profile():
    """Serve the user profile page."""
    return render_template("profile.html")


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"})


@app.route("/api/db-check")
def db_check():
    try:
        result = run_select_one("""
            SELECT
                current_database() AS database_name,
                current_user AS database_user,
                inet_server_port() AS server_port;
        """)
        return jsonify({"status": "connected", **result})
    except Exception as e:
        return jsonify({"status": "error", "details": str(e)}), 500


# ============================================================
# CATEGORY HELPERS
# ============================================================

def normalize_category(category: str | None) -> str | None:
    c = str(category or "").lower().strip()
    aliases = {
        "all": "all",
        "cpu": "cpu", "cpus": "cpu",
        "mb": "mb", "motherboard": "mb", "motherboards": "mb",
        "ram": "ram", "rams": "ram", "memory": "ram", "ram_modules": "ram",
        "gpu": "gpu", "gpus": "gpu",
        "storage": "storage", "ssd": "storage", "hdd": "storage", "storage_drives": "storage",
        "psu": "psu", "psus": "psu",
        "case": "case", "cases": "case", "pc_case": "case", "pc_cases": "case",
        "cooler": "cooler", "coolers": "cooler",
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


# ============================================================
# COMPONENT QUERIES — matches your exact schema
# ============================================================

def get_cpus():
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


def fetch_all_components_grouped():
    return {
        "cpu": get_cpus(),
        "mb": get_motherboards(),
        "ram": get_rams(),
        "gpu": get_gpus(),
        "storage": get_storage_drives(),
        "psu": get_psus(),
        "case": get_cases(),
        "cooler": [],
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
    if category == "cooler": return []
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

@app.route("/api/components", methods=["GET"])
def api_get_components():
    try:
        return jsonify(fetch_all_components_grouped())
    except Exception as e:
        print("ERROR LOADING COMPONENTS FROM POSTGRESQL:", repr(e))
        return jsonify({
            "error": "Failed to load components from PostgreSQL",
            "details": str(e),
        }), 500


@app.route("/api/components/<category>", methods=["GET"])
def api_get_components_by_category(category):
    normalized = normalize_category(category)
    if normalized == "all":
        return jsonify(fetch_all_components_grouped())
    if not normalized:
        return jsonify({"error": "Invalid category"}), 400
    return jsonify(fetch_all_components_by_category(normalized))


@app.route("/api/components/<category>/<component_id>", methods=["GET"])
def api_get_component(category, component_id):
    component = fetch_component(category, component_id)
    if not component:
        return jsonify({"error": "Component not found"}), 404
    return jsonify(component)


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


@app.route("/api/compatibility", methods=["POST"])
def api_compatibility():
    data = request.get_json(silent=True) or {}
    report = build_report(data)
    return jsonify({
        "compatible": report["compatible"],
        "issues": report["issues"],
        "totalPower": report["totalPower"],
        "recommendedPsu": report["recommendedPsu"],
    })


@app.route("/api/stats", methods=["POST"])
def api_stats():
    data = request.get_json(silent=True) or {}
    return jsonify(build_report(data))


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


@app.route("/api/builds", methods=["GET"])
def api_get_builds():
    ensure_saved_builds_table()
    return jsonify(run_select("""
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
    """))


@app.route("/api/builds", methods=["POST"])
def api_save_build():
    ensure_saved_builds_table()
    data = request.get_json(silent=True) or {}
    build_name = data.get("buildName") or data.get("build_name") or data.get("name") or "Untitled Build"
    report = build_report(data)
    data_to_save = dict(data)
    data_to_save["stats"] = report

    result = run_write("""
        INSERT INTO saved_builds (build_name, build_data, total_price)
        VALUES (%s, %s, %s)
        RETURNING build_id;
    """, (build_name, Json(data_to_save), report["totalPrice"]))

    return jsonify({"success": True, "id": result["build_id"] if result else None})


@app.route("/api/builds/<int:build_id>", methods=["GET"])
def api_get_build(build_id):
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
        return jsonify({"error": "Build not found"}), 404

    build_data = build.get("build_data") or {}
    build["components"] = build_data.get("components", {})
    build["stats"] = build_data.get("stats", {})
    return jsonify(build)


@app.route("/api/builds/<int:build_id>", methods=["DELETE"])
def api_delete_build(build_id):
    ensure_saved_builds_table()
    deleted = run_write("""
        DELETE FROM saved_builds
        WHERE build_id = %s
        RETURNING build_id;
    """, (build_id,))
    if not deleted:
        return jsonify({"error": "Build not found"}), 404
    return jsonify({"success": True})


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    print("=" * 60)
    print("Assembly PC - Flask Backend")
    print("=" * 60)
    print(f"  DB: postgresql://postgres@localhost/pc_builder_simulation")
    print(f"  Simulator: http://127.0.0.1:5000/simulator")
    print(f"  Admin:     http://127.0.0.1:5000/admin")
    print(f"  DB Check:  http://127.0.0.1:5000/api/db-check")
    print(f"  Components:http://127.0.0.1:5000/api/components")
    print("=" * 60)
    app.run(debug=True, port=5000)
