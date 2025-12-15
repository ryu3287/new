let map = null;
let marker = null;
let currentLocation = null;
let currentImages = [];
let currentTags = [];
let activeTagFilter = null;
let mapMarkers = [];
let mapPolylines = [];
let backendUrl = "https://your-app-name.onrender.com";

// ローカル環境判定
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    backendUrl = "http://localhost:5000";
}

document.getElementById("imageInput").addEventListener("change", handleImageSelect);
document.getElementById("displayBtn").addEventListener("click", displayLocation);
document.getElementById("saveBtn").addEventListener("click", saveLocation);
document.getElementById("clearBtn").addEventListener("click", clearAllLocations);
document.getElementById("saveEditBtn").addEventListener("click", saveEdit);

// モーダル関連
const modal = document.getElementById("savedImageModal");
const closeBtn = document.querySelector(".close");
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

// 編集モーダル関連
let editingIndex = null;
window.addEventListener("click", (e) => {
    const editModal = document.getElementById("editModal");
    if (e.target === editModal) closeEditModal();
});

// ページ読み込み時に保存済み場所を表示
window.addEventListener("load", () => {
    initializeMap();
    loadSavedLocations();
});

function initializeMap() {
    if (!map) {
        // 初期表示は日本全体
        map = L.map("map").setView([36.5, 138.2], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
    }
}

function handleImageSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    currentImages = [];
    const previewContainer = document.getElementById("previewContainer");
    previewContainer.innerHTML = "";
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImages.push(event.target.result);
            
            const previewDiv = document.createElement("div");
            previewDiv.className = "preview-item";
            previewDiv.innerHTML = `
                <img src="${event.target.result}" alt="Preview ${index + 1}">
                <button class="remove-image-btn" onclick="removeImage(${index})">✕</button>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
    
    document.getElementById("preview").style.display = "block";
}

function removeImage(index) {
    currentImages.splice(index, 1);
    
    const previewContainer = document.getElementById("previewContainer");
    previewContainer.innerHTML = "";
    
    currentImages.forEach((img, idx) => {
        const previewDiv = document.createElement("div");
        previewDiv.className = "preview-item";
        previewDiv.innerHTML = `
            <img src="${img}" alt="Preview ${idx + 1}">
            <button class="remove-image-btn" onclick="removeImage(${idx})">✕</button>
        `;
        previewContainer.appendChild(previewDiv);
    });
    
    if (currentImages.length === 0) {
        document.getElementById("preview").style.display = "none";
    }
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

async function displayLocation() {
    const placeName = document.getElementById("placeInput").value.trim();
    
    if (!placeName) {
        showError("場所名を入力してください");
        return;
    }
    
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${backendUrl}/api/geocode`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ place: placeName })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(`❌ ${data.error || "場所が見つかりません"}`);
            showLoading(false);
            return;
        }
        
        currentLocation = {
            name: placeName,
            lat: data.lat,
            lon: data.lon,
            images: [...currentImages],
            comment: "",
            tags: [],
            timestamp: new Date().toISOString()
        };
        
        displayLocationInfo(data, placeName);
        showMap(data.lat, data.lon, placeName);
        
        // コメント・タグ入力欄をリセット
        document.getElementById("commentInput").value = "";
        document.getElementById("tagInput").value = "";
        currentTags = [];
        
    } catch (error) {
        showError(`❌ サーバーに接続できません\n詳細: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function displayLocationInfo(data, placeName) {
    document.getElementById("placeName").textContent = placeName;
    document.getElementById("latitude").textContent = data.lat.toFixed(6);
    document.getElementById("longitude").textContent = data.lon.toFixed(6);
    
    document.getElementById("locationInfo").style.display = "block";
}

function showMap(lat, lon, placeName) {
    if (!map) {
        initializeMap();
    }
    
    // 場所を検索したときはその場所に移動
    map.setView([lat, lon], 15);
    
    if (marker) map.removeLayer(marker);
    
    // ピンのポップアップテキストを作成
    let popupText = `<strong>📍 ${placeName}</strong>`;
    if (currentLocation && currentLocation.comment) {
        popupText += `<br><small>${currentLocation.comment}</small>`;
    }
    
    marker = L.marker([lat, lon]).addTo(map).bindPopup(popupText).openPopup();
}

function saveLocation() {
    if (!currentLocation) {
        showError("先に場所を表示してください");
        return;
    }
    
    // コメント・タグを取得して保存
    currentLocation.comment = document.getElementById("commentInput").value.trim();
    const tagInput = document.getElementById("tagInput").value.trim();
    currentLocation.tags = tagInput ? tagInput.split(",").map(t => t.trim()).filter(t => t) : [];
    currentLocation.timestamp = new Date().toISOString();
    
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    saved.push(currentLocation);
    localStorage.setItem("savedLocations", JSON.stringify(saved));
    
    showError("✅ 場所を保存しました");
    setTimeout(hideError, 2000);
    
    loadSavedLocations();
}

function loadSavedLocations() {
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    const listDiv = document.getElementById("savedLocations");
    const listElement = document.getElementById("locationList");
    
    if (saved.length === 0) {
        listDiv.style.display = "none";
        return;
    }
    
    listDiv.style.display = "block";
    listElement.innerHTML = "";
    
    // 新しい順（逆順）で表示
    saved.reverse().forEach((location, displayIndex) => {
        const actualIndex = saved.length - 1 - displayIndex;
        
        // フィルター中の場合、タグがマッチしなければスキップ
        if (activeTagFilter && !location.tags.includes(activeTagFilter)) {
            return;
        }
        
        const li = document.createElement("li");
        li.className = "location-item";
        li.draggable = true;
        li.dataset.index = actualIndex;
        
        const hasImages = location.images && location.images.length > 0;
        const imageCount = hasImages ? location.images.length : 0;
        const saveDate = new Date(location.timestamp);
        const formattedDate = saveDate.toLocaleDateString("ja-JP");
        const formattedTime = saveDate.toLocaleTimeString("ja-JP");
        
        let thumbnailsHtml = "";
        if (hasImages) {
            location.images.forEach((img, imgIndex) => {
                thumbnailsHtml += `<img class="thumbnail" src="${img}" alt="Thumbnail" onclick="openImageModal(${actualIndex}, ${imgIndex})">`;
            });
        }
        
        let commentHtml = "";
        if (location.comment) {
            commentHtml = `<span class="location-comment">💬 ${location.comment}</span>`;
        }
        
        let tagsHtml = "";
        if (location.tags && location.tags.length > 0) {
            tagsHtml = `<div class="location-tags">`;
            location.tags.forEach((tag, tagIndex) => {
                tagsHtml += `<span class="tag-badge" draggable="true" data-tag-index="${tagIndex}" data-location-index="${actualIndex}" onclick="filterByTag('${tag}')">#${tag}</span>`;
            });
            tagsHtml += `</div>`;
        }
        
        li.innerHTML = `
            <div class="location-content ${hasImages ? 'has-image' : ''}">
                ${thumbnailsHtml}
                <div class="location-text">
                    <strong>${location.name}</strong>
                    ${hasImages ? `<span class="image-count">📸 ${imageCount}枚</span>` : ""}
                    <span class="location-datetime">📅 ${formattedDate} ${formattedTime}</span>
                    ${commentHtml}
                    ${tagsHtml}
                </div>
            </div>
            <div class="location-actions">
                <button class="open-btn" onclick="openLocation(${actualIndex})">📍 開く</button>
                <button class="edit-btn" onclick="openEditModal(${actualIndex})">✏️ 編集</button>
                <button class="delete-btn" onclick="deleteLocation(${actualIndex})">🗑️</button>
            </div>
        `;
        
        // ドラッグイベント設定
        li.addEventListener("dragstart", handleLocationDragStart);
        li.addEventListener("dragover", handleLocationDragOver);
        li.addEventListener("drop", handleLocationDrop);
        li.addEventListener("dragend", handleLocationDragEnd);
        
        listElement.appendChild(li);
    });
    
    // フィルター表示
    updateFilterDisplay();
}

