document.addEventListener("DOMContentLoaded", () => {
    // 抓取畫面上所有的娃娃 (item)
    const items = document.querySelectorAll(".item");
    const collectedCountSpan = document.getElementById("collected-count");
    const totalCountSpan = document.getElementById("total-count");

    // 1. 自動把「總數量」設定為你新增的娃娃總數
    if (totalCountSpan) {
        totalCountSpan.textContent = items.length;
    }

    // 2. 更新進度條的功能
    function updateProgress() {
        let currentCount = 0;
        items.forEach(item => {
            const checkbox = item.querySelector(".collect-checkbox");
            if (checkbox && checkbox.checked) {
                currentCount++;
            }
        });
        if (collectedCountSpan) {
            collectedCountSpan.textContent = currentCount;
        }
    }

    // 3. 讀取記憶與打勾儲存
    items.forEach(item => {
        const checkbox = item.querySelector(".collect-checkbox");
        const itemId = item.getAttribute("data-id");

        if (checkbox && itemId) {
            // 每次打開網頁時，檢查有沒有之前的記憶
            if (localStorage.getItem(itemId) === "true") {
                checkbox.checked = true;
            }

            // 當你打勾或取消打勾時，立刻存檔
            checkbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    localStorage.setItem(itemId, "true");
                } else {
                    localStorage.removeItem(itemId); 
                }
                updateProgress(); // 同時更新上方數字
            });
        }
    });

    // 網頁剛打開時，先算一次進度
    updateProgress();
});
