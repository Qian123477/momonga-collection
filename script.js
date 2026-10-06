document.addEventListener("DOMContentLoaded", () => {

    const items = document.querySelectorAll(".item");


    /* ==================================
       取得統計元素
       ================================== */

    const plushCollected =
        document.getElementById("plush-collected");

    const plushTotal =
        document.getElementById("plush-total");

    const plushPercentage =
        document.getElementById("plush-percentage");


    const otherCollected =
        document.getElementById("other-collected");

    const otherTotal =
        document.getElementById("other-total");

    const otherPercentage =
        document.getElementById("other-percentage");


    const totalCollected =
        document.getElementById("total-collected");

    const totalSpent =
        document.getElementById("total-spent");


    /* ==================================
       判斷商品屬於哪個大分類
       ================================== */

    function getMainCategory(item) {

        /*
         * 找商品前面的 major-title。
         *
         * 例如：
         *
         * 娃娃
         *   └ 吊飾
         *      └ 商品
         *
         * 其他周邊
         *   └ 立牌
         *      └ 商品
         */

        let element = item;

        while (element) {

            element = element.previousElementSibling;

            if (
                element &&
                element.classList.contains("major-title")
            ) {
                return element.textContent.trim();
            }
        }


        /*
         * 如果上面的方式找不到，
         * 再往父層尋找。
         */

        const parent = item.closest(".category-section");

        if (parent) {

            const title =
                parent.querySelector(".major-title");

            if (title) {
                return title.textContent.trim();
            }
        }


        return "娃娃";
    }


    /* ==================================
       儲存單一商品
       ================================== */

    function saveItem(item) {

        const checkbox =
            item.querySelector(".collect-checkbox");

        const priceInput =
            item.querySelector(".price-input-field");

        const itemId =
            item.getAttribute("data-id");


        if (!checkbox || !itemId) {
            return;
        }


        const data = {

            collected: checkbox.checked,

            price: priceInput
                ? priceInput.value
                : ""

        };


        /*
         * 只要收藏或有價格，
         * 就保存資料。
         */

        if (
            checkbox.checked ||
            data.price !== ""
        ) {

            localStorage.setItem(
                itemId,
                JSON.stringify(data)
            );

        } else {

            localStorage.removeItem(itemId);

        }
    }


    /* ==================================
       讀取單一商品
       ================================== */

    function loadItem(item) {

        const checkbox =
            item.querySelector(".collect-checkbox");

        const priceInput =
            item.querySelector(".price-input-field");

        const itemId =
            item.getAttribute("data-id");


        if (!checkbox || !itemId) {
            return;
        }


        const saved =
            localStorage.getItem(itemId);


        if (!saved) {
            return;
        }


        /*
         * 新版本資料
         */

        try {

            const data = JSON.parse(saved);


            if (typeof data === "object") {

                checkbox.checked =
                    data.collected === true;


                if (
                    priceInput &&
                    data.price !== undefined
                ) {

                    priceInput.value =
                        data.price;

                }

                return;
            }

        } catch (error) {

            /*
             * 如果不是 JSON，
             * 就可能是你舊版存的 true。
             */

            if (saved === "true") {

                checkbox.checked = true;

            }

        }

    }


    /* ==================================
       更新商品外觀
       ================================== */

    function updateItemAppearance(item) {

        const checkbox =
            item.querySelector(".collect-checkbox");

        const priceArea =
            item.querySelector(".price-area");


        if (!checkbox) {
            return;
        }


        if (checkbox.checked) {

            item.classList.add("selected");


            if (priceArea) {
                priceArea.classList.add("show");
            }

        } else {

            item.classList.remove("selected");


            if (priceArea) {
                priceArea.classList.remove("show");
            }

        }

    }


    /* ==================================
       計算百分比
       ================================== */

    function calculatePercentage(
        collected,
        total
    ) {

        if (total === 0) {
            return 0;
        }


        return Math.round(
            (collected / total) * 1000
        ) / 10;

    }


    /* ==================================
       更新全部統計
       ================================== */

    function updateProgress() {

        let plushCount = 0;
        let plushTotalCount = 0;

        let otherCount = 0;
        let otherTotalCount = 0;

        let allCollected = 0;
        let allSpent = 0;


        items.forEach(item => {

            const checkbox =
                item.querySelector(".collect-checkbox");

            const priceInput =
                item.querySelector(".price-input-field");


            if (!checkbox) {
                return;
            }


            /*
             * 判斷大分類
             */

            const mainCategory =
                getMainCategory(item);


            const isOther =
                mainCategory === "其他周邊";


            /*
             * 計算總數
             */

            if (isOther) {

                otherTotalCount++;

            } else {

                plushTotalCount++;

            }


            /*
             * 計算收藏數
             */

            if (checkbox.checked) {

                allCollected++;


                if (isOther) {

                    otherCount++;

                } else {

                    plushCount++;

                }


                /*
                 * 計算價格
                 */

                if (
                    priceInput &&
                    priceInput.value !== ""
                ) {

                    const price =
                        Number(priceInput.value);


                    if (
                        !isNaN(price) &&
                        price >= 0
                    ) {

                        allSpent += price;

                    }

                }

            }

        });


        /* ==================================
           娃娃
           ================================== */

        if (plushCollected) {

            plushCollected.textContent =
                plushCount;

        }


        if (plushTotal) {

            plushTotal.textContent =
                plushTotalCount;

        }


        if (plushPercentage) {

            plushPercentage.textContent =
                calculatePercentage(
                    plushCount,
                    plushTotalCount
                ) + "%";

        }


        /* ==================================
           其他周邊
           ================================== */

        if (otherCollected) {

            otherCollected.textContent =
                otherCount;

        }


        if (otherTotal) {

            otherTotal.textContent =
                otherTotalCount;

        }


        if (otherPercentage) {

            otherPercentage.textContent =
                calculatePercentage(
                    otherCount,
                    otherTotalCount
                ) + "%";

        }


        /* ==================================
           全部收藏
           ================================== */

        if (totalCollected) {

            totalCollected.textContent =
                allCollected;

        }


        /* ==================================
           全部花費
           ================================== */

        if (totalSpent) {

            totalSpent.textContent =
                "NT$ " +
                allSpent.toLocaleString("zh-TW");

        }

    }


    /* ==================================
       初始化商品
       ================================== */

    items.forEach(item => {

        const checkbox =
            item.querySelector(".collect-checkbox");

        const priceInput =
            item.querySelector(".price-input-field");


        if (!checkbox) {
            return;
        }


        /*
         * 讀取記憶
         */

        loadItem(item);


        /*
         * 更新外觀
         */

        updateItemAppearance(item);


        /* ==================================
           收藏狀態改變
           ================================== */

        checkbox.addEventListener(
            "change",
            () => {

                saveItem(item);

                updateItemAppearance(item);

                updateProgress();

            }
        );


        /* ==================================
           價格改變
           ================================== */

        if (priceInput) {

            priceInput.addEventListener(
                "input",
                () => {

                    saveItem(item);

                    updateProgress();

                }
            );

        }


        /* ==================================
           點擊整張卡片
           ================================== */

        item.addEventListener(
            "click",
            (event) => {

                /*
                 * 點到輸入框時，
                 * 不要觸發收藏。
                 */

                if (
                    event.target.tagName === "INPUT"
                ) {

                    return;

                }


                /*
                 * 點 label 時，
                 * 瀏覽器本身會處理 checkbox，
                 * 所以不要再手動切換。
                 */

                if (
                    event.target.tagName === "LABEL"
                ) {

                    return;

                }


                checkbox.checked =
                    !checkbox.checked;


                saveItem(item);

                updateItemAppearance(item);

                updateProgress();

            }
        );

    });


    /* ==================================
       第一次載入
       ================================== */

    updateProgress();

});
