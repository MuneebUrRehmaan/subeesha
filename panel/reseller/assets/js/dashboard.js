/* Reseller dashboard - live figures + loading shimmer */
R.ready(function () {
    var section = document.getElementById("dashboard");
    if (!section) return;

    function stopLoading() { section.classList.remove("is-loading"); }
    if (!SUB.configured) { stopLoading(); return; }

    var $ = function (selector) { return document.querySelector(selector); };
    var cards = {
        sales: $("#dashboardTotalSales"),
        earned: $("#dashboardEarned"),
        pending: $("#dashboardPending"),
        wallet: $("#dashboardWallet")
    };

    function gross(order) {
        return SUB.num(order.total) + SUB.num(order.walletUsed);
    }
    function isVoided(order) {
        return /^(Cancelled|Returned)$/i.test(String(order.status || ""));
    }
    function isDelivered(order) {
        return order.status === "Delivered" && !order.commissionVoid;
    }
    function isOpen(order) {
        return !isVoided(order) && order.status !== "Delivered";
    }
    function monthKey(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    }
    function percentChange(list, metric) {
        var now = new Date();
        var currentKey = monthKey(now);
        var prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var previousKey = monthKey(prevDate);
        var current = 0, previous = 0;
        list.forEach(function (order) {
            var date = SUB.toDate(order.createdAt);
            if (!date) return;
            var value = metric(order);
            if (monthKey(date) === currentKey) current += value;
            if (monthKey(date) === previousKey) previous += value;
        });
        if (!previous) return current ? "New this month" : "No activity this month";
        var change = Math.round((current - previous) / previous * 100);
        return (change > 0 ? "+" : "") + change + "% vs last month";
    }

    var resellerUid = R.uid || (SUB.user && SUB.user.uid);
    if (!resellerUid) { stopLoading(); R.err(new Error("Your reseller session could not be verified. Please sign in again.")); return; }

    SUB.db.collection("orders").where("resellerId", "==", resellerUid).onSnapshot(function (snapshot) {
        var orders = SUB.docs(snapshot);
        var active = orders.filter(function (order) { return !isVoided(order); });
        var earnedOrders = active.filter(isDelivered);
        var openOrders = active.filter(isOpen);
        var sales = active.reduce(function (sum, order) { return sum + gross(order); }, 0);
        var earned = earnedOrders.reduce(function (sum, order) { return sum + (order.commissionVoid ? 0 : SUB.num(order.commission)); }, 0);
        var pending = openOrders.reduce(function (sum, order) { return sum + SUB.num(order.commission); }, 0);

        if (cards.sales) cards.sales.textContent = SUB.money(sales);
        if (cards.earned) cards.earned.textContent = SUB.money(earned);
        if (cards.pending) cards.pending.textContent = SUB.money(pending);
        if (cards.wallet) cards.wallet.textContent = SUB.money(R.me.wallet);

        var pendingText = $(".pending-text");
        if (pendingText) pendingText.textContent = openOrders.length + " order(s) in progress";
        var growth = document.querySelectorAll(".growth");
        if (growth[0]) growth[0].textContent = percentChange(active, gross);
        if (growth[1]) growth[1].textContent = percentChange(earnedOrders, function (order) { return SUB.num(order.commission); });

        var today = new Date();
        var dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var days = [];
        for (var i = 6; i >= 0; i--) {
            var date = new Date(dayStart);
            date.setDate(dayStart.getDate() - i);
            days.push({ date: date, key: date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate(), value: 0 });
        }
        active.forEach(function (order) {
            var date = SUB.toDate(order.createdAt);
            if (!date) return;
            var key = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
            var day = days.filter(function (item) { return item.key === key; })[0];
            if (day) day.value += gross(order);
        });
        var max = Math.max.apply(null, days.map(function (day) { return day.value; }).concat([1]));
        var bars = document.querySelectorAll(".bar-item .bar");
        var labels = document.querySelectorAll(".bar-item > span");
        bars.forEach(function (bar, index) {
            var day = days[index];
            if (!day) return;
            bar.style.height = Math.max(4, Math.round(day.value / max * 100)) + "%";
            bar.title = SUB.money(day.value);
            if (labels[index]) labels[index].textContent = day.date.toLocaleDateString("en-US", { weekday: "short" });
        });
        stopLoading();
    }, function (error) {
        stopLoading();
        R.err(error);
    });
});
