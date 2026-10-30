/* Review moderation (approval awards review points once) */
A.ready(function () {
    var body = document.getElementById("revBody"), list = [], esc = SUB.esc;
    A.loading(body, 6);
    function draw() {
        var f = document.getElementById("fStatus").value, l = list.filter(function (r) { return !f || r.status === f; });
        A.rows(body, l, 6, "No reviews here.", function (r) {
            return "<tr><td style='max-width:280px'><b>" + esc(r.product || "-") + "</b><br><small>" + esc(r.review) + "</small>" + (r.image ? '<br><a href="' + esc(SUB.img(r.image, 900)) + '" target="_blank" rel="noopener"><img src="' + esc(SUB.img(r.image, 120)) + '" style="width:54px;height:54px;object-fit:cover;border-radius:4px;margin-top:4px" alt=""></a>' : "") + "</td><td>" + esc(r.name) + "<br><small style='color:#88938f'>" + esc(r.email || "") + "</small></td><td>" + esc(r.orderId || "-") + "</td><td>" + SUB.stars(r.rating) + "</td><td>" + A.pill(r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending") + "</td><td style='white-space:nowrap'>" +
                (r.status !== "approved" ? '<button class="btn small primary" onclick="setReview(\'' + esc(r.id) + '\',true)">Approve</button> ' : "") + (r.status !== "rejected" ? '<button class="btn small danger" onclick="setReview(\'' + esc(r.id) + '\',false)">Reject</button> ' : "") + '<button class="btn small secondary" onclick="delReview(\'' + esc(r.id) + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
        });
    }
    function load() { return A.load("reviews", true).then(function (l) { list = l.sort(function (a, b) { return SUB.ms(b.createdAt) - SUB.ms(a.createdAt); }); draw(); }).catch(A.err); }
    document.getElementById("fStatus").onchange = draw;
    load();
    window.setReview = function (id, ok) {
        var r = list.filter(function (x) { return x.id === id; })[0], db = SUB.db;
        SUB.settings("rewards", true).then(function (rw) {
            var b = db.batch(), pts = SUB.num(rw.review);
            var upd = { status: ok ? "approved" : "rejected", moderatedAt: SUB.now(), moderatedBy: A.me.name };
            if (ok && !r.pointsAwarded && r.uid && pts > 0) {
                upd.pointsAwarded = true;
                b.update(db.collection("users").doc(r.uid), { points: SUB.FV.increment(pts) });
                b.set(db.collection("rewardLog").doc(), { uid: r.uid, points: pts, reason: "Product Review", note: "Review " + id, createdAt: SUB.now() });
            }
            b.update(db.collection("reviews").doc(id), upd);
            return b.commit();
        }).then(function () { A.toast(ok ? "Review approved" : "Review rejected"); A.refreshBadges(); return load(); }).catch(A.err);
    };
    window.delReview = function (id) { A.confirmDo("Delete this review?", function () { return SUB.db.collection("reviews").doc(id).delete().then(function () { A.toast("Deleted"); return load(); }); }); };
});
