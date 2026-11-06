// Інтерфейс, стан, анімація.
const $ = (s) => document.querySelector(s);
const COL = {
  interp: "#1f5fbf",
  lsq: "#d9480f",
  pt: "#1c2733",
  act: "#c2255c",
  res: "#2b8a3e",
};
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const f4 = (v) => (Math.abs(v) < 1e-9 ? "0" : String(+v.toPrecision(4)));

const S = {
  key: 5,
  pts: [],
  mode: "all",
  degSel: 3,
  extra: false,
  run: 0,
  hideL: false,
  shown: 0,
  active: -1,
  iPrev: [],
  iCur: [],
  iT: 1,
  lt: 1,
  hover: null,
  view: {},
  fn: {},
};

const xsOf = () => S.pts.map((p) => p[0]);
const ysOf = () => S.pts.map((p) => p[1]);
const interpYs = (k) =>
  S.grid.map(M.lagrange(xsOf().slice(0, k), ysOf().slice(0, k)));

// ---------- підготовка даних ----------
function recompute() {
  S.run++;
  const xs = xsOf(),
    ys = ysOf(),
    n = xs.length;
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    pad = S.extra ? 0.2 * (x1 - x0) : 0;
  S.xr = [x0 - pad, x1 + pad];
  S.grid = Array.from(
    { length: 301 },
    (_, i) => S.xr[0] + ((S.xr[1] - S.xr[0]) * i) / 300,
  );
  S.deg = Math.min(S.degSel, n - 1);
  S.fit = M.polyFit(xs, ys, S.deg);
  S.mean = ys.reduce((a, b) => a + b, 0) / n;
  S.iCur = S.iPrev = interpYs(n);
  Object.assign(S, {
    iT: 1,
    shown: n,
    active: -1,
    lt: 1,
    hideL: false,
    hover: null,
  });
  [...$("#deg").options].forEach((o) => {
    o.disabled = +o.value > n - 1;
  });
  status("");
  render();
  metrics();
}
function status(t) {
  $("#status").textContent = t || "\u00a0";
}

// ---------- відмальовування ----------
function render() {
  const xs = xsOf(),
    ys = ysOf(),
    n = xs.length;
  const showI = S.mode !== "lsq",
    showL = S.mode !== "interp" && !S.hideL;
  let iy = null,
    ly = null,
    cf = null;
  if (showI) {
    const e = ease(S.iT);
    iy = S.grid.map((_, i) => S.iPrev[i] + (S.iCur[i] - S.iPrev[i]) * e);
  }
  if (showL) {
    const e = ease(S.lt); // коефіцієнти ростуть від y = ȳ до остаточних
    cf = S.fit.c.map((c, j) => {
      const c0 = j ? 0 : S.mean;
      return c0 + (c - c0) * e;
    });
    ly = S.grid.map((x) => S.fit.eval(x, cf));
  }
  // автомасштаб осі Y: min/max даних і кривих; викиди Лагранжа обмежені ±1.5 розмаху даних
  const dmin = Math.min(...ys),
    dmax = Math.max(...ys),
    lim = 1.5 * (dmax - dmin || 1);
  let lo = dmin,
    hi = dmax;
  for (const v of iy || [])
    if (isFinite(v)) {
      lo = Math.min(lo, Math.max(v, dmin - lim));
      hi = Math.max(hi, Math.min(v, dmax + lim));
    }
  for (const v of ly || [])
    if (isFinite(v)) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  const pd = 0.08 * (hi - lo || 1),
    yr = [lo - pd, hi + pd];

  const k = Math.max(1, S.shown),
    pI = M.lagrange(xs.slice(0, k), ys.slice(0, k));
  S.fn = { pI: showI ? pI : null, pL: showL ? (x) => S.fit.eval(x, cf) : null };
  const yhat = xs.map((x) => (showL ? S.fit.eval(x, cf) : null));

  const c = Plot.frame($("#main"), S.xr, yr, { xl: "x", yl: "y" });
  S.view.main = c;
  c.clip();
  if (iy) Plot.line(c, S.grid, iy, COL.interp, 2.5);
  if (ly) Plot.line(c, S.grid, ly, COL.lsq, 2.5);
  if (showL && S.lt > 0) {
    c.g.strokeStyle = COL.res;
    c.g.lineWidth = 2;
    c.g.setLineDash([4, 3]);
    xs.forEach((x, i) => {
      c.g.beginPath();
      c.g.moveTo(c.X(x), c.Y(ys[i]));
      c.g.lineTo(c.X(x), c.Y(yhat[i]));
      c.g.stroke();
    });
    c.g.setLineDash([]);
  }
  xs.forEach((x, i) => {
    const on = i < S.shown,
      act = i === S.active,
      hov = i === S.hover;
    c.g.beginPath();
    c.g.arc(c.X(x), c.Y(ys[i]), act ? 9 : hov ? 7 : 5, 0, 7);
    c.g.fillStyle = act ? COL.act : on ? COL.pt : "#fff";
    c.g.fill();
    c.g.strokeStyle = act ? COL.act : COL.pt;
    c.g.lineWidth = 1.5;
    c.g.stroke();
  });
  c.g.restore();
  const lg = [{ c: COL.pt, t: `Точки (n = ${n})`, dot: true }];
  if (showI)
    lg.push({ c: COL.interp, t: `Лагранж (вузлів: ${Math.max(1, S.shown)})` });
  if (showL)
    lg.push(
      { c: COL.lsq, t: `МНК, m = ${S.deg}` },
      { c: COL.res, t: "Залишки", dash: [4, 3] },
    );
  c.legend(lg);

  // діаграма залишків
  const r = xs.map((_, i) => (showL ? ys[i] - yhat[i] : 0));
  const rm = Math.max(0.1, ...r.map(Math.abs)) * 1.25;
  const d = Plot.frame($("#res"), S.xr, [-rm, rm], { xl: "x", yl: "rᵢ" });
  S.view.res = d;
  S.view.r = r;
  d.clip();
  d.g.strokeStyle = COL.pt;
  d.g.lineWidth = 1.5;
  d.g.beginPath();
  d.g.moveTo(d.m.l, d.Y(0));
  d.g.lineTo(d.w - d.m.r, d.Y(0));
  d.g.stroke();
  xs.forEach((x, i) => {
    d.g.strokeStyle = d.g.fillStyle = COL.res;
    d.g.lineWidth = 4;
    d.g.beginPath();
    d.g.moveTo(d.X(x), d.Y(0));
    d.g.lineTo(d.X(x), d.Y(r[i]));
    d.g.stroke();
    d.g.beginPath();
    d.g.arc(d.X(x), d.Y(r[i]), 5, 0, 7);
    d.g.fill();
  });
  d.g.restore();
  d.g.fillStyle = COL.pt;
  d.g.font = "12px system-ui,sans-serif";
  d.g.textAlign = "left";
  d.g.textBaseline = "bottom";
  d.g.fillText(
    showL
      ? "нульова лінія rᵢ = 0"
      : "інтерполяція проходить через вузли: rᵢ = 0",
    d.m.l + 6,
    d.Y(0) - 4,
  );
}

