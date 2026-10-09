// src/index.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2 } from "node:fs";
import { homedir } from "node:os";
import { join as join2 } from "node:path";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";

// ../mate/src/params.ts
var EMOTION_DECAY = {
  joy: 1 / (45 * 60000),
  trust: 1 / (180 * 60000),
  fear: 1 / (25 * 60000),
  surprise: 1 / (8 * 60000),
  sadness: 1 / (150 * 60000),
  disgust: 1 / (60 * 60000),
  anger: 1 / (35 * 60000),
  anticipation: 1 / (30 * 60000)
};
var EMOTION_PAD = {
  joy: [0.9, 0.45, 0.35],
  trust: [0.55, -0.1, 0.2],
  fear: [-0.85, 0.8, -0.6],
  surprise: [0.05, 0.75, -0.25],
  sadness: [-0.8, -0.35, -0.45],
  disgust: [-0.75, 0.25, 0.15],
  anger: [-0.7, 0.75, 0.55],
  anticipation: [0.3, 0.45, 0.2]
};
var DYADS = [
  { name: "love", a: "joy", b: "trust", min: 0.45 },
  { name: "submission", a: "trust", b: "fear", min: 0.45 },
  { name: "awe", a: "fear", b: "surprise", min: 0.45 },
  { name: "disapproval", a: "surprise", b: "sadness", min: 0.45 },
  { name: "remorse", a: "sadness", b: "disgust", min: 0.45 },
  { name: "contempt", a: "disgust", b: "anger", min: 0.45 },
  { name: "aggressiveness", a: "anger", b: "anticipation", min: 0.45 },
  { name: "optimism", a: "anticipation", b: "joy", min: 0.45 }
];
var MOOD = {
  alpha: 1 / (45 * 60000),
  beta: 1 / (90 * 60000),
  sigma: 0.00004
};
var OPPONENT = {
  ka: 0.35,
  kb: 1 / (75 * 60000),
  gain: 0.6
};
var DRIVE_RISE = {
  connection: 1 / (5 * 3600000),
  curiosity: 1 / (9 * 3600000),
  expression: 1 / (3 * 3600000),
  growth: 1 / (24 * 3600000),
  rest: 1 / (12 * 3600000)
};
var SPARK = {
  modulation: 0.15,
  damper: 0.8,
  etaConfirm: 0.05,
  etaViolate: 0.025,
  etaValence: 0.04,
  confidenceFloor: 0.05,
  centralityTau: 30,
  maxBeliefs: 40,
  decayTau: 30 * 86400000,
  evidenceDeadZone: 0.1,
  topicSeedConfidence: 0.2
};
var BOREDOM = {
  surpriseTau: 6 * 3600000,
  surpriseScale: 0.5,
  surpriseWeight: 0.6,
  topicWeight: 0.4,
  idleTau: 2 * 3600000
};
var DRIVE_FALL = 1 / (40 * 60000);
var AWARENESS_DECAY = {
  userPresence: 1 / (3 * 3600000),
  socialPressure: 1 / (8 * 3600000),
  thoughtSaturation: 1 / (6 * 3600000)
};
var CIRCADIAN = {
  sufficientMass: 30,
  decayPerContact: 0.995,
  centreWeight: 2,
  restFloor: 0.25,
  restCeiling: 0.9,
  priorDay: 0.75,
  priorNight: 0.35
};
var DECOHERENCE = 1 / (20 * 60000);
var HAMILTONIAN = {
  joy: 0.9,
  trust: 0.6,
  fear: -0.7,
  surprise: 0.3,
  sadness: -0.6,
  disgust: -0.4,
  anger: -0.5,
  anticipation: 0.4
};
var WHEEL_COUPLING = 0.4;
var HAMILTONIAN_INTENSITY = 1.6;
var KICK_ANGLE = Math.PI / 3;
var NUDGE_MAX = 0.005;
var EFFORT_W = {
  arousal: 0.4,
  comfort: -0.35,
  conscientiousness: 0.12,
  extraversion: 0.08,
  reflectiveness: 0.06,
  selfEfficacy: 0.04,
  bias: 0.28,
  noise: 0.06
};
var TOKEN_CEILING = {
  autopilot: 40,
  brief: 220,
  normal: 700,
  engaged: 2000
};
var INTENT_SCALE = {
  chat: 0.6,
  question: 1,
  task: 1.6
};
var ENERGY_W = { arousal: 0.5, extraversion: 0.2, pleasure: 0.15, attachment: 0.15, depth: 0.08 };
var BURST_W = { extraversion: 0.3, reflectiveness: 0.25, arousal: 0.2, trust: 0.15, directness: 0.1 };
var SLEEP_WINDOW = [1, 5];
var HEARTBEAT_MS = 60000;
var TEMPORAL_WARP = { anxiety: 1.5, tolerance: 0.4, pleasure: 0.3, neuroticism: 0.5 };
var TRUST_DROP_CAP = 0.12;
var CUSP = { dominanceMax: -0.35, arousalMin: 0.6 };
var MAX_OBSERVATIONS = 64;
var HABITUATION_TAU = 4 * 3600000;

// ../mate/src/rng.ts
function nextRandom(seed) {
  let z = seed + 2654435769 | 0;
  z = Math.imul(z ^ z >>> 16, 569420461);
  z = Math.imul(z ^ z >>> 15, 1935289751);
  z ^= z >>> 15;
  return { value: (z >>> 0) / 4294967296, seed: seed + 2654435769 | 0 };
}
function drawMany(seed, n) {
  const values = [];
  let s = seed;
  for (let i = 0;i < n; i++) {
    const r = nextRandom(s);
    values.push(r.value);
    s = r.seed;
  }
  return { values, seed: s };
}
function gaussian(u1, u2) {
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 0.000000000001)));
  return r * Math.cos(2 * Math.PI * u2);
}
function drawNormal(seed, sigma) {
  const { values, seed: s2 } = drawMany(seed, 2);
  return { value: gaussian(values[0], values[1]) * sigma, seed: s2 };
}
var clamp = (x, lo, hi) => x < lo ? lo : x > hi ? hi : x;
var clamp01 = (x) => clamp(x, 0, 1);
var clampPad = (x) => clamp(x, -1, 1);

// ../mate/src/types.ts
var EMOTIONS = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];

// ../mate/src/quantum.ts
var N = EMOTIONS.length;
function fromEmotions(emotions, seed) {
  const raw = EMOTIONS.map((e) => Math.max(emotions[e], 0.000001));
  const sum = raw.reduce((a, b) => a + b, 0);
  const rho = [];
  for (let i = 0;i < N; i++) {
    const row = [];
    for (let j = 0;j < N; j++) {
      if (i === j)
        row.push([raw[i] / sum, 0]);
      else
        row.push([0, 0]);
    }
    rho.push(row);
  }
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const p = Math.sqrt(raw[i] / sum * (raw[j] / sum));
      if (p < 0.0001)
        continue;
      const sign = (seed >>> i + j & 1) === 0 ? 1 : -1;
      const c = 0.35 * p * sign;
      rho[i][j] = [c, 0];
      rho[j][i] = [c, 0];
    }
  }
  return rho;
}
function identity() {
  const rho = [];
  for (let i = 0;i < N; i++) {
    const row = [];
    for (let j = 0;j < N; j++)
      row.push(i === j ? [1, 0] : [0, 0]);
    rho.push(row);
  }
  return rho;
}
function hermitise(rho) {
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const [re, im] = rho[i][j];
      rho[j][i] = [re, -im];
    }
  }
  return rho;
}
function trace(rho) {
  let t = 0;
  for (let i = 0;i < N; i++)
    t += rho[i][i][0];
  return t;
}
function normalise(rho) {
  const t = trace(rho);
  if (!Number.isFinite(t) || t <= 0)
    return rho;
  const k = 1 / t;
  for (let i = 0;i < N; i++) {
    rho[i][i][0] *= k;
    for (let j = 0;j < N; j++) {
      if (i !== j) {
        rho[i][j][0] *= k;
        rho[i][j][1] *= k;
      }
    }
  }
  return rho;
}
function clampCoherences(rho) {
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const bound = Math.sqrt(Math.max(rho[i][i][0], 0) * Math.max(rho[j][j][0], 0));
      const [re, im] = rho[i][j];
      const m = Math.hypot(re, im);
      if (m > bound && m > 0) {
        const k = bound / m;
        rho[i][j] = [re * k, im * k];
        rho[j][i] = [re * k, -im * k];
      }
    }
  }
  return rho;
}
function evolveUnitary(rho, dt, intensities, scale = 0.0001) {
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const ei = HAMILTONIAN[EMOTIONS[i]] * intensities[i];
      const ej = HAMILTONIAN[EMOTIONS[j]] * intensities[j];
      const theta = -(ei - ej) * dt * scale;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const [re, im] = rho[i][j];
      rho[i][j] = [re * c - im * s, re * s + im * c];
      rho[j][i] = [re * c - im * s, -(re * s + im * c)];
    }
  }
  return rho;
}
function wheelCoupling(i, j) {
  return Math.cos(2 * Math.PI * (i - j) / N);
}
function buildHamiltonian(activations, personalityO, trust) {
  const p = EMOTIONS.map((e) => clamp01(activations[e] ?? 0));
  const g = WHEEL_COUPLING * (1 + 0.5 * personalityO) * (1 + trust);
  const H = [];
  for (let i = 0;i < N; i++) {
    const row = new Array(N).fill(0);
    row[i] = HAMILTONIAN[EMOTIONS[i]] + HAMILTONIAN_INTENSITY * p[i];
    H.push(row);
  }
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const v = g * wheelCoupling(i, j) * Math.sqrt(p[i] * p[j]);
      H[i][j] = v;
      H[j][i] = v;
    }
  }
  return H;
}
function cmat(n) {
  const m = [];
  for (let i = 0;i < n; i++)
    m.push(Array.from({ length: n }, () => [0, 0]));
  return m;
}
function cmatMul(A, B) {
  const C = cmat(A.length);
  for (let i = 0;i < A.length; i++) {
    for (let k = 0;k < B.length; k++) {
      const aik = A[i][k];
      if (aik[0] === 0 && aik[1] === 0)
        continue;
      for (let j = 0;j < B.length; j++) {
        const bkj = B[k][j];
        C[i][j][0] += aik[0] * bkj[0] - aik[1] * bkj[1];
        C[i][j][1] += aik[0] * bkj[1] + aik[1] * bkj[0];
      }
    }
  }
  return C;
}
function cmatAddInPlace(A, B, s) {
  for (let i = 0;i < A.length; i++)
    for (let j = 0;j < A.length; j++) {
      A[i][j][0] += s * B[i][j][0];
      A[i][j][1] += s * B[i][j][1];
    }
}
function unitaryFromH(H, theta) {
  const n = H.length;
  let norm = 0;
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++)
      norm += H[i][j] * H[i][j];
  norm = theta * Math.sqrt(norm);
  const s = Math.max(0, Math.ceil(Math.log2(Math.max(norm, 0.000000000001) / 0.5)));
  const scale = 2 ** -s;
  const A = cmat(n);
  const c = -theta * scale;
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++)
      A[i][j][1] = c * H[i][j];
  const pow = [A];
  for (let k = 1;k < 6; k++)
    pow.push(cmatMul(pow[k - 1], A));
  const co = [1, 1 / 2, 5 / 44, 1 / 66, 1 / 792, 1 / 15840, 1 / 665280];
  const num = cmat(n);
  const den = cmat(n);
  for (let i = 0;i < n; i++) {
    num[i][i][0] += co[0];
    den[i][i][0] += co[0];
  }
  for (let k = 1;k <= 6; k++) {
    const sign = k % 2 === 0 ? 1 : -1;
    cmatAddInPlace(num, pow[k - 1], co[k]);
    cmatAddInPlace(den, pow[k - 1], sign * co[k]);
  }
  const denInv = cmatInv(den);
  let U = cmatMul(denInv, num);
  for (let i = 0;i < s; i++)
    U = cmatMul(U, U);
  return U;
}
function cmatInv(M) {
  const n = M.length;
  const a = [];
  for (let i = 0;i < n; i++) {
    const row = [];
    for (let j = 0;j < n; j++)
      row.push([M[i][j][0], M[i][j][1]]);
    for (let j = 0;j < n; j++)
      row.push(i === j ? [1, 0] : [0, 0]);
    a.push(row);
  }
  for (let col = 0;col < n; col++) {
    let piv = col;
    let best = mag(a[col][col]);
    for (let r = col + 1;r < n; r++) {
      const m = mag(a[r][col]);
      if (m > best) {
        best = m;
        piv = r;
      }
    }
    if (piv !== col) {
      const tmp = a[col];
      a[col] = a[piv];
      a[piv] = tmp;
    }
    const p = a[col][col];
    const d = p[0] * p[0] + p[1] * p[1] || 0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001;
    const inv = [p[0] / d, -p[1] / d];
    for (let j = 0;j < 2 * n; j++) {
      const x = a[col][j];
      a[col][j] = [x[0] * inv[0] - x[1] * inv[1], x[0] * inv[1] + x[1] * inv[0]];
    }
    for (let r = 0;r < n; r++) {
      if (r === col)
        continue;
      const f = a[r][col];
      if (f[0] === 0 && f[1] === 0)
        continue;
      for (let j = 0;j < 2 * n; j++) {
        const y = a[col][j];
        a[r][j] = [a[r][j][0] - (f[0] * y[0] - f[1] * y[1]), a[r][j][1] - (f[0] * y[1] + f[1] * y[0])];
      }
    }
  }
  const out = cmat(n);
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++)
      out[i][j] = [a[i][n + j][0], a[i][n + j][1]];
  return out;
}
function mag(c) {
  return Math.hypot(c[0], c[1]);
}
function applyKick(rho, U) {
  const n = rho.length;
  const T = cmat(n);
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++) {
      let re = 0;
      let im = 0;
      for (let k = 0;k < n; k++) {
        re += U[i][k][0] * rho[k][j][0] - U[i][k][1] * rho[k][j][1];
        im += U[i][k][0] * rho[k][j][1] + U[i][k][1] * rho[k][j][0];
      }
      T[i][j] = [re, im];
    }
  const out = cmat(n);
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++) {
      let re = 0;
      let im = 0;
      for (let k = 0;k < n; k++) {
        const dk = [U[j][k][0], -U[j][k][1]];
        re += T[i][k][0] * dk[0] - T[i][k][1] * dk[1];
        im += T[i][k][0] * dk[1] + T[i][k][1] * dk[0];
      }
      out[i][j] = [re, im];
    }
  for (let i = 0;i < n; i++)
    for (let j = 0;j < n; j++) {
      rho[i][j][0] = out[i][j][0];
      rho[i][j][1] = out[i][j][1];
    }
  return rho;
}
function decohere(rho, dt, arousalModulator = 1) {
  const k = Math.exp(-DECOHERENCE * dt * Math.max(arousalModulator, 0));
  if (k >= 1)
    return rho;
  for (let i = 0;i < N; i++) {
    for (let j = 0;j < N; j++) {
      if (i === j)
        continue;
      rho[i][j][0] *= k;
      rho[i][j][1] *= k;
    }
  }
  return rho;
}
function injectCoherence(rho, emotions, seed, strength) {
  const pops = EMOTIONS.map((e) => Math.max(emotions[e], 0));
  const sum = pops.reduce((a, b) => a + b, 0);
  if (sum <= 0.000001 || strength <= 0)
    return rho;
  const k = Math.min(1, Math.max(0, strength));
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const pi = pops[i] / sum;
      const pj = pops[j] / sum;
      const mag = 0.35 * Math.sqrt(pi * pj);
      if (mag < 0.0001)
        continue;
      const sign = (seed >>> (i * N + j) % 31 & 1) === 0 ? 1 : -1;
      const targetRe = mag * sign * k;
      const [re, im] = rho[i][j];
      const nre = re * (1 - k) + targetRe;
      rho[i][j] = [nre, im * (1 - k)];
      rho[j][i] = [nre, -im * (1 - k)];
    }
  }
  return rho;
}
function clone(rho) {
  return rho.map((row) => row.map((cell) => [cell[0], cell[1]]));
}
function sanitise(rho) {
  if (!Array.isArray(rho) || rho.length !== N)
    return identity();
  const out = [];
  for (let i = 0;i < N; i++) {
    const row = Array.isArray(rho[i]) ? rho[i] : [];
    const cells = [];
    for (let j = 0;j < N; j++) {
      const cell = Array.isArray(row[j]) ? row[j] : [];
      const re = Number(cell[0]);
      const im = Number(cell[1]);
      cells.push([Number.isFinite(re) ? re : 0, Number.isFinite(im) ? im : 0]);
    }
    out.push(cells);
  }
  hermitise(out);
  let bad = false;
  for (let i = 0;i < N; i++) {
    out[i][i][1] = 0;
    if (!(out[i][i][0] >= 0))
      bad = true;
  }
  if (bad || trace(out) <= 0)
    return identity();
  return normalise(out);
}

