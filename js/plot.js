// Малювання на canvas: адаптивність (DPR), осі, сітка, підписи, легенда.
const Plot = {
  fmt: (v) => String(+v.toFixed(3)),
  ticks(a, b, n) {
    const raw = (b - a) / n,
      p = 10 ** Math.floor(Math.log10(raw)),
      f = raw / p;
    const s = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p,
      t = [];
    for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) t.push(v);
    return t;
  },
  frame(cv, xr, yr, o) {
    const dpr = window.devicePixelRatio || 1,
      w = cv.clientWidth,
      h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = { l: 58, r: 16, t: 14, b: 42 };
    const X = (x) => m.l + ((x - xr[0]) / (xr[1] - xr[0])) * (w - m.l - m.r);
    const Y = (y) =>
      h - m.b - ((y - yr[0]) / (yr[1] - yr[0])) * (h - m.t - m.b);
    g.clearRect(0, 0, w, h);
    g.font = "12px system-ui,sans-serif";
    g.lineWidth = 1;
    g.strokeStyle = "#e3e7ec";
    g.fillStyle = "#5b6573";
    g.textAlign = "center";
    g.textBaseline = "top";
    for (const x of this.ticks(xr[0], xr[1], Math.max(3, w / 80))) {
      g.beginPath();
      g.moveTo(X(x), m.t);
      g.lineTo(X(x), h - m.b);
      g.stroke();
      g.fillText(this.fmt(x), X(x), h - m.b + 6);
    }
    g.textAlign = "right";
    g.textBaseline = "middle";
    for (const y of this.ticks(yr[0], yr[1], Math.max(3, h / 60))) {
      g.beginPath();
      g.moveTo(m.l, Y(y));
      g.lineTo(w - m.r, Y(y));
      g.stroke();
      g.fillText(this.fmt(y), m.l - 8, Y(y));
    }
    g.strokeStyle = "#1c2733";
    g.beginPath();
    g.moveTo(m.l, m.t);
    g.lineTo(m.l, h - m.b);
    g.lineTo(w - m.r, h - m.b);
    g.stroke();
    g.fillStyle = "#1c2733";
    g.textAlign = "center";
    g.textBaseline = "bottom";
    g.fillText(o.xl, (m.l + w - m.r) / 2, h - 4);
    g.save();
    g.translate(14, (m.t + h - m.b) / 2);
    g.rotate(-Math.PI / 2);
    g.textBaseline = "top";
    g.fillText(o.yl, 0, -6);
    g.restore();
    const ctx = { g, X, Y, w, h, m, xr, yr };
    ctx.clip = () => {
      g.save();
      g.beginPath();
      g.rect(m.l, m.t, w - m.l - m.r, h - m.t - m.b);
      g.clip();
    };
    ctx.legend = (items) => {
      g.font = "13px system-ui,sans-serif";
      g.textAlign = "left";
      g.textBaseline = "middle";
      const lw = Math.max(...items.map((i) => g.measureText(i.t).width)) + 44,
        lh = items.length * 20 + 8,
        x0 = w - m.r - lw - 8,
        y0 = m.t + 8;
      g.fillStyle = "rgba(255,255,255,.92)";
      g.strokeStyle = "#d5dbe3";
      g.fillRect(x0, y0, lw, lh);
      g.strokeRect(x0, y0, lw, lh);
      items.forEach((it, i) => {
        const y = y0 + 14 + i * 20;
        g.strokeStyle = g.fillStyle = it.c;
        g.lineWidth = 2.5;
        g.setLineDash(it.dash || []);
        if (it.dot) {
          g.beginPath();
          g.arc(x0 + 16, y, 4.5, 0, 7);
          g.fill();
        } else {
          g.beginPath();
          g.moveTo(x0 + 6, y);
          g.lineTo(x0 + 26, y);
          g.stroke();
        }
        g.setLineDash([]);
        g.lineWidth = 1;
        g.fillStyle = "#1c2733";
        g.fillText(it.t, x0 + 34, y);
      });
    };
    return ctx;
  },
  line(c, xs, ys, color, wd) {
    const g = c.g;
    g.strokeStyle = color;
    g.lineWidth = wd;
    g.lineJoin = "round";
    g.beginPath();
    let pen = false;
    xs.forEach((x, i) => {
      if (!isFinite(ys[i])) {
        pen = false;
        return;
      }
      pen ? g.lineTo(c.X(x), c.Y(ys[i])) : g.moveTo(c.X(x), c.Y(ys[i]));
      pen = true;
    });
    g.stroke();
    g.lineWidth = 1;
  },
};
