document.addEventListener(
    "DOMContentLoaded",
    async () => {


        // =========================================================
        // 1. 商品資料
        // =========================================================

        let products = [];


        try {

            const response =
                await fetch("products.json");


            if (!response.ok) {

                throw new Error(
                    "無法讀取 products.json"
                );

            }


            products =
                await response.json();


        } catch (error) {

            console.error(error);


            const container =
                document.getElementById(
                    "catalog-container"
                );


            if (container) {

                container.innerHTML = `
                    <p style="
                        text-align:center;
                        color:#999;
                        padding:40px;
                    ">
                        商品資料讀取失敗，
                        請確認 products.json 是否存在。
                    </p>
                `;

            }


            return;

        }



        // =========================================================
        // 2. DOM
        // =========================================================

        const catalogContainer =
            document.getElementById(
                "catalog-container"
            );


        if (!catalogContainer) {

            console.error(
                "找不到 catalog-container"
            );

            return;

        }



        // =========================================================
        // 3. 分類順序
        // =========================================================

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



        // =========================================================
        // 4. LocalStorage
        // =========================================================

        function getCollectionKey(id) {

            return (
                "momo_collection_" +
                id
            );

        }


        function getPriceKey(id) {

            return (
                "momo_price_" +
                id
            );

        }


        // 新增：收藏數量
        function getQuantityKey(id) {

            return (
                "momo_quantity_" +
                id
            );

        }


        function isCollected(id) {

            return (
                localStorage.getItem(
                    getCollectionKey(id)
                ) === "true"
            );

        }



        // =========================================================
        // 5. 建立商品卡片
        // =========================================================

        function createProductCard(product) {


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "item";


            item.dataset.id =
                product.id;


            item.dataset.category =
                product.category;


            item.dataset.subcategory =
                product.subcategory;



            // -----------------------------------------------------
            // 圖片
            // -----------------------------------------------------

            const image =
                document.createElement(
                    "img"
                );


            image.src =
                product.image;


            image.alt =
                product.name;


            image.loading =
                "lazy";


            item.appendChild(
                image
            );



            // -----------------------------------------------------
            // 商品名稱
            // -----------------------------------------------------

            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "item-name";


            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.className =
                "collect-checkbox";


            label.appendChild(
                checkbox
            );


            label.appendChild(
                document.createTextNode(
                    product.name
                )
            );


            item.appendChild(
                label
            );



            // =====================================================
            // 價格 / 數量區
            // =====================================================

            const priceArea =
                document.createElement(
                    "div"
                );


            priceArea.className =
                "price-area";



            // -----------------------------------------------------
            // 數量
            // -----------------------------------------------------

            const quantityRow =
                document.createElement(
                    "div"
                );


            quantityRow.className =
                "collection-input-row";


            const quantityLabel =
                document.createElement(
                    "span"
                );


            quantityLabel.className =
                "collection-input-label";


            quantityLabel.textContent =
                "數量";


            const quantityField =
                document.createElement(
                    "input"
                );


            quantityField.type =
                "number";


            quantityField.className =
                "quantity-input-field";


            quantityField.min =
                "1";


            quantityField.step =
                "1";


            quantityField.value =
                "1";


            quantityField.placeholder =
                "1";


            quantityRow.appendChild(
                quantityLabel
            );


            quantityRow.appendChild(
                quantityField
            );


            priceArea.appendChild(
                quantityRow
            );



            // -----------------------------------------------------
            // 均價
            // -----------------------------------------------------

            const averagePriceRow =
                document.createElement(
                    "div"
                );


            averagePriceRow.className =
                "collection-input-row";


            const averagePriceLabel =
                document.createElement(
                    "span"
                );


            averagePriceLabel.className =
                "collection-input-label";


            averagePriceLabel.textContent =
                "均價";


            const priceInput =
                document.createElement(
                    "div"
                );


            priceInput.className =
                "price-input";


            const currency =
                document.createElement(
                    "span"
                );


            currency.textContent =
                "NT$";


            priceInput.appendChild(
                currency
            );


            const priceField =
                document.createElement(
                    "input"
                );


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


            averagePriceRow.appendChild(
                averagePriceLabel
            );


            averagePriceRow.appendChild(
                priceInput
            );


            priceArea.appendChild(
                averagePriceRow
            );



            // -----------------------------------------------------
            // 該款總價
            // -----------------------------------------------------

            const totalPriceRow =
                document.createElement(
                    "div"
                );


            totalPriceRow.className =
                "collection-total-price";


            const totalPriceLabel =
                document.createElement(
                    "span"
                );


            totalPriceLabel.textContent =
                "總價";


            const totalPriceValue =
                document.createElement(
                    "span"
                );


            totalPriceValue.className =
                "collection-total-price-value";


            totalPriceValue.textContent =
                "NT$ 0";


            totalPriceRow.appendChild(
                totalPriceLabel
            );


            totalPriceRow.appendChild(
                totalPriceValue
            );


            priceArea.appendChild(
                totalPriceRow
            );


            item.appendChild(
                priceArea
            );



            // =====================================================
            // 點擊 checkbox
            // =====================================================

            checkbox.addEventListener(
                "change",
                () => {

                    handleCollectionChange(
                        product,
                        item,
                        checkbox,
                        priceArea,
                        priceField,
                        quantityField,
                        totalPriceValue
                    );

                }
            );



            // =====================================================
            // 點擊整張商品卡
            // =====================================================

            item.addEventListener(
                "click",
                event => {


                    if (

                        event.target ===
                        checkbox

                        ||

                        event.target ===
                        priceField

                        ||

                        event.target ===
                        quantityField

                        ||

                        event.target.closest(
                            ".price-input"
                        )

                        ||

                        event.target.closest(
                            ".quantity-input-field"
                        )

                    ) {

                        return;

                    }


                    checkbox.checked =
                        !checkbox.checked;


                    checkbox.dispatchEvent(
                        new Event(
                            "change"
                        )
                    );

                }
            );



            // =====================================================
            // 均價輸入
            // =====================================================

            priceField.addEventListener(
                "input",
                () => {


                    savePrice(
                        product.id,
                        priceField.value
                    );


                    updateProductTotalPrice(
                        quantityField,
                        priceField,
                        totalPriceValue
                    );


                    updateTotalSpent();

                }
            );


            priceField.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );



            // =====================================================
            // 數量輸入
            // =====================================================

            quantityField.addEventListener(
                "input",
                () => {


                    saveQuantity(
                        product.id,
                        quantityField.value
                    );


                    updateProductTotalPrice(
                        quantityField,
                        priceField,
                        totalPriceValue
                    );


                    updateTotalCollected();

                    updateTotalSpent();

                }
            );


            quantityField.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );


            return item;

        }



        // =========================================================
        // 6. 產生整個圖鑑
        // =========================================================

        function renderCatalog() {


            catalogContainer.innerHTML =
                "";


            categoryOrder.forEach(
                category => {


                    const categoryProducts =
                        products.filter(
                            product =>
                                product.category ===
                                category
                        );


                    if (
                        categoryProducts.length ===
                        0
                    ) {

                        return;

                    }



                    const section =
                        document.createElement(
                            "section"
                        );


                    section.className =
                        "category-section";


                    section.dataset.category =
                        category;



                    // ------------------------------------------------
                    // 大分類
                    // ------------------------------------------------

                    const majorTitle =
                        document.createElement(
                            "h2"
                        );


                    majorTitle.className =
                        "major-title";


                    majorTitle.textContent =
                        category;


                    section.appendChild(
                        majorTitle
                    );



                    const subcategories =
                        subcategoryOrder[
                            category
                        ] || [];



                    subcategories.forEach(
                        subcategory => {


                            const subProducts =
                                products.filter(
                                    product =>

                                        product.category ===
                                        category

                                        &&

                                        product.subcategory ===
                                        subcategory
                                );


                            if (
                                subProducts.length ===
                                0
                            ) {

                                return;

                            }



                            // -----------------------------------------
                            // 小分類
                            // -----------------------------------------

                            const subTitle =
                                document.createElement(
                                    "h3"
                                );


                            subTitle.className =
                                "sub-title";


                            subTitle.textContent =
                                subcategory;


                            section.appendChild(
                                subTitle
                            );



                            // -----------------------------------------
                            // 商品 grid
                            // -----------------------------------------

                            const grid =
                                document.createElement(
                                    "div"
                                );


                            grid.className =
                                "catalog-grid";


                            grid.dataset.category =
                                category;


                            grid.dataset.subcategory =
                                subcategory;



                            subProducts.forEach(
                                product => {

                                    const item =
                                        createProductCard(
                                            product
                                        );


                                    grid.appendChild(
                                        item
                                    );

                                }
                            );


                            section.appendChild(
                                grid
                            );

                        }
                    );


                    catalogContainer.appendChild(
                        section
                    );

                }
            );


            initializeCollectionState();


            updateAllStatistics();

        }



        // =========================================================
        // 7. 初始化收藏
        // =========================================================

        function initializeCollectionState() {


            const items =
                document.querySelectorAll(
                    ".item"
                );


            items.forEach(
                item => {


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


                    const quantityField =
                        item.querySelector(
                            ".quantity-input-field"
                        );


                    const totalPriceValue =
                        item.querySelector(
                            ".collection-total-price-value"
                        );


                    const collected =
                        isCollected(id);


                    checkbox.checked =
                        collected;



                    // -------------------------------------------------
                    // 讀取原本的均價
                    // -------------------------------------------------

                    const savedPrice =
                        localStorage.getItem(
                            getPriceKey(id)
                        );


                    if (
                        savedPrice !==
                        null
                    ) {

                        priceField.value =
                            savedPrice;

                    }



                    // -------------------------------------------------
                    // 讀取數量
                    //
                    // 舊資料沒有數量時，自動視為 1 件
                    // -------------------------------------------------

                    const savedQuantity =
                        localStorage.getItem(
                            getQuantityKey(id)
                        );


                    if (
                        savedQuantity !==
                        null
                    ) {

                        const parsedQuantity =
                            Number(
                                savedQuantity
                            );


                        if (
                            Number.isFinite(
                                parsedQuantity
                            ) &&
                            parsedQuantity >= 1
                        ) {

                            quantityField.value =
                                Math.floor(
                                    parsedQuantity
                                );

                        } else {

                            quantityField.value =
                                "1";

                        }

                    } else {

                        quantityField.value =
                            "1";

                    }



                    // -------------------------------------------------
                    // 更新該商品總價
                    // -------------------------------------------------

                    updateProductTotalPrice(
                        quantityField,
                        priceField,
                        totalPriceValue
                    );



                    // -------------------------------------------------
                    // 收藏狀態
                    // -------------------------------------------------

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

                }
            );

        }



        // =========================================================
        // 8. 收藏狀態
        // =========================================================

        function handleCollectionChange(
            product,
            item,
            checkbox,
            priceArea,
            priceField,
            quantityField,
            totalPriceValue
        ) {


            if (
                checkbox.checked
            ) {


                localStorage.setItem(
                    getCollectionKey(
                        product.id
                    ),
                    "true"
                );


                item.classList.add(
                    "selected"
                );


                priceArea.classList.add(
                    "show"
                );


                // 沒有數量時預設為 1
                if (
                    !quantityField.value ||
                    Number(
                        quantityField.value
                    ) < 1
                ) {

                    quantityField.value =
                        "1";

                }


                saveQuantity(
                    product.id,
                    quantityField.value
                );


                updateProductTotalPrice(
                    quantityField,
                    priceField,
                    totalPriceValue
                );


                setTimeout(
                    () => {

                        priceField.focus();

                    },
                    50
                );


            } else {


                localStorage.removeItem(
                    getCollectionKey(
                        product.id
                    )
                );


                item.classList.remove(
                    "selected"
                );


                priceArea.classList.remove(
                    "show"
                );

                // 注意：
                // 取消收藏不刪除價格與數量
                // 之後重新收藏時資料還會保留

            }


            updateAllStatistics();


            applyFilters();

        }



        // =========================================================
        // 9. 儲存均價
        // =========================================================

        function savePrice(
            id,
            value
        ) {


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



        // =========================================================
        // 10. 儲存數量
        // =========================================================

        function saveQuantity(
            id,
            value
        ) {


            if (
                value === "" ||
                value === null ||
                value === undefined
            ) {

                localStorage.setItem(
                    getQuantityKey(id),
                    "1"
                );

                return;

            }


            const quantity =
                Number(value);


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity < 1
            ) {

                return;

            }


            localStorage.setItem(
                getQuantityKey(id),
                String(
                    Math.floor(quantity)
                )
            );

        }



        // =========================================================
        // 11. 計算單一商品總價
        // =========================================================

        function updateProductTotalPrice(
            quantityField,
            priceField,
            totalPriceValue
        ) {


            if (
                !totalPriceValue
            ) {

                return;

            }


            const quantity =
                Number(
                    quantityField.value
                );


            const price =
                Number(
                    priceField.value
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity < 1 ||
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                totalPriceValue.textContent =
                    "NT$ 0";

                return;

            }


            const total =
                Math.floor(
                    quantity
                ) *
                price;


            totalPriceValue.textContent =
                "NT$ " +
                total.toLocaleString(
                    "zh-TW"
                );

        }



        // =========================================================
        // 12. 統計
        // =========================================================

        function countCollected(
            productList
        ) {


            let count = 0;


            productList.forEach(
                product => {

                    if (
                        isCollected(
                            product.id
                        )
                    ) {

                        count++;

                    }

                }
            );


            return count;

        }



        function formatPercentage(
            value
        ) {


            if (
                value === 0
            ) {

                return "0";

            }


            if (
                value === 100
            ) {

                return "100";

            }


            return value.toFixed(
                1
            );

        }



        function updateCategoryCard(
            type,
            collected,
            total
        ) {


            const collectedElement =
                document.getElementById(
                    type +
                    "-collected"
                );


            const totalElement =
                document.getElementById(
                    type +
                    "-total"
                );


            const percentageElement =
                document.getElementById(
                    type +
                    "-percentage"
                );


            if (
                collectedElement
            ) {

                collectedElement.textContent =
                    collected;

            }


            if (
                totalElement
            ) {

                totalElement.textContent =
                    total;

            }


            if (
                percentageElement
            ) {


                const percentage =
                    total > 0
                        ? (
                            collected /
                            total
                        ) *
                        100
                        : 0;


                percentageElement.textContent =
                    formatPercentage(
                        percentage
                    ) +
                    "%";

            }

        }



        function updateCategoryStatistics() {


            const plushProducts =
                products.filter(
                    product =>
                        product.category ===
                        "娃娃"
                );


            const otherProducts =
                products.filter(
                    product =>
                        product.category ===
                        "其他周邊"
                );


            updateCategoryCard(
                "plush",
                countCollected(
                    plushProducts
                ),
                plushProducts.length
            );


            updateCategoryCard(
                "other",
                countCollected(
                    otherProducts
                ),
                otherProducts.length
            );

        }



        // =========================================================
        // 13. 收藏總數
        //
        // 顯示：
        // XX 款 · XX 件
        //
        // XX 款 = 收藏了幾種不同商品
        // XX 件 = 所有收藏數量加總
        // =========================================================

        function updateTotalCollected() {


            let totalStyles = 0;

            let totalItems = 0;


            products.forEach(
                product => {


                    if (
                        !isCollected(
                            product.id
                        )
                    ) {

                        return;

                    }


                    // ---------------------------------------------
                    // 收藏款式 +1
                    // ---------------------------------------------

                    totalStyles++;


                    // ---------------------------------------------
                    // 取得數量
                    // 舊資料沒有數量時 = 1
                    // ---------------------------------------------

                    const savedQuantity =
                        localStorage.getItem(
                            getQuantityKey(
                                product.id
                            )
                        );


                    let quantity = 1;


                    if (
                        savedQuantity !==
                        null
                    ) {

                        const parsedQuantity =
                            Number(
                                savedQuantity
                            );


                        if (
                            Number.isFinite(
                                parsedQuantity
                            ) &&
                            parsedQuantity >= 1
                        ) {

                            quantity =
                                Math.floor(
                                    parsedQuantity
                                );

                        }

                    }


                    totalItems +=
                        quantity;

                }
            );


            // -----------------------------------------------------
            // 款式
            // -----------------------------------------------------

            const styleElement =
                document.getElementById(
                    "total-collected"
                );


            if (styleElement) {

                styleElement.textContent =
                    totalStyles;

            }


            // -----------------------------------------------------
            // 件數
            // -----------------------------------------------------

            const itemElement =
                document.getElementById(
                    "total-items"
                );


            if (itemElement) {

                itemElement.textContent =
                    totalItems;

            }

        }



        // =========================================================
        // 14. 收藏總花費
        //
        // 均價 × 數量
        // =========================================================

        function updateTotalSpent() {


            let totalSpent = 0;


            products.forEach(
                product => {


                    if (
                        !isCollected(
                            product.id
                        )
                    ) {

                        return;

                    }


                    // ---------------------------------------------
                    // 取得均價
                    // ---------------------------------------------

                    const savedPrice =
                        localStorage.getItem(
                            getPriceKey(
                                product.id
                            )
                        );


                    if (
                        savedPrice ===
                        null
                    ) {

                        return;

                    }


                    const price =
                        Number(
                            savedPrice
                        );


                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price < 0
                    ) {

                        return;

                    }


                    // ---------------------------------------------
                    // 取得數量
                    // ---------------------------------------------

                    const savedQuantity =
                        localStorage.getItem(
                            getQuantityKey(
                                product.id
                            )
                        );


                    let quantity = 1;


                    if (
                        savedQuantity !==
                        null
                    ) {

                        const parsedQuantity =
                            Number(
                                savedQuantity
                            );


                        if (
                            Number.isFinite(
                                parsedQuantity
                            ) &&
                            parsedQuantity >= 1
                        ) {

                            quantity =
                                Math.floor(
                                    parsedQuantity
                                );

                        }

                    }


                    // ---------------------------------------------
                    // 均價 × 數量
                    // ---------------------------------------------

                    totalSpent +=
                        price *
                        quantity;

                }
            );


            const element =
                document.getElementById(
                    "total-spent"
                );


            if (element) {

                element.textContent =
                    "NT$ " +
                    totalSpent.toLocaleString(
                        "zh-TW"
                    );

            }

        }



        function updateAllStatistics() {

            updateCategoryStatistics();

            updateTotalCollected();

            updateTotalSpent();

        }



        // =========================================================
        // 15. 搜尋與篩選
        // =========================================================

        let currentFilter =
            "all";


        let currentSearch =
            "";


        const searchInput =
            document.getElementById(
                "search-input"
            );


        const clearSearchButton =
            document.getElementById(
                "clear-search"
            );


        const filterButtons =
            document.querySelectorAll(
                ".filter-button"
            );


        const searchResultMessage =
            document.getElementById(
                "search-result-message"
            );



        function applyFilters() {


            const searchText =
                currentSearch
                    .trim()
                    .toLowerCase();


            const items =
                document.querySelectorAll(
                    ".item"
                );


            let visibleCount =
                0;



            items.forEach(
                item => {


                    const id =
                        item.dataset.id;


                    const product =
                        products.find(
                            p =>
                                p.id === id
                        );


                    if (!product) {

                        return;

                    }



                    // ----------------------------------------------
                    // 搜尋
                    // ----------------------------------------------

                    const searchableText = [

                        product.name,

                        product.category,

                        product.subcategory

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    const matchesSearch =
                        searchText === "" ||
                        searchableText.includes(
                            searchText
                        );



                    // ----------------------------------------------
                    // 收藏篩選
                    // ----------------------------------------------

                    const collected =
                        isCollected(id);


                    let matchesFilter =
                        true;


                    if (
                        currentFilter ===
                        "collected"
                    ) {

                        matchesFilter =
                            collected;

                    }


                    if (
                        currentFilter ===
                        "uncollected"
                    ) {

                        matchesFilter =
                            !collected;

                    }



                    // ----------------------------------------------
                    // 顯示
                    // ----------------------------------------------

                    if (
                        matchesSearch &&
                        matchesFilter
                    ) {

                        item.classList.remove(
                            "filter-hidden"
                        );

                        visibleCount++;

                    } else {

                        item.classList.add(
                            "filter-hidden"
                        );

                    }

                }
            );



            // =====================================================
            // 隱藏沒有商品的小分類
            // =====================================================

            document
                .querySelectorAll(
                    ".category-section"
                )
                .forEach(
                    section => {


                        const grids =
                            section.querySelectorAll(
                                ".catalog-grid"
                            );


                        let sectionHasVisible =
                            false;


                        grids.forEach(
                            grid => {


                                const visibleItems =
                                    grid.querySelectorAll(
                                        ".item:not(.filter-hidden)"
                                    );


                                const hasVisible =
                                    visibleItems.length >
                                    0;


                                grid.style.display =
                                    hasVisible
                                        ? ""
                                        : "none";


                                const title =
                                    grid.previousElementSibling;


                                if (
                                    title &&
                                    title.classList.contains(
                                        "sub-title"
                                    )
                                ) {

                                    title.style.display =
                                        hasVisible
                                            ? ""
                                            : "none";

                                }


                                if (
                                    hasVisible
                                ) {

                                    sectionHasVisible =
                                        true;

                                }

                            }
                        );


                        const majorTitle =
                            section.querySelector(
                                ".major-title"
                            );


                        if (
                            majorTitle
                        ) {

                            majorTitle.style.display =
                                sectionHasVisible
                                    ? ""
                                    : "none";

                        }


                    }
                );



            // =====================================================
            // 顯示結果
            // =====================================================

            if (
                searchText !== ""
            ) {

                searchResultMessage.textContent =
                    `找到 ${visibleCount} 件商品`;

            } else if (
                currentFilter ===
                "collected"
            ) {

                searchResultMessage.textContent =
                    `已收藏 ${visibleCount} 件`;

            } else if (
                currentFilter ===
                "uncollected"
            ) {

                searchResultMessage.textContent =
                    `尚未收藏 ${visibleCount} 件`;

            } else {

                searchResultMessage.textContent =
                    "";

            }



            // =====================================================
            // 搜尋 X
            // =====================================================

            clearSearchButton.style.display =
                searchText !== ""
                    ? "flex"
                    : "none";

        }



        // =========================================================
        // 16. 搜尋事件
        // =========================================================

        searchInput.addEventListener(
            "input",
            () => {

                currentSearch =
                    searchInput.value;

                applyFilters();

            }
        );



        clearSearchButton.addEventListener(
            "click",
            () => {

                searchInput.value =
                    "";

                currentSearch =
                    "";

                searchInput.focus();

                applyFilters();

            }
        );



        // =========================================================
        // 17. 篩選按鈕
        // =========================================================

        filterButtons.forEach(
            button => {


                button.addEventListener(
                    "click",
                    () => {


                        currentFilter =
                            button.dataset.filter;


                        filterButtons.forEach(
                            otherButton => {

                                otherButton.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        applyFilters();

                    }
                );

            }
        );



        // =========================================================
        // 18. 深色模式
        // =========================================================

        const themeToggle =
            document.getElementById(
                "theme-toggle"
            );


        const themeToggleIcon =
            document.querySelector(
                ".theme-toggle-icon"
            );


        const themeToggleText =
            document.querySelector(
                ".theme-toggle-text"
            );



        function updateThemeButton() {


            const isDark =
                document.body.classList.contains(
                    "dark-mode"
                );


            if (isDark) {

                themeToggleIcon.textContent =
                    "☀️";


                themeToggleText.textContent =
                    "淺色";

            } else {

                themeToggleIcon.textContent =
                    "🌙";


                themeToggleText.textContent =
                    "深色";

            }

        }



        function loadTheme() {


            const savedTheme =
                localStorage.getItem(
                    "momo_theme"
                );


            if (
                savedTheme ===
                "dark"
            ) {

                document.body.classList.add(
                    "dark-mode"
                );

            } else {

                document.body.classList.remove(
                    "dark-mode"
                );

            }


            updateThemeButton();

        }



        themeToggle.addEventListener(
            "click",
            () => {


                const isDark =
                    document.body.classList.toggle(
                        "dark-mode"
                    );


                localStorage.setItem(
                    "momo_theme",
                    isDark
                        ? "dark"
                        : "light"
                );


                updateThemeButton();

            }
        );



        // =========================================================
        // 19. 設定面板
        // =========================================================

        const settingsButton =
            document.getElementById(
                "settings-button"
            );


        const settingsOverlay =
            document.getElementById(
                "settings-overlay"
            );


        const closeSettings =
            document.getElementById(
                "close-settings"
            );



        function openSettings() {

            settingsOverlay.classList.add(
                "show"
            );

        }


        function closeSettingsPanel() {

            settingsOverlay.classList.remove(
                "show"
            );

        }


        settingsButton.addEventListener(
            "click",
            openSettings
        );


        closeSettings.addEventListener(
            "click",
            closeSettingsPanel
        );


        settingsOverlay.addEventListener(
            "click",
            event => {


                if (
                    event.target ===
                    settingsOverlay
                ) {

                    closeSettingsPanel();

                }

            }
        );



        // =========================================================
        // 20. 清除收藏資料
        // =========================================================

        const clearDataButton =
            document.getElementById(
                "clear-data-button"
            );


        const confirmOverlay =
            document.getElementById(
                "confirm-overlay"
            );


        const cancelClear =
            document.getElementById(
                "cancel-clear"
            );


        const confirmClear =
            document.getElementById(
                "confirm-clear"
            );



        clearDataButton.addEventListener(
            "click",
            () => {


                confirmOverlay.classList.add(
                    "show"
                );

            }
        );



        cancelClear.addEventListener(
            "click",
            () => {


                confirmOverlay.classList.remove(
                    "show"
                );

            }
        );



        confirmClear.addEventListener(
            "click",
            () => {


                // --------------------------------------------------
                // 清除收藏、均價、數量
                // --------------------------------------------------

                products.forEach(
                    product => {


                        localStorage.removeItem(
                            getCollectionKey(
                                product.id
                            )
                        );


                        localStorage.removeItem(
                            getPriceKey(
                                product.id
                            )
                        );


                        localStorage.removeItem(
                            getQuantityKey(
                                product.id
                            )
                        );

                    }
                );



                // --------------------------------------------------
                // 關閉確認視窗
                // --------------------------------------------------

                confirmOverlay.classList.remove(
                    "show"
                );



                // --------------------------------------------------
                // 更新商品
                // --------------------------------------------------

                initializeCollectionState();


                updateAllStatistics();


                applyFilters();



                // --------------------------------------------------
                // 顯示提示
                // --------------------------------------------------

                searchResultMessage.textContent =
                    "已清除所有收藏資料";


                setTimeout(
                    () => {

                        applyFilters();

                    },
                    1800
                );

            }
        );



        confirmOverlay.addEventListener(
            "click",
            event => {


                if (
                    event.target ===
                    confirmOverlay
                ) {

                    confirmOverlay.classList.remove(
                        "show"
                    );

                }

            }
        );



        // =========================================================
        // 21. ESC 關閉設定 / 視窗
        // =========================================================

        document.addEventListener(
            "keydown",
            event => {


                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                settingsOverlay.classList.remove(
                    "show"
                );


                confirmOverlay.classList.remove(
                    "show"
                );

            }
        );



        // =========================================================
        // 22. 啟動
        // =========================================================

        loadTheme();


        renderCatalog();


        applyFilters();


    }
);