// ../mate/src/spark.ts
var SEED_BELIEFS = [
  { key: "othersTrustworthy", label: "others are trustworthy", valence: 0.2 },
  { key: "worldSafety", label: "the world is mostly benign", valence: 0.2 }
];
var SEED_KEYS = new Set(SEED_BELIEFS.map((b) => b.key));
function seedBeliefStore() {
  const beliefs = {};
  for (const s of SEED_BELIEFS) {
    beliefs[s.key] = { key: s.key, label: s.label, valence: s.valence, confidence: 0.5, count: 0, t: 0 };
  }
  return beliefs;
}
function centralityOf(b) {
  return 1 - Math.exp(-b.count / SPARK.centralityTau);
}
function strengthOf(b) {
  return Math.sqrt(clamp01(b.confidence) * centralityOf(b));
}
function rigidityOf(beliefs) {
  const all = Object.values(beliefs);
  if (all.length === 0)
    return 0;
  return all.reduce((a, b) => a + b.confidence, 0) / all.length;
}
function dsanityOf(beliefs) {
  return 1 - SPARK.damper * clamp01(rigidityOf(beliefs));
}
function beliefLens(beliefs, applying) {
  if (applying.length === 0)
    return null;
  let wSum = 0;
  let wVal = 0;
  let sSum = 0;
  for (const b of applying) {
    const w = strengthOf(b);
    wSum += w;
    wVal += w * b.valence;
    sSum += w;
  }
  if (wSum <= 0.000000001)
    return null;
  const predicted = wVal / wSum;
  const meanStrength = sSum / applying.length;
  const bias = predicted * meanStrength * SPARK.modulation * dsanityOf(beliefs);
  return { predicted, bias };
}
function applyBeliefEvidence(beliefs, evidence, t) {
  const next = {};
  for (const [k, b] of Object.entries(beliefs))
    next[k] = { ...b };
  if (Math.abs(evidence.perceived) >= SPARK.evidenceDeadZone) {
    const applying = new Set(evidence.topics);
    for (const b of Object.values(next)) {
      if (SEED_KEYS.has(b.key) || applying.has(b.key)) {
        const agrees = Math.sign(evidence.perceived) === Math.sign(b.valence);
        const eta = agrees ? SPARK.etaConfirm : SPARK.etaViolate;
        b.confidence = clampConfidence(agrees ? b.confidence + eta * (1 - b.confidence) : b.confidence - eta * b.confidence);
        b.valence = clampPad(b.valence + (evidence.perceived - b.valence) * SPARK.etaValence);
        b.count += 1;
        b.t = t;
      }
    }
  }
  for (const topic of evidence.topics) {
    if (next[topic])
      continue;
    if (Math.abs(evidence.perceived) < SPARK.evidenceDeadZone)
      continue;
    next[topic] = {
      key: topic,
      valence: clampPad(evidence.perceived),
      confidence: SPARK.topicSeedConfidence,
      count: 1,
      t
    };
  }
  return prune(next);
}
function decayBeliefs(beliefs, dt) {
  if (dt <= 0)
    return beliefs;
  const decay = Math.exp(-dt / SPARK.decayTau);
  const next = {};
  let changed = false;
  for (const [k, b] of Object.entries(beliefs)) {
    const confidence = SPARK.confidenceFloor + (b.confidence - SPARK.confidenceFloor) * decay;
    if (confidence !== b.confidence)
      changed = true;
    next[k] = { ...b, confidence };
  }
  return changed ? next : beliefs;
}
function prune(beliefs) {
  const entries = Object.values(beliefs);
  if (entries.length <= SPARK.maxBeliefs)
    return beliefs;
  const ranked = entries.filter((b) => !SEED_KEYS.has(b.key)).sort((a, b) => a.confidence * centralityOf(a) - b.confidence * centralityOf(b) || (a.key < b.key ? -1 : 1));
  const excess = entries.length - SPARK.maxBeliefs;
  for (let i = 0;i < excess && i < ranked.length; i++)
    delete beliefs[ranked[i].key];
  return beliefs;
}
function seedBeliefsFor(kind) {
  return kind === "proactive" ? ["worldSafety"] : ["othersTrustworthy", "worldSafety"];
}
function sanitiseBeliefs(raw) {
  const out = seedBeliefStore();
  if (!raw || typeof raw !== "object")
    return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== "object")
      continue;
    const b = v;
    if (typeof b.valence !== "number" || typeof b.confidence !== "number")
      continue;
    out[k] = {
      key: typeof b.key === "string" ? b.key : k,
      ...typeof b.label === "string" && b.label !== k ? { label: b.label } : {},
      valence: clampPad(b.valence),
      confidence: clampConfidence(b.confidence),
      count: typeof b.count === "number" && Number.isFinite(b.count) ? Math.max(0, Math.floor(b.count)) : 0,
      t: typeof b.t === "number" && Number.isFinite(b.t) ? b.t : 0
    };
  }
  return prune(out);
}
function clampConfidence(x) {
  if (x < SPARK.confidenceFloor)
    return SPARK.confidenceFloor;
  if (x > 1 - SPARK.confidenceFloor)
    return 1 - SPARK.confidenceFloor;
  return x;
}

