document.addEventListener("DOMContentLoaded", () => {
    const items = document.querySelectorAll(".item");
    const collectedCountSpan = document.getElementById("collected-count");
    const totalCountSpan = document.getElementById("total-count");

    // 1. 自動計算總數量
    if (totalCountSpan) {
        totalCountSpan.textContent = items.length;
    }

    // 2. 更新進度與「框框樣式」
    function updateProgress() {
        let currentCount = 0;
        items.forEach(item => {
            const checkbox = item.querySelector(".collect-checkbox");
            if (checkbox && checkbox.checked) {
                currentCount++;
                item.classList.add("selected"); // 打勾就加上紫色框框
            } else {
                item.classList.remove("selected"); // 取消就移除框框
            }
        });
        if (collectedCountSpan) {
            collectedCountSpan.textContent = currentCount;
        }
    }

    // 3. 綁定點擊事件與記憶功能
    items.forEach(item => {
        const checkbox = item.querySelector(".collect-checkbox");
        const itemId = item.getAttribute("data-id");

        if (checkbox && itemId) {
            // 讀取記憶
            if (localStorage.getItem(itemId) === "true") {
                checkbox.checked = true;
            }

            // 當隱藏的核取方塊改變時，存檔並更新畫面
            checkbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    localStorage.setItem(itemId, "true");
                } else {
                    localStorage.removeItem(itemId); 
                }
                updateProgress(); 
            });

            // 【新功能】讓點擊整張卡片(包含圖片)都能切換打勾狀態
            item.addEventListener("click", (e) => {
                // 如果是直接點到文字標籤，不要重複觸發
                if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change')); // 主動通知網頁狀態改變了
                }
            });
        }
    });

    // 剛打開網頁時先執行一次
    updateProgress();
});
