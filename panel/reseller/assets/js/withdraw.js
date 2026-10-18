/* Reseller - withdrawal requests (payouts collection) */
R.ready(function () {
    var info = document.querySelector(".withdraw-info h2"); if (!info || !SUB.configured) return;
    info.textContent = SUB.money(R.me.wallet);
    var form = document.getElementById("withdrawForm");
    var methodSel = form.querySelector("select");
    if (R.me.paymentMethod) methodSel.value = R.me.paymentMethod;
    if (R.me.account) document.getElementById("accountNumber").value = R.me.account;
    var placing = false;
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (placing) return;
        var amount = Number(document.getElementById("withdrawAmount").value);
        var account = document.getElementById("accountNumber").value.trim();
        if (amount < 1000) return R.toast("Minimum withdrawal amount is Rs. 1,000");
        if (account.length < 5) return R.toast("Please enter a valid account number.");
        if (amount > SUB.num(R.me.wallet)) return R.toast("Amount exceeds your available balance.");
        placing = true;
        SUB.db.collection("payouts").add({
            uid: R.me.id, name: R.me.name, amount: amount, method: methodSel.value, account: account, status: "Pending", createdAt: SUB.now()
        }).then(function () {
            R.toast("Withdrawal request submitted successfully!");
            form.reset();
        }).catch(function (e) { R.err(e); }).finally(function () { placing = false; });
    });
});
