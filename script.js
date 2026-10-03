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