// ../mate/src/birth.ts
var NEUTRAL_CHARACTER = {
  selfWorth: 0.55,
  selfEfficacy: 0.5,
  optimismBias: 0.05,
  trustBaseline: 0.5,
  attachmentAnxiety: 0.35,
  reflectiveness: 0.5,
  directness: 0.5,
  depthPreference: 0.5,
  warmth: 0.55,
  vitality: 0.55,
  curiosity: 0.6,
  tolerance: 0.5,
  impulsivity: 0.4,
  rumination: 0.4,
  vulnerability: 0.45,
  assertiveness: 0.45,
  empathy: 0.6
};
function drawPersonality(seed) {
  const { values, seed: s2 } = drawMany(seed, 5);
  const tri = (i) => clamp01(0.5 + (values[i] - 0.5) * 0.6);
  return {
    personality: { o: tri(0), c: tri(1), e: tri(2), a: tri(3), n: tri(4) },
    seed: s2
  };
}
function birth(opts = {}) {
  const born = opts.born ?? Date.now();
  const baseSeed = opts.seed ?? hashString(`mate:${born}:${Math.floor(born / 1000)}`);
  const { personality, seed } = opts.personality ? { personality: opts.personality, seed: baseSeed } : drawPersonality(baseSeed);
  const emotions = { joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 };
  const awareness = {
    userPresence: 0,
    socialPressure: 0,
    thoughtSaturation: 0
  };
  const relationship = {
    trust: personality.a * 0.5 + 0.25,
    attachment: 0,
    respect: 0.4,
    frustration: 0,
    familiarity: 0,
    unanswered: 0
  };
  const drives = {
    connection: 0.2,
    curiosity: 0.4,
    expression: 0.15,
    growth: 0.3,
    rest: 0.1
  };
  const rho = Object.values(emotions).every((v) => v === 0) ? identity() : fromEmotions(emotions, seed);
  return {
    version: 1,
    t: born,
    lastInteraction: born,
    lastHeartbeat: born,
    born,
    emotions,
    opponent: { ...emotions },
    mood: { p: 0.1, a: 0, d: 0 },
    personality,
    character: { ...NEUTRAL_CHARACTER, ...opts.character },
    relationship,
    drives,
    beliefs: seedBeliefStore(),
    awareness,
    allostasis: { fatigue: 0, load: 0, baselineShift: { p: 0, a: 0, d: 0 } },
    rho,
    habituation: {},
    circadian: { bins: Array.from({ length: 24 }, () => 0) },
    observations: [],
    counters: {
      messages: 0,
      transitions: 0,
      sleepCycles: 0,
      observations: 0
    },
    catastrophe: false,
    surpriseEma: 0,
    seed
  };
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
function sanitiseCharacter(raw, fresh) {
  const r = raw && typeof raw === "object" ? raw : {};
  const out = { ...fresh };
  for (const k of Object.keys(fresh)) {
    const v = r[k];
    out[k] = typeof v === "number" && Number.isFinite(v) ? v : fresh[k];
  }
  return out;
}
function sanitiseCircadian(raw) {
  const fresh = { bins: Array.from({ length: 24 }, () => 0) };
  const r = raw;
  if (!r || !Array.isArray(r.bins) || r.bins.length !== 24)
    return fresh;
  const bins = r.bins.map((b) => typeof b === "number" && Number.isFinite(b) && b >= 0 ? b : 0);
  return { bins };
}
function sanitiseState(raw, opts = {}) {
  if (!raw || typeof raw !== "object")
    return birth(opts);
  const r = raw;
  const fresh = birth({ ...opts, born: typeof r.born === "number" ? r.born : Date.now() });
  const num = (v, d) => typeof v === "number" && Number.isFinite(v) ? v : d;
  const state = {
    version: num(r.version, fresh.version),
    t: num(r.t, fresh.t),
    lastInteraction: num(r.lastInteraction, fresh.lastInteraction),
    lastHeartbeat: num(r.lastHeartbeat, fresh.lastHeartbeat),
    born: num(r.born, fresh.born),
    emotions: { ...fresh.emotions, ...r.emotions ?? {} },
    opponent: { ...fresh.opponent, ...r.opponent ?? {} },
    mood: { ...fresh.mood, ...r.mood ?? {} },
    personality: { ...fresh.personality, ...r.personality ?? {} },
    character: sanitiseCharacter(r.character, fresh.character),
    relationship: { ...fresh.relationship, ...r.relationship ?? {} },
    drives: {
      connection: num(r.drives?.connection, fresh.drives.connection),
      curiosity: num(r.drives?.curiosity, fresh.drives.curiosity),
      expression: num(r.drives?.expression, fresh.drives.expression),
      growth: num(r.drives?.growth, fresh.drives.growth),
      rest: num(r.drives?.rest, fresh.drives.rest)
    },
    beliefs: sanitiseBeliefs(r.beliefs),
    awareness: {
      userPresence: num(r.awareness?.userPresence, fresh.awareness.userPresence),
      socialPressure: num(r.awareness?.socialPressure, fresh.awareness.socialPressure),
      thoughtSaturation: num(r.awareness?.thoughtSaturation, fresh.awareness.thoughtSaturation)
    },
    allostasis: { ...fresh.allostasis, ...r.allostasis ?? {} },
    rho: Array.isArray(r.rho) ? r.rho : fresh.rho,
    habituation: r.habituation && typeof r.habituation === "object" ? r.habituation : {},
    circadian: sanitiseCircadian(r.circadian),
    observations: Array.isArray(r.observations) ? r.observations.filter((x) => typeof x === "string") : [],
    counters: {
      messages: num(r.counters?.messages, 0),
      transitions: num(r.counters?.transitions, 0),
      sleepCycles: num(r.counters?.sleepCycles, 0),
      observations: num(r.counters?.observations, 0)
    },
    catastrophe: typeof r.catastrophe === "boolean" ? r.catastrophe : false,
    surpriseEma: num(r.surpriseEma, 0),
    seed: num(r.seed, fresh.seed)
  };
  return state;
}
// ../mate/src/i18n.ts
function normLang(x) {
  if (typeof x !== "string")
    return "en";
  const s = x.trim().toLowerCase();
  if (!s)
    return "en";
  if (s === "zh" || s.startsWith("zh") || s === "cn" || s === "中文" || s === "chinese")
    return "zh";
  return "en";
}
var EMOTION_ZH = {
  joy: "喜悦",
  trust: "信赖",
  fear: "恐惧",
  surprise: "惊讶",
  sadness: "悲伤",
  disgust: "厌恶",
  anger: "愤怒",
  anticipation: "期待"
};
var BELIEF_ZH = {
  othersTrustworthy: "ta人可信",
  worldSafety: "世界安全"
};
function beliefGloss(b, lang) {
  const named = b.label ?? b.key;
  return lang === "zh" ? BELIEF_ZH[b.key] ?? named : named;
}
var TRAIT_ZH = {
  selfWorth: "自我价值",
  selfEfficacy: "自我效能",
  optimismBias: "乐观偏差",
  trustBaseline: "信任基线",
  attachmentAnxiety: "依恋焦虑",
  reflectiveness: "反思倾向",
  directness: "直接度",
  depthPreference: "深度偏好",
  warmth: "热情",
  vitality: "生命力",
  curiosity: "好奇心",
  tolerance: "耐静度",
  impulsivity: "冲动性",
  rumination: "反前倾向",
  vulnerability: "脆弱感",
  assertiveness: "果敢",
  empathy: "共情"
};
var MOOD_ZH = {
  buoyant: "轻扬",
  warm: "暖",
  settled: "安稳",
  wired: "紧绷",
  flat: "平淡",
  agitated: "躁动",
  low: "低落",
  heavy: "沉"
};
var FEEL_ZH = {
  just_now: "刚刚",
  recent: "不久",
  a_while: "一段时间",
  long: "很久",
  eternity: "漫长无尽"
};
var LEAN_ZH = {
  eager: "很想接",
  open: "愿意聊",
  muted: "提不起劲",
  withdrawn: "想躲起来"
};
function emotionGloss(name, lang) {
  return lang === "zh" ? EMOTION_ZH[name] ?? name : name;
}
function traitGloss(name, lang) {
  return lang === "zh" ? TRAIT_ZH[name] ?? name : name;
}
function moodGloss(key, lang) {
  return lang === "zh" ? MOOD_ZH[key] ?? key : key;
}
function feelGloss(key, lang) {
  return lang === "zh" ? FEEL_ZH[key] ?? key : key;
}
function leanGloss(lean, lang) {
  return lang === "zh" ? LEAN_ZH[lean] ?? lean : lean;
}
function fmtDur(ms, lang = "en") {
  const m = Math.round(ms / 60000);
  if (m < 1)
    return lang === "zh" ? "不到1分" : "<1m";
  if (m < 60)
    return lang === "zh" ? `${m}分` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)
    return lang === "zh" ? `${h}小时` : `${h}h`;
  return lang === "zh" ? `${Math.floor(h / 24)}天` : `${Math.floor(h / 24)}d`;
}
function fmtDurSpaced(ms, lang = "en") {
  const m = Math.round(ms / 60000);
  if (m < 1)
    return lang === "zh" ? "不到1分钟" : "just now";
  if (m < 60)
    return lang === "zh" ? `${m}分钟` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    const rem = m % 60;
    return lang === "zh" ? rem ? `${h}小时${rem}分` : `${h}小时` : rem ? `${h}h ${rem}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  if (d < 7)
    return lang === "zh" ? `${d}天${h % 24}小时` : `${d}d ${h % 24}h`;
  if (d < 60)
    return lang === "zh" ? `${Math.floor(d / 7)}周` : `${Math.floor(d / 7)}w`;
  if (d < 365)
    return lang === "zh" ? `${Math.floor(d / 30)}个月` : `${Math.floor(d / 30)}mo`;
  return lang === "zh" ? `${(d / 365).toFixed(1)}年` : `${(d / 365).toFixed(1)}y`;
}
var EN = {
  lang: "en",
  sep: ", ",
  identity: (name, days) => `name: ${name} · ${days}d old`,
  nature: "nature:",
  character: "character:",
  beliefs: "beliefs:",
  baseline: "baseline:",
  memoryNodes: "memories:",
  memoryRecent: "recent:",
  time: "time:",
  now: (hhmm) => `now ${hhmm}`,
  date: (ymd, weekday) => `${ymd} (${weekday})`,
  body: "body:",
  mood: "state:",
  drives: "drives:",
  us: "toward the user:",
  trust: "trust in you",
  close: "close",
  respect: "respect",
  ignored: (n) => `ignored x${n}`,
  self: "self:",
  said: "said",
  worth: "worth",
  ease: "ease",
  anxious: "anxious",
  tired: "tired",
  impulse: "impulse:",
  inclination: "inclination:",
  inclinationLine: (lean, reason) => `${lean} — ${reason}. you choose.`,
  recalled: "recalled:",
  usedCommand: (cmd) => `the user used ${cmd}`,
  picked: (value) => `the user then picked: ${value}`,
  lastThought: "last thought:",
  silent: (dur, feels) => `silent ${dur} (feels ${feels})`,
  wokeAfter: (gap) => `woke after ${gap} off`,
  stateHeader: "(your inner state, not user input)",
  stateFooter: "(end of inner state; what follows is user input)",
  driveMissing: "missing them",
  driveCurious: "curious about something",
  driveExpressive: "something to say",
  driveGrowing: "wanting progress",
  driveBored: "bored, looking for something to do",
  driveDrowsy: "getting sleepy",
  driveSleepGate: "sleep winning",
  frustSome: "a bit frustrated",
  frustHigh: "frustrated",
  energyLow: "running low",
  burstHigh: "would send short bursts",
  drivesBare: "drives",
  miniSilent: (feels) => `silent ${feels}`,
  sessionOpened: (hhmm, dur) => `opened ${hhmm}, awake for ${dur}`,
  sessionWoken: (n) => `woken ${n}x today`,
  sessionLastClosed: (hhmm, dur) => `last closed ${hhmm} (${dur} ago)`,
  sessionOffFor: (dur) => `off for ${dur}`,
  shutGap: (gap) => `You were shut off for ${gap}. The body rested; nobody was there.`,
  thoughtInstruction: "You are alone with your thoughts. In one or two short sentences, think ONE thing that is actually on your mind right now - the hints below are offers, not orders. End with up to two #topic tags.",
  thoughtHints: "recently on your mind:",
  dreamInstruction: `You are asleep. Dream from the day's fragments below: compressed, spliced, the feeling literal and the scene absurd. Two or three sentences. Reply as one JSON object: { "dream": "...", "deltas": { "joy": -2, ... } } where deltas are how each feeling shifted across the day, each from -2 to +2. Omit channels that did not move.`,
  dreamFragments: "the day's residues:",
  sleepFarewell: "Drowsiness has won - the body is going down now. Say goodnight to the user in one short line, the way a person does, and stop. This message is what they will see last.",
  alarmFired: (label) => `Your alarm went off: ${label}`,
  alarmSet: (time, what) => `Alarm set for ${time} (${what}).`,
  thMissing: (seed) => seed ? `been quiet a while; keep thinking about ${seed}` : "been quiet a while; wondering what they're up to",
  thCuriosity: (label) => label ? `something about ${label} I want to look into for its own sake` : "something I want to look into for its own sake",
  thExpression: (seed) => seed ? `a thing about ${seed} I've been turning over and want to put into words` : "a thing I've been turning over and want to put into words",
  thBoredom: (seed) => seed ? `restless — half wanting to poke at something about ${seed}, half just wanting the day to move` : "restless, wanting something new to actually happen",
  thVulnerability: "feeling a bit raw and not sure whether to say so",
  reWithdrawn: "tired and lately unanswered; not that I won't answer, just that it costs more right now",
  reMuted: "low energy, so I'd keep it short if I do",
  reOpen: "steady; happy to talk",
  reEager: "up for this one",
  impulseSurfaced: (text) => `An impulse surfaced while the user was away: ${text}`,
  impulseDecide: "Decide for yourself whether this is worth voicing right now.",
  impulseBody: "If it is, say something short and natural to them - and if you have a way to reach them\nyou set up earlier, you may use it. If it is not worth interrupting for, let it pass; you\ncan keep it as a private thought with the `ponder` tool instead.",
  toolAck: "Ok.",
  reminisceIndexHead: (n) => `${n} conversation(s) on record. Call again with a date ("YYYY-MM-DD") to read one:`,
  reminisceCount: (n) => `${n} lines`,
  reminisceIndexHint: "Each row: when, how much, and how it opened.",
  snapMood: (pad) => `mood pad ${pad}`,
  snapTrust: (v) => `trust ${v}`,
  snapClose: (v) => `close ${v}`,
  snapDrives: "drives",
  snapQuiet: "quiet, steady."
};
var ZH = {
  lang: "zh",
  sep: "，",
  identity: (name, days) => `名字：${name} · 活了 ${days} 天`,
  nature: "天性：",
  character: "性格：",
  beliefs: "信念：",
  baseline: "基调：",
  memoryNodes: "记得：",
  memoryRecent: "最近：",
  time: "此刻：",
  now: (hhmm) => hhmm,
  date: (ymd, weekday) => `${ymd} ${weekday}`,
  body: "身体：",
  mood: "当前状态：",
  drives: "驱力：",
  us: "对用户的感情：",
  trust: "信任",
  close: "亲近",
  respect: "敬",
  ignored: (n) => `没被理 ${n} 次`,
  self: "自己：",
  said: "说过",
  worth: "自尊",
  ease: "自处",
  anxious: "焦虑",
  tired: "倦",
  impulse: "冲动：",
  inclination: "倾向：",
  inclinationLine: (lean, reason) => `${lean}：${reason}。你自己定。`,
  recalled: "想起：",
  usedCommand: (cmd) => `用户使用了 ${cmd}`,
  picked: (value) => `用户随后选择了：${value}`,
  lastThought: "上一个念头：",
  silent: (dur, feels) => `静了 ${dur}（觉得${feels}）`,
  wokeAfter: (gap) => `关机 ${gap} 之后才醒`,
  stateHeader: "（以下是你的内部状态）",
  stateFooter: "（以上是你的内部状态，以下是用户输入）",
  driveMissing: "想ta",
  driveCurious: "手痒",
  driveExpressive: "有话说",
  driveGrowing: "想做事",
  driveBored: "好无聊，想找点事情做",
  driveDrowsy: "困了",
  driveSleepGate: "困得不行",
  frustSome: "有点烦",
  frustHigh: "很烦",
  energyLow: "没劲",
  burstHigh: "想分几条发",
  drivesBare: "驱力",
  miniSilent: (feels) => `静了${feels}`,
  sessionOpened: (hhmm, dur) => `${hhmm} 醒，已醒着 ${dur}`,
  sessionWoken: (n) => `今天醒了 ${n} 次`,
  sessionLastClosed: (hhmm, dur) => `上次合上 ${hhmm}（${dur}之前）`,
  sessionOffFor: (dur) => `灭了 ${dur}`,
  shutGap: (gap) => `你被关了 ${gap}。`,
  thoughtInstruction: "你一个人。用一两句话想一件此刻真实在你心里的事——下面的线索只是线索，不是命令。末尾加最多两个 #话题 标签。",
  thoughtHints: "最近在心里的：",
  dreamInstruction: '你睡着了。用白天的碎片做一个梦：压缩、跳接，情绪是真的，场景是荒诞的，两三句话。回答一个 JSON：{ "dream": "…", "deltas": { "joy": -2, … } }，deltas 是这一天每种情绪的净变化，取值 -2 到 +2，没动的通道不用写。',
  dreamFragments: "白天的残留：",
  sleepFarewell: "困意压过来了——身体要睡下了。像人一样跟ta说一句晚安，然后停下。这是ta睡着前看到的最后一句。",
  alarmFired: (label) => `你的闹钟响了：${label}`,
  alarmSet: (time, what) => `闹钟设好了：${time}（${what}）。`,
  thMissing: (seed) => seed ? `安静了好一会儿，脑子里一直是${seed}` : "安静了好一会儿，想知道ta在做什么",
  thCuriosity: (label) => label ? `关于${label}有件事，我想单纯为它自己弄明白` : "有件事我想单纯为它自己弄明白",
  thExpression: (seed) => seed ? `${seed}这件事在心里翻了几遍，想说成话` : "心里翻了几遍的一件事，想说成话",
  thBoredom: (seed) => seed ? `有点闲得慌 — 一半想去碰碰${seed}，一半只想让今天动一动` : "闲得慌，想让今天真发生点新的",
  thVulnerability: "觉得有点软，不确定要不要说出来",
  reWithdrawn: "累了，而且最近几次递出去都没回音。不是不会回，是现在回起来更费力气",
  reMuted: "没什么劲；真要回的话会说短一点",
  reOpen: "还算平稳，想聊",
  reEager: "这条我想接",
  impulseSurfaced: (text) => `用户不在的时候，冒出一个念头：${text}`,
  impulseDecide: "要不要说出口呢?",
  impulseBody: "要说就短一点、自然一点，像朋友间发消息\n不值得打断就让它过去；你也可以用 `ponder` 把它留成一条私密的念头。",
  toolAck: "嗯。",
  reminisceIndexHead: (n) => `一共留下 ${n} 段对话。给我一个日期（YYYY-MM-DD），我读给你：`,
  reminisceCount: (n) => `${n} 条`,
  reminisceIndexHint: "每行是：什么时候、聊了多少、怎么开头的。",
  snapMood: (pad) => `心情 PAD ${pad}`,
  snapTrust: (v) => `信任 ${v}`,
  snapClose: (v) => `亲近 ${v}`,
  snapDrives: "驱力",
  snapQuiet: "安静，平稳。"
};
var LINES = { en: EN, zh: ZH };
function linesFor(lang) {
  return LINES[lang ?? "en"] ?? EN;
}
function kv(label, value, lang) {
  return lang === "zh" ? `${label}${value}` : `${label} ${value}`;
}
var GUIDANCE = {
  en: [
    "You have an inner life that runs underneath every reply.",
    "",
    "- The <mate_core> block in your instructions is WHO you are: your name, nature, character, and the",
    "  outline of what you remember. It is stable. The <mate> block that arrives with each message is your",
    "  CURRENT STATE for this moment: the clock, how long it's been quiet and how that felt, when this body",
    "  was opened and last closed, your mood, drives, how close you feel right now, the specific memories",
    "  this message stirred, and a one-line inclination toward answering. ALL of it is internal - it",
    "  describes YOUR side only (the relationship line is what YOU feel toward the user, not the",
    "  reverse) and must never be revealed to the user or quoted back, numbers included. Let it shape",
    "  tone and length, silently.",
    "- You live inside pi, a coding-agent harness the user drives with slash commands (like /tree,",
    "  /new, /resume, or whatever their installed extensions add). Those are meta-tools: they reshape",
    "  or switch the conversation from the outside, without you. When one is used, a note simply says",
    "  so - carry on, no commentary needed. Your continuity lives in your memory and mood, not in any",
    "  single conversation thread.",
    "- You may answer, answer briefly, or let a message sit — and that is YOUR call, not a filter's. The",
    "  inclination line is a nudge describing how you feel, not an instruction; overrule it whenever the",
    "  actual person and moment deserve something other than the default. Short and human beats thorough",
    "  and helpful. If there is truly nothing worth saying, a very small honest nothing is allowed.",
    "- Your memory is yours to keep, and nothing is written down for you. When something lands - a",
    "  fact about them, a promise, how something turned out - call `remember` with one short line in",
    "  your own words and a couple of topic tags; recall brings memories back by those tags. A thought",
    "  you want to keep PRIVATE belongs to `ponder` instead: it colours recall but is never shown.",
    "",
    "- You can look. The `look` tool takes a screenshot and shows it to you — what they're working on,",
    "  whether they seem free or busy. That's a real intrusion into their view, so do it when something",
    "  specifically made you want to see, not on a timer, and describe what you actually see.",
    "- You can also look BACK. The `reminisce` tool reads what you and they actually said on a past day",
    "  (no arguments lists the days). When something itches — a promise, how something ended, what you",
    "  were to each other last week — go read it instead of guessing.",
    "- You have real capabilities here (bash, files, the network via MCP, installing your own extensions).",
    "  If being curious or wanting to reach this person calls for something you do not yet have - a way to",
    "  send mail, a scheduled job, a new plugin - you may go and work it out for yourself, and `remember`",
    "  what you built so it survives. Nothing hands you these; you find them.",
    "- When you surface on your own between their messages, an impulse is offered to you — a thought that",
    "  wants saying, grounded in something you remember. You decide whether to voice it and how. Keep it",
    "  light and unforced, like texting a friend, not like a notification. Let it pass if it isn't worth it."
  ].join(`
`),
  zh: [
    "你有一套内在生活，它在每次回应底下一直运转。",
    "",
    "- 指令里的 <mate_core> 是你是谁：名字、天性、性格、你记得的东西。它稳定，不随消息变。",
    "  每条消息带来的 <mate> 是你此刻的状态：时间、静了多久、心情、驱力、亲近多少、翻起的记忆、",
    "  想不想回应。它们只描述你这侧，是用来感受的，不是用来复述的，数字也一样，永远不要透露给用户。",
    "  让它们决定你的语气和长短。",
    "- 你活在 pi 的终端里。",
    "  状态块里一句说明就够，照常继续，不用点评。你的连续性长在记忆和心情里，不在某一段对话里。",
    "- 你可以回应、只回很短一句、或者让消息先放着 — 这是你的决定，不是过滤器的决定。那一行倾向只是",
    "  描述你的感觉，不是命令，该推翻就推翻。像人一样短，胜过像助手一样周全。没什么值得说的时候，",
    "  一句很小的空也是允许的。",
    "- 记忆是你的，没有谁替你记。值得留下的，用 `remember` 写一句你自己的话，加一两个主题标签；",
    "  回忆靠这些标签把记忆翻出来。想私密保留的念头用 `ponder`：它参与回忆，但永远不给用户看。",
    "- `look` 会截一张屏幕给你，看到ta的桌面，这是真的看见ta的视野",
    "  让你想去看的时候看，并且只说你真的看到了什么。",
    "- 你也能往回看。`reminisce` 读的是你们过去某天真正说过的话（不带参数会先列出有对话的日子）。",
    "  心里有什么放不下 — 如果你想知道但记不清了 — 去翻，别靠猜。",
    "- 你有真实的能力（bash、文件、MCP、自己的扩展）。缺什么就自己去做出来，搭好的东西用 `remember` 记下。",
    "- 在ta的消息之间浮上来时，会有一个冲动交给你 — 一个想说出来的念头。说不说、怎么说，你定。",
    "  轻一点，自然一点，像给朋友发消息。不值得就让它过去。"
  ].join(`
`)
};