// ---------- анімація ----------
function tween(ms, fn, id) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function step(now) {
      if (id !== S.run) return res(false);
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      render();
      t < 1 ? requestAnimationFrame(step) : res(true);
    })(t0);
  });
}
async function play() {
  recompute();
  const id = S.run,
    n = S.pts.length,
    doI = S.mode !== "lsq",
    doL = S.mode !== "interp",
    q = reduced ? 0.15 : 1;
  const xs = xsOf(),
    ys = ysOf();
  if (doI) {
    S.shown = 0;
    S.hideL = doL;
    S.lt = 0;
    render();
    let prev = null;
    for (let k = 1; k <= n; k++) {
      S.shown = k;
      S.active = k - 1;
      const cur = interpYs(k);
      S.iPrev = prev || cur;
      S.iCur = cur;
      prev = cur;
      status(
        `Інтерполяція: крок ${k} з ${n} — додано вузол (${xs[k - 1]}; ${ys[k - 1]}), степінь полінома ${k - 1}`,
      );
      if (!(await tween((n > 10 ? 280 : 550) * q, (t) => (S.iT = t), id)))
        return;
      if (!(await tween(150 * q, () => 0, id))) return;
    }
    S.active = -1;
    S.hideL = false;
  }
  if (doL) {
    S.shown = n;
    S.lt = 0;
    S.hideL = false;
    status(
      `МНК: поліном росте від горизонтальної лінії y = ${f4(S.mean)} до степеня m = ${S.deg}, відображаються залишки`,
    );
    if (!(await tween(1800 * q, (t) => (S.lt = t), id))) return;
  }
  status("Готово. Наведіть курсор на точку, щоб побачити значення та похибку.");
}

