import os
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, render_template, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient

from content import COMPANY

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPT_DIR = os.path.join(BASE_DIR, "script")

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.environ.get("SECRET_KEY", "")
CORS(app, resources={r"/api/*": {"origins": "*"}})

_client = None


@app.context_processor
def inject_company():
    return {"company": COMPANY}


def get_collection():
    global _client
    uri = os.environ.get("MONGODB_URI", "").strip()
    db_name = os.environ.get("DB_NAME", "DB_Walida").strip() or "DB_Walida"
    if not uri:
        raise RuntimeError("MONGODB_URI belum diatur di .env")
    if _client is None:
        _client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    return _client[db_name]["polygon"]


def serialize(doc):
    if not doc:
        return None
    item = dict(doc)
    if "_id" in item:
        item["_id"] = str(item["_id"])
    for key in ("createdAt", "updatedAt"):
        value = item.get(key)
        if isinstance(value, datetime):
            item[key] = value.isoformat()
    return item


def find_polygon(polygon_id):
    coll = get_collection()
    clauses = [{"idPolygon": polygon_id}]
    if str(polygon_id).isdigit():
        clauses.append({"id": int(polygon_id)})
    try:
        clauses.append({"_id": ObjectId(polygon_id)})
    except InvalidId:
        pass
    return coll.find_one({"$or": clauses})


@app.get("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/tentang")
def tentang():
    return render_template("tentang.html")


@app.get("/proses")
def proses():
    return render_template("proses.html")


@app.get("/peta")
def peta():
    return render_template("peta.html")


@app.get("/kontak")
def kontak():
    contact = COMPANY["kontak"]
    sosial = [
        (name, url)
        for name, url in (contact.get("sosial") or {}).items()
        if isinstance(url, str) and url.strip()
    ]
    rows = []
    if contact.get("nama", "").strip():
        rows.append({"label": "Nama", "value": contact["nama"], "href": None})
    if contact.get("alamat", "").strip():
        rows.append({"label": "Alamat", "value": contact["alamat"], "href": None})
    if contact.get("telepon", "").strip():
        rows.append(
            {
                "label": "Telepon",
                "value": contact["telepon"],
                "href": "tel:" + contact["telepon"],
            }
        )
    if contact.get("email", "").strip():
        rows.append(
            {
                "label": "Email",
                "value": contact["email"],
                "href": "mailto:" + contact["email"],
            }
        )
    has_contact = bool(
        contact.get("alamat", "").strip()
        or contact.get("telepon", "").strip()
        or contact.get("email", "").strip()
        or sosial
    )
    return render_template(
        "kontak.html", rows=rows, sosial=sosial, has_contact=has_contact
    )


@app.get("/script/<path:filename>")
def script_file(filename):
    return send_from_directory(SCRIPT_DIR, filename)


@app.get("/api/polygon")
def api_polygon_list():
    try:
        docs = get_collection().find().sort("id", 1)
        return jsonify([serialize(doc) for doc in docs])
    except Exception as exc:
        return jsonify({"error": str(exc)}), 503


@app.get("/api/polygon/<polygon_id>")
def api_polygon_one(polygon_id):
    try:
        doc = find_polygon(polygon_id)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 503
    if not doc:
        abort(404)
    return jsonify(serialize(doc))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
