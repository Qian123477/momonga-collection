document.addEventListener(
  "DOMContentLoaded",
  async () => {

    // =========================================================
    // 1. 商品資料
    // =========================================================

    let products = [];

    // =========================================================
    // 幣別設定：購入價格以 TWD 儲存，畫面才依選擇換算
    // =========================================================
    const CURRENCY_META = {
      TWD: { label: "新台幣 TWD", symbol: "NT$" },
      JPY: { label: "日圓 JPY", symbol: "¥" },
      HKD: { label: "港幣 HKD", symbol: "HK$" },
      CNY: { label: "人民幣 CNY", symbol: "¥" }
    };

    const CURRENCY_STORAGE_KEY = "momo_currency_settings";
    let currencySettings = loadCurrencySettings();
    let exchangeRatesToTWD = {
      TWD: 1,
      JPY: 0.22,
      HKD: 4.1,
      CNY: 4.45
    };
    let liveRatesReady = false;

    function loadCurrencySettings() {
      try {
        const saved = JSON.parse(
          localStorage.getItem(CURRENCY_STORAGE_KEY) || "{}"
        );

        return {
          displayCurrency: CURRENCY_META[saved.displayCurrency]
            ? saved.displayCurrency
            : "TWD",

          mode: saved.mode === "fixed" ? "fixed" : "live",

          fixedRates: {
            JPY: Number(saved.fixedRates?.JPY) > 0
              ? Number(saved.fixedRates.JPY)
              : 0.22,

            HKD: Number(saved.fixedRates?.HKD) > 0
              ? Number(saved.fixedRates.HKD)
              : 4.1,

            CNY: Number(saved.fixedRates?.CNY) > 0
              ? Number(saved.fixedRates.CNY)
              : 4.45
          }
        };
      } catch (_) {
        return {
          displayCurrency: "TWD",
          mode: "live",
          fixedRates: {
            JPY: 0.22,
            HKD: 4.1,
            CNY: 4.45
          }
        };
      }
    }

    function saveCurrencySettings() {
      localStorage.setItem(
        CURRENCY_STORAGE_KEY,
        JSON.stringify(currencySettings)
      );
    }

    function currencySymbol(code = currencySettings.displayCurrency) {
      return CURRENCY_META[code]?.symbol || code;
    }

    function formatMoney(
      amount,
      code = currencySettings.displayCurrency
    ) {
      const digits = code === "JPY" || code === "TWD" ? 0 : 2;

      return currencySymbol(code) + " " +
        Number(amount || 0).toLocaleString("zh-TW", {
          maximumFractionDigits: digits
        });
    }

    function convertCurrency(amount, from, to) {
      const value = Number(amount);

      if (!Number.isFinite(value)) return 0;

      const fromRate = exchangeRatesToTWD[from] || 1;
      const toRate = exchangeRatesToTWD[to] || 1;

      return value * fromRate / toRate;
    }

    function getProductCurrency(product) {
      return CURRENCY_META[product.originalCurrency]
        ? product.originalCurrency
        : "TWD";
    }

    async function loadLiveExchangeRates() {
      if (currencySettings.mode !== "live") return;

      try {
        const response = await fetch(
          "https://api.frankfurter.dev/v1/latest?base=TWD&symbols=JPY,HKD,CNY",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("匯率服務暫時無法使用");
        }

        const data = await response.json();

        if (
          data.rates?.JPY &&
          data.rates?.HKD &&
          data.rates?.CNY
        ) {
          exchangeRatesToTWD = {
            TWD: 1,
            JPY: 1 / data.rates.JPY,
            HKD: 1 / data.rates.HKD,
            CNY: 1 / data.rates.CNY
          };

          liveRatesReady = true;
        }
      } catch (error) {
        console.warn(
          "即時匯率讀取失敗，暫用預設匯率：",
          error
        );
      }
    }

    function applyFixedRates() {
      if (currencySettings.mode !== "fixed") return;

      exchangeRatesToTWD = {
        TWD: 1,
        ...currencySettings.fixedRates
      };
    }


    function refreshCurrencyDisplays() {
      // 從儲存值重新渲染，避免重複換算
      renderCatalog();
      refreshPurchasePriceFields();
      applyFilters();
      updateAllStatistics();
    }

    function addCurrencySettingsUI() {
      const panel = document.querySelector(".settings-panel");

      if (
        !panel ||
        document.getElementById("currency-settings-section")
      ) {
        return;
      }

      const section = document.createElement("div");

      section.id = "currency-settings-section";
      section.className = "currency-settings-section";

      section.innerHTML = `
        <div class="currency-settings-heading">
          💱 幣別與匯率
        </div>

        <label class="currency-setting-row">
          <span>顯示幣別</span>
          <select id="display-currency">
            <option value="TWD">TWD 新台幣</option>
            <option value="JPY">JPY 日圓</option>
            <option value="HKD">HKD 港幣</option>
            <option value="CNY">CNY 人民幣</option>
          </select>
        </label>

        <label class="currency-setting-row">
          <span>匯率模式</span>
          <select id="exchange-rate-mode">
            <option value="live">即時匯率</option>
            <option value="fixed">固定匯率</option>
          </select>
        </label>

        <div id="fixed-rate-fields" class="fixed-rate-fields">
          <label>
            1 JPY =
            <input id="fixed-rate-JPY" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <label>
            1 HKD =
            <input id="fixed-rate-HKD" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <label>
            1 CNY =
            <input id="fixed-rate-CNY" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <button type="button" id="save-fixed-rates">
            儲存固定匯率
          </button>
        </div>

        <div id="exchange-rate-status" class="exchange-rate-status">
          即時匯率會在載入時更新；若讀取失敗會使用預設匯率。
        </div>
      `;

      const header = panel.querySelector(".settings-header");

      if (header?.nextSibling) {
        panel.insertBefore(section, header.nextSibling);
      } else {
        panel.prepend(section);
      }

      const currencySelect =
        section.querySelector("#display-currency");

      const modeSelect =
        section.querySelector("#exchange-rate-mode");

      const fixedFields =
        section.querySelector("#fixed-rate-fields");

      currencySelect.value = currencySettings.displayCurrency;
      modeSelect.value = currencySettings.mode;

      ["JPY", "HKD", "CNY"].forEach(code => {
        section.querySelector(`#fixed-rate-${code}`).value =
          currencySettings.fixedRates[code];
      });

      fixedFields.style.display =
        currencySettings.mode === "fixed" ? "grid" : "none";

      currencySelect.addEventListener("change", () => {
        currencySettings.displayCurrency = currencySelect.value;
        saveCurrencySettings();
        refreshCurrencyDisplays();
      });

      modeSelect.addEventListener("change", async () => {
        currencySettings.mode = modeSelect.value;

        fixedFields.style.display =
          currencySettings.mode === "fixed" ? "grid" : "none";

        saveCurrencySettings();

        if (currencySettings.mode === "fixed") {
          applyFixedRates();
        } else {
          await loadLiveExchangeRates();
        }

        refreshCurrencyDisplays();

        section.querySelector("#exchange-rate-status").textContent =
          currencySettings.mode === "fixed"
            ? "已使用固定匯率。"
            : (
                liveRatesReady
                  ? "即時匯率已更新。"
                  : "即時匯率暫時無法讀取，使用預設匯率。"
              );
      });

      section.querySelector("#save-fixed-rates")
        .addEventListener("click", () => {
          const rates = {};

          ["JPY", "HKD", "CNY"].forEach(code => {
            rates[code] = Number(
              section.querySelector(`#fixed-rate-${code}`).value
            );
          });

          if (
            Object.values(rates).some(
              rate => !Number.isFinite(rate) || rate <= 0
            )
          ) {
            alert("請輸入大於 0 的有效匯率。");
            return;
          }

          currencySettings.fixedRates = rates;
          currencySettings.mode = "fixed";
          modeSelect.value = "fixed";
          fixedFields.style.display = "grid";

          saveCurrencySettings();
          applyFixedRates();
          refreshCurrencyDisplays();

          section.querySelector("#exchange-rate-status").textContent =
            "固定匯率已儲存。";
        });
    }

    try {
      const response = await fetch("products.json");

      if (!response.ok) {
        throw new Error("無法讀取 products.json");
      }

      products = await response.json();

      // 防止 products.json 不是陣列
      if (!Array.isArray(products)) {
        throw new Error(
          "products.json 格式錯誤，必須是陣列"
        );
      }
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
      document.getElementById("catalog-container");

    if (!catalogContainer) {
      console.error("找不到 catalog-container");
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
    // 4. LocalStorage
    // =========================================================

    function getCollectionKey(id) {
      return "momo_collection_" + id;
    }

    function getTotalPriceKey(id) {
      return "momo_total_price_" + id;
    }

    // 舊版均價資料
    function getPriceKey(id) {
      return "momo_price_" + id;
    }

    function getQuantityKey(id) {
      return "momo_quantity_" + id;
    }

    function isCollected(id) {
      return localStorage.getItem(
        getCollectionKey(id)
      ) === "true";
    }

    // =========================================================
    // 5. 建立商品卡片
    // =========================================================

    function createProductCard(product) {
      const item = document.createElement("div");

      item.className = "item";
      item.dataset.id = product.id;
      item.dataset.category = product.category;
      item.dataset.subcategory = product.subcategory;

      // -----------------------------------------------------
      // 商品圖片
      // -----------------------------------------------------

      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      image.loading = "lazy";
      item.appendChild(image);

      // -----------------------------------------------------
      // 商品名稱
      // -----------------------------------------------------

      const label = document.createElement("label");
      label.className = "item-name";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "collect-checkbox";

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(product.name));
      item.appendChild(label);

      // -----------------------------------------------------
      // 收藏資訊區
      // -----------------------------------------------------

      const priceArea = document.createElement("div");
      priceArea.className = "price-area";

      // 數量
      const quantityRow = document.createElement("div");
      quantityRow.className = "collection-input-row";

      const quantityLabel = document.createElement("span");
      quantityLabel.className = "collection-input-label";
      quantityLabel.textContent = "數量";

      const quantityField = document.createElement("input");
      quantityField.type = "number";
      quantityField.className = "quantity-input-field";
      quantityField.min = "1";
      quantityField.step = "1";
      quantityField.value = "1";
      quantityField.placeholder = "1";

      quantityRow.appendChild(quantityLabel);
      quantityRow.appendChild(quantityField);
      priceArea.appendChild(quantityRow);

      // 總價
      const totalPriceRow = document.createElement("div");
      totalPriceRow.className = "collection-input-row";

      const totalPriceLabel = document.createElement("span");
      totalPriceLabel.className = "collection-input-label";
      totalPriceLabel.textContent = "總價";

      const totalPriceField = document.createElement("input");
      totalPriceField.type = "number";
      totalPriceField.className = "total-price-input-field";
      totalPriceField.min = "0";
      totalPriceField.step = "any";
      totalPriceField.placeholder = "總價";

      totalPriceRow.appendChild(totalPriceLabel);
      totalPriceRow.appendChild(totalPriceField);
      priceArea.appendChild(totalPriceRow);

      // 均價
      const averagePriceRow = document.createElement("div");
      averagePriceRow.className = "collection-input-row";

      const averagePriceLabel = document.createElement("span");
      averagePriceLabel.className = "collection-input-label";
      averagePriceLabel.textContent = "均價";

      const averagePriceValue = document.createElement("div");
      averagePriceValue.className = "collection-average-price";
      averagePriceValue.textContent = formatMoney(0);

      averagePriceRow.appendChild(averagePriceLabel);
      averagePriceRow.appendChild(averagePriceValue);
      priceArea.appendChild(averagePriceRow);

      item.appendChild(priceArea);

      // -----------------------------------------------------
      // 收藏狀態
      // -----------------------------------------------------

      checkbox.addEventListener("change", () => {
        handleCollectionChange(
          product,
          item,
          checkbox,
          priceArea,
          totalPriceField,
          quantityField,
          averagePriceValue
        );
      });

      // 點擊商品卡片切換收藏
      item.addEventListener("click", event => {
        if (
          event.target === checkbox ||
          event.target === totalPriceField ||
          event.target === quantityField ||
          event.target.closest(".collection-input-row")
        ) {
          return;
        }

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      });

      // -----------------------------------------------------
      // 儲存總價
      // 紀錄統一以 TWD 儲存，畫面才依顯示幣別換算
      // -----------------------------------------------------

      totalPriceField.addEventListener("input", () => {
        const enteredValue = totalPriceField.value;

        saveTotalPrice(
          product.id,
          enteredValue === ""
            ? ""
            : String(
                convertCurrency(
                  Number(enteredValue),
                  currencySettings.displayCurrency,
                  "TWD"
                )
              )
        );

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );

        updateTotalSpent();
      });

      totalPriceField.addEventListener("click", event => {
        event.stopPropagation();
      });

      // 數量
      quantityField.addEventListener("input", () => {
        saveQuantity(product.id, quantityField.value);

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );

        updateTotalCollected();
        updateTotalSpent();
      });

      quantityField.addEventListener("click", event => {
        event.stopPropagation();
      });

      return item;
    }

    // =========================================================
    // 6. 產生整個圖鑑
    // =========================================================

    function renderCatalog() {
      catalogContainer.innerHTML = "";

      if (products.length === 0) {
        catalogContainer.innerHTML = `
          <div style="text-align:center;color:#999;padding:60px 20px;">
            <div style="font-size:40px;margin-bottom:12px;">📦</div>
            <div style="font-size:16px;">目前沒有商品</div>
          </div>
        `;

        initializeCollectionState();
        updateAllStatistics();
        return;
      }

      categoryOrder.forEach(category => {
        const categoryProducts = products.filter(
          product => product.category === category
        );

        if (categoryProducts.length === 0) return;

        const section = document.createElement("section");
        section.className = "category-section";
        section.dataset.category = category;

        const majorTitle = document.createElement("h2");
        majorTitle.className = "major-title";
        majorTitle.textContent = category;
        section.appendChild(majorTitle);

        const subcategories = subcategoryOrder[category] || [];

        subcategories.forEach(subcategory => {
          const subProducts = products.filter(
            product =>
              product.category === category &&
              product.subcategory === subcategory
          );

          if (subProducts.length === 0) return;

          const subTitle = document.createElement("h3");
          subTitle.className = "sub-title";
          subTitle.textContent = subcategory;
          section.appendChild(subTitle);

          const grid = document.createElement("div");
          grid.className = "catalog-grid";
          grid.dataset.category = category;

          subProducts.forEach(product => {
            grid.appendChild(createProductCard(product));
          });

          section.appendChild(grid);
        });

        catalogContainer.appendChild(section);
      });

      initializeCollectionState();
      updateAllStatistics();
    }

    // =========================================================
    // 7. 收藏資料讀取與儲存
    // =========================================================

    function saveTotalPrice(id, value) {
      localStorage.setItem(
        getTotalPriceKey(id),
        value === "" ? "" : String(value)
      );
    }

    function saveQuantity(id, value) {
      localStorage.setItem(
        getQuantityKey(id),
        String(value)
      );
    }

    function getSavedTotalPrice(id) {
      const value = localStorage.getItem(getTotalPriceKey(id));
      return value === null || value === "" ? 0 : Number(value) || 0;
    }

    function getSavedQuantity(id) {
      const value = Number(localStorage.getItem(getQuantityKey(id)));
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function initializeCollectionState() {
      document.querySelectorAll(".item").forEach(item => {
        const id = item.dataset.id;
        const product = products.find(p => String(p.id) === String(id));
        if (!product) return;

        const checkbox = item.querySelector(".collect-checkbox");
        const priceArea = item.querySelector(".price-area");
        const totalPriceField = item.querySelector(".total-price-input-field");
        const quantityField = item.querySelector(".quantity-input-field");
        const averagePriceValue = item.querySelector(".collection-average-price");

        checkbox.checked = isCollected(id);
        item.classList.toggle("selected", checkbox.checked);
        priceArea.classList.toggle("show", checkbox.checked);

        quantityField.value = getSavedQuantity(id);

        const storedTotal = localStorage.getItem(getTotalPriceKey(id));
        const totalInTWD = storedTotal === null || storedTotal === ""
          ? 0
          : Number(storedTotal) || 0;

        totalPriceField.value = totalInTWD === 0
          ? ""
          : convertCurrency(
              totalInTWD,
              "TWD",
              currencySettings.displayCurrency
            ).toFixed(
              currencySettings.displayCurrency === "TWD" ||
              currencySettings.displayCurrency === "JPY" ? 0 : 2
            );

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );
      });

      updateAllStatistics();
    }

    // =========================================================
    // 8. 收藏切換
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
      const selected = checkbox.checked;

      localStorage.setItem(
        getCollectionKey(product.id),
        selected ? "true" : "false"
      );

      item.classList.toggle("selected", selected);
      priceArea.classList.toggle("show", selected);

      if (selected) {
        if (!quantityField.value) {
          quantityField.value = "1";
          saveQuantity(product.id, "1");
        }
      }

      updateAveragePrice(
        quantityField,
        totalPriceField,
        averagePriceValue
      );

      updateAllStatistics();
    }

    // =========================================================
    // 9. 均價計算
    // =========================================================

    function updateAveragePrice(
      quantityField,
      totalPriceField,
      averagePriceValue
    ) {
      const quantity = Math.max(1, Number(quantityField.value) || 1);
      const total = Math.max(0, Number(totalPriceField.value) || 0);

      const average = total / quantity;

      averagePriceValue.textContent = formatMoney(average);
    }

    // =========================================================
    // 10. 收藏數量統計
    // =========================================================

    function updateTotalCollected() {
      let totalQuantity = 0;
      let collectedTypes = 0;

      products.forEach(product => {
        if (isCollected(product.id)) {
          collectedTypes++;
          totalQuantity += getSavedQuantity(product.id);
        }
      });

      const totalCollectedElement =
        document.getElementById("total-collected");

      if (totalCollectedElement) {
        totalCollectedElement.textContent =
          `${totalQuantity} / ${products.length}`;
      }

      const collectedCountElement =
        document.getElementById("collected-count");

      if (collectedCountElement) {
        collectedCountElement.textContent = collectedTypes;
      }
    }

    // =========================================================
    // 11. 購入總金額統計
    // =========================================================

    function updateTotalSpent() {
      let totalSpentTWD = 0;

      products.forEach(product => {
        if (!isCollected(product.id)) return;

        totalSpentTWD += getSavedTotalPrice(product.id);
      });

      const totalSpentElement =
        document.getElementById("total-spent");

      if (totalSpentElement) {
        totalSpentElement.textContent = formatMoney(
          convertCurrency(
            totalSpentTWD,
            "TWD",
            currencySettings.displayCurrency
          )
        );
      }
    }

    // =========================================================
    // 12. 商品原價統計
    // =========================================================

    function updateOriginalPriceStatistics() {
      let totalOriginalPriceTWD = 0;

      products.forEach(product => {
        const originalPrice = Number(product.originalPrice) || 0;
        const originalCurrency = getProductCurrency(product);

        totalOriginalPriceTWD += convertCurrency(
          originalPrice,
          originalCurrency,
          "TWD"
        );
      });

      const originalPriceElement =
        document.getElementById("total-original-price");

      if (originalPriceElement) {
        originalPriceElement.textContent = formatMoney(
          convertCurrency(
            totalOriginalPriceTWD,
            "TWD",
            currencySettings.displayCurrency
          )
        );
      }
    }

    // =========================================================
    // 13. 更新全部統計
    // =========================================================

    function updateAllStatistics() {
      updateTotalCollected();
      updateTotalSpent();
      updateOriginalPriceStatistics();
    }

    // =========================================================
    // 14. 搜尋與篩選
    // =========================================================

    function setupSearchAndFilters() {
      const searchInput =
        document.getElementById("search-input");

      const clearSearchButton =
        document.querySelector(".clear-search");

      const filterButtons =
        document.querySelectorAll(".filter-button");

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          applyFilters();

          if (clearSearchButton) {
            clearSearchButton.style.display =
              searchInput.value ? "flex" : "none";
          }
        });
      }

      if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
          if (searchInput) {
            searchInput.value = "";
            searchInput.dispatchEvent(new Event("input"));
          }

          clearSearchButton.style.display = "none";
        });
      }

      filterButtons.forEach(button => {
        button.addEventListener("click", () => {
          filterButtons.forEach(item => {
            item.classList.remove("active");
          });

          button.classList.add("active");
          applyFilters();
        });
      });
    }

    function applyFilters() {
      const searchInput =
        document.getElementById("search-input");

      const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

      const activeFilter =
        document.querySelector(".filter-button.active");

      const filterValue = activeFilter
        ? activeFilter.dataset.filter ||
          activeFilter.textContent.trim()
        : "all";

      let visibleCount = 0;

      document.querySelectorAll(".item").forEach(item => {
        const nameElement = item.querySelector(".item-name");

        const productName = nameElement
          ? nameElement.textContent.toLowerCase()
          : "";

        const category = item.dataset.category || "";
        const subcategory = item.dataset.subcategory || "";

        const matchesSearch =
          !searchText ||
          productName.includes(searchText) ||
          category.toLowerCase().includes(searchText) ||
          subcategory.toLowerCase().includes(searchText);

        let matchesFilter = true;

        if (
          filterValue === "collected" ||
          filterValue.includes("已收藏")
        ) {
          matchesFilter = isCollected(item.dataset.id);
        } else if (
          filterValue === "uncollected" ||
          filterValue.includes("未收藏")
        ) {
          matchesFilter = !isCollected(item.dataset.id);
        } else if (
          filterValue !== "all" &&
          !filterValue.includes("全部")
        ) {
          matchesFilter =
            category === filterValue ||
            subcategory === filterValue;
        }

        const visible = matchesSearch && matchesFilter;

        item.classList.toggle("filter-hidden", !visible);

        if (visible) visibleCount++;
      });

      document.querySelectorAll(".category-section").forEach(section => {
        let hasVisibleItem = false;

        section.querySelectorAll(".catalog-grid").forEach(grid => {
          const visibleItems = grid.querySelectorAll(
            ".item:not(.filter-hidden)"
          );

          const hasItems = visibleItems.length > 0;

          grid.style.display = hasItems ? "grid" : "none";

          const previousTitle = grid.previousElementSibling;

          if (
            previousTitle &&
            previousTitle.classList.contains("sub-title")
          ) {
            previousTitle.style.display = hasItems ? "flex" : "none";
          }

          if (hasItems) hasVisibleItem = true;
        });

        section.style.display = hasVisibleItem ? "block" : "none";
      });

      const resultMessage =
        document.querySelector(".search-result-message");

      if (resultMessage) {
        resultMessage.textContent =
          searchText || filterValue !== "all"
            ? `找到 ${visibleCount} 件商品`
            : "";
      }
    }

    // =========================================================
    // 15. 深色模式
    // =========================================================

    function loadTheme() {
      const savedTheme = localStorage.getItem("momo_theme");

      const isDark = savedTheme === "dark";

      document.documentElement.classList.toggle(
        "dark-mode",
        isDark
      );

      const themeButton =
        document.getElementById("theme-toggle");

      if (themeButton) {
        themeButton.textContent = isDark
          ? "☀️ 淺色模式"
          : "🌙 深色模式";
      }
    }

    function setupThemeToggle() {
      const themeButton =
        document.getElementById("theme-toggle");

      if (!themeButton) return;

      themeButton.addEventListener("click", () => {
        const isDark =
          document.documentElement.classList.toggle("dark-mode");

        localStorage.setItem(
          "momo_theme",
          isDark ? "dark" : "light"
        );

        themeButton.textContent = isDark
          ? "☀️ 淺色模式"
          : "🌙 深色模式";
      });
    }

    // =========================================================
    // 16. 設定視窗
    // =========================================================

    function setupSettingsPanel() {
      const settingsButton =
        document.getElementById("settings-button");

      const settingsOverlay =
        document.getElementById("settings-overlay");

      const closeButton =
        document.querySelector(".close-settings");

      if (!settingsButton || !settingsOverlay) return;

      function openSettings() {
        settingsOverlay.classList.add("show");
      }

      function closeSettings() {
        settingsOverlay.classList.remove("show");
      }

      settingsButton.addEventListener("click", openSettings);

      if (closeButton) {
        closeButton.addEventListener("click", closeSettings);
      }

      settingsOverlay.addEventListener("click", event => {
        if (event.target === settingsOverlay) {
          closeSettings();
        }
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          closeSettings();
        }
      });
    }

    // =========================================================
    // 17. 清除收藏資料
    // =========================================================

    function setupClearDataButton() {
      const clearButton =
        document.getElementById("clear-data-button");

      if (!clearButton) return;

      clearButton.addEventListener("click", () => {
        const confirmed = confirm(
          "確定要清除所有收藏狀態、數量及購入價格嗎？此操作無法復原。"
        );

        if (!confirmed) return;

        products.forEach(product => {
          localStorage.removeItem(getCollectionKey(product.id));
          localStorage.removeItem(getTotalPriceKey(product.id));
          localStorage.removeItem(getQuantityKey(product.id));
          localStorage.removeItem(getPriceKey(product.id));
        });

        renderCatalog();
        applyFilters();
        updateAllStatistics();
      });
    }

    // =========================================================
    // 18. 幣別切換時重新顯示購入價格
    // =========================================================

    function refreshPurchasePriceFields() {
      document.querySelectorAll(".item").forEach(item => {
        const id = item.dataset.id;

        const totalPriceField =
          item.querySelector(".total-price-input-field");

        const quantityField =
          item.querySelector(".quantity-input-field");

        const averagePriceValue =
          item.querySelector(".collection-average-price");

        if (
          !totalPriceField ||
          !quantityField ||
          !averagePriceValue
        ) {
          return;
        }

        const savedTotalTWD = getSavedTotalPrice(id);

        totalPriceField.value = savedTotalTWD
          ? convertCurrency(
              savedTotalTWD,
              "TWD",
              currencySettings.displayCurrency
            ).toFixed(
              currencySettings.displayCurrency === "TWD" ||
              currencySettings.displayCurrency === "JPY" ? 0 : 2
            )
          : "";

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );
      });
    }

    // =========================================================
    // 19. 初始化
    // =========================================================

    addCurrencySettingsUI();

    if (currencySettings.mode === "fixed") {
      applyFixedRates();
    } else {
      await loadLiveExchangeRates();
    }

    setupSearchAndFilters();
    setupThemeToggle();
    setupSettingsPanel();
    setupClearDataButton();

    loadTheme();
    renderCatalog();
    refreshPurchasePriceFields();
    applyFilters();
    updateAllStatistics();

  }
);

    //document.addEventListener(
  "DOMContentLoaded",
  async () => {

    // =========================================================
    // 1. 商品資料
    // =========================================================

    let products = [];

    // =========================================================
    // 幣別設定：購入價格以 TWD 儲存，畫面才依選擇換算
    // =========================================================
    const CURRENCY_META = {
      TWD: { label: "新台幣 TWD", symbol: "NT$" },
      JPY: { label: "日圓 JPY", symbol: "¥" },
      HKD: { label: "港幣 HKD", symbol: "HK$" },
      CNY: { label: "人民幣 CNY", symbol: "¥" }
    };

    const CURRENCY_STORAGE_KEY = "momo_currency_settings";
    let currencySettings = loadCurrencySettings();
    let exchangeRatesToTWD = {
      TWD: 1,
      JPY: 0.22,
      HKD: 4.1,
      CNY: 4.45
    };
    let liveRatesReady = false;

    function loadCurrencySettings() {
      try {
        const saved = JSON.parse(
          localStorage.getItem(CURRENCY_STORAGE_KEY) || "{}"
        );

        return {
          displayCurrency: CURRENCY_META[saved.displayCurrency]
            ? saved.displayCurrency
            : "TWD",

          mode: saved.mode === "fixed" ? "fixed" : "live",

          fixedRates: {
            JPY: Number(saved.fixedRates?.JPY) > 0
              ? Number(saved.fixedRates.JPY)
              : 0.22,

            HKD: Number(saved.fixedRates?.HKD) > 0
              ? Number(saved.fixedRates.HKD)
              : 4.1,

            CNY: Number(saved.fixedRates?.CNY) > 0
              ? Number(saved.fixedRates.CNY)
              : 4.45
          }
        };
      } catch (_) {
        return {
          displayCurrency: "TWD",
          mode: "live",
          fixedRates: {
            JPY: 0.22,
            HKD: 4.1,
            CNY: 4.45
          }
        };
      }
    }

    function saveCurrencySettings() {
      localStorage.setItem(
        CURRENCY_STORAGE_KEY,
        JSON.stringify(currencySettings)
      );
    }

    function currencySymbol(code = currencySettings.displayCurrency) {
      return CURRENCY_META[code]?.symbol || code;
    }

    function formatMoney(
      amount,
      code = currencySettings.displayCurrency
    ) {
      const digits = code === "JPY" || code === "TWD" ? 0 : 2;

      return currencySymbol(code) + " " +
        Number(amount || 0).toLocaleString("zh-TW", {
          maximumFractionDigits: digits
        });
    }

    function convertCurrency(amount, from, to) {
      const value = Number(amount);

      if (!Number.isFinite(value)) return 0;

      const fromRate = exchangeRatesToTWD[from] || 1;
      const toRate = exchangeRatesToTWD[to] || 1;

      return value * fromRate / toRate;
    }

    function getProductCurrency(product) {
      return CURRENCY_META[product.originalCurrency]
        ? product.originalCurrency
        : "TWD";
    }

    async function loadLiveExchangeRates() {
      if (currencySettings.mode !== "live") return;

      try {
        const response = await fetch(
          "https://api.frankfurter.dev/v1/latest?base=TWD&symbols=JPY,HKD,CNY",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("匯率服務暫時無法使用");
        }

        const data = await response.json();

        if (
          data.rates?.JPY &&
          data.rates?.HKD &&
          data.rates?.CNY
        ) {
          exchangeRatesToTWD = {
            TWD: 1,
            JPY: 1 / data.rates.JPY,
            HKD: 1 / data.rates.HKD,
            CNY: 1 / data.rates.CNY
          };

          liveRatesReady = true;
        }
      } catch (error) {
        console.warn(
          "即時匯率讀取失敗，暫用預設匯率：",
          error
        );
      }
    }

    function applyFixedRates() {
      if (currencySettings.mode !== "fixed") return;

      exchangeRatesToTWD = {
        TWD: 1,
        ...currencySettings.fixedRates
      };
    }

    function refreshCurrencyDisplays() {
      // 從儲存值重新渲染，避免重複換算
      renderCatalog();
      applyFilters();
      updateAllStatistics();
    }

    function addCurrencySettingsUI() {
      const panel = document.querySelector(".settings-panel");

      if (
        !panel ||
        document.getElementById("currency-settings-section")
      ) {
        return;
      }

      const section = document.createElement("div");

      section.id = "currency-settings-section";
      section.className = "currency-settings-section";

      section.innerHTML = `
        <div class="currency-settings-heading">
          💱 幣別與匯率
        </div>

        <label class="currency-setting-row">
          <span>顯示幣別</span>
          <select id="display-currency">
            <option value="TWD">TWD 新台幣</option>
            <option value="JPY">JPY 日圓</option>
            <option value="HKD">HKD 港幣</option>
            <option value="CNY">CNY 人民幣</option>
          </select>
        </label>

        <label class="currency-setting-row">
          <span>匯率模式</span>
          <select id="exchange-rate-mode">
            <option value="live">即時匯率</option>
            <option value="fixed">固定匯率</option>
          </select>
        </label>

        <div id="fixed-rate-fields" class="fixed-rate-fields">
          <label>
            1 JPY =
            <input id="fixed-rate-JPY" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <label>
            1 HKD =
            <input id="fixed-rate-HKD" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <label>
            1 CNY =
            <input id="fixed-rate-CNY" type="number"
              min="0.000001" step="any">
            TWD
          </label>

          <button type="button" id="save-fixed-rates">
            儲存固定匯率
          </button>
        </div>

        <div id="exchange-rate-status" class="exchange-rate-status">
          即時匯率會在載入時更新；若讀取失敗會使用預設匯率。
        </div>
      `;

      const header = panel.querySelector(".settings-header");

      if (header?.nextSibling) {
        panel.insertBefore(section, header.nextSibling);
      } else {
        panel.prepend(section);
      }

      const currencySelect =
        section.querySelector("#display-currency");

      const modeSelect =
        section.querySelector("#exchange-rate-mode");

      const fixedFields =
        section.querySelector("#fixed-rate-fields");

      currencySelect.value = currencySettings.displayCurrency;
      modeSelect.value = currencySettings.mode;

      ["JPY", "HKD", "CNY"].forEach(code => {
        section.querySelector(`#fixed-rate-${code}`).value =
          currencySettings.fixedRates[code];
      });

      fixedFields.style.display =
        currencySettings.mode === "fixed" ? "grid" : "none";

      currencySelect.addEventListener("change", () => {
        currencySettings.displayCurrency = currencySelect.value;
        saveCurrencySettings();
        refreshCurrencyDisplays();
      });

      modeSelect.addEventListener("change", async () => {
        currencySettings.mode = modeSelect.value;

        fixedFields.style.display =
          currencySettings.mode === "fixed" ? "grid" : "none";

        saveCurrencySettings();

        if (currencySettings.mode === "fixed") {
          applyFixedRates();
        } else {
          await loadLiveExchangeRates();
        }

        refreshCurrencyDisplays();

        section.querySelector("#exchange-rate-status").textContent =
          currencySettings.mode === "fixed"
            ? "已使用固定匯率。"
            : (
                liveRatesReady
                  ? "即時匯率已更新。"
                  : "即時匯率暫時無法讀取，使用預設匯率。"
              );
      });

      section.querySelector("#save-fixed-rates")
        .addEventListener("click", () => {
          const rates = {};

          ["JPY", "HKD", "CNY"].forEach(code => {
            rates[code] = Number(
              section.querySelector(`#fixed-rate-${code}`).value
            );
          });

          if (
            Object.values(rates).some(
              rate => !Number.isFinite(rate) || rate <= 0
            )
          ) {
            alert("請輸入大於 0 的有效匯率。");
            return;
          }

          currencySettings.fixedRates = rates;
          currencySettings.mode = "fixed";
          modeSelect.value = "fixed";
          fixedFields.style.display = "grid";

          saveCurrencySettings();
          applyFixedRates();
          refreshCurrencyDisplays();

          section.querySelector("#exchange-rate-status").textContent =
            "固定匯率已儲存。";
        });
    }

    try {
      const response = await fetch("products.json");

      if (!response.ok) {
        throw new Error("無法讀取 products.json");
      }

      products = await response.json();

      // 防止 products.json 不是陣列
      if (!Array.isArray(products)) {
        throw new Error(
          "products.json 格式錯誤，必須是陣列"
        );
      }
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
      document.getElementById("catalog-container");

    if (!catalogContainer) {
      console.error("找不到 catalog-container");
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
    // 4. LocalStorage
    // =========================================================

    function getCollectionKey(id) {
      return "momo_collection_" + id;
    }

    function getTotalPriceKey(id) {
      return "momo_total_price_" + id;
    }

    // 舊版均價資料
    function getPriceKey(id) {
      return "momo_price_" + id;
    }

    function getQuantityKey(id) {
      return "momo_quantity_" + id;
    }

    function isCollected(id) {
      return localStorage.getItem(
        getCollectionKey(id)
      ) === "true";
    }

    // =========================================================
    // 5. 建立商品卡片
    // =========================================================

    function createProductCard(product) {
      const item = document.createElement("div");

      item.className = "item";
      item.dataset.id = product.id;
      item.dataset.category = product.category;
      item.dataset.subcategory = product.subcategory;

      // -----------------------------------------------------
      // 商品圖片
      // -----------------------------------------------------

      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      image.loading = "lazy";
      item.appendChild(image);

      // -----------------------------------------------------
      // 商品名稱
      // -----------------------------------------------------

      const label = document.createElement("label");
      label.className = "item-name";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "collect-checkbox";

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(product.name));
      item.appendChild(label);

      // -----------------------------------------------------
      // 收藏資訊區
      // -----------------------------------------------------

      const priceArea = document.createElement("div");
      priceArea.className = "price-area";

      // 數量
      const quantityRow = document.createElement("div");
      quantityRow.className = "collection-input-row";

      const quantityLabel = document.createElement("span");
      quantityLabel.className = "collection-input-label";
      quantityLabel.textContent = "數量";

      const quantityField = document.createElement("input");
      quantityField.type = "number";
      quantityField.className = "quantity-input-field";
      quantityField.min = "1";
      quantityField.step = "1";
      quantityField.value = "1";
      quantityField.placeholder = "1";

      quantityRow.appendChild(quantityLabel);
      quantityRow.appendChild(quantityField);
      priceArea.appendChild(quantityRow);

      // 總價
      const totalPriceRow = document.createElement("div");
      totalPriceRow.className = "collection-input-row";

      const totalPriceLabel = document.createElement("span");
      totalPriceLabel.className = "collection-input-label";
      totalPriceLabel.textContent = "總價";

      const totalPriceField = document.createElement("input");
      totalPriceField.type = "number";
      totalPriceField.className = "total-price-input-field";
      totalPriceField.min = "0";
      totalPriceField.step = "any";
      totalPriceField.placeholder = "總價";

      totalPriceRow.appendChild(totalPriceLabel);
      totalPriceRow.appendChild(totalPriceField);
      priceArea.appendChild(totalPriceRow);

      // 均價
      const averagePriceRow = document.createElement("div");
      averagePriceRow.className = "collection-input-row";

      const averagePriceLabel = document.createElement("span");
      averagePriceLabel.className = "collection-input-label";
      averagePriceLabel.textContent = "均價";

      const averagePriceValue = document.createElement("div");
      averagePriceValue.className = "collection-average-price";
      averagePriceValue.textContent = formatMoney(0);

      averagePriceRow.appendChild(averagePriceLabel);
      averagePriceRow.appendChild(averagePriceValue);
      priceArea.appendChild(averagePriceRow);

      item.appendChild(priceArea);

      // -----------------------------------------------------
      // 收藏狀態
      // -----------------------------------------------------

      checkbox.addEventListener("change", () => {
        handleCollectionChange(
          product,
          item,
          checkbox,
          priceArea,
          totalPriceField,
          quantityField,
          averagePriceValue
        );
      });

      // 點擊商品卡片切換收藏
      item.addEventListener("click", event => {
        if (
          event.target === checkbox ||
          event.target === totalPriceField ||
          event.target === quantityField ||
          event.target.closest(".collection-input-row")
        ) {
          return;
        }

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      });

      // -----------------------------------------------------
      // 儲存總價
      // 紀錄統一以 TWD 儲存，畫面才依顯示幣別換算
      // -----------------------------------------------------

      totalPriceField.addEventListener("input", () => {
        const enteredValue = totalPriceField.value;

        saveTotalPrice(
          product.id,
          enteredValue === ""
            ? ""
            : String(
                convertCurrency(
                  Number(enteredValue),
                  currencySettings.displayCurrency,
                  "TWD"
                )
              )
        );

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );

        updateTotalSpent();
      });

      totalPriceField.addEventListener("click", event => {
        event.stopPropagation();
      });

      // 數量
      quantityField.addEventListener("input", () => {
        saveQuantity(product.id, quantityField.value);

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );

        updateTotalCollected();
        updateTotalSpent();
      });

      quantityField.addEventListener("click", event => {
        event.stopPropagation();
      });

      return item;
    }

    // =========================================================
    // 6. 產生整個圖鑑
    // =========================================================

    function renderCatalog() {
      catalogContainer.innerHTML = "";

      if (products.length === 0) {
        catalogContainer.innerHTML = `
          <div style="text-align:center;color:#999;padding:60px 20px;">
            <div style="font-size:40px;margin-bottom:12px;">📦</div>
            <div style="font-size:16px;">目前沒有商品</div>
          </div>
        `;

        initializeCollectionState();
        updateAllStatistics();
        return;
      }

      categoryOrder.forEach(category => {
        const categoryProducts = products.filter(
          product => product.category === category
        );

        if (categoryProducts.length === 0) return;

        const section = document.createElement("section");
        section.className = "category-section";
        section.dataset.category = category;

        const majorTitle = document.createElement("h2");
        majorTitle.className = "major-title";
        majorTitle.textContent = category;
        section.appendChild(majorTitle);

        const subcategories = subcategoryOrder[category] || [];

        subcategories.forEach(subcategory => {
          const subProducts = products.filter(
            product =>
              product.category === category &&
              product.subcategory === subcategory
          );

          if (subProducts.length === 0) return;

          const subTitle = document.createElement("h3");
          subTitle.className = "sub-title";
          subTitle.textContent = subcategory;
          section.appendChild(subTitle);

          const grid = document.createElement("div");
          grid.className = "catalog-grid";
          grid.dataset.category = category;

          subProducts.forEach(product => {
            grid.appendChild(createProductCard(product));
          });

          section.appendChild(grid);
        });

        catalogContainer.appendChild(section);
      });

      initializeCollectionState();
      updateAllStatistics();
    }

    // =========================================================
    // 7. 收藏資料讀取與儲存
    // =========================================================

    function saveTotalPrice(id, value) {
      localStorage.setItem(
        getTotalPriceKey(id),
        value === "" ? "" : String(value)
      );
    }

    function saveQuantity(id, value) {
      localStorage.setItem(
        getQuantityKey(id),
        String(value)
      );
    }

    function getSavedTotalPrice(id) {
      const value = localStorage.getItem(getTotalPriceKey(id));
      return value === null || value === "" ? 0 : Number(value) || 0;
    }

    function getSavedQuantity(id) {
      const value = Number(localStorage.getItem(getQuantityKey(id)));
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function initializeCollectionState() {
      document.querySelectorAll(".item").forEach(item => {
        const id = item.dataset.id;
        const product = products.find(p => String(p.id) === String(id));
        if (!product) return;

        const checkbox = item.querySelector(".collect-checkbox");
        const priceArea = item.querySelector(".price-area");
        const totalPriceField = item.querySelector(".total-price-input-field");
        const quantityField = item.querySelector(".quantity-input-field");
        const averagePriceValue = item.querySelector(".collection-average-price");

        checkbox.checked = isCollected(id);
        item.classList.toggle("selected", checkbox.checked);
        priceArea.classList.toggle("show", checkbox.checked);

        quantityField.value = getSavedQuantity(id);

        const storedTotal = localStorage.getItem(getTotalPriceKey(id));
        const totalInTWD = storedTotal === null || storedTotal === ""
          ? 0
          : Number(storedTotal) || 0;

        totalPriceField.value = totalInTWD === 0
          ? ""
          : convertCurrency(
              totalInTWD,
              "TWD",
              currencySettings.displayCurrency
            ).toFixed(
              currencySettings.displayCurrency === "TWD" ||
              currencySettings.displayCurrency === "JPY" ? 0 : 2
            );

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );
      });

      updateAllStatistics();
    }

    // =========================================================
    // 8. 收藏切換
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
      const selected = checkbox.checked;

      localStorage.setItem(
        getCollectionKey(product.id),
        selected ? "true" : "false"
      );

      item.classList.toggle("selected", selected);
      priceArea.classList.toggle("show", selected);

      if (selected) {
        if (!quantityField.value) {
          quantityField.value = "1";
          saveQuantity(product.id, "1");
        }
      }

      updateAveragePrice(
        quantityField,
        totalPriceField,
        averagePriceValue
      );

      updateAllStatistics();
    }

    // =========================================================
    // 9. 均價計算
    // =========================================================

    function updateAveragePrice(
      quantityField,
      totalPriceField,
      averagePriceValue
    ) {
      const quantity = Math.max(1, Number(quantityField.value) || 1);
      const total = Math.max(0, Number(totalPriceField.value) || 0);

      const average = total / quantity;

      averagePriceValue.textContent = formatMoney(average);
    }

    // =========================================================
    // 10. 收藏數量統計
    // =========================================================

    function updateTotalCollected() {
      let totalQuantity = 0;
      let collectedTypes = 0;

      products.forEach(product => {
        if (isCollected(product.id)) {
          collectedTypes++;
          totalQuantity += getSavedQuantity(product.id);
        }
      });

      const totalCollectedElement =
        document.getElementById("total-collected");

      if (totalCollectedElement) {
        totalCollectedElement.textContent =
          `${totalQuantity} / ${products.length}`;
      }

      const collectedCountElement =
        document.getElementById("collected-count");

      if (collectedCountElement) {
        collectedCountElement.textContent = collectedTypes;
      }
    }

    // =========================================================
    // 11. 購入總金額統計
    // =========================================================

    function updateTotalSpent() {
      let totalSpentTWD = 0;

      products.forEach(product => {
        if (!isCollected(product.id)) return;

        totalSpentTWD += getSavedTotalPrice(product.id);
      });

      const totalSpentElement =
        document.getElementById("total-spent");

      if (totalSpentElement) {
        totalSpentElement.textContent = formatMoney(
          convertCurrency(
            totalSpentTWD,
            "TWD",
            currencySettings.displayCurrency
          )
        );
      }
    }

    // =========================================================
    // 12. 商品原價統計
    // =========================================================

    function updateOriginalPriceStatistics() {
      let totalOriginalPriceTWD = 0;

      products.forEach(product => {
        const originalPrice = Number(product.originalPrice) || 0;
        const originalCurrency = getProductCurrency(product);

        totalOriginalPriceTWD += convertCurrency(
          originalPrice,
          originalCurrency,
          "TWD"
        );
      });

      const originalPriceElement =
        document.getElementById("total-original-price");

      if (originalPriceElement) {
        originalPriceElement.textContent = formatMoney(
          convertCurrency(
            totalOriginalPriceTWD,
            "TWD",
            currencySettings.displayCurrency
          )
        );
      }
    }

    // =========================================================
    // 13. 更新全部統計
    // =========================================================

    function updateAllStatistics() {
      updateTotalCollected();
      updateTotalSpent();
      updateOriginalPriceStatistics();
    }

    // =========================================================
    // 14. 搜尋與篩選
    // =========================================================

    function setupSearchAndFilters() {
      const searchInput =
        document.getElementById("search-input");

      const clearSearchButton =
        document.querySelector(".clear-search");

      const filterButtons =
        document.querySelectorAll(".filter-button");

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          applyFilters();

          if (clearSearchButton) {
            clearSearchButton.style.display =
              searchInput.value ? "flex" : "none";
          }
        });
      }

      if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
          if (searchInput) {
            searchInput.value = "";
            searchInput.dispatchEvent(new Event("input"));
          }

          clearSearchButton.style.display = "none";
        });
      }

      filterButtons.forEach(button => {
        button.addEventListener("click", () => {
          filterButtons.forEach(item => {
            item.classList.remove("active");
          });

          button.classList.add("active");
          applyFilters();
        });
      });
    }

    function applyFilters() {
      const searchInput =
        document.getElementById("search-input");

      const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

      const activeFilter =
        document.querySelector(".filter-button.active");

      const filterValue = activeFilter
        ? activeFilter.dataset.filter ||
          activeFilter.textContent.trim()
        : "all";

      let visibleCount = 0;

      document.querySelectorAll(".item").forEach(item => {
        const nameElement = item.querySelector(".item-name");

        const productName = nameElement
          ? nameElement.textContent.toLowerCase()
          : "";

        const category = item.dataset.category || "";
        const subcategory = item.dataset.subcategory || "";

        const matchesSearch =
          !searchText ||
          productName.includes(searchText) ||
          category.toLowerCase().includes(searchText) ||
          subcategory.toLowerCase().includes(searchText);

        let matchesFilter = true;

        if (
          filterValue === "collected" ||
          filterValue.includes("已收藏")
        ) {
          matchesFilter = isCollected(item.dataset.id);
        } else if (
          filterValue === "uncollected" ||
          filterValue.includes("未收藏")
        ) {
          matchesFilter = !isCollected(item.dataset.id);
        } else if (
          filterValue !== "all" &&
          !filterValue.includes("全部")
        ) {
          matchesFilter =
            category === filterValue ||
            subcategory === filterValue;
        }

        const visible = matchesSearch && matchesFilter;

        item.classList.toggle("filter-hidden", !visible);

        if (visible) visibleCount++;
      });

      document.querySelectorAll(".category-section").forEach(section => {
        let hasVisibleItem = false;

        section.querySelectorAll(".catalog-grid").forEach(grid => {
          const visibleItems = grid.querySelectorAll(
            ".item:not(.filter-hidden)"
          );

          const hasItems = visibleItems.length > 0;

          grid.style.display = hasItems ? "grid" : "none";

          const previousTitle = grid.previousElementSibling;

          if (
            previousTitle &&
            previousTitle.classList.contains("sub-title")
          ) {
            previousTitle.style.display = hasItems ? "flex" : "none";
          }

          if (hasItems) hasVisibleItem = true;
        });

        section.style.display = hasVisibleItem ? "block" : "none";
      });

      const resultMessage =
        document.querySelector(".search-result-message");

      if (resultMessage) {
        resultMessage.textContent =
          searchText || filterValue !== "all"
            ? `找到 ${visibleCount} 件商品`
            : "";
      }
    }

    // =========================================================
    // 15. 深色模式
    // =========================================================

    function loadTheme() {
      const savedTheme = localStorage.getItem("momo_theme");

      const isDark = savedTheme === "dark";

      document.documentElement.classList.toggle(
        "dark-mode",
        isDark
      );

      const themeButton =
        document.getElementById("theme-toggle");

      if (themeButton) {
        themeButton.textContent = isDark
          ? "☀️ 淺色模式"
          : "🌙 深色模式";
      }
    }

    function setupThemeToggle() {
      const themeButton =
        document.getElementById("theme-toggle");

      if (!themeButton) return;

      themeButton.addEventListener("click", () => {
        const isDark =
          document.documentElement.classList.toggle("dark-mode");

        localStorage.setItem(
          "momo_theme",
          isDark ? "dark" : "light"
        );

        themeButton.textContent = isDark
          ? "☀️ 淺色模式"
          : "🌙 深色模式";
      });
    }

    // =========================================================
    // 16. 設定視窗
    // =========================================================

    function setupSettingsPanel() {
      const settingsButton =
        document.getElementById("settings-button");

      const settingsOverlay =
        document.getElementById("settings-overlay");

      const closeButton =
        document.querySelector(".close-settings");

      if (!settingsButton || !settingsOverlay) return;

      function openSettings() {
        settingsOverlay.classList.add("show");
      }

      function closeSettings() {
        settingsOverlay.classList.remove("show");
      }

      settingsButton.addEventListener("click", openSettings);

      if (closeButton) {
        closeButton.addEventListener("click", closeSettings);
      }

      settingsOverlay.addEventListener("click", event => {
        if (event.target === settingsOverlay) {
          closeSettings();
        }
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          closeSettings();
        }
      });
    }

    // =========================================================
    // 17. 清除收藏資料
    // =========================================================

    function setupClearDataButton() {
      const clearButton =
        document.getElementById("clear-data-button");

      if (!clearButton) return;

      clearButton.addEventListener("click", () => {
        const confirmed = confirm(
          "確定要清除所有收藏狀態、數量及購入價格嗎？此操作無法復原。"
        );

        if (!confirmed) return;

        products.forEach(product => {
          localStorage.removeItem(getCollectionKey(product.id));
          localStorage.removeItem(getTotalPriceKey(product.id));
          localStorage.removeItem(getQuantityKey(product.id));
          localStorage.removeItem(getPriceKey(product.id));
        });

        renderCatalog();
        applyFilters();
        updateAllStatistics();
      });
    }

    // =========================================================
    // 18. 幣別切換時重新顯示購入價格
    // =========================================================

    function refreshPurchasePriceFields() {
      document.querySelectorAll(".item").forEach(item => {
        const id = item.dataset.id;

        const totalPriceField =
          item.querySelector(".total-price-input-field");

        const quantityField =
          item.querySelector(".quantity-input-field");

        const averagePriceValue =
          item.querySelector(".collection-average-price");

        if (
          !totalPriceField ||
          !quantityField ||
          !averagePriceValue
        ) {
          return;
        }

        const savedTotalTWD = getSavedTotalPrice(id);

        totalPriceField.value = savedTotalTWD
          ? convertCurrency(
              savedTotalTWD,
              "TWD",
              currencySettings.displayCurrency
            ).toFixed(
              currencySettings.displayCurrency === "TWD" ||
              currencySettings.displayCurrency === "JPY" ? 0 : 2
            )
          : "";

        updateAveragePrice(
          quantityField,
          totalPriceField,
          averagePriceValue
        );
      });
    }

    // =========================================================
    // 19. 初始化
    // =========================================================

    addCurrencySettingsUI();

    if (currencySettings.mode === "fixed") {
      applyFixedRates();
    } else {
      await loadLiveExchangeRates();
    }

    setupSearchAndFilters();
    setupThemeToggle();
    setupSettingsPanel();
    setupClearDataButton();

    loadTheme();
    renderCatalog();
    refreshPurchasePriceFields();
    applyFilters();
    updateAllStatistics();

  }
);
