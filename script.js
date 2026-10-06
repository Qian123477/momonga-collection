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



    if (!catalogContainer) {

        console.error("找不到 catalog-container");

        return;

    }



    // ============================================================
    // 3. 主要分類順序
    // ============================================================

    const categoryOrder = [

        "娃娃",

        "其他周邊"

    ];



    // ============================================================
    // 4. 小分類順序
    // ============================================================

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

            "徽章",

            "公仔",

            "鑰匙圈",

            "磁鐵",

            "包包",

            "衣物",

            "手帕",

            "貼紙",

            "生活用品",

            "其他"

        ]

    };



    // ============================================================
    // 5. 產生整個圖鑑
    // ============================================================

    function renderCatalog() {

        catalogContainer.innerHTML = "";


        categoryOrder.forEach(category => {

            // ----------------------------------------------------
            // 找出這個大分類的所有商品
            // ----------------------------------------------------

            const categoryProducts =
                products.filter(
                    product =>
                        product.category === category
                );


            // 如果完全沒有商品，就不顯示這個大分類
            if (categoryProducts.length === 0) {

                return;

            }



            // ----------------------------------------------------
            // 建立大分類 section
            // ----------------------------------------------------

            const section =
                document.createElement("section");

            section.className =
                "category-section";



            // ----------------------------------------------------
            // 大分類標題
            // ----------------------------------------------------

            const majorTitle =
                document.createElement("h2");

            majorTitle.className =
                "major-title";

            majorTitle.textContent =
                category;

            section.appendChild(
                majorTitle
            );



            // ----------------------------------------------------
            // 取得這個分類的小分類順序
            // ----------------------------------------------------

            const subcategories =
                subcategoryOrder[category] || [];



            subcategories.forEach(subcategory => {

                // ------------------------------------------------
                // 找出目前小分類的商品
                // ------------------------------------------------

                const subProducts =
                    products.filter(product =>

                        product.category === category &&

                        product.subcategory === subcategory

                    );


                // 沒有商品就不顯示這個小分類
                if (subProducts.length === 0) {

                    return;

                }



                // ------------------------------------------------
                // 小分類標題
                // ------------------------------------------------

                const subTitle =
                    document.createElement("h3");

                subTitle.className =
                    "sub-title";

                subTitle.textContent =
                    subcategory;

                section.appendChild(
                    subTitle
                );



                // ------------------------------------------------
                // 商品網格
                // ------------------------------------------------

                const grid =
                    document.createElement("div");

                grid.className =
                    "catalog-grid";



                // ------------------------------------------------
                // 建立商品卡片
                // ------------------------------------------------

                subProducts.forEach(product => {

                    const item =
                        createProductCard(product);

                    grid.appendChild(
                        item
                    );

                });



                section.appendChild(
                    grid
                );

            });



            catalogContainer.appendChild(
                section
            );

        });



        // --------------------------------------------------------
        // 商品建立完成
        // --------------------------------------------------------

        initializeCollectionState();

        updateAllStatistics();

    }



    // ============================================================
    // 6. 建立單一商品卡片
    // ============================================================

    function createProductCard(product) {

        // --------------------------------------------------------
        // 商品卡片
        // --------------------------------------------------------

        const item =
            document.createElement("div");

        item.className =
            "item";

        item.dataset.id =
            product.id;

        item.dataset.category =
            product.category;



        // --------------------------------------------------------
        // 商品圖片
        // --------------------------------------------------------

        const image =
            document.createElement("img");

        image.src =
            product.image;

        image.alt =
            product.name;

        image.loading =
            "lazy";

        item.appendChild(
            image
        );



        // --------------------------------------------------------
        // 商品名稱
        // --------------------------------------------------------

        const label =
            document.createElement("label");

        label.className =
            "item-name";



        // --------------------------------------------------------
        // 隱藏 checkbox
        // --------------------------------------------------------

        const checkbox =
            document.createElement("input");

        checkbox.type =
            "checkbox";

        checkbox.className =
            "collect-checkbox";



        label.appendChild(
            checkbox
        );



        // --------------------------------------------------------
        // 商品名稱文字
        // --------------------------------------------------------

        label.appendChild(
            document.createTextNode(
                product.name
            )
        );


        item.appendChild(
            label
        );



        // ========================================================
        // 價格區域
        // ========================================================

        const priceArea =
            document.createElement("div");

        priceArea.className =
            "price-area";



        // --------------------------------------------------------
        // 價格輸入
        //
        // 不再顯示「購入」
        // 只留下 NT$ + 輸入框
        // --------------------------------------------------------

        const priceInput =
            document.createElement("div");

        priceInput.className =
            "price-input";



        const currency =
            document.createElement("span");

        currency.textContent =
            "NT$";



        priceInput.appendChild(
            currency
        );



        const priceField =
            document.createElement("input");

        priceField.type =
            "number";

        priceField.className =
            "price-input-field";

        priceField.min =
            "0";

        priceField.step =
            "1";

        priceField.placeholder =
            "價格";



        priceInput.appendChild(
            priceField
        );


        priceArea.appendChild(
            priceInput
        );


        item.appendChild(
            priceArea
        );



        // ========================================================
        // 收藏 checkbox 事件
        // ========================================================

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



        // ========================================================
        // 點整張商品卡片也可以收藏
        // ========================================================

        item.addEventListener(
            "click",
            event => {

                /*
                如果點擊的是：

                checkbox
                價格輸入框
                價格區域

                就不要觸發收藏
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

            }
        );



        // ========================================================
        // 價格輸入事件
        // ========================================================

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



        // ========================================================
        // 防止點擊價格欄位時觸發收藏
        // ========================================================

        priceField.addEventListener(
            "click",
            event => {

                event.stopPropagation();

            }
        );



        return item;

    }



    // ============================================================
    // 7. 初始化收藏狀態
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
            // 讀取之前輸入的價格
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
            // 套用收藏外觀
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
    // 8. 收藏狀態改變
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

                getCollectionKey(
                    product.id
                ),

                "true"

            );



            // ----------------------------------------------------
            // 紫色外框
            // ----------------------------------------------------

            item.classList.add(
                "selected"
            );



            // ----------------------------------------------------
            // 顯示價格欄位
            // ----------------------------------------------------

            priceArea.classList.add(
                "show"
            );



            // ----------------------------------------------------
            // 自動讓價格欄位取得焦點
            // ----------------------------------------------------

            setTimeout(() => {

                priceField.focus();

            }, 50);


        } else {

            // ----------------------------------------------------
            // 取消收藏
            // ----------------------------------------------------

            localStorage.removeItem(

                getCollectionKey(
                    product.id
                )

            );



            // ----------------------------------------------------
            // 移除紫色外框
            // ----------------------------------------------------

            item.classList.remove(
                "selected"
            );



            // ----------------------------------------------------
            // 隱藏價格欄位
            // ----------------------------------------------------

            priceArea.classList.remove(
                "show"
            );

        }



        // --------------------------------------------------------
        // 更新統計
        // --------------------------------------------------------

        updateAllStatistics();

    }



    // ============================================================
    // 9. LocalStorage Key
    // ============================================================

    function getCollectionKey(id) {

        return "momo_collection_" + id;

    }



    function getPriceKey(id) {

        return "momo_price_" + id;

    }



    // ============================================================
    // 10. 儲存價格
    // ============================================================

    function savePrice(id, value) {

        // --------------------------------------------------------
        // 空白價格
        // --------------------------------------------------------

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



        // --------------------------------------------------------
        // 轉成數字
        // --------------------------------------------------------

        const price =
            Number(value);



        // --------------------------------------------------------
        // 無效價格
        // --------------------------------------------------------

        if (

            Number.isNaN(price) ||

            price < 0

        ) {

            return;

        }



        // --------------------------------------------------------
        // 儲存
        // --------------------------------------------------------

        localStorage.setItem(

            getPriceKey(id),

            String(price)

        );

    }



    // ============================================================
    // 11. 更新所有統計
    // ============================================================

    function updateAllStatistics() {

        updateCategoryStatistics();

        updateTotalCollected();

        updateTotalSpent();

    }



    // ============================================================
    // 12. 娃娃 / 其他周邊統計
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



        // --------------------------------------------------------
        // 娃娃收藏數
        // --------------------------------------------------------

        const plushCollected =
            countCollected(
                plushProducts
            );



        // --------------------------------------------------------
        // 其他周邊收藏數
        // --------------------------------------------------------

        const otherCollected =
            countCollected(
                otherProducts
            );



        // --------------------------------------------------------
        // 更新畫面
        // --------------------------------------------------------

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
    // 13. 計算某分類收藏數
    // ============================================================

    function countCollected(productList) {

        let count = 0;



        productList.forEach(product => {

            if (

                localStorage.getItem(

                    getCollectionKey(
                        product.id
                    )

                ) === "true"

            ) {

                count++;

            }

        });



        return count;

    }



    // ============================================================
    // 14. 更新分類統計卡
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



        // --------------------------------------------------------
        // 收藏數
        // --------------------------------------------------------

        if (collectedElement) {

            collectedElement.textContent =
                collected;

        }



        // --------------------------------------------------------
        // 商品總數
        // --------------------------------------------------------

        if (totalElement) {

            totalElement.textContent =
                total;

        }



        // --------------------------------------------------------
        // 百分比
        // --------------------------------------------------------

        if (percentageElement) {

            let percentage = 0;



            if (total > 0) {

                percentage =
                    (collected / total) * 100;

            }



            percentageElement.textContent =
                formatPercentage(
                    percentage
                ) + "%";

        }

    }



    // ============================================================
    // 15. 收藏總數
    // ============================================================

    function updateTotalCollected() {

        let total = 0;



        products.forEach(product => {

            if (

                localStorage.getItem(

                    getCollectionKey(
                        product.id
                    )

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
    // 16. 收藏總花費
    // ============================================================

    function updateTotalSpent() {

        let totalSpent = 0;



        products.forEach(product => {

            // ----------------------------------------------------
            // 是否收藏
            // ----------------------------------------------------

            const collected =
                localStorage.getItem(

                    getCollectionKey(
                        product.id
                    )

                ) === "true";



            if (!collected) {

                return;

            }



            // ----------------------------------------------------
            // 取得價格
            // ----------------------------------------------------

            const savedPrice =
                localStorage.getItem(

                    getPriceKey(
                        product.id
                    )

                );



            if (savedPrice === null) {

                return;

            }



            // ----------------------------------------------------
            // 計算
            // ----------------------------------------------------

            const price =
                Number(savedPrice);



            if (

                !Number.isNaN(price) &&

                price >= 0

            ) {

                totalSpent += price;

            }

        });



        // --------------------------------------------------------
        // 更新畫面
        // --------------------------------------------------------

        const totalSpentElement =
            document.getElementById(
                "total-spent"
            );



        if (totalSpentElement) {

            totalSpentElement.textContent =

                "NT$ " +

                totalSpent.toLocaleString(
                    "zh-TW"
                );

        }

    }



    // ============================================================
    // 17. 百分比格式
    // ============================================================

    function formatPercentage(value) {

        // --------------------------------------------------------
        // 0%
        // --------------------------------------------------------

        if (value === 0) {

            return "0";

        }



        // --------------------------------------------------------
        // 100%
        // --------------------------------------------------------

        if (value === 100) {

            return "100";

        }



        // --------------------------------------------------------
        // 其他保留一位小數
        // --------------------------------------------------------

        return value.toFixed(1);

    }



    // ============================================================
    // 18. 啟動圖鑑
    // ============================================================

    renderCatalog();

});
