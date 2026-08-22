function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMd(s: string) {
  let out = escapeHtml(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/`(.+?)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function compileMarkdownToHtml(src: string): string {
  const text = String(src ?? "");
  if (!text.trim()) return "";
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listTag: "ul" | "ol" | "" = "";
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    const raw = para.join("\n").trim();
    if (!raw) {
      para = [];
      return;
    }
    const html = raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${inlineMd(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
    out.push(html);
    para = [];
  };
  const flushList = () => {
    if (!listTag) return;
    out.push(`</${listTag}>`);
    listTag = "";
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushPara();
        flushList();
        inCode = true;
        codeBuf = [];
      } else {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        inCode = false;
        codeBuf = [];
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const mH = line.match(/^(#{1,3})\s+(.*)$/);
    if (mH) {
      flushPara();
      flushList();
      const level = mH[1].length;
      out.push(`<h${level}>${inlineMd(mH[2].trim())}</h${level}>`);
      continue;
    }
    const mBq = line.match(/^>\s?(.*)$/);
    if (mBq) {
      flushPara();
      flushList();
      out.push(`<blockquote>${inlineMd(mBq[1])}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      if (listTag !== "ul") {
        flushList();
        out.push("<ul>");
        listTag = "ul";
      }
      out.push(`<li>${inlineMd(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      if (listTag !== "ol") {
        flushList();
        out.push("<ol>");
        listTag = "ol";
      }
      out.push(`<li>${inlineMd(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();
  if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  return out.join("\n");
}
