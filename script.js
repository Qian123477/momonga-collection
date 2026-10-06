document.addEventListener("DOMContentLoaded", async () => {

    /*
    ============================================================
    小桃圖鑑
    商品資料由 products.json 提供
    ============================================================
    */


    // ============================================================
    // 1. 讀取商品資料
    // ============================================================

    let products = [];

    try {

        const response = await fetch("products.json");

        if (!response.ok) {
            throw new Error("無法讀取 products.json");
        }

        products = await response.json();

    } catch (error) {

        console.error(error);

        const container =
            document.getElementById("catalog-container");

        if (container) {

            container.innerHTML = `
                <p style="
                    text-align:center;
                    color:#999;
                    padding:40px;
                ">
                    商品資料讀取失敗，請確認 products.json 是否存在。
                </p>
            `;

        }

        return;
    }



    // ============================================================
    // 2. 取得主要容器
    // ============================================================

    const catalogContainer =
        document.getElementById("catalog-container");



    // ============================================================
    // 3. 建立商品分類
    // ============================================================

    const categoryOrder = [
        "娃娃",
        "其他周邊"
    ];


    const subcategoryOrder = {

        "娃娃": [
            "吊飾",
            "S娃",
            "景品",
            "中國",
            "香港",
            "台灣",
            "其他海外"
        ],

        "其他周邊": [
            "立牌",
            "徽章"
        ]

    };



    // ============================================================
    // 4. 產生整個圖鑑
    // ============================================================

    function renderCatalog() {

        catalogContainer.innerHTML = "";


        categoryOrder.forEach(category => {

            const categoryProducts =
                products.filter(
                    product => product.category === category
                );


            if (categoryProducts.length === 0) {
                return;
            }



            // ----------------------------------------------------
            // 大分類 section
            // ----------------------------------------------------

            const section =
                document.createElement("section");

            section.className = "category-section";



            // ----------------------------------------------------
            // 大分類標題
            // ----------------------------------------------------

            const majorTitle =
                document.createElement("h2");

            majorTitle.className = "major-title";

            majorTitle.textContent = category;

            section.appendChild(majorTitle);



            // ----------------------------------------------------
            // 小分類
            // ----------------------------------------------------

            const subcategories =
                subcategoryOrder[category] || [];


            subcategories.forEach(subcategory => {

                const subProducts =
                    products.filter(product =>
                        product.category === category &&
                        product.subcategory === subcategory
                    );


                if (subProducts.length === 0) {
                    return;
                }



                // ------------------------------------------------
                // 小分類標題
                // ------------------------------------------------

                const subTitle =
                    document.createElement("h3");

                subTitle.className = "sub-title";

                subTitle.textContent = subcategory;

                section.appendChild(subTitle);



                // ------------------------------------------------
                // 商品網格
                // ------------------------------------------------

                const grid =
                    document.createElement("div");

                grid.className = "catalog-grid";



                // ------------------------------------------------
                // 產生商品
                // ------------------------------------------------

                subProducts.forEach(product => {

                    const item =
                        createProductCard(product);

                    grid.appendChild(item);

                });



                section.appendChild(grid);

            });



            catalogContainer.appendChild(section);

        });



        // 商品產生完成後
        // 初始化所有收藏狀態

        initializeCollectionState();

        updateAllStatistics();

    }



    // ============================================================
    // 5. 建立單一商品卡片
    // ============================================================

    function createProductCard(product) {

        const item =
            document.createElement("div");

        item.className = "item";

        item.dataset.id = product.id;

        item.dataset.category = product.category;



        // --------------------------------------------------------
        // 商品圖片
        // --------------------------------------------------------

        const image =
            document.createElement("img");

        image.src = product.image;

        image.alt = product.name;

        image.loading = "lazy";

        item.appendChild(image);



        // --------------------------------------------------------
        // 商品名稱
        // --------------------------------------------------------

        const label =
            document.createElement("label");

        label.className = "item-name";


        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.className = "collect-checkbox";


        label.appendChild(checkbox);


        label.appendChild(
            document.createTextNode(product.name)
        );


        item.appendChild(label);



        // --------------------------------------------------------
        // 價格區域
        // --------------------------------------------------------

        const priceArea =
            document.createElement("div");

        priceArea.className = "price-area";


        const purchaseText =
            document.createElement("span");

        purchaseText.textContent = "購入";


        priceArea.appendChild(purchaseText);



        const priceInput =
            document.createElement("div");

        priceInput.className = "price-input";



        const currency =
            document.createElement("span");

        currency.textContent = "NT$";


        priceInput.appendChild(currency);



        const priceField =
            document.createElement("input");

        priceField.type = "number";

        priceField.className =
            "price-input-field";

        priceField.min = "0";

        priceField.step = "1";

        priceField.placeholder = "價格";


        priceInput.appendChild(priceField);


        priceArea.appendChild(priceInput);

        item.appendChild(priceArea);



        // --------------------------------------------------------
        // 收藏 checkbox
        // --------------------------------------------------------

        checkbox.addEventListener(
            "change",
            () => {

                handleCollectionChange(
                    product,
                    item,
                    checkbox,
                    priceArea,
                    priceField
                );

            }
        );



        // --------------------------------------------------------
        // 點整張卡片也可以收藏
        // --------------------------------------------------------

        item.addEventListener("click", event => {

            /*
            如果點的是：

            checkbox
            input
            price input

            就不要再次觸發收藏
            */

            if (
                event.target === checkbox ||
                event.target === priceField ||
                event.target.closest(".price-input")
            ) {
                return;
            }


            checkbox.checked =
                !checkbox.checked;


            checkbox.dispatchEvent(
                new Event("change")
            );

        });



        // --------------------------------------------------------
        // 價格輸入
        // --------------------------------------------------------

        priceField.addEventListener(
            "input",
            () => {

                savePrice(
                    product.id,
                    priceField.value
                );

                updateTotalSpent();

            }
        );



        // 防止點價格時觸發商品收藏

        priceField.addEventListener(
            "click",
            event => {
                event.stopPropagation();
            }
        );



        return item;
    }



    // ============================================================
    // 6. 初始化收藏狀態
    // ============================================================

    function initializeCollectionState() {

        const items =
            document.querySelectorAll(".item");


        items.forEach(item => {

            const id =
                item.dataset.id;


            const checkbox =
                item.querySelector(
                    ".collect-checkbox"
                );


            const priceArea =
                item.querySelector(
                    ".price-area"
                );


            const priceField =
                item.querySelector(
                    ".price-input-field"
                );



            // ----------------------------------------------------
            // 讀取收藏狀態
            // ----------------------------------------------------

            const collected =
                localStorage.getItem(
                    getCollectionKey(id)
                ) === "true";


            checkbox.checked =
                collected;



            // ----------------------------------------------------
            // 讀取價格
            // ----------------------------------------------------

            const savedPrice =
                localStorage.getItem(
                    getPriceKey(id)
                );


            if (savedPrice !== null) {

                priceField.value =
                    savedPrice;

            }



            // ----------------------------------------------------
            // 套用外觀
            // ----------------------------------------------------

            if (collected) {

                item.classList.add(
                    "selected"
                );

                priceArea.classList.add(
                    "show"
                );

            } else {

                item.classList.remove(
                    "selected"
                );

                priceArea.classList.remove(
                    "show"
                );

            }

        });

    }



    // ============================================================
    // 7. 收藏狀態改變
    // ============================================================

    function handleCollectionChange(
        product,
        item,
        checkbox,
        priceArea,
        priceField
    ) {

        if (checkbox.checked) {

            // ----------------------------------------------------
            // 收藏
            // ----------------------------------------------------

            localStorage.setItem(
                getCollectionKey(product.id),
                "true"
            );


            item.classList.add(
                "selected"
            );


            priceArea.classList.add(
                "show"
            );


            // 讓價格欄位方便輸入

            setTimeout(() => {

                priceField.focus();

            }, 50);


        } else {

            // ----------------------------------------------------
            // 取消收藏
            // ----------------------------------------------------

            localStorage.removeItem(
                getCollectionKey(product.id)
            );


            item.classList.remove(
                "selected"
            );


            priceArea.classList.remove(
                "show"
            );

        }


        updateAllStatistics();

    }



    // ============================================================
    // 8. LocalStorage Key
    // ============================================================

    function getCollectionKey(id) {

        return "momo_collection_" + id;

    }


    function getPriceKey(id) {

        return "momo_price_" + id;

    }



    // ============================================================
    // 9. 儲存價格
    // ============================================================

    function savePrice(id, value) {

        if (
            value === "" ||
            value === null ||
            value === undefined
        ) {

            localStorage.removeItem(
                getPriceKey(id)
            );

            return;
        }


        const price =
            Number(value);


        if (
            Number.isNaN(price) ||
            price < 0
        ) {

            return;

        }


        localStorage.setItem(
            getPriceKey(id),
            String(price)
        );

    }



    // ============================================================
    // 10. 更新所有統計
    // ============================================================

    function updateAllStatistics() {

        updateCategoryStatistics();

        updateTotalCollected();

        updateTotalSpent();

    }



    // ============================================================
    // 11. 娃娃 / 其他周邊統計
    // ============================================================

    function updateCategoryStatistics() {

        const plushProducts =
            products.filter(
                product =>
                    product.category === "娃娃"
            );


        const otherProducts =
            products.filter(
                product =>
                    product.category === "其他周邊"
            );



        const plushCollected =
            countCollected(
                plushProducts
            );


        const otherCollected =
            countCollected(
                otherProducts
            );



        updateCategoryCard(
            "plush",
            plushCollected,
            plushProducts.length
        );


        updateCategoryCard(
            "other",
            otherCollected,
            otherProducts.length
        );

    }



    // ============================================================
    // 12. 計算某分類收藏數
    // ============================================================

    function countCollected(productList) {

        let count = 0;


        productList.forEach(product => {

            if (
                localStorage.getItem(
                    getCollectionKey(product.id)
                ) === "true"
            ) {

                count++;

            }

        });


        return count;

    }



    // ============================================================
    // 13. 更新分類統計卡
    // ============================================================

    function updateCategoryCard(
        type,
        collected,
        total
    ) {

        const collectedElement =
            document.getElementById(
                type + "-collected"
            );


        const totalElement =
            document.getElementById(
                type + "-total"
            );


        const percentageElement =
            document.getElementById(
                type + "-percentage"
            );



        if (collectedElement) {

            collectedElement.textContent =
                collected;

        }


        if (totalElement) {

            totalElement.textContent =
                total;

        }


        if (percentageElement) {

            let percentage = 0;


            if (total > 0) {

                percentage =
                    (collected / total) * 100;

            }


            percentageElement.textContent =
                formatPercentage(percentage) + "%";

        }

    }



    // ============================================================
    // 14. 收藏總數
    // ============================================================

    function updateTotalCollected() {

        let total = 0;


        products.forEach(product => {

            if (
                localStorage.getItem(
                    getCollectionKey(product.id)
                ) === "true"
            ) {

                total++;

            }

        });


        const totalElement =
            document.getElementById(
                "total-collected"
            );


        if (totalElement) {

            totalElement.textContent =
                total;

        }

    }



    // ============================================================
    // 15. 收藏總花費
    // ============================================================

    function updateTotalSpent() {

        let totalSpent = 0;


        products.forEach(product => {

            const collected =
                localStorage.getItem(
                    getCollectionKey(product.id)
                ) === "true";


            if (!collected) {
                return;
            }


            const savedPrice =
                localStorage.getItem(
                    getPriceKey(product.id)
                );


            if (savedPrice === null) {
                return;
            }


            const price =
                Number(savedPrice);


            if (
                !Number.isNaN(price) &&
                price >= 0
            ) {

                totalSpent += price;

            }

        });


        const totalSpentElement =
            document.getElementById(
                "total-spent"
            );


        if (totalSpentElement) {

            totalSpentElement.textContent =
                "NT$ " +
                totalSpent.toLocaleString("zh-TW");

        }

    }



    // ============================================================
    // 16. 百分比格式
    // ============================================================

    function formatPercentage(value) {

        if (value === 0) {
            return "0";
        }


        if (value === 100) {
            return "100";
        }


        return value.toFixed(1);

    }



    // ============================================================
    // 17. 啟動圖鑑
    // ============================================================

    renderCatalog();

});
