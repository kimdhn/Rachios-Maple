
from flask import Flask, request, jsonify, send_from_directory, Response
import hmac, logging, sqlite3, os, requests
import flask.cli
from urllib.parse import unquote, urlparse

app = Flask(__name__, static_folder="static", static_url_path="/static")
DB = "db.sqlite3"

def load_env_file(path=".env"):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)

load_env_file()

MAX = int(os.getenv("MAX_CHARACTERS", "10"))
# Keep this in sync with CHARACTER_SLOTS.length in static/main.js.
QUEUE_LIMIT = int(os.getenv("QUEUE_LIMIT", str(MAX)))
NEXON_API_BASE = "https://open.api.nexon.com/maplestory/v1"
NEXON_API_KEY = os.getenv("NEXON_OPEN_API_KEY", "")
DB_ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD", "")

def get_conn():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    con = get_conn()
    cur = con.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS chars_new (
        name TEXT PRIMARY KEY,
        level INTEGER NOT NULL,
        power INTEGER NOT NULL,
        popularity INTEGER NOT NULL,
        look TEXT NOT NULL,
        create_date TEXT,
        raw_qr TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    has_old_chars = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='chars'"
    ).fetchone()

    if has_old_chars:
        columns = [row[1] for row in cur.execute("PRAGMA table_info(chars)").fetchall()]
        created_at_expr = "created_at" if "created_at" in columns else "CURRENT_TIMESTAMP"
        cur.execute(f"""
        INSERT OR REPLACE INTO chars_new(name, level, power, popularity, look, create_date, raw_qr, created_at)
        SELECT name, level, power, popularity, look, create_date, raw_qr, {created_at_expr}
        FROM chars
        ORDER BY rowid ASC
        """)
        cur.execute("DROP TABLE chars")

    cur.execute("ALTER TABLE chars_new RENAME TO chars")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS char_queue (
        name TEXT PRIMARY KEY,
        slot_index INTEGER NOT NULL UNIQUE,
        queue_order INTEGER NOT NULL UNIQUE,
        queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    queue_columns = [row[1] for row in cur.execute("PRAGMA table_info(char_queue)").fetchall()]
    if "slot_index" not in queue_columns:
        old_rows = cur.execute("""
            SELECT name, queue_order, queued_at
            FROM char_queue
            ORDER BY queue_order ASC
        """).fetchall()
        cur.execute("DROP TABLE char_queue")
        cur.execute("""
        CREATE TABLE char_queue (
            name TEXT PRIMARY KEY,
            slot_index INTEGER NOT NULL UNIQUE,
            queue_order INTEGER NOT NULL UNIQUE,
            queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        for slot_index, row in enumerate(old_rows):
            cur.execute(
                "INSERT INTO char_queue(name, slot_index, queue_order, queued_at) VALUES (?, ?, ?, ?)",
                (row["name"], slot_index, row["queue_order"], row["queued_at"]),
            )
    cur.execute("DELETE FROM char_queue WHERE name NOT IN (SELECT name FROM chars)")
    con.commit()
    con.close()

def parse_qr_payload(payload: str):
    # expected: 00/<look>|<urlencoded_name>|<level>|<power>|<yyyymmdd>|<popularity>
    if not payload:
        raise ValueError("Empty QR payload")
    if payload.startswith("00/"):
        payload = payload[3:]
    parts = payload.split("|")
    if len(parts) < 6:
        raise ValueError(f"Expected at least 6 fields, got {len(parts)}")
    look, enc_name, level, power, create_date, popularity = parts[:6]
    return {
        "name": unquote(enc_name),
        "level": int(level),
        "power": int(power),
        "popularity": int(popularity),
        "look": look,
        "create_date": create_date,
        "raw_qr": payload,
    }

def insert_character(cur, data: dict):
    cur.execute(
        "INSERT INTO chars(name, level, power, popularity, look, create_date, raw_qr) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            data["name"],
            int(data["level"]),
            int(data["power"]),
            int(data["popularity"]),
            data["look"],
            data.get("create_date"),
            data.get("raw_qr"),
        ),
    )

def fetch_character(cur, name: str):
    row = cur.execute("SELECT * FROM chars WHERE name = ?", (name,)).fetchone()
    return dict(row) if row else None

def is_character_queued(cur, name: str):
    row = cur.execute("SELECT 1 FROM char_queue WHERE name = ?", (name,)).fetchone()
    return row is not None

def enqueue_character(cur, name: str, queue_limit: int):
    if is_character_queued(cur, name):
        return False

    next_order = cur.execute(
        "SELECT COALESCE(MAX(queue_order), 0) + 1 FROM char_queue"
    ).fetchone()[0]
    queue_size = cur.execute("SELECT COUNT(*) FROM char_queue").fetchone()[0]

    if queue_size < queue_limit:
        used_slots = {
            row[0] for row in cur.execute("SELECT slot_index FROM char_queue").fetchall()
        }
        slot_index = next(i for i in range(queue_limit) if i not in used_slots)
    else:
        oldest = cur.execute("""
            SELECT name, slot_index
            FROM char_queue
            ORDER BY queue_order ASC
            LIMIT 1
        """).fetchone()
        slot_index = oldest["slot_index"]
        cur.execute("DELETE FROM char_queue WHERE name = ?", (oldest["name"],))

    cur.execute(
        "INSERT INTO char_queue(name, slot_index, queue_order) VALUES (?, ?, ?)",
        (name, slot_index, next_order),
    )
    normalize_queue(cur, queue_limit)
    return True

def parse_queue_limit(value):
    try:
        queue_limit = int(value)
    except (TypeError, ValueError):
        return QUEUE_LIMIT
    return max(queue_limit, 1)

def normalize_queue(cur, queue_limit: int):
    cur.execute("DELETE FROM char_queue WHERE slot_index >= ?", (queue_limit,))
    queue_size = cur.execute("SELECT COUNT(*) FROM char_queue").fetchone()[0]
    if queue_size > queue_limit:
        cur.execute(
            "DELETE FROM char_queue WHERE name IN (SELECT name FROM char_queue ORDER BY queue_order ASC LIMIT ?)",
            (queue_size - queue_limit,),
        )

def add_or_queue_character(data: dict, queue_limit: int):
    con = get_conn()
    cur = con.cursor()
    normalize_queue(cur, queue_limit)

    existing = fetch_character(cur, data["name"])
    if existing:
        if is_character_queued(cur, data["name"]):
            action = "noop"
            character = existing
        else:
            enqueue_character(cur, data["name"], queue_limit)
            action = "queued_existing"
            character = existing
    else:
        insert_character(cur, data)
        enqueue_character(cur, data["name"], queue_limit)
        action = "inserted"
        character = fetch_character(cur, data["name"]) or data

    con.commit()
    con.close()
    return action, character

def nexon_get(path: str, **params):
    if not NEXON_API_KEY:
        raise ValueError("NEXON_OPEN_API_KEY is not configured")

    headers = {
        "accept": "application/json",
        "x-nxopen-api-key": NEXON_API_KEY,
    }
    res = requests.get(f"{NEXON_API_BASE}{path}", headers=headers, params=params, timeout=15)
    if not res.ok:
        try:
            detail = res.json()
        except ValueError:
            detail = {"message": res.text}
        raise ValueError(detail.get("message") or detail.get("error", {}).get("message") or "Nexon API request failed")
    return res.json()

def extract_look_code(character_image_url: str):
    parsed = urlparse(character_image_url)
    parts = parsed.path.rstrip("/").split("/")
    if not parts:
        raise ValueError("Invalid character_image URL")
    return parts[-1]

def parse_power(stat_payload: dict):
    for stat in stat_payload.get("final_stat", []):
        stat_name = str(stat.get("stat_name", "")).strip()
        stat_value = str(stat.get("stat_value", "0")).replace(",", "")
        if stat_name in {"전투력", "Combat Power"}:
            try:
                return int(float(stat_value))
            except ValueError:
                return 0
    return 0

def build_character_from_name(name: str):
    if not name:
        raise ValueError("캐릭터 닉네임을 입력해주세요")

    ocid_payload = nexon_get("/id", character_name=name)
    ocid = ocid_payload.get("ocid")
    if not ocid:
        raise ValueError("캐릭터 식별자(ocid)를 찾지 못했습니다")

    basic = nexon_get("/character/basic", ocid=ocid)
    popularity_data = nexon_get("/character/popularity", ocid=ocid)
    stat_data = nexon_get("/character/stat", ocid=ocid)

    return {
        "name": basic.get("character_name", name),
        "level": int(basic.get("character_level", 0)),
        "power": parse_power(stat_data),
        "popularity": int(popularity_data.get("popularity", 0)),
        "look": extract_look_code(basic.get("character_image", "")),
        "create_date": basic.get("character_date_create"),
        "raw_qr": None,
        "world_name": basic.get("world_name"),
        "character_class": basic.get("character_class"),
    }

def verify_admin_password(payload: dict):
    if not DB_ADMIN_PASSWORD:
        return False, ("DB_ADMIN_PASSWORD is not configured", 503)
    password = str(payload.get("password", ""))
    if not hmac.compare_digest(password, DB_ADMIN_PASSWORD):
        return False, ("비밀번호가 올바르지 않습니다", 403)
    return True, None

def clean_queue():
    con = get_conn()
    cur = con.cursor()
    cur.execute("DELETE FROM char_queue")
    deleted = cur.rowcount
    con.commit()
    con.close()
    return deleted

def clean_db():
    con = get_conn()
    cur = con.cursor()
    cur.execute("DELETE FROM char_queue")
    deleted_queue = cur.rowcount
    cur.execute("DELETE FROM chars")
    deleted_chars = cur.rowcount
    con.commit()
    con.close()
    return deleted_queue, deleted_chars

init_db()

@app.route("/")
def root():
    return send_from_directory("static", "index.html")

@app.route("/api/list")
def list_chars():
    con = get_conn()
    cur = con.cursor()
    queue_limit = parse_queue_limit(request.args.get("limit"))
    normalize_queue(cur, queue_limit)
    con.commit()
    rows = [dict(r) for r in cur.execute("""
        SELECT c.*, q.slot_index
        FROM char_queue q
        JOIN chars c ON c.name = q.name
        ORDER BY q.slot_index ASC
    """)]
    con.close()
    return jsonify(rows)

@app.route("/api/add", methods=["POST"])
def add_char():
    d = request.get_json(force=True)
    required = ["name", "level", "power", "popularity", "look"]
    for k in required:
        if k not in d:
            return jsonify({"ok": False, "error": f"Missing field: {k}"}), 400
    queue_limit = parse_queue_limit(d.get("queue_limit"))
    action, character = add_or_queue_character(d, queue_limit)
    return jsonify({"ok": True, "action": action, "character": character})

@app.route("/api/add_qr", methods=["POST"])
def add_qr():
    d = request.get_json(force=True)
    payload = d.get("payload", "").strip()
    parsed = parse_qr_payload(payload)
    queue_limit = parse_queue_limit(d.get("queue_limit"))
    action, character = add_or_queue_character(parsed, queue_limit)
    return jsonify({"ok": True, "action": action, "character": character})

@app.route("/api/add_name", methods=["POST"])
def add_name():
    d = request.get_json(force=True)
    name = d.get("name", "").strip()
    queue_limit = parse_queue_limit(d.get("queue_limit"))

    try:
        con = get_conn()
        cur = con.cursor()
        existing = fetch_character(cur, name)
        con.close()

        if existing:
            action, character = add_or_queue_character(existing, queue_limit)
        else:
            character_data = build_character_from_name(name)
            action, character = add_or_queue_character(character_data, queue_limit)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except requests.RequestException:
        return jsonify({"ok": False, "error": "넥슨 API 호출에 실패했습니다"}), 502

    return jsonify({"ok": True, "action": action, "character": character})

@app.route("/api/character/<path:name>", methods=["DELETE"])
def delete_char(name):
    d = request.get_json(silent=True) or {}
    ok, error = verify_admin_password(d)
    if not ok:
        message, status = error
        return jsonify({"ok": False, "error": message}), status

    name = unquote(name).strip()
    if not name:
        return jsonify({"ok": False, "error": "캐릭터 닉네임을 입력해주세요"}), 400

    con = get_conn()
    cur = con.cursor()
    cur.execute("DELETE FROM char_queue WHERE name = ?", (name,))
    cur.execute("DELETE FROM chars WHERE name = ?", (name,))
    deleted = cur.rowcount
    con.commit()
    con.close()

    if deleted == 0:
        return jsonify({"ok": False, "error": "해당 캐릭터를 찾지 못했습니다"}), 404
    return jsonify({"ok": True, "name": name})

@app.route("/api/admin/clean_queue", methods=["POST"])
def admin_clean_queue():
    d = request.get_json(force=True)
    ok, error = verify_admin_password(d)
    if not ok:
        message, status = error
        return jsonify({"ok": False, "error": message}), status
    deleted = clean_queue()
    return jsonify({"ok": True, "deleted_queue": deleted})

@app.route("/api/admin/clean_db", methods=["POST"])
def admin_clean_db():
    d = request.get_json(force=True)
    ok, error = verify_admin_password(d)
    if not ok:
        message, status = error
        return jsonify({"ok": False, "error": message}), status
    deleted_queue, deleted_chars = clean_db()
    return jsonify({
        "ok": True,
        "deleted_queue": deleted_queue,
        "deleted_chars": deleted_chars,
    })

@app.route("/api/rank/<kind>")
def rank(kind):
    rank_specs = {
        "level": ("level", "DESC"),
        "power": ("power", "DESC"),
        "popularity": ("popularity", "DESC"),
        "created": ("REPLACE(SUBSTR(create_date, 1, 10), '-', '')", "ASC"),
    }
    spec = rank_specs.get(kind)
    if spec is None:
        return jsonify({"ok": False, "error": "Invalid ranking kind"}), 400
    col, direction = spec
    null_order = "create_date IS NULL ASC," if kind == "created" else ""
    con = get_conn()
    rows = [dict(r) for r in con.execute(
        f"SELECT name, level, power, popularity, create_date FROM chars ORDER BY {null_order} {col} {direction}, name ASC LIMIT 50"
    )]
    con.close()
    return jsonify(rows)

@app.route("/api/proxy")
def proxy():
    url = request.args.get("url", "")
    if not url.startswith("https://open.api.nexon.com/static/maplestory/character/look/"):
        return jsonify({"ok": False, "error": "Only Nexon static character image URLs are allowed"}), 400
    r = requests.get(url, timeout=15)
    headers = {
        "Content-Type": r.headers.get("Content-Type", "image/png"),
        "Cache-Control": "public, max-age=3600"
    }
    return Response(r.content, status=r.status_code, headers=headers)

def run_local_server():
    host = os.getenv("APP_HOST", "127.0.0.1")
    port = int(os.getenv("PORT", os.getenv("APP_PORT", "1939")))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    quiet = os.getenv("QUIET_SERVER", "1") != "0"

    if quiet:
        flask.cli.show_server_banner = lambda *args, **kwargs: None
        logging.getLogger("werkzeug").disabled = True

    display_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    print(f"Server running at http://{display_host}:{port}")
    if host == "0.0.0.0":
        print(f"LAN/external access is enabled. Use this machine's LAN IP or forwarded public address with port {port}.")
    app.run(host=host, port=port, debug=debug, use_reloader=False)

if __name__ == "__main__":
    run_local_server()
