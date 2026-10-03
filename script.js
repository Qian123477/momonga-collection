document.addEventListener("DOMContentLoaded", () => {
    const items = document.querySelectorAll(".item");
    items.forEach(item => {
        const checkbox = item.querySelector(".collect-checkbox");
        const itemId = item.getAttribute("data-id");

        if (localStorage.getItem(itemId) === "true") {
            checkbox.checked = true;
        }

        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                localStorage.setItem(itemId, "true");
            } else {
                localStorage.removeItem(itemId); 
            }
        });
    });
});
/* 進度區塊設計 */
.progress-section {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.character-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%; /* 變成圓形 */
    border: 4px solid #e5e5e5; /* 灰色外框 */
    overflow: hidden;
    margin-bottom: 8px;
    background-color: white;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.name {
    font-weight: bold;
    font-size: 16px;
    color: #333;
}

.count {
    font-size: 14px;
    color: #666;
}
