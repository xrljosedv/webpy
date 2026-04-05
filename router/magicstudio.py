import requests
import uuid
import time
import base64
import os
from datetime import datetime

def generate_client_id():
    return base64.b64encode(os.urandom(32)).decode('utf-8').replace('+', '-').replace('/', '_').rstrip('=')

def generate_magic_image(prompt):
    client_id = generate_client_id()
    anonymous_user_id = str(uuid.uuid4())
    request_timestamp = f"{time.time():.3f}"
    
    form_data = {
        'prompt': prompt,
        'output_format': 'bytes',
        'user_profile_id': 'null',
        'anonymous_user_id': anonymous_user_id,
        'request_timestamp': request_timestamp,
        'user_is_subscribed': 'false',
        'client_id': client_id
    }
    
    headers = {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://magicstudio.com',
        'referer': 'https://magicstudio.com/ai-art-generator/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.post(
        'https://ai-api.magicstudio.com/api/ai-art-generator',
        data=form_data,
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        return response.content
    raise Exception(f"API error: {response.status_code}")

def run(request):
    if request.method == 'GET':
        prompt = request.args.get('prompt', '').strip()
    else:
        prompt = request.json.get('prompt', '').strip() if request.is_json else request.form.get('prompt', '').strip()
    
    if not prompt:
        return {
            'status': False,
            'error': 'Missing required parameter',
            'message': "The 'prompt' parameter is required",
            'code': 400
        }
    
    if len(prompt) > 1000:
        return {
            'status': False,
            'error': 'Prompt too long',
            'message': 'Prompt must be 1000 characters or less',
            'code': 400
        }
    
    image_buffer = generate_magic_image(prompt)
    
    return {
        'image_data': image_buffer,
        'mimetype': 'image/jpeg',
        'filename': f"magicstudio_{int(time.time())}.jpg",
        'as_attachment': False
    }

endpoints = [
    {
        "metode": "GET",
        "endpoint": "/ai/magicstudio",
        "name": "MagicStudio AI Image Generator",
        "category": "AI Image",
        "description": "Generates AI-powered art from a text prompt. Returns a JPEG image.",
        "tags": ["AI", "Image Generation", "Art"],
        "example": "?prompt=portrait of a wizard",
        "parameters": [
            {
                "name": "prompt",
                "in": "query",
                "required": True,
                "schema": {"type": "string", "minLength": 1, "maxLength": 1000},
                "description": "Text prompt for generating the AI art",
                "example": "portrait of a wizard with a long beard"
            }
        ],
        "isPremium": False,
        "isMaintenance": False,
        "isPublic": True,
        "supportsUpload": False,
        "run": run
    }
]