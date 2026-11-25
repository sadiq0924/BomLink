/* ===================== DEFAULT SETTINGS =====================
   Firebase set ho jaane ke baad ye sab ADMIN PANEL se badlo.
   Firebase na ho to site yahi values use karti hai. */
var CONFIG = {
  MAIN_LINK: "https://t.me/your_channel",
  WAIT_SECONDS: 30,
  FINAL_WAIT: 5,
  SITE_NAME_1: "Bom",
  SITE_NAME_2: "Link",
  PROMO_TITLE: "Hamara Telegram channel join karo",
  PROMO_TEXT: "Daily gaming tips, updates aur naye posts sabse pehle.",
  PROMO_LINK: "https://t.me/your_channel",
  PROMO_BUTTON: "Join Now",
  NEWS: {
    1: { title: "Free Fire ki taaza khabar", q: "Free Fire MAX" },
    2: { title: "Online earning news", q: "online earning OR freelancing OR YouTube monetization India" },
    3: { title: "Aaj ke Free Fire redeem codes & updates", q: "Free Fire MAX redeem codes today" },
    4: { title: "Trending gaming news", q: "BGMI OR Free Fire OR mobile gaming India" }
  },
  NEWS_LANG: "hi",
  NEWS_COUNT: 6
};
/* ============================================================ */

