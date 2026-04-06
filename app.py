from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import sys
import importlib
from pathlib import Path
from datetime import datetime
import json
import uuid

base_dir = Path(__file__).parent.resolve()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = base_dir / 'uploads'
app.config['UPLOAD_FOLDER'].mkdir(exist_ok=True)

ROUTER_DIR = base_dir / 'router'
router_endpoints = []

def load_routers():
    global router_endpoints
    router_endpoints = []
    
    if not ROUTER_DIR.exists():
        ROUTER_DIR.mkdir(exist_ok=True)
        init_file = ROUTER_DIR / '__init__.py'
        if not init_file.exists():
            init_file.touch()
        return
    
    sys.path.insert(0, str(base_dir))
    
    for py_file in ROUTER_DIR.glob('*.py'):
        if py_file.name == '__init__.py':
            continue
        
        module_name = f"router.{py_file.stem}"
        try:
            module = importlib.import_module(module_name)
            if hasattr(module, 'endpoints'):
                endpoints = getattr(module, 'endpoints')
                if isinstance(endpoints, list):
                    for endpoint in endpoints:
                        if isinstance(endpoint, dict) and 'endpoint' in endpoint and 'metode' in endpoint:
                            router_endpoints.append(endpoint)
        except Exception as e:
            print(f"Error loading {py_file.name}: {e}")

def create_route_handler(endpoint_config):
    def handler():
        try:
            result = endpoint_config.get('run', lambda req: None)(request)
            
            if isinstance(result, dict):
                if 'file' in result and 'filename' in result:
                    return send_file(
                        result['file'],
                        mimetype=result.get('mimetype', 'application/octet-stream'),
                        as_attachment=result.get('as_attachment', False),
                        download_name=result.get('filename', 'download')
                    )
                elif 'image_data' in result:
                    from io import BytesIO
                    return send_file(
                        BytesIO(result['image_data']),
                        mimetype=result.get('mimetype', 'image/jpeg'),
                        download_name=result.get('filename', 'image.jpg')
                    )
                else:
                    response = jsonify(result)
                    if 'code' in result:
                        response.status_code = result['code']
                    return response
            return jsonify(result)
        except Exception as e:
            return jsonify({
                'status': False,
                'creator': 'Xrljose Xxdvわ',
                'error': str(e),
                'code': 500
            }), 500
    
    handler.__name__ = f"handler_{endpoint_config['endpoint'].replace('/', '_')}"
    return handler

load_routers()

for endpoint in router_endpoints:
    method = endpoint.get('metode', 'GET').lower()
    route_path = endpoint.get('endpoint', '')
    
    if route_path:
        handler_func = create_route_handler(endpoint)
        
        if method == 'get':
            app.route(route_path, methods=['GET'])(handler_func)
        elif method == 'post':
            app.route(route_path, methods=['POST'])(handler_func)
        elif method == 'delete':
            app.route(route_path, methods=['DELETE'])(handler_func)

@app.route('/api/list', methods=['GET'])
def list_endpoints():
    all_routes = []
    
    for endpoint in router_endpoints:
        example_string = endpoint.get('example', '')
        if not example_string and endpoint.get('parameters'):
            example_params = []
            for param in endpoint.get('parameters', []):
                if param.get('example'):
                    example_params.append(f"{param['name']}={param['example']}")
            if example_params:
                example_string = f"?{'&'.join(example_params)}"
        
        all_routes.append({
            'name': endpoint.get('name', endpoint.get('endpoint', '')),
            'endpoint': endpoint.get('endpoint', ''),
            'method': endpoint.get('metode', 'GET'),
            'category': endpoint.get('category', 'General'),
            'description': endpoint.get('description', 'Sin descripcion'),
            'tags': endpoint.get('tags', []),
            'example': example_string,
            'parameters': endpoint.get('parameters', []),
            'isPremium': endpoint.get('isPremium', False),
            'isMaintenance': endpoint.get('isMaintenance', False),
            'isPublic': endpoint.get('isPublic', True),
            'supportsUpload': endpoint.get('supportsUpload', False)
        })
    
    return jsonify({
        'status': True,
        'creator': 'Xrljose Xxdvわ',
        'data': all_routes,
        'count': len(all_routes),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/', methods=['GET'])
def home():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>', methods=['GET'])
def static_files(path):
    return send_from_directory('static', path)

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': False,
        'creator': 'Xrljose Xxdvわ',
        'error': 'Endpoint not found',
        'code': 404
    }), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
