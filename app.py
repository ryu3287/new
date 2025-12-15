from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)

# CORS設定を強化
CORS(app, 
    origins="*",
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"]
)

def geocode_place(place_name):
    """Nominatim APIで場所名から緯度経度を取得"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": place_name,
            "format": "json",
            "limit": 1
        }
        headers = {"User-Agent": "photo-location-map"}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        if not data:
            return {"error": f"'{place_name}' が見つかりません"}
        
        result = data[0]
        return {
            "lat": float(result["lat"]),
            "lon": float(result["lon"]),
            "display_name": result.get("display_name", place_name)
        }
    
    except requests.Timeout:
        return {"error": "タイムアウト: サーバーが応答しません"}
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

@app.route("/api/geocode", methods=["POST", "OPTIONS"])
def geocode():
    """場所名から座標を取得"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.json
        place = data.get("place", "").strip()
        
        if not place:
            return jsonify({"error": "場所名が入力されていません"}), 400
        
        result = geocode_place(place)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({
            "lat": result["lat"],
            "lon": result["lon"],
            "display_name": result["display_name"]
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/suggest", methods=["POST", "OPTIONS"])
def suggest_places():
    """場所名の候補を提案"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.json
        query = data.get("query", "").strip()
        
        if not query or len(query) < 2:
            return jsonify({"suggestions": []}), 400
        
        suggestions = get_place_suggestions(query)
        
        return jsonify({
            "suggestions": suggestions
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_place_suggestions(query):
    """Nominatim APIから場所候補を取得"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "format": "json",
            "limit": 10
        }
        headers = {"User-Agent": "photo-location-map"}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        suggestions = []
        for item in data:
            suggestions.append({
                "name": item.get("name", ""),
                "display_name": item.get("display_name", ""),
                "lat": float(item.get("lat", 0)),
                "lon": float(item.get("lon", 0))
            })
        
        return suggestions
    
    except Exception as e:
        return []

@app.route("/", methods=["GET"])
def index():
    return "Photo Location Map API"

if __name__ == "__main__":
    print("🚀 Photo Location Map API 起動中...")
    print("📡 ポート 5000 でリッスン中...")
    app.run(debug=True, port=5000, host='0.0.0.0')
