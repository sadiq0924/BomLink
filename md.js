/* Simple post format -> HTML (site aur admin dono yahi use karte hain)
   ## Heading        -> bada heading
   - point          -> list
   > text           -> blue tip box
   **text**         -> bold
   [naam](https://link) -> link
   Khaali line      -> naya paragraph */
window.renderMd = function (text) {
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>');
  }
  var out = [];
  String(text || "").replace(/\r/g, "").split(/\n\s*\n/).forEach(function (block) {
    var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return;
    if (/^## /.test(lines[0])) {
      out.push("<h2>" + inline(lines.shift().slice(3)) + "</h2>");
      if (!lines.length) return;
    }
    if (lines.every(function (l) { return /^- /.test(l); })) {
      out.push("<ul>" + lines.map(function (l) { return "<li>" + inline(l.slice(2)) + "</li>"; }).join("") + "</ul>");
    } else if (/^> /.test(lines[0])) {
      out.push('<p class="tip">' + inline(lines.map(function (l) { return l.replace(/^> ?/, ""); }).join(" ")) + "</p>");
    } else {
      out.push("<p>" + inline(lines.join(" ")) + "</p>");
    }
  });
  return out.join("\n");
};
