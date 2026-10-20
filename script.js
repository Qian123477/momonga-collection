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

            // 防止 products.json 不是陣列
            if (!Array.isArray(products)) {

                throw new Error(
                    "products.json 格式錯誤，必須是陣列"
                );

            }

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
                "大娃/抱枕",
                "其他",
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
                "穿戴",
                "手帕/布",
                "飾品",
                "生活用品",
                "其他"
            ]
        };

        
        // =========================================================
        // 3.5 幣別與匯率設定
        // =========================================================

        const CURRENCY_KEY = "momo_display_currency";
        const EXCHANGE_MODE_KEY = "momo_exchange_mode";

        const currencyNames = {
            TWD: "台幣",
            JPY: "日幣",
            HKD: "港幣",
            CNY: "人民幣"
        };

        // rates 代表「1 單位該幣別 = 多少台幣」
        let currencyRates = {
            TWD: 1,
            JPY: 0.22,
            HKD: 4.1,
            CNY: 4.4
        };

        let exchangeRateDate = "";

        let displayCurrency =
            localStorage.getItem(CURRENCY_KEY) || "TWD";

        let exchangeMode =
            localStorage.getItem(EXCHANGE_MODE_KEY) || "live";

        if (!currencyNames[displayCurrency]) {
            displayCurrency = "TWD";
        }

        if (!["live", "fixed"].includes(exchangeMode)) {
            exchangeMode = "live";
        }

        function getCurrencySymbol(currency) {
            return {
                TWD: "NT$",
                JPY: "¥",
                HKD: "HK$",
                CNY: "CN¥"
            }[currency] || currency;
        }

        function formatMoney(amount, currency = displayCurrency) {
            if (!Number.isFinite(amount)) {
                amount = 0;
            }

            return new Intl.NumberFormat("zh-TW", {
                style: "currency",
                currency,
                maximumFractionDigits: 2
            }).format(amount);
        }

        // 先換算成台幣，再換成目標幣別
        function convertCurrency(amount, from, to) {
            if (!Number.isFinite(amount)) {
                return 0;
            }

            if (from === to) {
                return amount;
            }

            const fromRate = currencyRates[from];
            const toRate = currencyRates[to];

            if (
                !Number.isFinite(fromRate) ||
                !Number.isFinite(toRate) ||
                fromRate <= 0 ||
                toRate <= 0
            ) {
                return amount;
            }

            return amount * fromRate / toRate;
        }

        function getStoredCurrencyKey(id) {
            return "momo_total_currency_" + id;
        }

        function getSavedTotalInDisplayCurrency(id) {
            const saved = localStorage.getItem(
                getTotalPriceKey(id)
            );

            if (saved === null) {
                return null;
            }

            const amount = Number(saved);

            if (!Number.isFinite(amount) || amount < 0) {
                return null;
            }

            // 舊資料沒有幣別記錄時，沿用舊版台幣的解讀方式
            const storedCurrency =
                localStorage.getItem(getStoredCurrencyKey(id)) || "TWD";

            return convertCurrency(
                amount,
                storedCurrency,
                displayCurrency
            );
        }

        function saveTotalPriceWithCurrency(id, value) {
            saveTotalPrice(id, value);

            if (value === "" || value === null || value === undefined) {
                localStorage.removeItem(getStoredCurrencyKey(id));
                return;
            }

            const amount = Number(value);

            if (Number.isFinite(amount) && amount >= 0) {
                localStorage.setItem(
                    getStoredCurrencyKey(id),
                    displayCurrency
                );
            }
        }

        function getFixedRate(currency) {
            if (currency === "TWD") {
                return 1;
            }

            const input = document.getElementById({
                JPY: "rate-jpy",
                HKD: "rate-hkd",
                CNY: "rate-cny"
            }[currency]);

            const value = Number(input?.value);

            return Number.isFinite(value) && value > 0
                ? value
                : NaN;
        }

        function loadFixedRates() {
            for (const currency of ["JPY", "HKD", "CNY"]) {
                const input = document.getElementById({
                    JPY: "rate-jpy",
                    HKD: "rate-hkd",
                    CNY: "rate-cny"
                }[currency]);

                const saved = localStorage.getItem(
                    "momo_fixed_rate_" + currency
                );

                if (input && saved !== null) {
                    input.value = saved;
                }
            }
        }

        function applyFixedRates() {
            currencyRates.TWD = 1;

            for (const currency of ["JPY", "HKD", "CNY"]) {
                const rate = getFixedRate(currency);

                if (Number.isFinite(rate)) {
                    currencyRates[currency] = rate;
                }
            }
        }

        async function loadLiveRates() {
            const status = document.getElementById(
                "exchange-rate-status"
            );

            if (status) {
                status.textContent = "正在取得最新參考匯率…";
            }

            try {
                const response = await fetch(
                    "https://api.frankfurter.dev/v2/rates?base=TWD&quotes=JPY,HKD,CNY"
                );

                if (!response.ok) {
                    throw new Error("匯率 API 回應失敗");
                }

                const rows = await response.json();

                const newRates = { TWD: 1 };

                for (const row of rows) {
                    if (
                        ["JPY", "HKD", "CNY"].includes(row.quote) &&
                        Number.isFinite(row.rate) &&
                        row.rate > 0
                    ) {
                        // API 回傳的是 1 TWD 可換多少外幣
                        // 反轉後就是 1 外幣等於多少 TWD
                        newRates[row.quote] = 1 / row.rate;
                    }
                }

                for (const currency of ["JPY", "HKD", "CNY"]) {
                    if (!Number.isFinite(newRates[currency])) {
                        throw new Error(
                            "匯率資料缺少 " + currency
                        );
                    }
                }

                currencyRates = newRates;
                exchangeRateDate = rows[0]?.date || "";

                if (status) {
                    status.textContent =
                        "參考匯率日期：" +
                        (exchangeRateDate || "API 最新資料");
                }

                refreshAllPriceDisplays();

            } catch (error) {
                console.error("取得匯率失敗：", error);

                if (status) {
                    status.textContent =
                        "無法取得匯率，請檢查網路。可切換固定匯率。";
                }

                // 失敗時保留目前匯率，不假裝是最新匯率
                refreshAllPriceDisplays();
            }
        }

        function refreshAllPriceDisplays() {
            document.querySelectorAll(".item").forEach(item => {
                const id = item.dataset.id;

                const quantityField = item.querySelector(
                    ".quantity-input-field"
                );

                const totalPriceField = item.querySelector(
                    ".total-price-input-field"
                );

                const averagePriceValue = item.querySelector(
                    ".collection-average-price"
                );

                if (!id || !totalPriceField || !quantityField) {
                    return;
                }

                const converted = getSavedTotalInDisplayCurrency(id);

                totalPriceField.value =
                    converted === null ? "" : String(
                        Math.round(converted * 100) / 100
                    );

                updateAveragePrice(
                    quantityField,
                    totalPriceField,
                    averagePriceValue
                );
            });

            updateTotalSpent();
        }

        function initializeCurrencySettings() {
            const currencySelect = document.getElementById(
                "display-currency"
            );

            const modeSelect = document.getElementById(
                "exchange-mode"
            );

            const fixedSettings = document.getElementById(
                "fixed-rate-settings"
            );

            loadFixedRates();

            if (currencySelect) {
                currencySelect.value = displayCurrency;

                currencySelect.addEventListener("change", () => {
                    displayCurrency = currencySelect.value;

                    localStorage.setItem(
                        CURRENCY_KEY,
                        displayCurrency
                    );

                    refreshAllPriceDisplays();
                    updateAllStatistics();
                });
            }

            function updateExchangeMode() {
                exchangeMode = modeSelect?.value || "live";

                localStorage.setItem(
                    EXCHANGE_MODE_KEY,
                    exchangeMode
                );

                if (fixedSettings) {
                    fixedSettings.hidden = exchangeMode !== "fixed";
                }

                if (exchangeMode === "fixed") {
                    applyFixedRates();

                    const status = document.getElementById(
                        "exchange-rate-status"
                    );

                    if (status) {
                        status.textContent =
                            "目前使用自行設定的固定匯率";
                    }

                    refreshAllPriceDisplays();
                } else {
                    loadLiveRates();
                }

                updateAllStatistics();
            }

            if (modeSelect) {
                modeSelect.value = exchangeMode;

                modeSelect.addEventListener(
                    "change",
                    updateExchangeMode
                );
            }

            for (const currency of ["JPY", "HKD", "CNY"]) {
                const input = document.getElementById({
                    JPY: "rate-jpy",
                    HKD: "rate-hkd",
                    CNY: "rate-cny"
                }[currency]);

                if (input) {
                    input.addEventListener("input", () => {
                        localStorage.setItem(
                            "momo_fixed_rate_" + currency,
                            input.value
                        );

                        if (exchangeMode === "fixed") {
                            applyFixedRates();
                            refreshAllPriceDisplays();
                            updateAllStatistics();
                        }
                    });
                }
            }

            updateExchangeMode();
        }



        // =========================================================
        // 4. LocalStorage
        // =========================================================

        function getCollectionKey(id) {

            return (
                "momo_collection_" +
                id
            );
        }


        function getTotalPriceKey(id) {

            return (
                "momo_total_price_" +
                id
            );
        }


        // 舊版均價資料
        function getPriceKey(id) {

            return (
                "momo_price_" +
                id
            );
        }


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
            // 收藏資訊區
            // =====================================================

            const priceArea =
                document.createElement(
                    "div"
                );

            priceArea.className =
                "price-area";


            // =====================================================
            // 數量
            // =====================================================

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


            // =====================================================
            // 總價
            // =====================================================

            const totalPriceRow =
                document.createElement(
                    "div"
                );

            totalPriceRow.className =
                "collection-input-row";


            const totalPriceLabel =
                document.createElement(
                    "span"
                );

            totalPriceLabel.className =
                "collection-input-label";

            totalPriceLabel.textContent =
                "總價";


            const totalPriceField =
                document.createElement(
                    "input"
                );

            totalPriceField.type =
                "number";

            totalPriceField.className =
                "total-price-input-field";

            totalPriceField.min =
                "0";

            totalPriceField.step =
                "1";

            totalPriceField.placeholder =
                "總價";


            totalPriceRow.appendChild(
                totalPriceLabel
            );

            totalPriceRow.appendChild(
                totalPriceField
            );

            priceArea.appendChild(
                totalPriceRow
            );


            // =====================================================
            // 均價
            // =====================================================

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


            const averagePriceValue =
                document.createElement(
                    "div"
                );

            averagePriceValue.className =
                "collection-average-price";

            averagePriceValue.textContent =
                "NT$ 0";


            averagePriceRow.appendChild(
                averagePriceLabel
            );

            averagePriceRow.appendChild(
                averagePriceValue
            );

            priceArea.appendChild(
                averagePriceRow
            );


            item.appendChild(
                priceArea
            );


            // =====================================================
            // 收藏 checkbox
            // =====================================================

            checkbox.addEventListener(
                "change",
                () => {

                    handleCollectionChange(
                        product,
                        item,
                        checkbox,
                        priceArea,
                        totalPriceField,
                        quantityField,
                        averagePriceValue
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
                        totalPriceField

                        ||

                        event.target ===
                        quantityField

                        ||

                        event.target.closest(
                            ".collection-input-row"
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
            // 總價輸入
            // =====================================================

            totalPriceField.addEventListener(
                "input",
                () => {

                    saveTotalPriceWithCurrency(
                        product.id,
                        totalPriceField.value
                    );


                    updateAveragePrice(
                        quantityField,
                        totalPriceField,
                        averagePriceValue
                    );


                    updateTotalSpent();

                }
            );


            totalPriceField.addEventListener(
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


                    updateAveragePrice(
                        quantityField,
                        totalPriceField,
                        averagePriceValue
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


            // -----------------------------------------------------
            // 商品完全為 0 時
            // -----------------------------------------------------

            if (
                products.length ===
                0
            ) {

                catalogContainer.innerHTML = `
                    <div style="
                        text-align:center;
                        color:#999;
                        padding:60px 20px;
                    ">
                        <div style="
                            font-size:40px;
                            margin-bottom:12px;
                        ">
                            📦
                        </div>

                        <div style="
                            font-size:16px;
                        ">
                            目前沒有商品
                        </div>
                    </div>
                `;

                initializeCollectionState();

                updateAllStatistics();

                return;
            }


            // -----------------------------------------------------
            // 依分類產生商品
            // -----------------------------------------------------

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


                    const totalPriceField =
                        item.querySelector(
                            ".total-price-input-field"
                        );


                    const quantityField =
                        item.querySelector(
                            ".quantity-input-field"
                        );


                    const averagePriceValue =
                        item.querySelector(
                            ".collection-average-price"
                        );


                    const collected =
                        isCollected(id);


                    checkbox.checked =
                        collected;


                    // -------------------------------------------------
                    // 讀取新版總價
                    // -------------------------------------------------

                    let savedTotalPrice =
                        localStorage.getItem(
                            getTotalPriceKey(id)
                        );


                    // -------------------------------------------------
                    // 相容舊版均價資料
                    // -------------------------------------------------

                    if (
                        savedTotalPrice ===
                        null
                    ) {

                        const oldPrice =
                            localStorage.getItem(
                                getPriceKey(id)
                            );


                        const oldQuantity =
                            localStorage.getItem(
                                getQuantityKey(id)
                            );


                        if (
                            oldPrice !==
                            null
                        ) {

                            const price =
                                Number(
                                    oldPrice
                                );


                            let quantity =
                                1;


                            if (
                                oldQuantity !==
                                null
                            ) {

                                const parsedQuantity =
                                    Number(
                                        oldQuantity
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


                            if (
                                Number.isFinite(
                                    price
                                ) &&
                                price >= 0
                            ) {

                                const convertedTotal =
                                    price *
                                    quantity;


                                savedTotalPrice =
                                    String(
                                        convertedTotal
                                    );


                                localStorage.setItem(
                                    getTotalPriceKey(id),
                                    savedTotalPrice
                                );

                            }

                        }

                    }

                    // -------------------------------------------------
                    // 顯示總價
                    // -------------------------------------------------

                    if (
                        savedTotalPrice !==
                        null
                    ) {

                        const convertedTotal =
                            getSavedTotalInDisplayCurrency(
                                id
                            );


                        totalPriceField.value =
                            convertedTotal === null
                                ? savedTotalPrice
                                : String(
                                    Math.round(
                                        convertedTotal * 100
                                    ) / 100
                                );

                    }
                    // -------------------------------------------------
                    // 讀取數量
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
                    // 計算均價
                    // -------------------------------------------------

                    updateAveragePrice(
                        quantityField,
                        totalPriceField,
                        averagePriceValue
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
            totalPriceField,
            quantityField,
            averagePriceValue
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


                // 沒有數量時預設 1
                if (
                    !quantityField.value ||
                    Number(
                        quantityField.value
                    ) < 1
                ) {

                    quantityField.value =
                        "1";

                }

                // -------------------------------------------------
                // 第一次收藏時自動帶入原價
                // 只有尚未儲存總價的商品才會自動帶入，
                // 使用者手動修改的價格不會被覆蓋。
                // -------------------------------------------------

                const savedTotalPrice =
                    localStorage.getItem(
                        getTotalPriceKey(
                            product.id
                        )
                    );


                const originalPrice =
                    Number(
                        product.originalPrice
                    );


                const hasOriginalPrice =
                    product.originalPrice !==
                        undefined &&

                    product.originalPrice !==
                        null &&

                    product.originalPrice !==
                        "" &&

                    Number.isFinite(
                        originalPrice
                    ) &&

                    originalPrice >= 0;


                if (
                    savedTotalPrice ===
                        null &&

                    totalPriceField.value ===
                        "" &&

                    hasOriginalPrice
                )
                {

                // -------------------------------------------------
                // 將商品原價換算成目前顯示幣別
                // -------------------------------------------------

                const originalCurrency =
                    currencyNames[
                        product.originalCurrency
                    ]
                        ? product.originalCurrency
                        : "TWD";


                const convertedOriginalPrice =
                    convertCurrency(
                        originalPrice,
                        originalCurrency,
                        displayCurrency
                    );


                const initialTotalPrice =
                    convertedOriginalPrice *
                    Number(
                        quantityField.value
                    );


                totalPriceField.value =
                    String(
                        Math.round(
                            initialTotalPrice * 100
                        ) / 100
                    );


                saveTotalPriceWithCurrency(
                    product.id,
                    totalPriceField.value
                );
                    
                saveQuantity(
                    product.id,
                    quantityField.value
                );


                updateAveragePrice(
                    quantityField,
                    totalPriceField,
                    averagePriceValue
                );


                setTimeout(
                    () => {

                        totalPriceField.focus();

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

                // 取消收藏不刪除總價與數量

            }


            updateAllStatistics();

            applyFilters();
        }


        // =========================================================
        // 9. 儲存總價
        // =========================================================

        function saveTotalPrice(
            id,
            value
        ) {

            if (
                value === "" ||
                value === null ||
                value === undefined
            ) {

                localStorage.removeItem(
                    getTotalPriceKey(id)
                );

                return;
            }


            const price =
                Number(value);


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                return;
            }


            localStorage.setItem(
                getTotalPriceKey(id),
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
        // 11. 計算均價
        // =========================================================

        function updateAveragePrice(
            quantityField,
            totalPriceField,
            averagePriceValue
        ) {

            if (
                !averagePriceValue
            ) {

                return;
            }


            const quantity =
                Number(
                    quantityField.value
                );


            const totalPrice =
                Number(
                    totalPriceField.value
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity < 1
            ) {

                averagePriceValue.textContent =
                    formatMoney(
                        0
                    );

                return;
            }


            if (
                !Number.isFinite(
                    totalPrice
                ) ||
                totalPrice < 0
            ) {

                averagePriceValue.textContent =
                    formatMoney(
                        0
                    );
                return;
            }


            const average =
                totalPrice /
                Math.floor(
                    quantity
                );

            averagePriceValue.textContent =
                formatMoney(
                    average
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


                    totalStyles++;


                    const savedQuantity =
                        localStorage.getItem(
                            getQuantityKey(
                                product.id
                            )
                        );


                    let quantity =
                        1;


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


            const styleElement =
                document.getElementById(
                    "total-collected"
                );


            if (styleElement) {

                styleElement.textContent =
                    totalStyles;
            }


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


                    const savedTotalPrice =
                        localStorage.getItem(
                            getTotalPriceKey(
                                product.id
                            )
                        );


                    // -------------------------------------------------
                    // 新版總價
                    // -------------------------------------------------

                    if (
                        savedTotalPrice !==
                        null
                    ) {

                        const totalPrice =
                            Number(
                                savedTotalPrice
                            );


                        if (
                            Number.isFinite(
                                totalPrice
                            ) &&
                            totalPrice >= 0
                        ) {

                            // -------------------------------------------------
                            // 換算成目前顯示幣別
                            // -------------------------------------------------

                            const storedCurrency =
                                localStorage.getItem(
                                    getStoredCurrencyKey(
                                        product.id
                                    )
                                ) || "TWD";


                            totalSpent +=
                                convertCurrency(
                                    totalPrice,
                                    storedCurrency,
                                    displayCurrency
                                );

                        }


                        return;
                    }


                    // -------------------------------------------------
                    // 舊版均價 × 數量
                    // -------------------------------------------------

                    const oldPrice =
                        localStorage.getItem(
                            getPriceKey(
                                product.id
                            )
                        );


                    if (
                        oldPrice ===
                        null
                    ) {

                        return;
                    }


                    const price =
                        Number(
                            oldPrice
                        );


                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price < 0
                    ) {

                        return;
                    }


                    const savedQuantity =
                        localStorage.getItem(
                            getQuantityKey(
                                product.id
                            )
                        );


                    let quantity =
                        1;


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


                    // -------------------------------------------------
                    // 舊版均價以台幣儲存
                    // -------------------------------------------------

                    totalSpent +=
                        convertCurrency(
                            price *
                            quantity,
                            "TWD",
                            displayCurrency
                        );

                }
            );


            // -------------------------------------------------
            // 更新收藏總花費
            // -------------------------------------------------

            const element =
                document.getElementById(
                    "total-spent"
                );


            if (
                element
            ) {

                element.textContent =
                    formatMoney(
                        totalSpent
                    );

            }

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


            clearSearchButton.style.display =
                searchText !== ""
                    ? "flex"
                    : "none";
        }


        // =========================================================
        // 16. 搜尋事件
        // =========================================================

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {

                    currentSearch =
                        searchInput.value;

                    applyFilters();
                }
            );

        }


        if (clearSearchButton) {

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

        }


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

            if (
                !themeToggleIcon ||
                !themeToggleText
            ) {

                return;
            }


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

        const theme =
                    localStorage.getItem("momo_theme");

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


        if (themeToggle) {

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

        }


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

            if (
                settingsOverlay
            ) {

                settingsOverlay.classList.add(
                    "show"
                );

            }
        }


        function closeSettingsPanel() {

            if (
                settingsOverlay
            ) {

                settingsOverlay.classList.remove(
                    "show"
                );

            }
        }


        if (settingsButton) {

            settingsButton.addEventListener(
                "click",
                openSettings
            );

        }


        if (closeSettings) {

            closeSettings.addEventListener(
                "click",
                closeSettingsPanel
            );

        }


        if (settingsOverlay) {

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

        }


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


        if (clearDataButton) {

            clearDataButton.addEventListener(
                "click",
                () => {

                    if (confirmOverlay) {

                        confirmOverlay.classList.add(
                            "show"
                        );

                    }

                }
            );

        }


        if (cancelClear) {

            cancelClear.addEventListener(
                "click",
                () => {

                    if (confirmOverlay) {

                        confirmOverlay.classList.remove(
                            "show"
                        );

                    }

                }
            );

        }


        if (confirmClear) {

            confirmClear.addEventListener(
                "click",
                () => {

                    // =================================================
                    // 重要修正
                    //
                    // 不再只清除 products.json 裡的商品。
                    //
                    // 直接清除所有 momo_ 開頭的資料，
                    // 因此以前刪掉的商品留下的資料也會被清除。
                    // =================================================

                    for (
                        let i =
                            localStorage.length - 1;
                        i >= 0;
                        i--
                    ) {

                        const key =
                            localStorage.key(i);


                        if (
                            key &&
                            key.startsWith(
                                "momo_"
                            )
                        ) {

                            localStorage.removeItem(
                                key
                            );

                        }

                    }


                    if (confirmOverlay) {

                        confirmOverlay.classList.remove(
                            "show"
                        );

                    }


                    initializeCollectionState();

                    updateAllStatistics();

                    applyFilters();


                    if (
                        searchResultMessage
                    ) {

                        searchResultMessage.textContent =
                            "已清除所有收藏資料";

                    }


                    setTimeout(
                        () => {

                            applyFilters();

                        },
                        1800
                    );

                }
            );

        }


        if (confirmOverlay) {

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

        }


        // =========================================================
        // 21. ESC
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


                if (settingsOverlay) {

                    settingsOverlay.classList.remove(
                        "show"
                    );

                }


                if (confirmOverlay) {

                    confirmOverlay.classList.remove(
                        "show"
                    );

                }

            }
        );

        // =========================================================
        // 22. 啟動
        // =========================================================

        loadTheme();

        initializeCurrencySettings();

        renderCatalog();

        applyFilters();