let draggedElement = null;

function handleLocationDragStart(e) {
    draggedElement = this;
    this.style.opacity = "0.5";
    e.dataTransfer.effectAllowed = "move";
}

function handleLocationDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = "move";
    return false;
}

function handleLocationDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);
        
        // 配列内で要素を交換
        const temp = saved[draggedIndex];
        saved[draggedIndex] = saved[targetIndex];
        saved[targetIndex] = temp;
        
        localStorage.setItem("savedLocations", JSON.stringify(saved));
        loadSavedLocations();
        
        // タグフィルター中なら線を再描画
        if (activeTagFilter) {
            displayTagLocationsOnMap(activeTagFilter);
        }
    }
    
    return false;
}

function handleLocationDragEnd(e) {
    this.style.opacity = "1";
}

function openLocation(index) {
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    if (index < 0 || index >= saved.length) return;
    
    const location = saved[index];
    document.getElementById("placeInput").value = location.name;
    document.getElementById("commentInput").value = location.comment || "";
    document.getElementById("tagInput").value = location.tags ? location.tags.join(", ") : "";
    displayLocationInfo(location, location.name);
    
    currentLocation = location;
    showMap(location.lat, location.lon, location.name);
    
    if (location.images && location.images.length > 0) {
        const previewContainer = document.getElementById("previewContainer");
        previewContainer.innerHTML = "";
        location.images.forEach((img, idx) => {
            const previewDiv = document.createElement("div");
            previewDiv.className = "preview-item";
            previewDiv.innerHTML = `<img src="${img}" alt="Preview ${idx + 1}">`;
            previewContainer.appendChild(previewDiv);
        });
        document.getElementById("preview").style.display = "block";
    }
}