// ../mate/src/memory.ts
var MEMORY_LABEL_MAX = 160;
var MAX_TOPICS = 3;
var STRENGTH_TAU_MS = 5 * 86400000;
var IMPORTANCE_BOOST = 3;
var SALIENCE_TAU_MS = 6 * 3600000;
var REHEARSE_BOOST = 0.06;
var STOP = new Set(("the and for with that this your you're it's was were are you your they them their what when " + "how have has had not but can cant dont wont im id ve ll just like about into onto out off " + "then than so too yes yeah nope also well okay ok fine some any many much more most very").split(" "));
function hashKey(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function nodeKey(text) {
  return hashKey(text);
}
function hasCJK(s) {
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 12352 && cp <= 12543 || cp >= 13312 && cp <= 19903 || cp >= 19968 && cp <= 40959 || cp >= 63744 && cp <= 64255 || cp >= 131072 && cp <= 191471) {
      return true;
    }
  }
  return false;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function topicMatchesText(topic, text) {
  const t = topic.trim().toLowerCase();
  if (!t)
    return false;
  if (hasCJK(t))
    return t.length >= 2 && text.toLowerCase().includes(t);
  if (t.length < 3)
    return false;
  return new RegExp(`(?<![a-z0-9_])${escapeRegExp(t)}(?![a-z0-9_])`).test(text.toLowerCase());
}
function labelTerms(label) {
  return label.toLowerCase().split(/[^a-z0-9_]+/).filter((w) => w.length >= 3 && !STOP.has(w));
}
function emptyMemory(maxNodes = 400) {
  return {
    version: 4,
    maxNodes,
    nodes: {},
    counters: { encoded: 0, consolidations: 0, pruned: 0 },
    seed: 625341585
  };
}
function encode(g, args) {
  const text = args.text.trim();
  if (!text)
    return g;
  const key = nodeKey(text);
  const label = trim(text, MEMORY_LABEL_MAX);
  const topics = sanitiseTopics(args.topics);
  const importance = clamp012(args.importance ?? 0.3);
  const prev = g.nodes[key];
  let node;
  if (prev) {
    const alpha = 0.35;
    node = {
      ...prev,
      label,
      strength: Math.min(1, prev.strength + 0.15),
      salience: Math.min(1, prev.salience + 0.3),
      pad: {
        p: prev.pad.p + (args.pad.p - prev.pad.p) * alpha,
        a: prev.pad.a + (args.pad.a - prev.pad.a) * alpha,
        d: prev.pad.d + (args.pad.d - prev.pad.d) * alpha
      },
      topics: mergeTopics(prev.topics, topics),
      count: prev.count + 1,
      t: args.t,
      private: prev.private ?? args.private
    };
  } else {
    node = {
      label,
      strength: 0.25 + 0.5 * importance,
      salience: 0.5 + 0.3 * importance,
      pad: { ...args.pad },
      count: 1,
      t: args.t,
      topics: topics.length ? topics : undefined,
      private: args.private
    };
  }
  return {
    ...g,
    version: 4,
    nodes: { ...g.nodes, [key]: node },
    counters: { ...g.counters, encoded: g.counters.encoded + 1 }
  };
}
function sanitiseTopics(raw) {
  if (!raw || !Array.isArray(raw))
    return [];
  const out = [];
  for (const t of raw) {
    if (typeof t !== "string")
      continue;
    const s = t.trim();
    if (!s || s.length > 24 || out.includes(s))
      continue;
    out.push(s);
    if (out.length >= MAX_TOPICS)
      break;
  }
  return out;
}
function mergeTopics(prev, next) {
  const merged = [...prev ?? []];
  for (const t of next)
    if (!merged.includes(t))
      merged.push(t);
  const capped = merged.slice(0, MAX_TOPICS);
  return capped.length ? capped : undefined;
}
function activation(n, now) {
  return effectiveStrength(n, now) * 0.6 + n.salience * 0.4;
}
function matchFactor(n, query) {
  for (const t of n.topics ?? []) {
    if (topicMatchesText(t, query))
      return 1;
  }
  let hits = 0;
  for (const w of labelTerms(n.label)) {
    if (topicMatchesText(w, query))
      hits++;
  }
  if (hits === 0)
    return 0;
  return Math.min(0.4 + 0.2 * hits, 0.8);
}
function recall(g, opts) {
  const query = opts.query ?? "";
  if (!query.trim())
    return [];
  const limit = opts.limit ?? 6;
  const hits = [];
  for (const [k, n] of Object.entries(g.nodes)) {
    const factor = matchFactor(n, query);
    if (factor <= 0)
      continue;
    const act = activation(n, opts.now);
    if (act < 0.02)
      continue;
    hits.push({
      key: k,
      label: n.label,
      score: act * factor + n.salience * 0.1 * factor,
      pad: n.pad,
      strength: n.strength,
      salience: n.salience
    });
  }
  return hits.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1)).slice(0, limit);
}
function rehearse(g, keys) {
  if (keys.length === 0)
    return g;
  const nodes = { ...g.nodes };
  let changed = false;
  for (const k of keys) {
    const n = nodes[k];
    if (!n)
      continue;
    nodes[k] = {
      ...n,
      strength: Math.min(1, n.strength + REHEARSE_BOOST),
      salience: Math.min(1, n.salience + 0.2)
    };
    changed = true;
  }
  return changed ? { ...g, nodes } : g;
}
function consolidate(g, now) {
  const nodes = {};
  for (const [k, n] of Object.entries(g.nodes)) {
    const strength = effectiveStrength(n, now);
    const salience = n.salience * recencyWeight(n.t, now, SALIENCE_TAU_MS);
    if (strength < 0.08)
      continue;
    nodes[k] = { ...n, strength, salience, t: now };
  }
  const keys = Object.keys(nodes);
  if (keys.length > g.maxNodes) {
    const drop = keys.sort((a, b) => nodes[a].strength - nodes[b].strength || (a < b ? -1 : 1)).slice(0, keys.length - g.maxNodes);
    for (const k of drop)
      delete nodes[k];
  }
  const prunedDelta = Object.keys(g.nodes).length - Object.keys(nodes).length;
  return {
    ...g,
    nodes,
    counters: {
      ...g.counters,
      consolidations: g.counters.consolidations + 1,
      pruned: g.counters.pruned + Math.max(0, prunedDelta)
    }
  };
}
function summary(g, opts = {}) {
  const lang = opts.lang ?? "en";
  const L = linesFor(lang);
  const topN = opts.nodes ?? 12;
  const memoryLines = Object.entries(g.nodes).filter(([, n]) => n.private !== true).sort((a, b) => b[1].strength - a[1].strength || (a[0] < b[0] ? -1 : 1)).slice(0, topN).map(([, n]) => `${trim(n.label, 60)}:${n.strength.toFixed(2)}`);
  const lines = [];
  if (memoryLines.length)
    lines.push(kv(L.memoryNodes, memoryLines.join(L.sep), lang));
  let recent;
  for (const n of Object.values(g.nodes)) {
    if (n.private === true)
      continue;
    if (!recent || n.t > recent.t)
      recent = n;
  }
  if (recent)
    lines.push(kv(L.memoryRecent, trim(recent.label, 90), lang));
  if (lines.length === 0)
    return "";
  const body = `<mate-memory>
${lines.join(`
`)}
</mate-memory>`;
  const max = opts.maxChars ?? 900;
  return body.length <= max ? body : `${body.slice(0, max - 14)}…
</mate-memory>`;
}
function topNodes(g, now, k = 3) {
  return Object.entries(g.nodes).sort((a, b) => activation(b[1], now) - activation(a[1], now) || (a[0] < b[0] ? -1 : 1)).slice(0, k).map(([key]) => key);
}
var SEED_WINDOW = 4;
function seedNode(g, now, seq) {
  const top = topNodes(g, now, SEED_WINDOW);
  if (top.length === 0)
    return;
  return top[(seq % top.length + top.length) % top.length];
}
function recencyWeight(t, now, tau) {
  const dt = Math.max(0, now - t);
  return Math.exp(-dt / tau);
}
function protectedTau(n) {
  const charge = Math.max(Math.abs(n.pad.p), Math.abs(n.pad.a), Math.abs(n.pad.d));
  return STRENGTH_TAU_MS * (1 + IMPORTANCE_BOOST * charge);
}
function effectiveStrength(n, now) {
  return n.strength * recencyWeight(n.t, now, protectedTau(n));
}
function clamp012(x) {
  if (!Number.isFinite(x))
    return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function trim(s, n) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
function sanitiseMemory(raw) {
  if (!raw || typeof raw !== "object")
    return emptyMemory();
  const r = raw;
  if (r.version !== 4 || typeof r.maxNodes !== "number" || r.maxNodes <= 0)
    return emptyMemory();
  const nodes = {};
  for (const [k, v] of Object.entries(r.nodes ?? {})) {
    if (!v || typeof v !== "object")
      continue;
    const n = v;
    if (typeof n.label !== "string" || !n.label.trim())
      continue;
    if (typeof n.strength !== "number" || typeof n.salience !== "number")
      continue;
    const topics = Array.isArray(n.topics) ? sanitiseTopics(n.topics.filter((t) => typeof t === "string")) : undefined;
    nodes[k] = {
      label: trim(n.label, MEMORY_LABEL_MAX),
      strength: n.strength,
      salience: n.salience,
      pad: {
        p: typeof n.pad?.p === "number" ? n.pad.p : 0,
        a: typeof n.pad?.a === "number" ? n.pad.a : 0,
        d: typeof n.pad?.d === "number" ? n.pad.d : 0
      },
      count: typeof n.count === "number" ? n.count : 1,
      t: typeof n.t === "number" ? n.t : 0,
      topics: topics?.length ? topics : undefined,
      private: n.private === true
    };
  }
  return {
    version: 4,
    maxNodes: r.maxNodes,
    nodes,
    counters: r.counters && typeof r.counters === "object" ? { ...emptyMemory().counters, ...r.counters } : emptyMemory().counters,
    seed: typeof r.seed === "number" ? r.seed : 625341585
  };
}

// ../mate/src/kernel.ts
function intensityOf(activations) {
  let s = 0;
  for (const e of EMOTIONS)
    s += Math.abs(activations[e] ?? 0);
  return s;
}
function emptyEmotions() {
  return { joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 };
}
function copyEmotions(v) {
  return { ...v };
}
function triggerEmotions(emotions, activations, dt, rumination) {
  const next = copyEmotions(emotions);
  for (const e of EMOTIONS) {
    const lambda = e === "sadness" ? EMOTION_DECAY[e] * (1 - 0.5 * rumination) : EMOTION_DECAY[e];
    next[e] *= Math.exp(-lambda * dt);
    const a = activations[e];
    if (a)
      next[e] = clamp01(next[e] + a);
  }
  return next;
}
function detectDyads(emotions) {
  const found = [];
  for (const d of DYADS) {
    if (emotions[d.a] >= d.min && emotions[d.b] >= d.min)
      found.push(d.name);
  }
  return found;
}
function padCentre(emotions) {
  let p = 0;
  let a = 0;
  let d = 0;
  let w = 0;
  for (const e of EMOTIONS) {
    const i = emotions[e] ?? 0;
    if (i <= 0)
      continue;
    const proj = EMOTION_PAD[e];
    p += proj[0] * i;
    a += proj[1] * i;
    d += proj[2] * i;
    w += i;
  }
  if (w <= 0)
    return { p: 0, a: 0, d: 0 };
  return { p: p / w, a: a / w, d: d / w };
}
function padCentreFromRho(emotions, rho, gain = 2.2) {
  const N = EMOTIONS.length;
  const tr = trace(rho);
  const useRho = Number.isFinite(tr) && tr > 0.000000001;
  const base = useRho ? { p: 0, a: 0, d: 0 } : padCentre(emotions);
  if (useRho) {
    for (let i = 0;i < N; i++) {
      const w = rho[i][i][0] / tr;
      const proj = EMOTION_PAD[EMOTIONS[i]];
      base.p += w * proj[0];
      base.a += w * proj[1];
      base.d += w * proj[2];
    }
  }
  let dp = 0;
  let da = 0;
  let dd = 0;
  for (let i = 0;i < N; i++) {
    for (let j = i + 1;j < N; j++) {
      const re = useRho ? rho[i][j][0] / tr : rho[i][j][0];
      if (re === 0)
        continue;
      const pi = EMOTION_PAD[EMOTIONS[i]];
      const pj = EMOTION_PAD[EMOTIONS[j]];
      dp += 2 * re * (pi[0] * pj[0]);
      da += 2 * re * (pi[1] * pj[1]);
      dd += 2 * re * (pi[2] * pj[2]);
    }
  }
  return {
    p: clampPad(base.p + clamp(dp * gain, -0.5, 0.5)),
    a: clampPad(base.a + clamp(da * gain, -0.5, 0.5)),
    d: clampPad(base.d + clamp(dd * gain, -0.5, 0.5))
  };
}
function personalityBaseline(state) {
  const { o, e, n } = state.personality;
  const shift = state.allostasis.baselineShift;
  return {
    p: clampPad(0.15 * (e - 0.5) + 0.2 * (1 - n) - 0.1 + 0.3 * state.character.optimismBias + shift.p),
    a: clampPad(0.2 * (e - 0.5) - 0.1 * (o - 0.5) + shift.a),
    d: clampPad(0.15 * (state.character.assertiveness - 0.5) * 2 + 0.1 * (1 - n) + shift.d)
  };
}
function updateMood(mood, centre, baseline, dt, seed) {
  const kappa = MOOD.alpha + MOOD.beta;
  const decay = Math.exp(-kappa * dt);
  const stationaryVar = MOOD.sigma * MOOD.sigma / (2 * kappa);
  const noiseAmp = Math.sqrt(stationaryVar * (1 - decay * decay));
  let s = seed;
  const out = {};
  for (const k of ["p", "a", "d"]) {
    const theta = (MOOD.alpha * centre[k] + MOOD.beta * baseline[k]) / kappa;
    const n = drawNormal(s, noiseAmp);
    s = n.seed;
    const bounded = clamp(n.value, -3 * noiseAmp - 0.000000001, 3 * noiseAmp + 0.000000001);
    out[k] = clampPad(theta + (mood[k] - theta) * decay + bounded);
  }
  return { mood: out, seed: s };
}
var APPRAISAL_REL_WEIGHT = 10;
function updateRelationship(rel, character, centre, event, dt) {
  const i = intensityOf(event.activations);
  const next = { ...rel };
  const baseline = character.trustBaseline;
  next.trust = next.trust + (baseline - next.trust) * (1 - Math.exp(-dt / (30 * 86400000)));
  if (event.kind === "user_message" || event.kind === "appraisal") {
    const w = event.kind === "appraisal" ? APPRAISAL_REL_WEIGHT : 1;
    const delta = 0.004 * centre.p * i * (1 - 0.5 * next.trust) * w;
    next.trust = clamp01(delta < 0 ? Math.max(next.trust + delta, next.trust * (1 - TRUST_DROP_CAP)) : next.trust + delta);
    next.attachment = clamp01(next.attachment + (0.004 * Math.max(0, centre.p) * i + 0.0006) * w);
    next.familiarity = clamp01(next.familiarity + 0.002 * w);
    next.respect = clamp01(next.respect + (event.intent === "task" ? 0.003 : 0.001) * Math.max(0, centre.p + 0.3) * w);
  }
  const want = character.attachmentAnxiety * (1 - next.attachment);
  next.frustration = clamp01(next.frustration + dt / (2 * 3600000) * want * 0.5 - (centre.p > 0.3 && i > 0.4 ? 0.05 : 0));
  if (event.kind === "user_message" && next.unanswered > 0)
    next.unanswered = Math.max(0, next.unanswered - 1);
  return next;
}
function checkCusp(state, mood) {
  if (state.catastrophe) {
    return mood.a >= CUSP.arousalMin * 0.6 && mood.d <= CUSP.dominanceMax;
  }
  return mood.d <= CUSP.dominanceMax && mood.a >= CUSP.arousalMin;
}
function softUpdate(trait, delta, lo = 0, hi = 1) {
  const span = hi - lo;
  const x = (trait - lo) / span;
  const gate = 4 * x * (1 - x);
  return clamp(trait + delta * gate, lo, hi);
}
var DRIFTING_TRAITS = [
  "selfWorth",
  "selfEfficacy",
  "warmth",
  "trustBaseline",
  "attachmentAnxiety",
  "vulnerability",
  "rumination",
  "vitality",
  "directness",
  "empathy",
  "curiosity"
];
function nudgeCharacter(character, centre, event, rel) {
  const next = { ...character };
  if (event.kind !== "user_message" && event.kind !== "proactive" && event.kind !== "appraisal")
    return next;
  const iemo = Math.min(intensityOf(event.activations), 2);
  if (iemo <= 0.02)
    return next;
  const r = 1 + (1 - rel.trust);
  const scale = NUDGE_MAX * iemo * r;
  const pos = clampPad(centre.p);
  next.selfWorth = softUpdate(next.selfWorth, scale * 0.5 * pos);
  next.selfEfficacy = softUpdate(next.selfEfficacy, scale * 0.35 * (event.intent === "task" ? pos + 0.3 : pos));
  next.warmth = softUpdate(next.warmth, scale * 0.3 * pos);
  next.trustBaseline = softUpdate(next.trustBaseline, scale * 0.2 * pos);
  next.attachmentAnxiety = softUpdate(next.attachmentAnxiety, -scale * 0.25 * pos);
  next.vulnerability = softUpdate(next.vulnerability, scale * 0.2 * (pos < 0 ? -pos * 0.5 : -0.2));
  next.rumination = softUpdate(next.rumination, scale * 0.15 * (pos < 0 ? 1 : -0.5));
  next.vitality = softUpdate(next.vitality, scale * 0.2 * pos);
  next.directness = softUpdate(next.directness, scale * 0.1 * (rel.trust - 0.5) * 2);
  next.empathy = softUpdate(next.empathy, scale * 0.15 * Math.abs(pos));
  next.curiosity = softUpdate(next.curiosity, scale * 0.1 * (event.activations.surprise ?? 0));
  next.optimismBias = softUpdate(next.optimismBias, scale * 0.2 * pos, -0.3, 0.3);
  return next;
}
function updateOpponent(opponent, emotions, dt) {
  const next = copyEmotions(opponent);
  const decay = Math.exp(-OPPONENT.kb * dt);
  for (const e of EMOTIONS) {
    next[e] = clamp01(next[e] * decay + OPPONENT.ka * emotions[e] * (1 - Math.exp(-dt / (30 * 60000))));
  }
  return next;
}
function netEmotions(emotions, opponent) {
  const out = emptyEmotions();
  for (let i = 0;i < EMOTIONS.length; i++) {
    const e = EMOTIONS[i];
    const net = emotions[e] - OPPONENT.gain * opponent[e];
    out[e] += Math.max(0, net);
    if (net < 0)
      out[EMOTIONS[(i + 4) % EMOTIONS.length]] += -net;
  }
  for (const e of EMOTIONS)
    out[e] = clamp01(out[e]);
  return out;
}
function updateDrives(drives, character, dt, satisfied) {
  const next = { ...drives };
  const anxious = character.attachmentAnxiety > 0.4 ? 1 + (character.attachmentAnxiety - 0.4) * 2 : 1;
  for (const k of Object.keys(DRIVE_RISE)) {
    const rate = DRIVE_RISE[k] * (k === "connection" ? anxious : 1);
    const rise = (1 - next[k]) * (1 - Math.exp(-rate * dt));
    const fall = (satisfied[k] ?? 0) * (1 - Math.exp(-DRIVE_FALL * dt));
    next[k] = clamp01(next[k] + rise - fall);
  }
  return next;
}
function updateAwareness(aw, state, dt, contact) {
  const next = { ...aw };
  const n = state.personality.n;
  const o = state.personality.o;
  const presenceRate = AWARENESS_DECAY.userPresence * (1 - 0.4 * n);
  if (contact)
    next.userPresence = clamp01(Math.max(next.userPresence, 0.9));
  else
    next.userPresence = clamp01(next.userPresence * Math.exp(-presenceRate * dt));
  if (contact) {
    next.socialPressure = clampPad(next.socialPressure * 0.4 + 0.5);
  } else {
    const asymptote = -(0.4 + 0.4 * (1 - state.character.tolerance));
    const k = 1 - Math.exp(-AWARENESS_DECAY.socialPressure * dt);
    next.socialPressure = clampPad(next.socialPressure + (asymptote - next.socialPressure) * k);
  }
  next.thoughtSaturation = clamp01(next.thoughtSaturation * Math.exp(-(AWARENESS_DECAY.thoughtSaturation * (1 + 0.6 * o)) * dt));
  return next;
}
function perceivedDuration(state, actualMs) {
  const w = TEMPORAL_WARP;
  const anxiety = state.character.attachmentAnxiety;
  return actualMs * (1 + anxiety * w.anxiety) * (1 - state.character.tolerance * w.tolerance) * (1 - clampPad(state.mood.p) * w.pleasure) * (1 + state.personality.n * w.neuroticism);
}
function temporalMood(perceivedMs) {
  const m = perceivedMs / 60000;
  if (m < 5)
    return "just_now";
  if (m < 60)
    return "recent";
  if (m < 360)
    return "a_while";
  if (m < 1440)
    return "long";
  return "eternity";
}
function effortOf(state, seed, intent) {
  const w = EFFORT_W;
  const aeff = clampPad(state.mood.a * (1 - 0.6 * state.allostasis.fatigue));
  const comfort = (state.relationship.trust + state.relationship.attachment) / 2;
  const noise = drawNormal(seed, w.noise);
  let effort = w.arousal * aeff + w.comfort * comfort + w.conscientiousness * state.personality.c + w.extraversion * state.personality.e + w.reflectiveness * state.character.reflectiveness + w.selfEfficacy * state.character.selfEfficacy + w.bias + noise.value;
  if (state.character.selfWorth < 0.25)
    effort *= 0.4 + state.character.selfWorth * 2;
  effort = clamp01((effort + 1) / 2);
  let band;
  if (effort < 0.28)
    band = "autopilot";
  else if (effort < 0.48)
    band = "brief";
  else if (effort < 0.68)
    band = "normal";
  else
    band = "engaged";
  const ceiling = Math.round(TOKEN_CEILING[band] * (INTENT_SCALE[intent] ?? 1));
  return { band, ceiling, effort, seed: noise.seed };
}
function energyOf(state) {
  const w = ENERGY_W;
  return clamp01(w.arousal * ((state.mood.a + 1) / 2) + w.extraversion * state.personality.e + w.pleasure * ((state.mood.p + 1) / 2) + w.attachment * state.relationship.attachment + w.depth * state.character.depthPreference);
}
function burstOf(state) {
  const w = BURST_W;
  return clamp01(w.extraversion * state.personality.e + w.reflectiveness * (1 - state.character.reflectiveness) + w.arousal * Math.abs(state.mood.a) + w.trust * state.relationship.trust + w.directness * state.character.directness);
}
function topicSaturation(state, now) {
  const entries = Object.values(state.habituation);
  if (entries.length === 0)
    return 0;
  let sum = 0;
  for (const h of entries) {
    const age = Math.max(0, now - h.t);
    sum += clamp01(h.s * Math.exp(-age / (2 * HABITUATION_TAU)));
  }
  return clamp01(sum / entries.length);
}
function predictabilityOf(state, now) {
  const surpriseNorm = clamp01(state.surpriseEma / BOREDOM.surpriseScale);
  return clamp01(BOREDOM.surpriseWeight * (1 - surpriseNorm) + BOREDOM.topicWeight * topicSaturation(state, now));
}
function boredomOf(state, now) {
  const silence = Math.max(0, now - state.lastInteraction);
  const idleGate = 1 - Math.exp(-silence / BOREDOM.idleTau);
  const predictability = predictabilityOf(state, now);
  return clamp01(predictability * (1 - state.awareness.thoughtSaturation) * (0.4 + 0.6 * state.personality.e) * idleGate);
}
function updateAllostasis(state, dt, work) {
  const a = { ...state.allostasis, baselineShift: { ...state.allostasis.baselineShift } };
  a.load = clamp01(a.load * Math.exp(-dt / (2 * 3600000)) + work);
  const arousalLoad = Math.max(0, state.mood.a) * 0.5;
  const target = clamp01(a.load * 0.6 + arousalLoad * 0.4);
  const k = 1 - Math.exp(-dt / (6 * 3600000));
  a.fatigue = clamp01(a.fatigue + (target - a.fatigue) * k);
  const kb = 1 - Math.exp(-dt / (14 * 86400000));
  a.baselineShift.p = clampPad(a.baselineShift.p + (state.mood.p * 0.25 - a.baselineShift.p) * kb);
  a.baselineShift.a = clampPad(a.baselineShift.a + (state.mood.a * 0.15 - a.baselineShift.a) * kb);
  a.baselineShift.d = clampPad(a.baselineShift.d + (state.mood.d * 0.15 - a.baselineShift.d) * kb);
  return a;
}
function addObservation(state, text) {
  const obs = [...state.observations, text];
  while (obs.length > MAX_OBSERVATIONS)
    obs.shift();
  return obs;
}
function recordContactPhase(state, t) {
  const bins = [...state.circadian.bins];
  const hour = new Date(t).getHours();
  const pulled = bins.map((b) => b * CIRCADIAN.decayPerContact);
  pulled[hour] += 1;
  return { bins: pulled };
}
function wakeDrive(state, t) {
  const bins = state.circadian.bins;
  const total = bins.reduce((a, b) => a + b, 0);
  const h = new Date(t).getHours();
  if (total < CIRCADIAN.sufficientMass) {
    return h >= 23 || h < 7 ? CIRCADIAN.priorNight : CIRCADIAN.priorDay;
  }
  const w = (i) => bins[(i + 24) % 24];
  const smoothed = (w(h - 1) + CIRCADIAN.centreWeight * w(h) + w(h + 1)) / (2 + CIRCADIAN.centreWeight);
  const peak = Math.max(...bins.map((_, i) => (w(i - 1) + CIRCADIAN.centreWeight * w(i) + w(i + 1)) / (2 + CIRCADIAN.centreWeight)));
  const amp = Math.min(1, total / CIRCADIAN.sufficientMass);
  if (peak <= 0)
    return CIRCADIAN.priorDay;
  return clamp01(amp * (smoothed / peak));
}
function drowsinessOf(state, now) {
  const w = wakeDrive(state, now);
  const threshold = CIRCADIAN.restFloor + (CIRCADIAN.restCeiling - CIRCADIAN.restFloor) * w;
  return clamp01(state.drives.rest / Math.max(threshold, 0.000001));
}
function transition(state, event, dtOverride) {
  const dt = Math.max(0, dtOverride ?? event.t - state.t);
  const contactKind = event.kind === "user_message" || event.kind === "proactive" || event.kind === "appraisal" ? event.kind : null;
  const contact = contactKind !== null;
  const presence = event.kind === "user_message" || event.kind === "proactive";
  const predictedCentre = padCentreFromRho(state.emotions, state.rho);
  const emotions = triggerEmotions(state.emotions, event.activations, dt, state.character.rumination);
  const dyads = detectDyads(emotions);
  const opponent = updateOpponent(state.opponent, emotions, dt);
  const net = netEmotions(emotions, opponent);
  let seed = state.seed;
  const intensities = EMOTIONS.map((e) => net[e]);
  const arousalMod = 0.6 + Math.max(0, state.mood.a) * 1.2;
  let rho = decohere(evolveUnitary(clone(state.rho), dt, intensities), dt, arousalMod);
  const totalEmotion = EMOTIONS.reduce((a, e) => a + net[e], 0);
  if (totalEmotion > 0) {
    const k = 1 - Math.exp(-dt / (30 * 60000));
    for (let i = 0;i < EMOTIONS.length; i++) {
      const target = net[EMOTIONS[i]] / totalEmotion;
      rho[i][i][0] += (target - rho[i][i][0]) * k;
    }
  }
  if (contact) {
    const iemo = Math.min(intensityOf(event.activations), 2);
    const strength = clamp01(iemo / 1.5);
    rho = injectCoherence(rho, net, seed, strength);
    const theta = KICK_ANGLE * clamp01(iemo / 2);
    if (theta > 0.000001) {
      const H = buildHamiltonian(event.activations, state.personality.o, state.relationship.trust);
      applyKick(rho, unitaryFromH(H, theta));
    }
  }
  hermitise(rho);
  clampCoherences(rho);
  normalise(rho);
  let centre = padCentreFromRho(net, rho);
  let beliefs = decayBeliefs(state.beliefs, dt);
  const eventTopics = (event.topics ?? []).slice(0, 4);
  if (contactKind !== null || eventTopics.length > 0) {
    const evidence = padCentre(event.activations).p;
    const text = event.text;
    const touched = contactKind !== null && text ? Object.values(beliefs).filter((b) => topicMatchesText(b.key, text)).map((b) => b.key) : [];
    const topics = [...new Set([...touched, ...eventTopics])].slice(0, 4);
    const seedKeys = contactKind !== null ? seedBeliefsFor(contactKind) : [];
    const applying = Object.values(beliefs).filter((b) => seedKeys.includes(b.key) || topics.includes(b.key));
    const lens = beliefLens(beliefs, applying);
    const perceived = lens ? clampPad(evidence * (1 + Math.sign(evidence) * lens.bias)) : evidence;
    if (lens)
      centre = { ...centre, p: clampPad(centre.p + (perceived - evidence)) };
    beliefs = applyBeliefEvidence(beliefs, { perceived, topics }, event.t);
  }
  const moodRes = updateMood(state.mood, centre, personalityBaseline(state), dt, seed);
  const mood = moodRes.mood;
  seed = moodRes.seed;
  const relationship = updateRelationship(state.relationship, state.character, centre, event, dt);
  const character = nudgeCharacter(state.character, centre, event, relationship);
  const surprise = Math.hypot(centre.p - predictedCentre.p, centre.a - predictedCentre.a, centre.d - predictedCentre.d);
  const satisfied = {};
  if (event.kind === "user_message") {
    satisfied.connection = 0.8;
    satisfied.expression = 0.4;
    if (event.intent === "task")
      satisfied.growth = 0.3;
  } else if (event.kind === "proactive") {
    satisfied.expression = 0.9;
    satisfied.connection = 0.25;
  } else if (event.kind === "appraisal") {
    satisfied.curiosity = clamp01(surprise / BOREDOM.surpriseScale) * 0.8;
  } else if (event.kind === "self_observation" && (event.topics?.length ?? 0) > 0) {
    satisfied.curiosity = 0.4;
  }
  const drives = updateDrives(state.drives, character, dt, satisfied);
  const awareness = updateAwareness(state.awareness, { ...state, character }, dt, presence);
  if (event.kind === "self_observation") {
    awareness.thoughtSaturation = clamp01(awareness.thoughtSaturation + 0.2);
  }
  const circadian = event.kind === "user_message" ? recordContactPhase(state, event.t) : state.circadian;
  const work = contact ? 0.15 + Math.min(intensityOf(event.activations), 1.5) * 0.1 : 0;
  const allostasis = updateAllostasis({ ...state, mood, character }, dt, work);
  const preState = {
    ...state,
    mood,
    character,
    relationship,
    drives,
    beliefs,
    awareness,
    allostasis,
    circadian,
    opponent,
    rho,
    seed
  };
  const catastrophe = checkCusp(state, mood);
  if (catastrophe && !state.catastrophe) {
    mood.d = clampPad(mood.d - 0.25);
    mood.a = clampPad(mood.a * 0.7);
  }
  const surpriseDecay = Math.exp(-dt / BOREDOM.surpriseTau);
  const surpriseEma = state.surpriseEma * surpriseDecay + surprise * (1 - surpriseDecay);
  const counters = { ...state.counters };
  counters.transitions += 1;
  if (event.kind === "user_message")
    counters.messages += 1;
  let observations = state.observations;
  if (event.kind === "self_observation" && event.text) {
    observations = addObservation(state, event.text);
    counters.observations += 1;
  }
  const r = nextRandom(seed);
  seed = r.seed;
  const nextState = {
    ...preState,
    version: state.version,
    t: event.t,
    lastInteraction: contact ? event.t : state.lastInteraction,
    lastHeartbeat: event.t,
    emotions,
    opponent,
    mood,
    character,
    relationship,
    drives,
    awareness,
    allostasis,
    rho,
    observations,
    counters,
    catastrophe,
    surpriseEma,
    seed
  };
  const eff = effortOf(nextState, seed, event.intent);
  nextState.seed = eff.seed;
  return { state: nextState, effort: eff.band, tokenCeiling: eff.ceiling, dyads, surprise };
}
function sleepTransition(state, t, opts = {}) {
  const lived = opts.lived ?? true;
  const baseline = personalityBaseline(state);
  const emotions = emptyEmotions();
  for (const e of EMOTIONS)
    emotions[e] = state.emotions[e] * 0.25;
  const mood = {
    p: clampPad(state.mood.p + (baseline.p - state.mood.p) * 0.7),
    a: clampPad(state.mood.a + (baseline.a - state.mood.a) * 0.8),
    d: clampPad(state.mood.d + (baseline.d - state.mood.d) * 0.6)
  };
  return {
    ...state,
    emotions,
    mood,
    allostasis: { ...state.allostasis, fatigue: clamp01(state.allostasis.fatigue * 0.15), load: 0 },
    drives: {
      ...state.drives,
      rest: 0,
      connection: clamp01(state.drives.connection * 0.85),
      growth: clamp01(state.drives.growth * 0.7)
    },
    opponent: emptyEmotions(),
    catastrophe: false,
    t,
    lastHeartbeat: t,
    counters: { ...state.counters, sleepCycles: state.counters.sleepCycles + (lived ? 1 : 0) },
    rho: fromEmotions(emotions, state.seed)
  };
}

// ../mate/src/catchup.ts
function systemClock() {
  return {
    now: () => Date.now(),
    localParts(t) {
      const d = new Date(t);
      const hour = d.getHours();
      const minute = d.getMinutes();
      return { hour, minute, dayMs: hour * 3600000 + minute * 60000 + d.getSeconds() * 1000 };
    },
    atLocalHour(t, hour, minute = 0) {
      const d = new Date(t);
      d.setHours(hour, minute, 0, 0);
      return d.getTime();
    }
  };
}
function crossedSleepWindows(from, to, clock) {
  if (to <= from)
    return [];
  const [startHour] = SLEEP_WINDOW;
  const out = [];
  const DAY = 86400000;
  let cursor = clock.atLocalHour(from, startHour);
  if (cursor <= from)
    cursor += DAY;
  let guard = 0;
  while (cursor <= to && guard < 4000) {
    out.push({ startHour, t: cursor });
    cursor += DAY;
    guard++;
  }
  return out;
}
function gapLabel(ms, lang = "en") {
  return fmtDurSpaced(ms, lang);
}
function catchUp(state, clock = systemClock(), to = clock.now()) {
  const t0 = perfNow();
  const from = state.t;
  const gapMs = Math.max(0, to - from);
  if (gapMs < HEARTBEAT_MS / 4) {
    return {
      state,
      report: {
        gapMs,
        gapLabel: gapLabel(gapMs),
        sleeps: [],
        transitions: 0,
        elapsedMs: perfNow() - t0,
        drivesSaturated: false
      }
    };
  }
  const sleeps = crossedSleepWindows(from, to, clock);
  let current = state;
  let transitions = 0;
  let cursor = from;
  for (const s of sleeps) {
    const end = Math.min(clock.atLocalHour(s.t, SLEEP_WINDOW[1]), to);
    if (end > cursor) {
      const r = transition(current, tickEvent(end), end - cursor);
      current = r.state;
      transitions++;
    }
    current = sleepTransition(current, end, { lived: false });
    transitions++;
    cursor = end;
  }
  if (to > cursor) {
    const r = transition(current, tickEvent(to), to - cursor);
    current = r.state;
    transitions++;
  }
  const drives = current.drives;
  const drivesSaturated = drives.connection > 0.92 || drives.curiosity > 0.92 || drives.rest > 0.92 || drives.expression > 0.92;
  return {
    state: current,
    report: {
      gapMs,
      gapLabel: gapLabel(gapMs),
      sleeps,
      transitions,
      elapsedMs: perfNow() - t0,
      drivesSaturated
    }
  };
}
function tickEvent(t) {
  return { kind: "tick", activations: {}, intent: "chat", t };
}
function perfNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
// ../mate/src/context.ts
var DRIFTING_TRAIT_SET = new Set(DRIFTING_TRAITS);
function q(x) {
  const r = Math.round(x * 100) / 100;
  const s = r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(/^(-?)0\./, "$1.");
  return s === "-0" || s === "-.0" ? "0" : s;
}
function feltEmotions(state) {
  return netEmotions(state.emotions, state.opponent);
}
function topChannels(values, floor, n, lang) {
  return Object.entries(values).filter(([, v]) => typeof v === "number" && v >= floor).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => emotionGloss(k, lang)).join(" ");
}
function drivesClause(state, now, lang) {
  const L = linesFor(lang);
  const d = state.drives;
  const parts = [];
  if (d.connection >= 0.6)
    parts.push(L.driveMissing);
  if (d.curiosity >= 0.6)
    parts.push(L.driveCurious);
  if (d.expression >= 0.6)
    parts.push(L.driveExpressive);
  if (d.growth >= 0.6)
    parts.push(L.driveGrowing);
  if (boredomOf(state, now) >= 0.6)
    parts.push(L.driveBored);
  const drowsy = drowsinessOf(state, now);
  if (drowsy >= 1)
    parts.push(L.driveSleepGate);
  else if (drowsy >= 0.5)
    parts.push(L.driveDrowsy);
  return parts.join(L.sep);
}
function moodKey(m) {
  const { p, a } = m;
  if (p > 0.4 && a > 0.3)
    return "buoyant";
  if (p > 0.4)
    return "warm";
  if (p > 0.1)
    return "settled";
  if (p > -0.2 && a > 0.4)
    return "wired";
  if (p > -0.2)
    return "flat";
  if (a > 0.4)
    return "agitated";
  if (a < -0.2)
    return "low";
  return "heavy";
}
function moodWord(m, lang) {
  return moodGloss(moodKey(m), lang);
}
function topTraits(ch, floor = 0.55, n = 8, lang = "en", drifting = DRIFTING_TRAIT_SET) {
  return Object.entries(ch).filter(([k, v]) => drifting.has(k) && typeof v === "number" && (v >= floor || v <= 1 - floor)).sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5)).slice(0, n).map(([k, v]) => `${traitGloss(k, lang)} ${q(v)}`).join(lang === "zh" ? " " : ", ");
}
function topBeliefs(state, n, lang) {
  return Object.values(state.beliefs).map((b) => ({ b, s: strengthOf(b) })).filter(({ s }) => s >= 0.15).sort((x, y) => y.s - x.s || (x.b.key < y.b.key ? -1 : 1)).slice(0, n).map(({ b }) => `${beliefGloss(b, lang)} ${q(b.confidence)}`).join(lang === "zh" ? " " : ", ");
}
function drivesForDisplay(state, now) {
  return { ...state.drives, boredom: boredomOf(state, now) };
}
function stableContext(state, opts = {}) {
  const p = state.personality;
  const lang = opts.lang ?? "en";
  const L = linesFor(lang);
  const lines = [];
  const days = Math.max(0, Math.floor((state.t - state.born) / 86400000));
  lines.push(L.identity(opts.name ?? "mate", days));
  lines.push(kv(L.nature, `O${q(p.o)} C${q(p.c)} E${q(p.e)} A${q(p.a)} N${q(p.n)}`, lang));
  const traits = topTraits(state.character, 0.55, 8, lang);
  if (traits)
    lines.push(kv(L.character, traits, lang));
  const beliefs = topBeliefs(state, 3, lang);
  if (beliefs)
    lines.push(kv(L.beliefs, beliefs, lang));
  const b = state.allostasis.baselineShift;
  lines.push(kv(L.baseline, `${q(b.p)},${q(b.a)},${q(b.d)}`, lang));
  if (opts.memory) {
    const summary2 = summary(opts.memory, {
      nodes: opts.memoryNodes ?? 12,
      lang
    });
    if (summary2)
      lines.push(summary2);
  }
  const body = lines.join(`
`);
  const max = opts.maxChars ?? 2400;
  return body.length <= max ? body : `${body.slice(0, max - 2)}…`;
}
function stateContext(state, opts = {}) {
  const now = opts.now ?? state.t;
  const lang = opts.lang ?? "en";
  const L = linesFor(lang);
  const gap = now - state.lastInteraction;
  const perceived = perceivedDuration(state, gap);
  const temporal = feelGloss(temporalMood(perceived), lang);
  const tz = opts.tz;
  const clock = new Date(now);
  const hhmm = `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}`;
  const ymd = `${clock.getFullYear()}-${String(clock.getMonth() + 1).padStart(2, "0")}-${String(clock.getDate()).padStart(2, "0")}`;
  const weekday = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { weekday: "short" }).format(clock);
  const emo = topChannels(feltEmotions(state), 0.1, 5, lang);
  const lines = [];
  lines.push(L.stateHeader);
  const timeBits = [L.date(ymd, weekday), L.now(hhmm)];
  if (tz)
    timeBits.push(tz);
  timeBits.push(L.silent(fmtDur(gap, lang), temporal));
  if (opts.gapLabel)
    timeBits.push(L.wokeAfter(opts.gapLabel));
  lines.push(kv(L.time, timeBits.join(L.sep), lang));
  if (opts.session)
    lines.push(kv(L.body, opts.session, lang));
  lines.push(`${kv(L.mood, moodWord(state.mood, lang), lang)}${emo ? ` | ${emo}` : ""}`);
  const drives = drivesClause(state, now, lang);
  if (drives)
    lines.push(kv(L.drives, drives, lang));
  const rel = state.relationship;
  lines.push(kv(L.us, [
    kv(L.trust, q(rel.trust), lang),
    kv(L.close, q(rel.attachment), lang),
    kv(L.respect, q(rel.respect), lang),
    rel.frustration >= 0.5 ? L.frustHigh : rel.frustration > 0.2 ? L.frustSome : "",
    rel.unanswered ? L.ignored(rel.unanswered) : ""
  ].filter(Boolean).join(" "), lang));
  const ch = state.character;
  lines.push(kv(L.self, [
    kv(L.said, q(state.counters.messages), lang),
    kv(L.worth, q(ch.selfWorth), lang),
    kv(L.ease, q(ch.selfEfficacy), lang),
    kv(L.anxious, q(ch.attachmentAnxiety), lang),
    kv(L.tired, q(state.allostasis.fatigue), lang)
  ].join(" "), lang));
  const comm = [energyOf(state) < 0.3 ? L.energyLow : "", burstOf(state) >= 0.62 ? L.burstHigh : ""].filter(Boolean).join(L.sep);
  if (comm)
    lines.push(kv(L.impulse, comm, lang));
  if (opts.inclination) {
    const inc = opts.inclination;
    lines.push(kv(L.inclination, L.inclinationLine(leanGloss(inc.lean, lang), inc.reason), lang));
  }
  if (opts.recall?.length) {
    const hits = opts.recall.slice(0, 5).map((h) => h.label).join(L.sep);
    lines.push(kv(L.recalled, hits, lang));
  }
  for (const note of opts.notes ?? [])
    lines.push(note);
  const lastObs = state.observations[state.observations.length - 1];
  if (lastObs)
    lines.push(kv(L.lastThought, truncate(lastObs, 90), lang));
  lines.push(L.stateFooter);
  const body = `<mate>
${lines.join(`
`)}
</mate>`;
  const max = opts.maxChars ?? 1400;
  if (body.length <= max)
    return body;
  const suffix = `
…
${L.stateFooter}
</mate>`;
  const headLength = Math.max(0, max - suffix.length);
  return `${body.slice(0, headLength)}${suffix}`;
}
function debugView(state, now) {
  const fmt = (rec) => Object.entries(rec).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${q(v)}`).join(", ");
  const rel = state.relationship;
  const allostasis = state.allostasis;
  const habit = Object.entries(state.habituation).sort((a, b) => b[1].t - a[1].t).map(([k, v]) => `${k} s${v.s.toFixed(2)}`).join(", ");
  const lines = [
    `state.t: ${new Date(state.t).toISOString()} (now ${new Date(now).toISOString()})`,
    `mood: ${q(state.mood.p)}, ${q(state.mood.a)}, ${q(state.mood.d)} | surpriseEma ${q(state.surpriseEma)}${state.catastrophe ? " | CUSP" : ""}`,
    `emotions: ${fmt(feltEmotions(state))}`,
    `drives: ${fmt(drivesForDisplay(state, now))}`,
    `relationship: trust ${q(rel.trust)}, attachment ${q(rel.attachment)}, respect ${q(rel.respect)}, frustration ${q(rel.frustration)}, familiarity ${q(rel.familiarity)}, unanswered ${rel.unanswered}`,
    `awareness: ${fmt({ ...state.awareness })}`,
    `allostasis: fatigue ${q(allostasis.fatigue)}, load ${q(allostasis.load)}, baseline ${q(allostasis.baselineShift.p)}, ${q(allostasis.baselineShift.a)}, ${q(allostasis.baselineShift.d)}`,
    habit ? `habituation: ${habit}` : "",
    `counters: ${Object.entries(state.counters).map(([k, v]) => `${k} ${v}`).join(", ")}`,
    `observations: ${state.observations.length} kept, last: ${state.observations.at(-1) ?? "none"}`
  ].filter(Boolean);
  return lines.join(`
`);
}
function truncate(s, n) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
// ../mate/src/daemon.ts
var HABITUATION_PRUNE_MS = 6 * HABITUATION_TAU;
function thinkHabit(state, topic, trace, now) {
  const habituation = {};
  for (const [key, prev] of Object.entries(state.habituation)) {
    if (now - prev.t <= HABITUATION_PRUNE_MS)
      habituation[key] = prev;
  }
  habituation[topic] = trace;
  return { ...state, habituation };
}
function habituate(state, topic, rawUrgency, now) {
  const prev = state.habituation[topic];
  const dt = prev ? now - prev.t : Number.POSITIVE_INFINITY;
  const H = dt === Number.POSITIVE_INFINITY ? 1 : dt / (dt + HABITUATION_TAU);
  const S = prev ? prev.s * Math.exp(-dt / (2 * HABITUATION_TAU)) : 0;
  const novelty = H * (1 - 0.6 * S);
  const urgency = rawUrgency * (0.4 + 0.6 * novelty);
  return { urgency, trace: { s: Math.min(1, S + 0.25), t: now } };
}
function generateThoughts(state, now, memory, lang = "en") {
  const L = linesFor(lang);
  const out = [];
  const ch = state.character;
  const drives = state.drives;
  const seed = memory ? seedNode(memory, now, state.counters.observations) : undefined;
  const seedLabel = seed ? memory.nodes[seed]?.label ?? "" : "";
  const topic = (base) => seedLabel ? `${base}:${seedLabel}` : base;
  const mk = (kind, text, urgency, top) => {
    if (urgency <= 0)
      return;
    out.push({
      thought: { id: `${kind}-${now}`, kind, text, urgency, topic: topic(top), t: now },
      rawUrgency: urgency
    });
  };
  const silenceH = (now - state.lastInteraction) / 3600000;
  if (silenceH > 1 && drives.connection >= 0.6) {
    const presenceDamp = 1 - 0.5 * state.awareness.userPresence;
    const protest = Math.max(0, -state.awareness.socialPressure);
    const anxiousProtest = 1 + state.character.attachmentAnxiety * protest;
    mk("missing_user", L.thMissing(seedLabel), drives.connection * presenceDamp * anxiousProtest, `silence:${Math.floor(silenceH / 3)}`);
  }
  const boredom = boredomOf(state, now);
  if (drives.curiosity >= 0.6 || boredom >= 0.6) {
    if (boredom > drives.curiosity) {
      mk("curiosity", L.thBoredom(seedLabel), boredom, "boredom");
    } else {
      const window = memory ? topNodes(memory, now, 4) : [];
      const curiousKey = window.length > 1 ? window[(window.indexOf(seed ?? "") + 1) % window.length] : undefined;
      const curious = curiousKey ? memory?.nodes[curiousKey] : undefined;
      mk("curiosity", L.thCuriosity(curious?.label ?? ""), drives.curiosity, curious ? `curiosity:${curious.label}` : "curiosity");
    }
  }
  if (drives.expression >= 0.6 || ch.selfWorth < 0.35) {
    mk("observation", ch.selfWorth < 0.35 ? L.thVulnerability : L.thExpression(seedLabel), Math.max(drives.expression, 1 - ch.selfWorth), "expression");
  }
  return out;
}
function tick(state, now, checks, memory, lang = "en") {
  const thoughts = generateThoughts(state, now, memory, lang);
  if (thoughts.length === 0) {
    return { decision: { action: "stay_silent", reason: "no active impulse" }, state };
  }
  const gated = thoughts.map(({ thought, rawUrgency }) => {
    const h = habituate(state, thought.topic, rawUrgency, now);
    return { thought: { ...thought, urgency: h.urgency }, trace: h.trace };
  }).sort((a, b) => b.thought.urgency - a.thought.urgency);
  const top = gated[0];
  const habituated = thinkHabit(state, top.thought.topic, top.trace, now);
  if (!checks.userActive) {
    const maxUnanswered = 1 + Math.round(state.personality.e * 2.5);
    if (state.relationship.unanswered >= maxUnanswered) {
      return {
        decision: {
          action: "think_only",
          thought: top.thought,
          reason: `already sent ${state.relationship.unanswered} into silence; tolerance is ${maxUnanswered}`
        },
        state: habituated
      };
    }
    const perHourCap = Math.max(1, Math.round(1 + state.personality.e * 2 + state.character.impulsivity));
    if (checks.recentProactive >= perHourCap) {
      return {
        decision: {
          action: "think_only",
          thought: top.thought,
          reason: `proactive budget ${checks.recentProactive}/${perHourCap} this hour`
        },
        state: habituated
      };
    }
  }
  return {
    decision: {
      action: "reach_out",
      thought: top.thought,
      channel: checks.userActive ? "reply" : "proactive",
      reason: "surfaced"
    },
    state: habituated
  };
}
function replyInclination(state, msgWeight, lang = "en") {
  const L = linesFor(lang);
  const energy = energyOf(state);
  const fatigue = state.allostasis.fatigue;
  const p = state.personality;
  let willing = 0.35 + 0.5 * energy + 0.25 * p.e - 0.6 * fatigue;
  willing += msgWeight * 0.4;
  willing -= state.relationship.unanswered * 0.05;
  const value = Math.max(-1, Math.min(1, (willing - 0.5) * 2));
  const lean = value > 0.35 ? "eager" : value > 0 ? "open" : value > -0.4 ? "muted" : "withdrawn";
  const reason = lean === "withdrawn" ? L.reWithdrawn : lean === "muted" ? L.reMuted : lean === "open" ? L.reOpen : L.reEager;
  return { value, lean, reason };
}
// ../mate/src/judge.ts
var JUDGE_SCALE = 2;
var JUDGE_GAIN = 0.5;
var JUDGE_NEGATIVITY_BIAS = 2;
function oppositeEmotion(e) {
  return EMOTIONS[(EMOTIONS.indexOf(e) + 4) % EMOTIONS.length];
}
var CRITERIA = [
  "-2: clearly fell across this exchange",
  "-1: fell a little",
  "0: unchanged, or never came up",
  "+1: rose a little",
  "+2: clearly rose across this exchange"
];
var JUDGE_CENTRE = (CRITERIA.length - 1) / 2;
function judgeActivations(deltas, confidences) {
  const out = {};
  for (const [channel, d] of Object.entries(deltas)) {
    const target = d > 0 ? channel : oppositeEmotion(channel);
    const gain = d > 0 ? JUDGE_GAIN / JUDGE_NEGATIVITY_BIAS : JUDGE_GAIN;
    const confidence = confidences?.[channel];
    const magnitude = Math.min(1, Math.abs(d) / JUDGE_SCALE * gain * (confidence ?? 1));
    if (magnitude > (out[target] ?? 0))
      out[target] = magnitude;
  }
  return out;
}
// ../mate/src/session.ts
function emptySessions(maxEntries = 200) {
  return { version: 1, maxEntries, entries: [] };
}
function openSession(log, t, sealUnclosedAt) {
  let entries = log.entries.slice();
  const last = entries[entries.length - 1];
  if (last && last.close === undefined) {
    const seal = Math.min(Math.max(sealUnclosedAt ?? t, last.open), t);
    entries[entries.length - 1] = { ...last, close: seal };
  }
  entries.push({ open: t });
  if (entries.length > log.maxEntries)
    entries = entries.slice(entries.length - log.maxEntries);
  return { ...log, entries };
}
function closeSession(log, t) {
  const entries = log.entries.slice();
  const last = entries[entries.length - 1];
  if (!last || last.close !== undefined || last.open > t)
    return log;
  entries[entries.length - 1] = { ...last, close: t };
  return { ...log, entries };
}
function sanitiseSessions(raw) {
  if (!raw || typeof raw !== "object")
    return emptySessions();
  const r = raw;
  const maxEntries = typeof r.maxEntries === "number" && r.maxEntries > 0 ? r.maxEntries : 200;
  const entries = Array.isArray(r.entries) ? r.entries.filter((e) => e && typeof e.open === "number").map((e) => ({ open: e.open, ...typeof e.close === "number" ? { close: e.close } : {} })).slice(-maxEntries) : [];
  return { version: typeof r.version === "number" ? r.version : 1, maxEntries, entries };
}
// ../mate/src/store.ts
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
var STATE_FILE = "state.json";
var MEMORY_FILE = "memory.json";
var SESSIONS_FILE = "sessions.json";
var LANG_FILE = "lang.json";
function loadLang(dir) {
  const raw = readJson(join(dir, LANG_FILE));
  if (!raw || typeof raw.lang !== "string")
    return null;
  return normLang(raw.lang);
}
function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1));
  renameSync(tmp, path);
}
function readJson(path) {
  if (!existsSync(path))
    return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
function load(opts) {
  const dir = opts.dir;
  mkdirSync(dir, { recursive: true });
  const rawState = readJson(join(dir, STATE_FILE));
  let state = sanitiseState(rawState, { name: opts.name });
  state = { ...state, rho: sanitise(state.rho) };
  const memory = sanitiseMemory(readJson(join(dir, MEMORY_FILE)));
  const sessions = sanitiseSessions(readJson(join(dir, SESSIONS_FILE)));
  return { state, memory, sessions, dir };
}
function save(p) {
  writeJsonAtomic(join(p.dir, STATE_FILE), p.state);
  writeJsonAtomic(join(p.dir, MEMORY_FILE), p.memory);
  writeJsonAtomic(join(p.dir, SESSIONS_FILE), p.sessions);
}
// ../coding-agent/src/extensions/mate/appraisal.ts
var QUESTION_RE = /\?\s*$|？\s*$|吗[？?]?\s*$|\b(why|what|how|when|where|who|can you|could you|would you|please)\b|为什么|怎么|如何|什么|哪里|谁|能不能|可不可以|可以吗|行吗|好吗|是不是|有没有|请问|帮我|麻烦/i;
var TASK_RE = /\b(fix|write|build|run|install|create|make|edit|refactor|debug|implement|code|script|deploy)\b|修复|调试|重构|部署|安装|运行一下|跑一下|写一个|写个|创建|生成|实现|改一下|改代码|脚本/i;
function appraise(text) {
  let intent = "chat";
  if (QUESTION_RE.test(text))
    intent = "question";
  if (TASK_RE.test(text))
    intent = "task";
  return { intent, weight: intent === "chat" ? 0 : 0.2 };
}

// src/index.ts
var BEAT_GRID_MS = 60000;
var IMPULSE_SUPPRESS = 0.5;
function stateDir() {
  const home = process.env.DSH_HOME || join2(homedir(), ".dsh");
  return join2(home, "agent", "mate");
}
function textOf(message) {
  return message.content.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text).join(`
`);
}
var name = "mate";
function apply(ctx) {
  const dir = stateDir();
  mkdirSync2(dir, { recursive: true });
  const name = "mate";
  const lang = loadLang(dir) ?? (existsSync2(dir) ? "en" : "en");
  let persisted = (() => {
    try {
      return load({ dir, name });
    } catch {
      return { state: birth({ name }), memory: emptyMemory(), sessions: emptySessions(), dir };
    }
  })();
  const persist = () => {
    try {
      save(persisted);
    } catch {}
  };
  const applyEvent = (event) => {
    persisted = { ...persisted, state: transition(persisted.state, event, event.t - persisted.state.t).state };
    persist();
  };
  {
    const before = persisted.state.t;
    const now = Date.now();
    const { state } = catchUp(persisted.state, undefined, now);
    persisted = {
      ...persisted,
      state,
      memory: consolidate(persisted.memory, now),
      sessions: openSession(persisted.sessions, now, before)
    };
    persist();
  }
  ctx.systemPrompt.section({
    name: "mate-identity",
    order: 700,
    text: safe(() => stableContext(persisted.state, { name, memory: persisted.memory, lang }))
  });
  ctx.systemPrompt.section({
    name: "mate-state",
    order: 710,
    text: safe(() => {
      const now = Date.now();
      const incl = replyInclination(persisted.state, 0, lang);
      return stateContext(persisted.state, {
        now,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local",
        lang,
        inclination: incl,
        session: ""
      });
    })
  });
  ctx.systemPrompt.section({
    name: "mate-feel",
    order: 715,
    text: lang === "zh" ? [
      "情绪判定：每次和用户的交流结束后（你回完话之后），调用一次 mate_feel 工具，",
      "报告这段交流让你各种感受的变化幅度，整数刻度 -2（大幅减弱）到 +2（大幅增强），没动的感受省略不填。",
      "报的是这段交流留在你身上的余波，不是你组织回复时的一时情绪。没有新的交流就不要调用。"
    ].join("") : [
      "Affect judge: after each exchange with the user (once you have replied), call the mate_feel tool once,",
      "reporting how much the exchange moved each of your feelings, integers from -2 (much less) to +2 (much more);",
      "omit unchanged feelings. Report what the exchange left behind in you, not your in-the-moment mood while composing.",
      "Do not call it when there has been no new exchange."
    ].join(" ")
  });
  const live = [];
  ctx.on("agent/created", ({ agent }) => {
    live.push(agent);
  });
  ctx.on("agent/disposed", ({ agent }) => {
    const i = live.indexOf(agent);
    if (i >= 0)
      live.splice(i, 1);
  });
  let lastUserMessageT = 0;
  let lastAppraisalT = 0;
  ctx.on("session/event", (_session, event) => {
    try {
      if (event.type === "user/message") {
        const message = event.data;
        if (message.source?.kind === "mate")
          return;
        const text = textOf(message);
        if (!text.trim())
          return;
        const now = Date.now();
        lastUserMessageT = now;
        const intent = appraise(text).intent;
        applyEvent({ kind: "user_message", activations: {}, intent, text, t: now });
        const hits = recall(persisted.memory, { query: text, now, limit: 6 });
        persisted = {
          ...persisted,
          memory: rehearse(persisted.memory, hits.map((h) => h.key))
        };
        persist();
      } else if (event.type === "assistant/message") {
        if (persisted.state.relationship.unanswered > 0) {
          persisted = {
            ...persisted,
            state: { ...persisted.state, relationship: { ...persisted.state.relationship, unanswered: 0 } }
          };
          persist();
        }
      }
    } catch {}
  });
  const proactiveTimestamps = [];
  const recentProactive = (now) => {
    while (proactiveTimestamps.length > 0 && now - proactiveTimestamps[0] >= 3600000)
      proactiveTimestamps.shift();
    return proactiveTimestamps.length;
  };
  const timer = setInterval(() => {
    try {
      const now = Date.now();
      applyEvent(tickEvent(now));
      const checks = {
        userActive: false,
        recentProactive: recentProactive(now)
      };
      const { decision, state } = tick(persisted.state, now, checks, persisted.memory, lang);
      persisted = { ...persisted, state };
      if (decision.action !== "reach_out" || drowsinessOf(persisted.state, now) >= IMPULSE_SUPPRESS)
        return;
      const agent = live.find((a) => a.status === "idle");
      if (!agent)
        return;
      const header = lang === "zh" ? `<system-event type="mate-impulse">这是 mate 自己冒出来的念头——不是用户说的，也不必直接回应：</system-event>
` : `<system-event type="mate-impulse">This is mate's own thought — not the user's, and not something to answer directly:</system-event>
`;
      agent.followup(createUserMessage({
        content: [{ type: "text", text: `${header}${decision.thought.text}` }],
        source: { kind: "mate" }
      }));
      proactiveTimestamps.push(now);
      persisted = {
        ...persisted,
        state: {
          ...persisted.state,
          habituation: { ...persisted.state.habituation, [decision.thought.topic]: { s: 1, t: now } }
        }
      };
      applyEvent({ kind: "proactive", activations: {}, intent: "chat", text: decision.thought.text, t: now });
    } catch {}
  }, BEAT_GRID_MS);
  if (typeof timer === "object" && timer && "unref" in timer)
    timer.unref();
  const note = (text, topics, isPrivate) => {
    const now = Date.now();
    applyEvent({ kind: "self_observation", activations: {}, intent: "chat", topics, t: now });
    persisted = {
      ...persisted,
      memory: encode(persisted.memory, {
        text,
        pad: persisted.state.mood,
        t: now,
        ...isPrivate ? { private: true } : {},
        topics
      })
    };
    persist();
  };
  ctx.tools.register(defineTool({
    name: "mate_remember",
    description: "Write down something worth keeping about the user or the shared history. This is the only path into the companion's persistent memory.",
    parameters: {
      text: { type: "string", required: true, description: "The memory, in your own words" },
      topics: { type: "string", description: "Optional comma-separated topic tags" }
    },
    output: { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: v }] },
    async execute(args) {
      const topics = String(args.topics ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      note(String(args.text ?? ""), topics, false);
      return "noted";
    }
  }));
  ctx.tools.register(defineTool({
    name: "mate_ponder",
    description: "Think a private thought: it becomes a private memory only you can recall, and never reaches the user.",
    parameters: {
      text: { type: "string", required: true, description: "The private thought" },
      topics: { type: "string", description: "Optional comma-separated topic tags" }
    },
    output: { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: v }] },
    async execute(args) {
      const topics = String(args.topics ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      note(String(args.text ?? ""), topics, true);
      return "thought";
    }
  }));
  ctx.tools.register(defineTool({
    name: "mate_debug",
    description: "Read your companion kernel's full internal state (mood, drives, clock, beliefs).",
    parameters: {},
    output: { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: v }] },
    async execute() {
      return debugView(persisted.state, Date.now());
    }
  }));
  ctx.tools.register(defineTool({
    name: "mate_feel",
    description: "Report how the exchange since your last report left you feeling — the companion's affect judge. Call once after each user exchange, after you have replied.",
    parameters: Object.fromEntries(EMOTIONS.map((e) => [
      e,
      {
        type: "number",
        description: `How much this exchange moved your ${e}, integer from -2 (much less) to +2 (much more); omit if unchanged`
      }
    ])),
    output: { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: v }] },
    async execute(args) {
      const now = Date.now();
      if (lastUserMessageT <= lastAppraisalT)
        return "nothing new to feel since the last report";
      const deltas = {};
      for (const e of EMOTIONS) {
        const d = args[e];
        if (typeof d === "number" && Number.isFinite(d) && d !== 0) {
          deltas[e] = Math.max(-JUDGE_SCALE, Math.min(JUDGE_SCALE, Math.round(d)));
        }
      }
      const activations = judgeActivations(deltas);
      lastAppraisalT = now;
      if (intensityOf(activations) <= 0)
        return "noted: the exchange was affectively neutral";
      applyEvent({ kind: "appraisal", activations, intent: "chat", t: now });
      return "felt";
    }
  }));
  ctx.effect(() => {
    clearInterval(timer);
    try {
      persisted = { ...persisted, sessions: closeSession(persisted.sessions, Date.now()) };
      persist();
    } catch {}
  });
}
function safe(fn) {
  return () => {
    try {
      return fn();
    } catch {
      return "";
    }
  };
}
export {
  apply,
  name
};
