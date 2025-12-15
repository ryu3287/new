from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import os

app = Flask(__name__)

# CORS設定を強化
CORS(app, 
    origins="*",
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"]
)

def get_decimal_from_dms(dms, ref):
    """DMS形式の座標をDecimal形式に変換"""
    degrees, minutes, seconds = dms
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_gps_from_exif(image_data):
    """画像のEXIFからGPS情報を抽出"""
    try:
        image = Image.open(io.BytesIO(image_data))
        exif_data = image._getexif()
        
        if exif_data is None:
            return {"error": "EXIF情報が見つかりません"}
        
        gps_data = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            if tag_name == "GPSInfo":
                for t in value:
                    sub_tag = GPSTAGS.get(t, t)
                    gps_data[sub_tag] = value[t]
        
        if not gps_data:
            return {"error": "GPS情報が見つかりません"}
        
        # 緯度・経度を取得
        lat = get_decimal_from_dms(gps_data['GPSLatitude'], gps_data['GPSLatitudeRef'])
        lon = get_decimal_from_dms(gps_data['GPSLongitude'], gps_data['GPSLongitudeRef'])
        
        return {
            "lat": lat,
            "lon": lon,
            "has_gps": True
        }
    
    except AttributeError:
        return {"error": "EXIF情報を読み込めません"}
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

@app.route("/api/analyze", methods=["POST", "OPTIONS"])
def analyze_image():
    """画像のGPS情報を抽出"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.json
        image_base64 = data.get("image")
        comment = data.get("comment", "")
        
        if not image_base64:
            return jsonify({"error": "画像が選択されていません"}), 400
        
        # Base64 → バイナリ変換
        image_data = base64.b64decode(image_base64)
        
        # GPS情報抽出
        result = extract_gps_from_exif(image_data)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({
            "lat": result["lat"],
            "lon": result["lon"],
            "comment": comment,
            "has_gps": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/landmarks", methods=["GET"])
def get_landmarks():
    return jsonify({"status": "ok"})

@app.route("/", methods=["GET"])
def index():
    return "Photo Location Map API (EXIF GPS)"

if __name__ == "__main__":
    print("🚀 Photo Location Map API 起動中...")
    print("📡 ポート 5000 でリッスン中...")
    app.run(debug=True, port=5000, host='0.0.0.0')