function openEditModal(index) {
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    if (index < 0 || index >= saved.length) return;
    
    const location = saved[index];
    editingIndex = index;
    
    document.getElementById("editPlaceName").textContent = location.name;
    document.getElementById("editCommentInput").value = location.comment || "";
    document.getElementById("editTagInput").value = location.tags ? location.tags.join(", ") : "";
    
    document.getElementById("editModal").style.display = "block";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    editingIndex = null;
}

function saveEdit() {
    if (editingIndex === null) return;
    
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    if (editingIndex < 0 || editingIndex >= saved.length) return;
    
    // コメント・タグを更新
    saved[editingIndex].comment = document.getElementById("editCommentInput").value.trim();
    const tagInput = document.getElementById("editTagInput").value.trim();
    saved[editingIndex].tags = tagInput ? tagInput.split(",").map(t => t.trim()).filter(t => t) : [];
    
    localStorage.setItem("savedLocations", JSON.stringify(saved));
    
    showError("✅ 編集を保存しました");
    setTimeout(hideError, 2000);
    
    closeEditModal();
    loadSavedLocations();
}

function filterByTag(tag) {
    // 前の単一ピンをクリア
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
    
    activeTagFilter = tag;
    loadSavedLocations();
    displayTagLocationsOnMap(tag);
}

