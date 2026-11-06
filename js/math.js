// Обчислювальна частина: поліном Лагранжа та МНК через QR-розклад Хаусхолдера.
const M = {
  // Інтерполяційний поліном Лагранжа (формула 4.3): p(x) = Σ yk·Lk(x)
  lagrange(xs, ys) {
    return (x) => {
      let s = 0;
      for (let k = 0; k < xs.length; k++) {
        let L = 1;
        for (let j = 0; j < xs.length; j++)
          if (j !== k) L *= (x - xs[j]) / (xs[k] - xs[j]);
        s += ys[k] * L;
      }
      return s;
    };
  },

  // Розв'язок min‖A·c − y‖₂ через QR (відображення Хаусхолдера), без нормальних рівнянь.
  lstsq(A, y) {
    const m = A.length,
      n = A[0].length;
    const R = A.map((r) => r.slice()),
      b = y.slice();
    for (let k = 0; k < n; k++) {
      let norm = 0;
      for (let i = k; i < m; i++) norm += R[i][k] ** 2;
      norm = Math.sqrt(norm);
      if (norm === 0) continue;
      const alpha = R[k][k] > 0 ? -norm : norm;
      const v = [];
      for (let i = k; i < m; i++) v.push(R[i][k]);
      v[0] -= alpha;
      const vv = v.reduce((s, a) => s + a * a, 0);
      if (vv === 0) continue;
      for (let j = k; j < n; j++) {
        let d = 0;
        for (let i = k; i < m; i++) d += v[i - k] * R[i][j];
        d = (2 * d) / vv;
        for (let i = k; i < m; i++) R[i][j] -= d * v[i - k];
      }
      let d = 0;
      for (let i = k; i < m; i++) d += v[i - k] * b[i];
      d = (2 * d) / vv;
      for (let i = k; i < m; i++) b[i] -= d * v[i - k];
    }
    const c = new Array(n).fill(0); // зворотна підстановка R·c = Qᵀy
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= R[i][j] * c[j];
      c[i] = s / R[i][i];
    }
    return c;
  },

  // Поліноміальна модель степеня deg. x нормалізується до t ∈ [−1; 1] для стійкості.
  polyFit(xs, ys, deg) {
    const lo = Math.min(...xs),
      hi = Math.max(...xs),
      mid = (lo + hi) / 2,
      half = (hi - lo) / 2 || 1;
    const t = (x) => (x - mid) / half;
    const A = xs.map((x) =>
      Array.from({ length: deg + 1 }, (_, j) => t(x) ** j),
    ); // дизайн-матриця
    const c = M.lstsq(A, ys);
    const evalAt = (x, cc = c) => {
      let s = 0;
      const u = t(x);
      for (let j = cc.length - 1; j >= 0; j--) s = s * u + cc[j];
      return s;
    };
    return { c, eval: evalAt };
  },
};
if (typeof module !== "undefined") module.exports = M;
