import os
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', '')
CORS(app, resources={r'/api/*': {'origins': '*'}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

_client = None


def get_collection():
    global _client
    uri = os.environ.get('MONGODB_URI', '').strip()
    db_name = os.environ.get('DB_NAME', 'DB_Walida').strip() or 'DB_Walida'
    if not uri:
        raise RuntimeError('MONGODB_URI belum diatur di .env')
    if _client is None:
        _client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    return _client[db_name]['polygon']


def serialize(doc):
    if not doc:
        return None
    item = dict(doc)
    if '_id' in item:
        item['_id'] = str(item['_id'])
    for key in ('createdAt', 'updatedAt'):
        value = item.get(key)
        if isinstance(value, datetime):
            item[key] = value.isoformat()
    return item


def find_polygon(polygon_id):
    coll = get_collection()
    clauses = [{'idPolygon': polygon_id}]
    if str(polygon_id).isdigit():
        clauses.append({'id': int(polygon_id)})
    try:
        clauses.append({'_id': ObjectId(polygon_id)})
    except InvalidId:
        pass
    return coll.find_one({'$or': clauses})


@app.get('/api/polygon')
def api_polygon_list():
    try:
        docs = get_collection().find().sort('id', 1)
        return jsonify([serialize(doc) for doc in docs])
    except Exception as exc:
        return jsonify({'error': str(exc)}), 503


@app.get('/api/polygon/<polygon_id>')
def api_polygon_one(polygon_id):
    try:
        doc = find_polygon(polygon_id)
    except Exception as exc:
        return jsonify({'error': str(exc)}), 503
    if not doc:
        abort(404)
    return jsonify(serialize(doc))


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/') or path in ('app.py',) or path.startswith('.'):
        abort(404)

    file_path = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(DIST_DIR, path)

    index_path = os.path.join(DIST_DIR, 'index.html')
    if os.path.isfile(index_path):
        return send_from_directory(DIST_DIR, 'index.html')

    return (
        'Frontend belum dibangun. Dari folder proyek jalankan: npm run build',
        503,
        {'Content-Type': 'text/plain; charset=utf-8'},
    )


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
