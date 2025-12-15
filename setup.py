import os
from pathlib import Path

def create_landmark_directory():
    """ランドマークフォルダを作成"""
    landmarks_dir = Path("landmarks")
    landmarks_dir.mkdir(exist_ok=True)
    
    readme_path = landmarks_dir / "README.txt"
    readme_path.write_text("""=== ランドマーク画像DB ===
このフォルダに以下の命名規則で画像を保存してください:

Tokyo_Tower.jpg
Eiffel_Tower.jpg
Statue_of_Liberty.jpg
Big_Ben.jpg
Christ_the_Redeemer.jpg

形式: JPG / PNG
推奨サイズ: 200×200 ～ 500×500 px
""")
    
    print(f"✅ landmarks/ フォルダを作成しました")
    print(f"   {readme_path} を参照してください")

if __name__ == "__main__":
    create_landmark_directory()