{
  var PAGES = ["start.html", "step2.html", "step3.html", "go.html"];
  var step = Number(document.body.dataset.step || 0);    // 0 = normal page (timer nahi)
  var isFinal = step === 4;
  var now = new Date();
  var today = now.toLocaleDateString("en-CA");          // YYYY-MM-DD (visitor ka local din)
  var POST = (window.DEFAULT_POSTS || {})[String(step)] || {};
  var TIPS = POST.tips || [];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // Bina pichhla page poora kiye aage aaye to wapas bhejo
  // ---------- Page lock ----------
  // Page 2/3/Final sirf tab khulta hai jab theek pichhle page ka timer
  // abhi poora hua ho. URL badal kar aage-peeche jaane par Page 1 par wapas.
  var PASS_KEY = "bl_pass", PASS_TTL = 15 * 60 * 1000;   // 15 minute tak valid
  function getPass() { try { return JSON.parse(ss(PASS_KEY)) || {}; } catch (e) { return {}; } }
  function setPass(n) { ss(PASS_KEY, JSON.stringify({ s: n, t: Date.now() })); }
  ss("chain_test", "1");
  var redirecting = false;
  if (step > 1 && ss("chain_test") === "1") {
    var pass = getPass();
    var ok = (pass.s === step - 1 || pass.s === step * 10) && Date.now() - (pass.t || 0) < PASS_TTL;
    if (!ok) {
      redirecting = true;
      ss(PASS_KEY, "");
      location.replace(PAGES[0]);
    } else if (pass.s === step - 1) {
      ss(PASS_KEY, JSON.stringify({ s: step * 10, t: pass.t }));   // "is page par hai, timer chal raha" (refresh chalega)
    }
  }

  // ---------- Firebase ----------
  var db = null;
  try {
    var cfg = window.FB_CONFIG;
    if (window.firebase && cfg && cfg.apiKey && cfg.apiKey.indexOf("PASTE") < 0) {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.firestore();
    }
  } catch (e) { db = null; }

  function loadRemote(cb) {
    if (!db) return cb(null, null);
    var key = "bl_remote_" + step, c = null;
    try { c = JSON.parse(ls(key)); } catch (e) {}
    if (c && Date.now() - c.t < 120000) return cb(c.s, c.p);   // 2 min cache
    var done = false;
    function finish(s, p) { if (!done) { done = true; cb(s, p); } }
    setTimeout(function () { finish(c && c.s, c && c.p); }, 2500);
    var reqs = [db.collection("site").doc("settings").get()];
    if (step) reqs.push(db.collection("posts").doc(String(step)).get());
    Promise.all(reqs)
      .then(function (r) {
        var s = r[0].exists ? r[0].data() : null, p = r[1] && r[1].exists ? r[1].data() : null;
        ls(key, JSON.stringify({ t: Date.now(), s: s, p: p }));
        finish(s, p);
      })
      .catch(function () { finish(c && c.s, c && c.p); });
  }

  function applySettings(s) {
    var map = { mainLink: "MAIN_LINK", waitSeconds: "WAIT_SECONDS", finalWait: "FINAL_WAIT", siteName1: "SITE_NAME_1", siteName2: "SITE_NAME_2",
      promoTitle: "PROMO_TITLE", promoText: "PROMO_TEXT", promoLink: "PROMO_LINK", promoButton: "PROMO_BUTTON", newsLang: "NEWS_LANG", newsCount: "NEWS_COUNT" };
    Object.keys(map).forEach(function (k) { if (s[k] !== undefined && s[k] !== "") CONFIG[map[k]] = s[k]; });
    if (s.news) Object.keys(s.news).forEach(function (k) { if (s.news[k] && s.news[k].q) CONFIG.NEWS[k] = s.news[k]; });
    CONFIG.WAIT_SECONDS = Math.max(1, Number(CONFIG.WAIT_SECONDS) || 30);
    CONFIG.FINAL_WAIT = Math.max(1, Number(CONFIG.FINAL_WAIT) || 5);
  }

  function applyPost(p) {
    function set(id, v) { var el = document.getElementById(id); if (el && v !== undefined) el.textContent = v; }
    if (p.title) { set("p-title", p.title); document.title = p.title; }
    set("p-cat", p.cat);
    if (p.read !== undefined) set("p-read", p.read ? " · " + p.read : "");
    var img = document.getElementById("p-img");
    if (img && p.image !== undefined) {
      if (/^(https?:\/\/|img\/)/i.test(p.image)) { img.src = p.image; img.alt = p.title || ""; img.hidden = false; }
      else img.hidden = true;
    }
    if (p.body && window.renderMd) document.getElementById("p-body").innerHTML = window.renderMd(p.body);
    if (p.tips && p.tips.length) TIPS = p.tips;
  }

  // ---------- Visit counting ----------
  function count(fields) {
    if (!db) return;
    try {
      var inc = firebase.firestore.FieldValue.increment(1), d = {};
      fields.forEach(function (f) { d[f] = inc; });
      db.collection("stats").doc(today).set(d, { merge: true }).catch(function () {});
      db.collection("stats").doc("total").set(d, { merge: true }).catch(function () {});
    } catch (e) {}
  }

  var article = document.getElementById("post");
  if (db && article) article.style.visibility = "hidden";
  if (!redirecting) loadRemote(function (s, p) {
    try { if (s) applySettings(s); if (p) applyPost(p); } catch (e) {}
    if (article) article.style.visibility = "";
    start();
  });

  function start() {
    // naam
    var logoHtml = esc(CONFIG.SITE_NAME_1) + "<b>" + esc(CONFIG.SITE_NAME_2) + "</b>";
    document.querySelectorAll("[data-logo]").forEach(function (el) { el.innerHTML = logoHtml; });

    // promo
    document.querySelectorAll(".promo").forEach(function (el) {
      el.querySelector("strong").textContent = CONFIG.PROMO_TITLE;
      el.querySelector("span").textContent = CONFIG.PROMO_TEXT;
      var a = el.querySelector("a"); a.textContent = CONFIG.PROMO_BUTTON; a.href = safeUrl(CONFIG.PROMO_LINK);
    });

    // date
    var dateTxt = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    document.querySelectorAll("[data-today]").forEach(function (el) { el.textContent = dateTxt; });
    var y = document.getElementById("year"); if (y) y.textContent = now.getFullYear();
    document.querySelectorAll(".tglink").forEach(function (a) { a.href = safeUrl(CONFIG.PROMO_LINK); });

    // share
    var here = encodeURIComponent(location.href.split("#")[0]);
    var wa = document.querySelector(".share .wa"), tg = document.querySelector(".share .tg");
    if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(document.title + " ") + here;
    if (tg) tg.href = "https://t.me/share/url?url=" + here;

    // cookie notice
    var ck = document.getElementById("cookie");
    if (ck && ls("bl_cookie_ok") !== "1") {
      ck.hidden = false;
      document.getElementById("cookieOk").addEventListener("click", function () { ls("bl_cookie_ok", "1"); ck.hidden = true; });
    }

    contactForm();
    if (!step) return;                          // neeche ka sab sirf timer wale pages ke liye

    // aaj ka tip
    var dayNum = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5) + now.getFullYear() * 400;
    var tipBox = document.getElementById("tip");
    if (tipBox) { if (TIPS.length) tipBox.textContent = TIPS[dayNum % TIPS.length]; else tipBox.parentNode.hidden = true; }

    // visit gino (din me pehli baar = unique)
    var f = ["p" + step];
    if (ls("bl_seen_" + step) !== today) { f.push("u" + step); ls("bl_seen_" + step, today); }
    count(f);

    // timer
    var total = isFinal ? CONFIG.FINAL_WAIT : CONFIG.WAIT_SECONDS, left = total;
    var num = document.getElementById("num"), fill = document.getElementById("fill"), msg = document.getElementById("msg");
    var goBtns = document.querySelectorAll("[data-go]");
    goBtns.forEach(function (b) {
      b.hidden = true;
      if (isFinal) { b.target = "_blank"; b.rel = "noopener"; b.addEventListener("click", function () { count(["clicks"]); }); }
    });
    function paint() { num.textContent = left; fill.style.width = ((total - left) / total * 100) + "%"; }
    paint();
    var t = setInterval(function () {
      if (document.hidden) return;              // tab chhodne par timer rukta hai
      left--; paint();
      if (left <= 0) {
        clearInterval(t);
        if (isFinal) ss(PASS_KEY, ""); else setPass(step);   // ab sirf agla page khulega
        msg.textContent = isFinal ? "Aapka link ready hai, neeche button dabayein." : "Ho gaya! Neeche button dabayein.";
        var href = isFinal ? safeUrl(CONFIG.MAIN_LINK) : PAGES[step];
        goBtns.forEach(function (b) { b.href = href; b.hidden = false; });
      }
    }, 1000);

    loadNews();
  }

  // ---------- Contact form ----------
  function contactForm() {
    var f = document.getElementById("cform");
    if (!f) return;
    var st = document.getElementById("c-status"), btn = document.getElementById("c-send");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("c-name").value.trim();
      var email = document.getElementById("c-email").value.trim();
      var msg = document.getElementById("c-msg").value.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || msg.length < 5) {
        st.textContent = "Kripya naam, sahi email aur kam se kam 5 akshar ka message likhein."; return;
      }
      if (!db) { st.textContent = "Abhi message nahi bhej paaye. Kripya Telegram par sampark karein."; return; }
      btn.disabled = true; st.textContent = "Bhej rahe hain...";
      db.collection("messages").add({ name: name.slice(0, 80), email: email.slice(0, 120), msg: msg.slice(0, 2000), t: firebase.firestore.FieldValue.serverTimestamp() })
        .then(function () { f.reset(); st.textContent = "Shukriya! Aapka message mil gaya hai."; })
        .catch(function () { st.textContent = "Message nahi gaya. Thodi der baad dobara try karein."; })
        .then(function () { btn.disabled = false; });
    });
  }

  // ---------- LIVE NEWS ----------
  function ago(d) {
    var m = Math.round((Date.now() - d) / 6e4);
    if (!(m >= 0)) return "";
    if (m < 60) return m + " min pehle";
    if (m < 1440) return Math.round(m / 60) + " ghante pehle";
    return Math.round(m / 1440) + " din pehle";
  }
  function loadNews() {
    var box = document.getElementById("news"), n = CONFIG.NEWS[step];
    if (!box || !n || !n.q) return;
    box.querySelector("h3 .t").textContent = n.title;
    function render(items) {
      box.querySelector(".list").innerHTML = items.slice(0, Number(CONFIG.NEWS_COUNT) || 6).map(function (it) {
        var parts = String(it.title).split(" - "), src = parts.length > 1 ? parts.pop() : "";
        return '<a class="item" href="' + esc(safeUrl(it.link)) + '" target="_blank" rel="noopener nofollow"><b>' + esc(parts.join(" - ")) +
          "</b><small>" + esc(src) + (src ? " · " : "") + esc(ago(new Date(it.date))) + "</small></a>";
      }).join("");
      box.hidden = false;
    }
    function fromXml(txt) {
      var doc = new DOMParser().parseFromString(txt, "text/xml");
      return Array.prototype.map.call(doc.querySelectorAll("item"), function (x) {
        return { title: x.querySelector("title").textContent, link: x.querySelector("link").textContent, date: (x.querySelector("pubDate") || {}).textContent };
      });
    }
    var hl = CONFIG.NEWS_LANG === "en" ? "hl=en-IN&gl=IN&ceid=IN:en" : "hl=hi&gl=IN&ceid=IN:hi";
    var rss = "https://news.google.com/rss/search?q=" + encodeURIComponent(n.q + " when:7d") + "&" + hl;
    var key = "bl_news_" + step + "_" + CONFIG.NEWS_LANG + "_" + n.q, cached = null;
    try { cached = JSON.parse(ls(key)); } catch (e) {}
    if (cached && Date.now() - cached.t < 36e5 && cached.items.length) return render(cached.items);
    fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rss))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status !== "ok" || !j.items.length) throw 0;
        return j.items.map(function (i) { return { title: i.title, link: i.link, date: i.pubDate.replace(" ", "T") + "Z" }; });
      })
      .catch(function () { return fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(rss)).then(function (r) { return r.text(); }).then(fromXml); })
      .then(function (items) {
        if (!items || !items.length) throw 0;
        ls(key, JSON.stringify({ t: Date.now(), items: items.slice(0, 12) }));
        render(items);
      })
      .catch(function () { if (cached && cached.items.length) render(cached.items); });
  }
}