// ---------- підказки при наведенні ----------
function hover(cv, tipEl, kind) {
  cv.addEventListener("pointermove", (e) => {
    const b = cv.getBoundingClientRect(),
      mx = e.clientX - b.left,
      my = e.clientY - b.top,
      c = S.view[kind],
      xs = xsOf(),
      ys = ysOf();
    let best = -1,
      bd = 1e9;
    xs.forEach((x, i) => {
      const dd =
        kind === "main"
          ? Math.hypot(c.X(x) - mx, c.Y(ys[i]) - my)
          : Math.abs(c.X(x) - mx);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    let html = "";
    if (bd < 14) {
      S.hover = best;
      html = `<b>Вузол ${best + 1}</b>: x = ${xs[best]}, y = ${ys[best]}`;
      if (S.fn.pL)
        html += `<br>МНК: ŷ = ${f4(S.fn.pL(xs[best]))}, r = ${f4(S.view.r[best])}`;
      if (S.fn.pI && best < S.shown)
        html += `<br>Лагранж: похибка у вузлі = ${f4(Math.abs(S.fn.pI(xs[best]) - ys[best]))}`;
    } else {
      S.hover = null;
      const x =
        S.xr[0] + ((mx - c.m.l) / (c.w - c.m.l - c.m.r)) * (S.xr[1] - S.xr[0]);
      if (kind === "main" && mx > c.m.l && mx < c.w - c.m.r) {
        html = `x = ${f4(x)}`;
        if (S.fn.pI) html += `<br>Лагранж: ${f4(S.fn.pI(x))}`;
        if (S.fn.pL) html += `<br>МНК: ${f4(S.fn.pL(x))}`;
      }
    }
    if (kind === "res" && S.hover !== null)
      html = `<b>Вузол ${best + 1}</b>: x = ${xs[best]}, r = ${f4(S.view.r[best])}`;
    tipEl.hidden = !html;
    tipEl.innerHTML = html;
    tipEl.style.left =
      (mx > c.w - 220 ? mx - tipEl.offsetWidth - 12 : mx + 14) + "px";
    tipEl.style.top = Math.max(4, my - 8) + "px";
    if (kind === "main") render();
  });
  cv.addEventListener("pointerleave", () => {
    S.hover = null;
    tipEl.hidden = true;
    render();
  });
}

// ---------- метрики ----------
function metrics() {
  const rows = [];
  for (const key of Object.keys(DATASETS)) {
    const P = DATASETS[key].pts,
      xs = P.map((p) => p[0]),
      ys = P.map((p) => p[1]),
      n = P.length;
    const ym = ys.reduce((a, b) => a + b, 0) / n,
      sst = ys.reduce((s, y) => s + (y - ym) ** 2, 0) || 1;
    const fit = M.polyFit(xs, ys, Math.min(S.degSel, n - 1));
    const methods = [
      ["Лагранж", M.lagrange(xs, ys)],
      [`МНК (m=${fit.c.length - 1})`, (x) => fit.eval(x)],
    ];
    for (const [name, f] of methods) {
      const r = xs.map((x, i) => ys[i] - f(x)),
        sse = r.reduce((s, v) => s + v * v, 0);
      let mn = 1e9,
        mx = -1e9;
      for (let i = 0; i <= 400; i++) {
        const v = f(xs[0] + ((xs[n - 1] - xs[0]) * i) / 400);
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
      const ov = Math.max(0, mx - Math.max(...ys), Math.min(...ys) - mn);
      rows.push(
        `<tr class="${key == S.key ? "cur" : ""}"><td>${key === "custom" ? "Свої точки" : n + " точок"}</td><td>${name}</td><td>${f4(sse)}</td>` +
          `<td>${f4(Math.sqrt(sse / n))}</td><td>${f4(Math.max(...r.map(Math.abs)))}</td><td>${f4(1 - sse / sst)}</td><td>${f4(ov)}</td></tr>`,
      );
    }
  }
  $("#metrics").innerHTML =
    "<tr><th>Набір</th><th>Метод</th><th>SSE</th><th>RMSE</th><th>max|r|</th><th>R²</th><th>Вихід кривої за діапазон y</th></tr>" +
    rows.join("");
}

// ---------- керування ----------
function setPressed(sel, attr, val) {
  document
    .querySelectorAll(sel + " button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset[attr] == val)),
    );
}
function setData(key) {
  S.key = key;
  S.pts = DATASETS[key].pts.map((p) => p.slice());
  $("#custom").value = S.pts.map((p) => p.join(" ")).join("\n");
  setPressed("#sets", "n", key);
  recompute();
}
$("#sets").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) setData(+b.dataset.n);
};
$("#modes").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) {
    S.mode = b.dataset.mode;
    setPressed("#modes", "mode", S.mode);
    recompute();
  }
};
$("#deg").onchange = (e) => {
  S.degSel = +e.target.value;
  recompute();
};
$("#extra").onchange = (e) => {
  S.extra = e.target.checked;
  recompute();
};
$("#play").onclick = play;
$("#reset").onclick = recompute;
$("#apply").onclick = () => {
  const rows = $("#custom")
    .value.trim()
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/,/g, ".")
        .trim()
        .split(/[\s;]+/)
        .map(Number),
    );
  const bad =
    rows.length < 3 ||
    rows.length > 60 ||
    rows.some((r) => r.length !== 2 || r.some((v) => !isFinite(v)));
  if (bad)
    return ($("#err").textContent =
      "Потрібно від 3 до 60 рядків у форматі «x y».");
  rows.sort((a, b) => a[0] - b[0]);
  if (rows.some((r, i) => i && r[0] === rows[i - 1][0]))
    return ($("#err").textContent = "Значення x мають бути різними.");
  $("#err").textContent = "";
  DATASETS.custom = { pts: rows };
  S.key = "custom";
  S.pts = rows;
  setPressed("#sets", "n", null);
  recompute();
};
$("#tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document
    .querySelectorAll("#tabs button")
    .forEach((t) => t.setAttribute("aria-selected", String(t === b)));
  $("#panel-charts").hidden = b.dataset.tab !== "charts";
  $("#panel-data").hidden = b.dataset.tab !== "data";
  if (b.dataset.tab === "charts") render(); // полотно в прихованій вкладці має нульовий розмір
};
hover($("#main"), $("#tip"), "main");
hover($("#res"), $("#tip2"), "res");
new ResizeObserver(() => render()).observe($("#main"));
setPressed("#modes", "mode", S.mode);
setData(5);