function displayTagLocationsOnMap(tag) {
    // 前のマーカーとポリラインをクリア
    clearMapMarkers();
    
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    const tagLocations = saved.filter(loc => loc.tags && loc.tags.includes(tag));
    
    if (tagLocations.length === 0) {
        return;
    }
    
    // マーカーと座標を準備（保存順序を保つ）
    const coordinates = [];
    const locationDetails = [];
    
    tagLocations.forEach((location, index) => {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        if (isNaN(lat) || isNaN(lon)) return;
        
        // 座標を保存順序で追加
        coordinates.push([lat, lon]);
        locationDetails.push({ lat, lon, location });
        
        // ポップアップテキストを作成
        let popupText = `<strong>📍 ${location.name}</strong>`;
        if (location.comment) {
            popupText += `<br><small>${location.comment}</small>`;
        }
        
        // 最初のマーカーは赤色、その他は青色
        const markerColor = index === 0 ? 'red' : 'blue';
        
        // カスタムアイコンを作成
        const markerIcon = L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        
        // マーカーを作成
        const m = L.marker([lat, lon], { icon: markerIcon })
            .addTo(map)
            .bindPopup(popupText);
        
        mapMarkers.push(m);
    });
    
    // ポリラインで全ての地点を保存順序でつなぐ
    if (coordinates.length > 1) {
        const polyline = L.polyline(coordinates, {
            color: '#2196f3',
            weight: 3,
            opacity: 0.7,
            dashArray: '5, 5'
        }).addTo(map);
        mapPolylines.push(polyline);
        
        // 全体を表示するようにズーム調整
        const group = new L.featureGroup(mapMarkers);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } else if (coordinates.length === 1) {
        map.setView([coordinates[0][0], coordinates[0][1]], 15);
    }
}

function clearMapMarkers() {
    mapMarkers.forEach(m => {
        if (map && map.hasLayer(m)) {
            map.removeLayer(m);
        }
    });
    mapPolylines.forEach(p => {
        if (map && map.hasLayer(p)) {
            map.removeLayer(p);
        }
    });
    mapMarkers = [];
    mapPolylines = [];
}

function clearTagFilter() {
    activeTagFilter = null;
    clearMapMarkers();
    loadSavedLocations();
}

function deleteLocation(index) {
    if (!confirm("この場所を削除しますか？")) return;
    
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    saved.splice(index, 1);
    localStorage.setItem("savedLocations", JSON.stringify(saved));
    
    loadSavedLocations();
}

function clearAllLocations() {
    if (!confirm("全ての場所を削除しますか？")) return;
    
    localStorage.removeItem("savedLocations");
    loadSavedLocations();
}

function openImageModal(index, imageIndex) {
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    if (index < 0 || index >= saved.length) return;
    
    const location = saved[index];
    if (!location.images || imageIndex >= location.images.length) return;
    
    const modal = document.getElementById("savedImageModal");
    const modalImage = document.getElementById("modalImage");
    modalImage.src = location.images[imageIndex];
    
    // 画像番号を表示
    let imageInfo = document.querySelector(".image-info");
    if (!imageInfo) {
        imageInfo = document.createElement("div");
        imageInfo.className = "image-info";
        document.querySelector(".modal-content").insertBefore(imageInfo, modalImage);
    }
    imageInfo.textContent = `${imageIndex + 1} / ${location.images.length}`;
    
    modal.style.display = "block";
}

function closeModal() {
    const modal = document.getElementById("savedImageModal");
    modal.style.display = "none";
}

function updateFilterDisplay() {
    let filterDiv = document.querySelector(".tag-filter");
    
    if (!filterDiv) {
        filterDiv = createFilterDiv();
    }
    
    if (activeTagFilter) {
        filterDiv.style.display = "block";
        filterDiv.innerHTML = `<strong>🔍 タグフィルター: #${activeTagFilter}</strong><button class="remove-filter" onclick="clearTagFilter()">フィルター解除</button>`;
    } else {
        filterDiv.style.display = "none";
    }
}

function createFilterDiv() {
    const filterDiv = document.createElement("div");
    filterDiv.className = "tag-filter";
    const listDiv = document.getElementById("savedLocations");
    if (listDiv && listDiv.parentNode) {
        listDiv.parentNode.insertBefore(filterDiv, listDiv);
    }
    return filterDiv;
}
