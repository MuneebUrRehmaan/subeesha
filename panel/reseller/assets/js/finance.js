/* Reseller monthly financial dashboard */
R.ready(function () {
    var page = document.getElementById("financePage");
    if (!page) return;

    var monthSelect = document.getElementById("financeMonth");
    var filterSelect = document.getElementById("financeStatusFilter");
    var tableBody = document.getElementById("financeOrdersTable");
    var allOrders = [];

    function money(value) { return SUB.money(value); }
    function gross(order) { return SUB.num(order.total) + SUB.num(order.walletUsed); }
    function isVoided(order) { return /^(Cancelled|Returned)$/i.test(String(order.status || "")); }
    function isDelivered(order) { return order.status === "Delivered" && !order.commissionVoid; }
    function isOpen(order) { return !isVoided(order) && order.status !== "Delivered"; }
    function dateOf(order) { return SUB.toDate(order.createdAt); }
    function makeKey(date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"); }
    function fromKey(key) {
        var parts = key.split("-");
        return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    }
    function monthLabel(date) {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    function keyLabel(key) { return monthLabel(fromKey(key)); }
    function selectedOrders() {
        var key = monthSelect.value;
        return allOrders.filter(function (order) {
            var date = dateOf(order);
            return date && makeKey(date) === key;
        }).sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); });
    }
    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    function buildMonthOptions() {
        var now = new Date();
        var keys = [];
        for (var i = 0; i < 12; i++) {
            var date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            keys.push(makeKey(date));
        }
        allOrders.forEach(function (order) {
            var date = dateOf(order);
            if (date && keys.indexOf(makeKey(date)) < 0) keys.push(makeKey(date));
        });
        keys.sort(function (a, b) { return fromKey(b) - fromKey(a); });
        monthSelect.innerHTML = keys.map(function (key) {
            return '<option value="' + key + '">' + SUB.esc(keyLabel(key)) + '</option>';
        }).join("");
        monthSelect.value = makeKey(now);
        if (!monthSelect.value && keys.length) monthSelect.value = keys[0];
    }
    function renderMetrics(orders) {
        var active = orders.filter(function (order) { return !isVoided(order); });
        var delivered = active.filter(isDelivered);
        var open = active.filter(isOpen);
        var cancelled = orders.filter(isVoided);
        var sales = active.reduce(function (sum, order) { return sum + gross(order); }, 0);
        var deliveredSales = delivered.reduce(function (sum, order) { return sum + gross(order); }, 0);
        var pendingSales = open.reduce(function (sum, order) { return sum + gross(order); }, 0);
        var earned = delivered.reduce(function (sum, order) { return sum + SUB.num(order.commission); }, 0);
        var pendingCommission = open.reduce(function (sum, order) { return sum + SUB.num(order.commission); }, 0);

        setText("financeSales", money(sales));
        setText("financeOrderCount", String(orders.length));
        setText("financeOrderNote", active.length + " active · " + cancelled.length + " cancelled/returned");
        setText("financeDeliveredSales", money(deliveredSales));
        setText("financeDeliveredNote", delivered.length + " delivered order(s)");
        setText("financePendingSales", money(pendingSales));
        setText("financePendingNote", open.length + " order(s) in progress");
        setText("financeEarned", money(earned));
        setText("financePendingCommission", money(pendingCommission));
        setText("financeCommissionNote", open.length + " order(s) awaiting delivery");
        setText("financeWallet", money(R.me.wallet));

        setText("impactDelivered", String(delivered.length));
        setText("impactOpen", String(open.length));
        setText("impactCancelled", String(cancelled.length));
        setText("impactCommission", money(earned + pendingCommission));
    }
    function renderChart(selectedKey) {
        var selectedDate = fromKey(selectedKey);
        var buckets = [];
        for (var i = 5; i >= 0; i--) {
            var date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
            var key = makeKey(date);
            var monthOrders = allOrders.filter(function (order) {
                var orderDate = dateOf(order);
                return orderDate && makeKey(orderDate) === key && !isVoided(order);
            });
            buckets.push({ label: date.toLocaleDateString("en-US", { month: "short" }), key: key, value: monthOrders.reduce(function (sum, order) { return sum + gross(order); }, 0) });
        }
        var maximum = Math.max.apply(null, buckets.map(function (item) { return item.value; }).concat([1]));
        var chart = document.getElementById("financeChart");
        chart.innerHTML = buckets.map(function (item) {
            var height = item.value ? Math.max(5, Math.round(item.value / maximum * 100)) : 3;
            return '<div class="finance-chart-column" title="' + SUB.esc(keyLabel(item.key) + ': ' + money(item.value)) + '">' +
                '<strong>' + SUB.esc(item.value ? money(item.value) : "Rs. 0") + '</strong>' +
                '<div class="finance-chart-track"><span style="height:' + height + '%"></span></div>' +
                '<small>' + SUB.esc(item.label) + '</small></div>';
        }).join("");
    }
    function statusClass(status) {
        if (status === "Delivered") return "completed";
        if (status === "Cancelled" || status === "Returned") return "cancelled";
        return "pending";
    }
    function renderTable(orders) {
        var status = filterSelect.value;
        var filtered = status === "all" ? orders : orders.filter(function (order) { return order.status === status; });
        setText("financeTableDescription", filtered.length + " order(s) · " + keyLabel(monthSelect.value));
        if (!filtered.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="finance-empty">No orders found for this month and status.</td></tr>';
            return;
        }
        tableBody.innerHTML = filtered.map(function (order) {
            var customer = order.customer || {};
            var products = (order.items || []).map(function (item) {
                return SUB.esc(item.name || "Product") + " × " + SUB.num(item.qty || 1);
            }).join(", ") || "—";
            var commission = order.commissionVoid || isVoided(order)
                ? '<span class="finance-commission voided">Voided</span>'
                : isDelivered(order)
                    ? '<span class="finance-commission earned">+' + SUB.esc(money(order.commission)) + '</span>'
                    : '<span class="finance-commission pending">' + SUB.esc(money(order.commission)) + ' pending</span>';
            var name = SUB.esc(customer.name || "Customer");
            var phone = customer.phone ? '<small>' + SUB.esc(customer.phone) + '</small>' : '';
            return '<tr>' +
                '<td>' + SUB.esc(SUB.date(order.createdAt)) + '</td>' +
                '<td><b>#' + SUB.esc(order.orderNo || order.id) + '</b></td>' +
                '<td><div class="finance-customer">' + name + phone + '<small class="finance-items">' + products + '</small></div></td>' +
                '<td class="finance-amount">' + SUB.esc(money(gross(order))) + '</td>' +
                '<td>' + commission + '</td>' +
                '<td><span class="status ' + statusClass(order.status) + '">' + SUB.esc(order.status || "Unknown") + '</span></td>' +
            '</tr>';
        }).join("");
    }
    function render() {
        var orders = selectedOrders();
        renderMetrics(orders);
        renderChart(monthSelect.value);
        renderTable(orders);
    }

    function finishLoading() { page.classList.remove("is-loading"); }
    if (!SUB.configured) {
        setText("financeOrdersTable", "");
        tableBody.innerHTML = '<tr><td colspan="6" class="finance-empty">Connect Firebase to view your financial records.</td></tr>';
        finishLoading();
        return;
    }

    monthSelect.addEventListener("change", render);
    filterSelect.addEventListener("change", function () { renderTable(selectedOrders()); });

    SUB.db.collection("orders").where("resellerId", "==", R.me.id).get().then(function (snapshot) {
        allOrders = SUB.docs(snapshot);
        buildMonthOptions();
        render();
    }).catch(function (error) {
        R.err(error);
        tableBody.innerHTML = '<tr><td colspan="6" class="finance-empty">Could not load financial records. Please refresh the page.</td></tr>';
    }).finally(finishLoading);
});
