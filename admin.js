/* BomLink admin panel */
{
  var DEF_SET = {
    mainLink: "https://t.me/your_channel", waitSeconds: 30, finalWait: 5, siteName1: "Bom", siteName2: "Link",
    promoTitle: "Hamara Telegram channel join karo", promoText: "Daily gaming tips, updates aur naye posts sabse pehle.",
    promoLink: "https://t.me/your_channel", promoButton: "Join Now", newsLang: "hi", newsCount: 6,
    news: {
      1: { title: "Free Fire ki taaza khabar", q: "Free Fire MAX" },
      2: { title: "Online earning news", q: "online earning OR freelancing OR YouTube monetization India" },
      3: { title: "Aaj ke Free Fire redeem codes & updates", q: "Free Fire MAX redeem codes today" },
      4: { title: "Trending gaming news", q: "BGMI OR Free Fire OR mobile gaming India" }
    }
  };
  var PAGE_NAMES = { 1: "Page 1", 2: "Page 2", 3: "Page 3", 4: "Final page" };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t) {
    var el = document.createElement("div"); el.className = "toast"; el.textContent = t;
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600);
  }
  function show(id) { ["noConfig", "login", "app"].forEach(function (x) { $(x).classList.toggle("hide", x !== id); }); }

  var cfg = window.FB_CONFIG, db, auth;
  if (!window.firebase || !cfg || !cfg.apiKey || cfg.apiKey.indexOf("PASTE") >= 0) {
    show("noConfig");
  } else {
    firebase.initializeApp(cfg);
    db = firebase.firestore(); auth = firebase.auth();
    auth.onAuthStateChanged(function (u) { if (u) { show("app"); loadDash(); } else show("login"); });
  }

  // ---------- login ----------
  function toEmail(u) { return u.trim().toLowerCase(); }
  $("login").addEventListener("submit", function (e) {
    e.preventDefault();
    $("lerr").textContent = ""; $("lbtn").disabled = true;
    auth.signInWithEmailAndPassword(toEmail($("em").value), $("pw").value).catch(function (err) {
      var c = err && err.code || "";
      $("lerr").textContent = /invalid|wrong|not-found|credential/.test(c) ? "Email ya password galat hai." :
        /too-many/.test(c) ? "Bahut baar galat try hua. Thodi der baad try karo." : "Login nahi ho paya: " + c;
    }).then(function () { $("lbtn").disabled = false; });
  });
  $("logout").addEventListener("click", function () { auth.signOut(); });

  // ---------- tabs ----------
  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      ["dash", "posts", "settings", "msgs"].forEach(function (s) { $(s).classList.toggle("hide", s !== t); });
      if (t === "dash") loadDash();
      if (t === "posts" && !postLoaded) loadPost(curPage);
      if (t === "settings") loadSettings();
      if (t === "msgs") loadMsgs();
    });
  });

  function permErr(err) {
    return err && /permission/.test(err.code || "") ? "Permission nahi mili. Firestore rules me apna admin email check karo." : "Error: " + (err && err.message || err);
  }

  // ---------- DASHBOARD ----------
  var statsDays = {}, statsTotal = {}, funnelMode = "today";
  function dayKey(d) { return d.toLocaleDateString("en-CA"); }
  function n(o, k) { return Number(o && o[k]) || 0; }
  function loadDash() {
    $("dashNote").textContent = "Visits load ho rahe hain...";
    db.collection("stats").orderBy(firebase.firestore.FieldPath.documentId(), "desc").limit(40).get().then(function (snap) {
      statsDays = {}; statsTotal = {};
      snap.forEach(function (d) { if (d.id === "total") statsTotal = d.data(); else if (/^\d{4}-\d\d-\d\d$/.test(d.id)) statsDays[d.id] = d.data(); });
      $("dashNote").textContent = "Last update: " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      drawDash();
    }).catch(function (e) { $("dashNote").textContent = permErr(e); });
  }
  $("refresh").addEventListener("click", loadDash);

  function drawDash() {
    var t = statsDays[dayKey(new Date())] || {};
    var cards = [
      ["Aaj ke visits", n(t, "p1")], ["Aaj unique log", n(t, "u1")], ["Aaj link clicks", n(t, "clicks")],
      ["Total visits", n(statsTotal, "p1")], ["Total unique", n(statsTotal, "u1")], ["Total link clicks", n(statsTotal, "clicks")]
    ];
    $("cards").innerHTML = cards.map(function (c) { return '<div class="card"><span>' + c[0] + "</span><strong>" + c[1].toLocaleString("en-IN") + "</strong></div>"; }).join("");

    var days = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    var vals = days.map(function (d) { return n(statsDays[dayKey(d)], "p1"); });
    var max = Math.max.apply(null, vals.concat([1]));
    $("chart").innerHTML = vals.map(function (v) { return '<div class="col"><i style="height:' + (v / max * 100) + '%"><b>' + v + "</b></i></div>"; }).join("");
    $("chartLabels").innerHTML = days.map(function (d) { return "<span>" + d.getDate() + "/" + (d.getMonth() + 1) + "</span>"; }).join("");

    drawFunnel();

    $("days").innerHTML = days.slice().reverse().map(function (d) {
      var s = statsDays[dayKey(d)] || {};
      return "<tr><td>" + d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + "</td>" +
        ["p1", "u1", "p2", "p3", "p4", "clicks"].map(function (k) { return "<td>" + n(s, k) + "</td>"; }).join("") + "</tr>";
    }).join("");
  }
  function drawFunnel() {
    var s = funnelMode === "today" ? (statsDays[dayKey(new Date())] || {}) : statsTotal;
    var rows = [["Page 1", "u1"], ["Page 2", "u2"], ["Page 3", "u3"], ["Final page", "u4"], ["Link click", "clicks"]];
    var base = n(s, "u1") || 1;
    $("funnel").innerHTML = rows.map(function (r) {
      var v = n(s, r[1]), pct = Math.min(100, Math.round(v / base * 100));
      return '<div class="fr"><span>' + r[0] + '</span><div class="track"><i style="width:' + pct + '%"></i></div><span class="n">' + v + " (" + pct + "%)</span></div>";
    }).join("");
  }
  document.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () {
      funnelMode = b.dataset.f;
      document.querySelectorAll("[data-f]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      drawFunnel();
    });
  });

  // ---------- POSTS ----------
  var curPage = "1", postLoaded = false, dirty = false;
  var F = { cat: $("f-cat"), title: $("f-title"), read: $("f-read"), body: $("f-body"), tips: $("f-tips"), imgsel: $("f-imgsel"), img: $("f-img") };
  var BUILTIN = ["img/img-gaming.svg", "img/img-earning.svg", "img/img-tech.svg", "img/img-link.svg"];

  function fill(p) {
    F.cat.value = p.cat || ""; F.title.value = p.title || ""; F.read.value = p.read || "";
    F.body.value = p.body || ""; F.tips.value = (p.tips || []).join("\n");
    var im = p.image || "";
    if (BUILTIN.indexOf(im) >= 0) { F.imgsel.value = im; F.img.value = ""; }
    else if (im) { F.imgsel.value = "custom"; F.img.value = im; }
    else { F.imgsel.value = ""; F.img.value = ""; }
    $("customWrap").classList.toggle("hide", F.imgsel.value !== "custom");
    dirty = false; preview();
  }
  function collect() {
    var im = F.imgsel.value === "custom" ? F.img.value.trim() : F.imgsel.value;
    return {
      cat: F.cat.value.trim(), title: F.title.value.trim(), read: F.read.value.trim(), image: im, body: F.body.value,
      tips: F.tips.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      updated: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  function setStatus(saved) {
    var s = $("pstatus");
    s.className = "status " + (saved ? "saved" : "def");
    s.textContent = saved ? "Site par yahi dikh raha hai" : "Default content (abhi save nahi)";
  }
  function loadPost(p) {
    curPage = p; postLoaded = true;
    $("pstatus").className = "status"; $("pstatus").textContent = "Load ho raha hai...";
    db.collection("posts").doc(p).get().then(function (d) {
      if (d.exists) { fill(d.data()); setStatus(true); }
      else { fill(window.DEFAULT_POSTS[p] || {}); setStatus(false); }
    }).catch(function (e) { $("pstatus").textContent = permErr(e); });
  }
  function preview() {
    var im = F.imgsel.value === "custom" ? F.img.value.trim() : F.imgsel.value;
    var okImg = /^(https?:\/\/|img\/)/i.test(im);
    $("preview").innerHTML = '<p class="note">' + esc(F.cat.value) + (F.read.value ? " · " + esc(F.read.value) : "") + "</p><h1>" + esc(F.title.value) + "</h1>" +
      (okImg ? '<img src="' + esc(im) + '" alt="">' : "") + window.renderMd(F.body.value);
  }
  ["cat", "title", "read", "body", "tips", "img"].forEach(function (k) { F[k].addEventListener("input", function () { dirty = true; preview(); }); });
  F.imgsel.addEventListener("change", function () { $("customWrap").classList.toggle("hide", F.imgsel.value !== "custom"); dirty = true; preview(); });

  document.querySelectorAll("[data-p]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.p === curPage) return;
      if (dirty && !window.confirm("Is page ke badlav save nahi hue. Phir bhi doosra page kholna hai?")) return;
      document.querySelectorAll("[data-p]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      loadPost(b.dataset.p);
    });
  });

  $("savePost").addEventListener("click", function () {
    var data = collect();
    if (!data.title) return toast("Title khaali nahi ho sakta");
    if (F.imgsel.value === "custom" && !/^https?:\/\//i.test(data.image)) return toast("Image link https:// se shuru hona chahiye");
    $("savePost").disabled = true;
    db.collection("posts").doc(curPage).set(data).then(function () {
      dirty = false; setStatus(true); toast(PAGE_NAMES[curPage] + " save ho gaya ✓");
    }).catch(function (e) { toast(permErr(e)); }).then(function () { $("savePost").disabled = false; });
  });
  $("defPost").addEventListener("click", function () {
    if (!window.confirm("Default content form me aa jayega. Site par tabhi dikhega jab Save dabaoge. Theek hai?")) return;
    fill(window.DEFAULT_POSTS[curPage] || {}); dirty = true;
  });

  // editor toolbar
  document.querySelectorAll("[data-ins]").forEach(function (b) {
    b.addEventListener("click", function () {
      var ta = F.body, s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e), ins;
      var t = b.dataset.ins;
      if (t === "b") ins = "**" + (sel || "bold text") + "**";
      else if (t === "link") ins = "[" + (sel || "link ka naam") + "](https://)";
      else {
        var pre = { h2: "## ", li: "- ", tip: "> " }[t];
        var lines = (sel || { h2: "Naya heading", li: "Pehla point", tip: "Kaam ki baat yahan likho" }[t]).split("\n");
        ins = "\n\n" + lines.map(function (l) { return pre + l.replace(/^(## |- |> )/, ""); }).join("\n") + "\n\n";
      }
      ta.setRangeText(ins, s, e, "end"); ta.focus(); dirty = true; preview();
    });
  });

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- SETTINGS ----------
  var SKEYS = ["mainLink", "siteName1", "siteName2", "waitSeconds", "finalWait", "promoTitle", "promoText", "promoLink", "promoButton", "newsLang", "newsCount"];
  $("newsFields").innerHTML = [1, 2, 3, 4].map(function (i) {
    return '<div class="grid g2"><div><label for="nt' + i + '">' + PAGE_NAMES[i] + ' - news ka heading</label><input id="nt' + i + '"></div>' +
      '<div><label for="nq' + i + '">' + PAGE_NAMES[i] + ' - kya search kare</label><input id="nq' + i + '"></div></div>';
  }).join("");
  function loadSettings() {
    db.collection("site").doc("settings").get().then(function (d) {
      var s = Object.assign({}, DEF_SET, d.exists ? d.data() : {});
      SKEYS.forEach(function (k) { $("s-" + k).value = s[k]; });
      [1, 2, 3, 4].forEach(function (i) { var nn = (s.news && s.news[i]) || DEF_SET.news[i]; $("nt" + i).value = nn.title; $("nq" + i).value = nn.q; });
    }).catch(function (e) { toast(permErr(e)); });
  }
  $("saveSet").addEventListener("click", function () {
    var s = {};
    SKEYS.forEach(function (k) { s[k] = $("s-" + k).value.trim(); });
    ["waitSeconds", "finalWait", "newsCount"].forEach(function (k) { s[k] = Math.max(1, Math.min(300, parseInt(s[k], 10) || DEF_SET[k])); });
    if (!/^https?:\/\//i.test(s.mainLink)) return toast("Main link https:// se shuru hona chahiye");
    if (s.promoLink && !/^https?:\/\//i.test(s.promoLink)) return toast("Promo link https:// se shuru hona chahiye");
    s.news = {};
    [1, 2, 3, 4].forEach(function (i) { s.news[i] = { title: $("nt" + i).value.trim(), q: $("nq" + i).value.trim() }; });
    $("saveSet").disabled = true;
    db.collection("site").doc("settings").set(s).then(function () { toast("Settings save ho gayi ✓"); })
      .catch(function (e) { toast(permErr(e)); }).then(function () { $("saveSet").disabled = false; });
  });

  // ---------- MESSAGES ----------
  function loadMsgs() {
    $("msgList").innerHTML = '<p class="note">Load ho rahe hain...</p>';
    db.collection("messages").orderBy("t", "desc").limit(50).get().then(function (snap) {
      var rows = [];
      snap.forEach(function (d) { rows.push({ id: d.id, v: d.data() }); });
      if (!rows.length) { $("msgList").innerHTML = '<p class="note">Abhi koi message nahi aaya.</p>'; return; }
      $("msgList").innerHTML = rows.map(function (r) {
        var v = r.v, t = v.t && v.t.toDate ? v.t.toDate() : (v.t ? new Date(v.t) : null);
        return '<div class="msg"><div class="mh"><b>' + esc(v.name || "") + '</b><span class="note">' + esc(v.email || "") +
          (t ? " · " + esc(t.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) : "") +
          '</span><button class="del" type="button" data-del="' + esc(r.id) + '">Delete</button></div><p>' + esc(v.msg || "") + "</p></div>";
      }).join("");
    }).catch(function (e) { $("msgList").innerHTML = '<p class="note">' + esc(permErr(e)) + "</p>"; });
  }
  $("msgRefresh").addEventListener("click", loadMsgs);
  $("msgList").addEventListener("click", function (e) {
    var id = e.target && e.target.getAttribute("data-del");
    if (!id || !window.confirm("Ye message delete karna hai?")) return;
    db.collection("messages").doc(id).delete().then(function () { toast("Delete ho gaya"); loadMsgs(); }).catch(function (er) { toast(permErr(er)); });
  });
}
