let map = null;
let marker = null;

document.getElementById("imageInput").addEventListener("change", handleImageSelect);
document.getElementById("analyzeBtn").addEventListener("click", analyzeImage);

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById("preview");
        const img = document.getElementById("previewImg");
        img.src = event.target.result;
        preview.style.display = "block";
    };
    reader.readAsDataURL(file);
}

function showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
}

function showError(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
}

function hideError() {
    document.getElementById("error").style.display = "none";
}

async function analyzeImage() {
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];
    
    if (!file) {
        showError("画像を選択してください");
        return;
    }
    
    showLoading(true);
    hideError();
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const base64Image = event.target.result.split(",")[1];
            const comment = document.getElementById("commentInput").value;
            
            const response = await fetch("http://localhost:5000/api/analyze", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ image: base64Image, comment: comment })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                showError(`❌ ${data.error || "GPS情報取得失敗"}`);
                showLoading(false);
                return;
            }
            
            displayGpsInfo(data);
            showMap(data.lat, data.lon, data.comment);
            
        } catch (error) {
            showError(`❌ サーバーが起動していません。ターミナルで以下を実行してください:\n\nターミナル1: python app.py\nターミナル2: python -m http.server 3000\n\n詳細: ${error.message}`);
        } finally {
            showLoading(false);
        }
    };
    reader.readAsDataURL(file);
}

function displayGpsInfo(data) {
    document.getElementById("latitude").textContent = data.lat.toFixed(6);
    document.getElementById("longitude").textContent = data.lon.toFixed(6);
    
    const commentDisplay = document.getElementById("commentDisplay");
    if (data.comment) {
        commentDisplay.innerHTML = `<strong>コメント:</strong> ${data.comment}`;
    } else {
        commentDisplay.innerHTML = "";
    }
    
    document.getElementById("gpsInfo").style.display = "block";
}

function showMap(lat, lon, comment) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
    } else {
        map.setView([lat, lon], 15);
    }
    
    if (marker) map.removeLayer(marker);
    const popupText = comment ? `📍 ${comment}` : "📍 撮影地点";
    marker = L.marker([lat, lon]).addTo(map).bindPopup(popupText).openPopup();
}
