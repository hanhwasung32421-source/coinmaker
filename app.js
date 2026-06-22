/* eslint-disable no-alert */
(() => {
  const CANVAS_W = 462;
  const CANVAS_H = 354;
  const SUPABASE_URL = "https://axcppzioyedwfvtvmilr.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Y3BwemlveWVkd2Z2dHZtaWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDE0ODAsImV4cCI6MjA5NTYxNzQ4MH0.R2dcCJoyBxgW6dzUSP0j8eJX3fMzCBxynda-AKu6aaw";

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("cardCanvas");
  const ctx = canvas.getContext("2d");
  const toastEl = document.getElementById("toast");
  const centerTipEl = document.getElementById("centerTip");
  // (프리셋/크롭 미리보기 UI 제거됨)
  const sideHintEl = document.getElementById("sideHint");

  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  const sb =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

  let saveTimer = null;
  // 초기 로드(loadSettingsFromSupabase) 중에는 저장을 막고, 최초 렌더 이후부터 저장 허용
  let isReadyForSave = false;

  const els = {
    percentMin: document.getElementById("inpPercentMin"),
    percentMax: document.getElementById("inpPercentMax"),
    profitMin: document.getElementById("inpProfitMin"),
    profitMax: document.getElementById("inpProfitMax"),
    symbol: document.getElementById("inpSymbol"),
    side: document.getElementById("inpSide"),
    leverage: document.getElementById("inpLeverage"),
    entry: document.getElementById("inpEntry"),
    entryReal: document.getElementById("inpEntryReal"),
    exit: document.getElementById("inpExit"),
    bgZoom: document.getElementById("inpBgZoom"),
    shiftUp: document.getElementById("btnShiftUp"),
    shiftDown: document.getElementById("btnShiftDown"),
    shiftLeft: document.getElementById("btnShiftLeft"),
    shiftRight: document.getElementById("btnShiftRight"),
    shiftReset: document.getElementById("btnShiftReset"),
    bgX: document.getElementById("inpBgX"),
    bgY: document.getElementById("inpBgY"),
    bgApply: document.getElementById("btnBgApply"),
    bgPosText: document.getElementById("txtBgPos"),

    padX: document.getElementById("inpPadX"),
    topPercentY: document.getElementById("inpTopPercentY"),
    topProfitY: document.getElementById("inpTopProfitY"),
    percentSignDy: document.getElementById("inpPercentSignDy"),
    sectionStartY: document.getElementById("inpSectionStartY"),
    rowGap: document.getElementById("inpRowGap"),
    labelToValueGap: document.getElementById("inpLabelToValueGap"),
    sideDx: document.getElementById("inpSideDx"),
    sideDy: document.getElementById("inpSideDy"),
    r1LabelDy: document.getElementById("inpR1LabelDy"),
    r1ValueDy: document.getElementById("inpR1ValueDy"),
    r2LabelDy: document.getElementById("inpR2LabelDy"),
    r2ValueDy: document.getElementById("inpR2ValueDy"),
    r3LabelDy: document.getElementById("inpR3LabelDy"),
    r3ValueDy: document.getElementById("inpR3ValueDy"),
    r4LabelDy: document.getElementById("inpR4LabelDy"),
    r4ValueDy: document.getElementById("inpR4ValueDy"),

    count: document.getElementById("inpCount"),
    prefix: document.getElementById("inpPrefix"),
    generate: document.getElementById("btnGenerate"),
    downloadZip: document.getElementById("btnDownloadZip"),
    reroll: document.getElementById("btnReroll"),
    reset: document.getElementById("btnReset"),

  };

  const sideUi = {
    longBtn: document.getElementById("btnSideLong"),
    shortBtn: document.getElementById("btnSideShort"),
  };

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1000);
  }
  showToast._t = null;

  function showToastFor(message, ms) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function showCenterTip(message, ms = 1000) {
    if (!centerTipEl) return;
    centerTipEl.textContent = message;
    centerTipEl.classList.add("show");
    clearTimeout(showCenterTip._t);
    showCenterTip._t = setTimeout(() => centerTipEl.classList.remove("show"), ms);
  }
  showCenterTip._t = null;

  function showSideHint() {
    if (!sideHintEl) return;
    // 재클릭 시 애니메이션 리셋
    sideHintEl.classList.remove("fadeout");
    sideHintEl.classList.add("show");
    // 다음 프레임에 fadeout 적용(transition 시작)
    requestAnimationFrame(() => {
      sideHintEl.classList.add("fadeout");
    });
  }

  async function copyTextWithSelection(text) {
    const t = String(text || "");
    if (!t.trim()) return false;

    // 1) clipboard API 우선
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(t);
        return true;
      } catch {
        // fallthrough
      }
    }

    // 2) fallback: 임시 textarea 생성 후 전체 선택 + execCommand
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select(); // "전체 선택" 느낌
    try {
      const ok = document.execCommand && document.execCommand("copy");
      return !!ok;
    } finally {
      document.body.removeChild(ta);
    }

  }

  function selectElementText(el) {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const LS_SIDE_TS = "coinbreaker_side_ts";
  const LS_ENTRY_TS = "coinbreaker_entry_ts";

  function getTs(key) {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  }

  function setTs(key) {
    localStorage.setItem(key, String(Date.now()));
  }

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    if (b <= a) return a;
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function makePresetPhrase(percentValue) {
    // 1번 : ## / ##.## / ##.#
    const fmt = ["int", "2", "1"][Math.floor(Math.random() * 3)];
    const absP = Math.abs(Number(percentValue) || 0);
    let numText = "";
    // 반올림 금지: 버림(Trunc)으로 처리
    if (fmt === "int") {
      numText = String(Math.floor(absP));
    } else if (fmt === "1") {
      const v = Math.floor(absP * 10) / 10;
      numText = v.toFixed(1);
    } else {
      const v = Math.floor(absP * 100) / 100;
      numText = v.toFixed(2);
    }

    // "##.0" 같은 경우 .0은 표시하지 않음
    if (numText.endsWith(".0")) numText = numText.slice(0, -2);

    // 2번 : % / 프로 / 퍼 / (빈칸)
    const unit = ["%", "프로", "퍼", ""][Math.floor(Math.random() * 4)];

    // 3번 : 감사합니다(2) / 고맙습니다(2) / 수익입니다(1)
    const part3 = ["감사합니다", "감사합니다", "고맙습니다", "고맙습니다", "수익입니다"][Math.floor(Math.random() * 5)];

    // 4번 : 25% 확률로만 추가 (추가될 때도 빈칸 가능)
    let part4 = "";
    if (Math.random() < 0.25) {
      part4 = ["", "대표님.", "대단하십니다.", "대박입니다."][Math.floor(Math.random() * 4)];
    }

    const first = `${numText}${unit}`.trim();
    const rest = part4 ? `${part3} ${part4}` : part3;
    return `${first} ${rest}`.trim();
  }

  const DEFAULTS = {
    percentMin: "20",
    percentMax: "25",
    // 만원 단위 입력
    profitMin: "300",
    profitMax: "1000",
    symbol: "DOGE/USDT",
    side: "LONG",
    leverage: "100x",
    entry: "0.11445",
    bgZoom: 1.0,
    count: 1,
    prefix: "screenshot",
  };

  // 배경 이동은 입력칸 없이 버튼으로만 조절
  let bgShiftX = 0;
  let bgShiftY = 28;

  function updateBgUi() {
    if (els.bgPosText) els.bgPosText.textContent = `X: ${Math.round(bgShiftX)}, Y: ${Math.round(bgShiftY)}`;
    if (els.bgX) els.bgX.value = String(Math.round(bgShiftX));
    if (els.bgY) els.bgY.value = String(Math.round(bgShiftY));
  }

  function scheduleSave() {
    if (!sb) return;
    if (!isReadyForSave) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveSettingsToSupabase(), 450);
  }

  function collectSettings() {
    return {
      percentMin: String(els.percentMin?.value ?? ""),
      percentMax: String(els.percentMax?.value ?? ""),
      profitMin: String(els.profitMin?.value ?? ""),
      profitMax: String(els.profitMax?.value ?? ""),
      symbol: String(els.symbol?.value ?? ""),
      side: String(els.side?.value ?? ""),
      leverage: String(els.leverage?.value ?? ""),
      entry: String(els.entry?.value ?? ""),
      bgZoom: Number(els.bgZoom?.value ?? DEFAULTS.bgZoom),
      bgShiftX: Math.round(bgShiftX),
      bgShiftY: Math.round(bgShiftY),
      count: Number(els.count?.value ?? DEFAULTS.count),
      prefix: String(els.prefix?.value ?? ""),
      textAdjust: textAdjust,
    };
  }

  function applySettings(data) {
    if (!data || typeof data !== "object") return;

    // 입력값
    if (els.percentMin && data.percentMin != null) els.percentMin.value = String(data.percentMin);
    if (els.percentMax && data.percentMax != null) els.percentMax.value = String(data.percentMax);
    if (els.profitMin && data.profitMin != null) els.profitMin.value = String(data.profitMin);
    if (els.profitMax && data.profitMax != null) els.profitMax.value = String(data.profitMax);
    if (els.symbol && data.symbol != null) els.symbol.value = String(data.symbol);
    if (els.side && data.side != null) els.side.value = String(data.side);
    if (els.leverage && data.leverage != null) els.leverage.value = String(data.leverage);
    if (els.entry && data.entry != null) els.entry.value = String(data.entry);
    if (els.count && data.count != null) els.count.value = String(Number(data.count) || DEFAULTS.count);
    if (els.prefix && data.prefix != null) els.prefix.value = String(data.prefix);

    // 배경
    if (els.bgZoom && data.bgZoom != null) {
      const z = Number(data.bgZoom);
      els.bgZoom.value = Number.isFinite(z) ? z.toFixed(3) : String(DEFAULTS.bgZoom.toFixed(3));
    }
    if (data.bgShiftX != null) bgShiftX = Math.round(Number(data.bgShiftX) || 0);
    if (data.bgShiftY != null) bgShiftY = Math.round(Number(data.bgShiftY) || 0);
    updateBgUi();

    // 텍스트 조정
    if (data.textAdjust && typeof data.textAdjust === "object") {
      Object.keys(textAdjust).forEach((k) => delete textAdjust[k]);
      Object.entries(data.textAdjust).forEach(([k, v]) => {
        if (!v || typeof v !== "object") return;
        textAdjust[k] = {
          dx: Number(v.dx) || 0,
          dy: Number(v.dy) || 0,
          size: v.size == null ? null : Number(v.size),
          bold: v.bold == null ? null : !!v.bold,
        };
      });
    }

    // anchor는 항상 재계산하도록 초기화
    Object.keys(baseAnchor).forEach((k) => delete baseAnchor[k]);

    // side UI 버튼 상태 동기화
    const curSide = String(els.side?.value || "").toUpperCase();
    if (sideUi.longBtn) sideUi.longBtn.classList.toggle("active", curSide === "LONG");
    if (sideUi.shortBtn) sideUi.shortBtn.classList.toggle("active", curSide === "SHORT");
  }

  async function loadSettingsFromSupabase() {
    if (!sb) return;
    try {
      const { data, error } = await sb.from("app_settings").select("data").eq("id", "global").maybeSingle();
      if (error) {
        console.error("[supabase] load failed:", error);
        showToast("Supabase 불러오기 실패");
        return;
      }
      if (data && data.data) applySettings(data.data);
    } catch (e) {
      console.error("[supabase] load exception:", e);
      showToast("Supabase 불러오기 실패");
    }
  }

  async function saveSettingsToSupabase() {
    if (!sb) return;
    try {
      const payload = collectSettings();
      const { error } = await sb.from("app_settings").upsert({ id: "global", data: payload }, { onConflict: "id" });
      if (error) {
        console.error("[supabase] save failed:", error);
        showToast("Supabase 저장 실패");
      }
    } catch (e) {
      console.error("[supabase] save exception:", e);
      showToast("Supabase 저장 실패");
    }
  }

  // ---- 스타일 (첨부 캡쳐 기준으로 고정) ----
  // 색상: 첨부 캡쳐에 맞춤
  const COLORS = {
    accent: "rgb(73, 245, 184)", // +19.75%, +10,229,614 WON 등
    red: "rgb(250, 79, 79)", // SHORT
    label: "rgb(176, 169, 159)", // 코인/레버리지/진입가격/종료가격 라벨
    value: "rgb(232, 230, 227)", // 값(100x, 0.08608 등)
  };

  /**
   * 폰트(사용자 제공):
   * - PostScript 이름: Noto-Sans-KR-Bold
   * - PostScript 이름: Noto-Sans-KR-Medium
   * - (일반) Noto-Sans-KR-Regular
   *
   * style.css에서 @font-face로 위 이름을 "font-family"로 등록해두었고,
   * 캔버스에서는 동일한 이름을 그대로 사용합니다.
   */
  const FONT_FAMILY = {
    regular: "Noto-Sans-KR-Regular",
    medium: "Noto-Sans-KR-Medium",
    bold: "Noto-Sans-KR-Bold",
  };

  // 좌표 (462x354 캔버스 기준). (제공된 .dg-body 카드 기준)
  const POS = {
    padX: 18,
    topPercentY: 44,
    topProfitY: 76,
    sectionStartY: 118,
    rowGap: 58,
    labelToValueGap: 24,
    // %가 숫자보다 살짝 아래에 붙는 느낌
    percentSignDy: 3,
    // 배경을 조금 더 "내려" 보이게(카드 안에서 배경이 아래로 이동)
    bgShiftDownPx: 28,
  };

  function numFrom(inputEl, fallback) {
    // inputEl이 없을 때 Number(null)=0 이 되어 좌표가 전부 0으로 깨지는 문제 방지
    if (!inputEl) return fallback;
    const v = Number(inputEl.value);
    return Number.isFinite(v) ? v : fallback;
  }

  function getPos() {
    return {
      padX: Math.round(numFrom(els.padX, POS.padX)),
      topPercentY: Math.round(numFrom(els.topPercentY, POS.topPercentY)),
      topProfitY: Math.round(numFrom(els.topProfitY, POS.topProfitY)),
      sectionStartY: Math.round(numFrom(els.sectionStartY, POS.sectionStartY)),
      rowGap: Math.round(numFrom(els.rowGap, POS.rowGap)),
      labelToValueGap: Math.round(numFrom(els.labelToValueGap, POS.labelToValueGap)),
      percentSignDy: Math.round(numFrom(els.percentSignDy, POS.percentSignDy)),
      sideDx: Math.round(numFrom(els.sideDx, 6)),
      sideDy: Math.round(numFrom(els.sideDy, 0)),
      rowLabelDy: [
        Math.round(numFrom(els.r1LabelDy, 0)),
        Math.round(numFrom(els.r2LabelDy, 0)),
        Math.round(numFrom(els.r3LabelDy, 0)),
        Math.round(numFrom(els.r4LabelDy, 0)),
      ],
      rowValueDy: [
        Math.round(numFrom(els.r1ValueDy, 0)),
        Math.round(numFrom(els.r2ValueDy, 0)),
        Math.round(numFrom(els.r3ValueDy, 0)),
        Math.round(numFrom(els.r4ValueDy, 0)),
      ],
    };
  }

  const BG_PRIMARY = "./bg.jpg";
  const BG_FALLBACK = "./calcu/bg.png";
  const bgImg = new Image();
  bgImg.src = BG_PRIMARY;

  // 미리보기에서는 범위가 바뀌지 않으면 같은 랜덤 값을 유지
  let samplePercent = null; // number
  let sampleProfit = null; // number (int)
  let sampleEntry = null; // string (0.11445)
  let lastEntryBase = null; // string
  let lastPercentKey = null;
  let lastProfitKey = null;

  // 생성 결과(갤러리)
  /** @type {{percent:number, profit:number}[]} */
  let generatedItems = [];
  let previewIndex = -1; // 생성된 것 중 현재 미리보기로 보여줄 인덱스

  // 캔버스 클릭 선택(글자 항목별 조정)
  /** @type {null | string} */
  let selectedTextId = null;
  /** @type {Record<string, {dx:number, dy:number, size:number|null, bold:boolean|null}>} */
  const textAdjust = {};
  /** @type {Record<string, {x:number, y:number}>} */
  const baseAnchor = {};
  /** @type {{id:string,name:string,x:number,y:number,w:number,h:number,size:number}[]} */
  let lastHitboxes = [];

  function parseRange(text, fallbackMin, fallbackMax) {
    const t = String(text || "")
      .trim()
      .replace("%", "")
      .replace("+", "")
      .replace(/\s+/g, "");
    if (!t) return [fallbackMin, fallbackMax];
    const parts = t.split(/~|-/).filter(Boolean);
    if (parts.length === 1) {
      const v = Number(parts[0].replace(/,/g, ""));
      return [v, v];
    }
    if (parts.length >= 2) {
      const a = Number(parts[0].replace(/,/g, ""));
      const b = Number(parts[1].replace(/,/g, ""));
      return a <= b ? [a, b] : [b, a];
    }
    return [fallbackMin, fallbackMax];
  }

  function roundTo(value, digits) {
    const f = 10 ** digits;
    return Math.round((value + Number.EPSILON) * f) / f;
  }

  function parseNumber(text, fallback) {
    const t = String(text ?? "")
      .trim()
      .replace(/,/g, "")
      .replace("%", "");
    const n = Number(t);
    return Number.isFinite(n) ? n : fallback;
  }

  function pickPercent2NoZeroSecondDigit(pMin, pMax) {
    // 0.01 단위 정수로 뽑되, (x*100)%10 != 0  (백분의 자리 0 금지)
    const minI = Math.ceil(Math.min(pMin, pMax) * 100);
    const maxI = Math.floor(Math.max(pMin, pMax) * 100);
    let pi = minI;
    if (minI === maxI) {
      // 범위가 단일 값이면 그대로 사용 (이 값이 0으로 끝나면 범위 내에서 해결 불가)
    } else {
      for (let k = 0; k < 60; k++) {
        const cand = Math.floor(Math.random() * (maxI - minI + 1)) + minI;
        if (Math.abs(cand) % 10 !== 0) {
          pi = cand;
          break;
        }
        pi = cand;
      }
      if (Math.abs(pi) % 10 === 0) {
        if (pi + 1 <= maxI) pi += 1;
        else if (pi - 1 >= minI) pi -= 1;
      }
    }
    return pi / 100;
  }

  function formatPercent(p) {
    // 소수점 2자리 무조건 표시
    return `+${Number(p).toFixed(2)}%`;
  }

  function formatProfit(won) {
    return `+${won.toLocaleString("en-US")} WON`;
  }

  function getPercentMinMax() {
    const a = parseNumber(els.percentMin?.value, 20);
    const b = parseNumber(els.percentMax?.value, 25);
    const minP = Math.min(a, b);
    const maxP = Math.max(a, b);
    return { minP, maxP };
  }

  function parseEntryToInt(entryText) {
    // 기본 진입가 형식: 0.11445 (소수 5자리)
    const n = Number(String(entryText || "").trim());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100000); // 1e5
  }

  function trimTrailingZerosDecimal(text) {
    const s = String(text ?? "").trim();
    if (!s.includes(".")) return s;
    // 소수점 뒤의 불필요한 0 제거 (예: 0.10050 -> 0.1005, 0.10000 -> 0.1)
    const t = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return t;
  }

  function entryIntToText(intVal) {
    return trimTrailingZerosDecimal((intVal / 100000).toFixed(5));
  }

  function randomEntryFromBase(entryBaseText) {
    const baseInt = parseEntryToInt(entryBaseText);
    if (baseInt == null) return String(entryBaseText || "").trim();
    // 마지막 자리(소수 5번째 자리) 기준 +-2
    // 사용자가 입력한 '본 가격(0)'도 포함해서 5개 케이스가 나오게
    const deltas = [-2, -1, 0, 1, 2];
    const d = deltas[Math.floor(Math.random() * deltas.length)];
    const next = Math.max(0, baseInt + d);
    return entryIntToText(next);
  }

  function parseLeverage(text) {
    // "100x", "50X", "100" 등에서 숫자만 추출
    const m = String(text || "").match(/(\d+(\.\d+)?)/);
    const v = m ? Number(m[1]) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function computeExit(entry, pnlPercent, side, leverageText) {
    /**
     * 첨부 스크린샷 기준:
     * - 표시되는 +21.84% 는 '가격 변동률'이 아니라 레버리지 적용된 PnL% 입니다.
     * - 가격 변동률(%) = pnlPercent / leverage
     *   예) 100x, +21.84%  => 가격은 +0.2184% 움직임
     *
     * LONG: exit = entry * (1 + (pnlPercent/100)/leverage)
     * SHORT: exit = entry * (1 - (pnlPercent/100)/leverage)
     *
     * 소수점 5자리 반올림 후 5자리로 표시.
     */
    const e = Number(entry);
    const lev = parseLeverage(leverageText);
    const p = (Number(pnlPercent) / 100) / lev;
    const isShort = String(side || "").toUpperCase() === "SHORT";
    const raw = isShort ? e * (1 - p) : e * (1 + p);
    const rounded = roundTo(raw, 5);
    return trimTrailingZerosDecimal(rounded.toFixed(5));
  }

  function getBgZoom() {
    if (!els.bgZoom) return 1.0;
    const z = Number(els.bgZoom.value);
    if (!Number.isFinite(z) || z <= 0) return 1.0;
    return z;
  }

  function getBgShiftX() {
    return Math.round(bgShiftX);
  }

  function getBgShiftY() {
    return Math.round(bgShiftY);
  }

  function getCount() {
    const n = Number(els.count.value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  }

  function rerollIfNeeded(force = false) {
    const fk = `${String(els.profitMin?.value || "")}|${String(els.profitMax?.value || "")}`;
    const { minP, maxP } = getPercentMinMax();
    const pk = `${minP}|${maxP}`;
    if (force || pk !== lastPercentKey || fk !== lastProfitKey || samplePercent === null || sampleProfit === null) {
      samplePercent = pickPercent2NoZeroSecondDigit(minP, maxP);
      const { minWon, maxWon } = getProfitMinMax();
      sampleProfit = minWon === maxWon ? minWon : Math.floor(Math.random() * (maxWon - minWon + 1)) + minWon;
      lastPercentKey = pk;
      lastProfitKey = fk;
    }
    return { percent: samplePercent, profit: sampleProfit };
  }

  function parseManWon(text, fallbackManWon) {
    // 만원 단위 입력 -> WON 변환
    const man = parseNumber(text, fallbackManWon);
    return Math.floor(man * 10000);
  }

  function getProfitMinMax() {
    const a = parseManWon(els.profitMin?.value, 300);
    const b = parseManWon(els.profitMax?.value, 1000);
    const minWon = Math.min(a, b);
    const maxWon = Math.max(a, b);
    return { minWon, maxWon };
  }

  function randomPercentProfit() {
    const { minP: pMin, maxP: pMax } = getPercentMinMax();
    const { minWon: fMin, maxWon: fMax } = getProfitMinMax();
    const p = pickPercent2NoZeroSecondDigit(pMin, pMax);
    const f = fMin === fMax ? fMin : Math.floor(Math.random() * (fMax - fMin + 1)) + fMin;
    return { percent: p, profit: f };
  }

  function drawBackgroundCoverTo(targetCtx) {
    // cover 렌더링 (center/cover)
    const iw = bgImg.naturalWidth || bgImg.width;
    const ih = bgImg.naturalHeight || bgImg.height;
    if (!iw || !ih) return;

    // zoom < 1.0: 더 넓게 보이도록(덜 확대) / zoom > 1.0: 더 확대
    const zoom = getBgZoom();
    const baseScale = Math.max(CANVAS_W / iw, CANVAS_H / ih);
    const scale = baseScale * zoom;

    // zoom으로 축소되면(sw/sh가 원본보다 커지면) crop 방식으로는 더 이상 이동이 먹지 않습니다.
    // 이 경우에는 "축소된 이미지"를 캔버스 위에 올려두고(=dest 좌표 이동) 이동을 적용합니다.
    const sw = CANVAS_W / scale;
    const sh = CANVAS_H / scale;
    const needsDestPan = sw >= iw || sh >= ih;

    if (needsDestPan) {
      // dest(캔버스) 공간에서 이동: zoom<1인 경우에도 항상 이동 가능
      const dw = iw * scale;
      const dh = ih * scale;
      // 기본은 중앙 정렬
      let dx = (CANVAS_W - dw) / 2 + getBgShiftX();
      let dy = (CANVAS_H - dh) / 2 + getBgShiftY();

      // 축소 상태에서는 이동 시 약간의 여백(검은 영역)이 생길 수 있어도 이동을 허용
      // (이미지가 캔버스보다 작거나, 어떤 축은 딱 맞는 경우도 이동이 되게)
      const PAD = 200; // overscroll 허용 픽셀
      if (dw <= CANVAS_W) dx = Math.max(-PAD, Math.min(dx, CANVAS_W - dw + PAD));
      else dx = Math.max(CANVAS_W - dw - PAD, Math.min(dx, 0 + PAD));

      if (dh <= CANVAS_H) dy = Math.max(-PAD, Math.min(dy, CANVAS_H - dh + PAD));
      else dy = Math.max(CANVAS_H - dh - PAD, Math.min(dy, 0 + PAD));

      targetCtx.drawImage(bgImg, dx, dy, dw, dh);
      return;
    }

    // 기본(cover) 모드: crop(source) 방식으로 이동
    // 배경 이동: +X(오른쪽) => crop window를 왼쪽으로(sx 감소)
    const sx0 = (iw - sw) / 2;
    const sy0 = (ih - sh) / 2;
    const slackX = iw - sw; // source에서 움직일 수 있는 여유
    const slackY = ih - sh;

    // 어떤 축이 "여유가 0"이면(crop 불가) 기존 방식으로는 이동이 안 되므로
    // 그 축은 dest 이동으로 처리하여(빈 여백이 생길 수 있어도) 이동을 가능하게 함.
    let dx = 0;
    let dy = 0;

    const shiftXSrc = getBgShiftX() / scale;
    const shiftYSrc = getBgShiftY() / scale;
    let sx = sx0;
    let sy = sy0;

    if (slackX > 0) sx = sx0 - shiftXSrc;
    else dx = getBgShiftX();

    if (slackY > 0) sy = sy0 - shiftYSrc;
    else dy = getBgShiftY();

    sy = Math.max(0, Math.min(sy, ih - sh));
    sx = Math.max(0, Math.min(sx, iw - sw));

    // dest 이동에도 약간의 overscroll 허용(완전히 화면 밖으로는 안 나가게)
    if (dx !== 0 || dy !== 0) {
      const PAD = 200;
      dx = Math.max(-PAD, Math.min(dx, PAD));
      dy = Math.max(-PAD, Math.min(dy, PAD));
    }

    targetCtx.drawImage(bgImg, sx, sy, sw, sh, dx, dy, CANVAS_W, CANVAS_H);
  }

  function drawBackgroundCover() {
    drawBackgroundCoverTo(ctx);
  }

  function splitPercentText(text) {
    // "+21.84%" => ["+21.84", "%"]
    const t = (text || "").trim();
    if (t.endsWith("%")) return [t.slice(0, -1), "%"];
    return [t, ""];
  }

  function getOrInitAdjust(id) {
    if (!textAdjust[id]) textAdjust[id] = { dx: 0, dy: 0, size: null, bold: null };
    return textAdjust[id];
  }

  function parseFontSizePx(fontStr, fallback = 16) {
    const m = String(fontStr || "").match(/(\d+(?:\.\d+)?)px/);
    return m ? Number(m[1]) : fallback;
  }

  function getBaseTextStyle(id, baseSizes) {
    // 첨부 캡쳐 기준
    if (id === "percentNum") return { family: FONT_FAMILY.medium, weight: 500, size: baseSizes.percentNum };
    if (id === "percentSign") return { family: FONT_FAMILY.bold, weight: 600, size: baseSizes.percentSign };
    if (id === "profit") return { family: FONT_FAMILY.regular, weight: 400, size: baseSizes.profit };
    if (id === "side") return { family: FONT_FAMILY.bold, weight: 600, size: baseSizes.side };
    if (id === "stockValue") return { family: FONT_FAMILY.bold, weight: 600, size: baseSizes.stockValue };
    if (id.endsWith("Label")) return { family: FONT_FAMILY.regular, weight: 400, size: baseSizes.label };
    // leverage/entry/exit 값 등
    return { family: FONT_FAMILY.bold, weight: 600, size: baseSizes.value };
  }

  function fontForTextId(id, baseSizes) {
    const adj = getOrInitAdjust(id);
    const base = getBaseTextStyle(id, baseSizes);

    // UI에서 볼드 토글을 쓰는 경우를 반영 (기본과 다르게 강제)
    const forced =
      adj.bold === true
        ? { family: FONT_FAMILY.bold, weight: 600 }
        : adj.bold === false
          ? { family: FONT_FAMILY.regular, weight: 400 }
          : null;

    const size = adj.size == null ? base.size : adj.size;
    const family = forced?.family ?? base.family;
    const weight = forced?.weight ?? base.weight;
    return `${weight} ${size}px "${family}"`;
  }

  function drawTextTo(targetCtx, { id, name, text, x, y, font, fill, recordHitbox }) {
    const adj = getOrInitAdjust(id);
    const xx = x + adj.dx;
    const yy = y + adj.dy;
    targetCtx.font = font;
    targetCtx.fillStyle = fill;
    targetCtx.fillText(text, xx, yy);

    const size = parseFontSizePx(font, 16);
    if (recordHitbox) {
      const m = targetCtx.measureText(text);
      const asc = Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : size * 0.8;
      const des = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : size * 0.25;
      lastHitboxes.push({
        id,
        name,
        x: xx,
        y: yy - asc,
        w: m.width,
        h: asc + des,
        size,
      });
      return m.width;
    }
    return targetCtx.measureText(text).width;
  }

  function buildCardTextData(percentValue, profitValue, entryOverride) {
    const symbol = (els.symbol?.value || "").trim();
    const side = (els.side?.value || "LONG").trim();
    const leverage = (els.leverage?.value || "").trim();
    const entry = (entryOverride ?? els.entry?.value ?? "").trim();
    if (els.entryReal) els.entryReal.value = entry;
    const exit = computeExit(entry, percentValue, side, leverage);
    if (els.exit) els.exit.value = exit;
    return {
      percentText: formatPercent(percentValue),
      profitText: formatProfit(profitValue),
      symbol,
      side,
      leverage,
      entry,
      exit,
    };
  }

  function getBaseSizes() {
    // 기본 글자 크기는 고정 (UI에서 항목별 +/- 로 조절)
    return { percentNum: 32, percentSign: 34, profit: 20, label: 16, stockValue: 20, value: 18, side: 18 };
  }

  function drawCardTo(targetCtx, percentValue, profitValue, { recordHitboxes = false, entryOverride } = {}) {
    const POS2 = getPos();
    const baseSizes = getBaseSizes();

    if (recordHitboxes) lastHitboxes = [];

    targetCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackgroundCoverTo(targetCtx);

    const t = buildCardTextData(percentValue, profitValue, entryOverride);
    targetCtx.textAlign = "left";
    targetCtx.textBaseline = "alphabetic";

    // percent (+24.8%)
    const [pNum, pSign] = splitPercentText(t.percentText);
    const x0 = POS2.padX;
    // 요청: 수익률(숫자) 시작점을 현재보다 5px 아래로
    const y0 = POS2.topPercentY + 5;
    const wNum = drawTextTo(targetCtx, {
      id: "percentNum",
      name: "수익률 숫자",
      text: pNum,
      x: x0,
      y: y0,
      font: fontForTextId("percentNum", baseSizes),
      fill: COLORS.accent,
      recordHitbox: recordHitboxes,
    });
    if (pSign) {
      // % 위치는 최초 렌더링 기준(anchor)을 고정하고, 이후에는 그 기준에서만 이동
      // 요청: % 시작점을 위로 1px 더 이동 => 아래 3px, 왼쪽 1px
      if (!baseAnchor.percentSign) baseAnchor.percentSign = { x: x0 + wNum + 1 - 1, y: y0 + POS2.percentSignDy + 3 };
      drawTextTo(targetCtx, {
        id: "percentSign",
        name: "%",
        text: pSign,
        x: baseAnchor.percentSign.x,
        y: baseAnchor.percentSign.y,
        font: fontForTextId("percentSign", baseSizes),
        fill: COLORS.accent,
        recordHitbox: recordHitboxes,
      });
    }

    // profit
    drawTextTo(targetCtx, {
      id: "profit",
      name: "수익금",
      text: t.profitText,
      x: POS2.padX,
      y: POS2.topProfitY,
      font: fontForTextId("profit", baseSizes),
      fill: COLORS.accent,
      recordHitbox: recordHitboxes,
    });

    // rows
    const rows = [
      { key: "stock", label: "코인", value: t.symbol, extra: t.side },
      { key: "leverage", label: "레버리지", value: t.leverage },
      { key: "entry", label: "진입가격", value: t.entry },
      { key: "exit", label: "종료가격", value: t.exit },
    ];

    rows.forEach((row, idx) => {
      const baseY = POS2.sectionStartY + idx * POS2.rowGap;
      const labelY = baseY + (POS2.rowLabelDy?.[idx] ?? 0);
      const valueY = baseY + POS2.labelToValueGap + (POS2.rowValueDy?.[idx] ?? 0);

      const labelId = `${row.key}Label`;
      const valueId = `${row.key}Value`;

      drawTextTo(targetCtx, {
        id: labelId,
        name: `${row.label} 라벨`,
        text: row.label,
        x: POS2.padX,
        y: labelY,
        font: fontForTextId(labelId, baseSizes),
        fill: COLORS.label,
        recordHitbox: recordHitboxes,
      });

      const wVal = drawTextTo(targetCtx, {
        id: valueId,
        name: `${row.label} 값`,
        text: row.value,
        x: POS2.padX,
        y: valueY,
        font: fontForTextId(valueId, baseSizes),
        fill: row.key === "stock" ? COLORS.accent : COLORS.value,
        recordHitbox: recordHitboxes,
      });

      if (idx === 0 && row.extra) {
        // LONG/SHORT 위치도 최초 렌더링 기준(anchor)을 고정
        if (!baseAnchor.side) {
          baseAnchor.side = { x: POS2.padX + wVal + POS2.sideDx, y: valueY + POS2.sideDy };
        }
        drawTextTo(targetCtx, {
          id: "side",
          name: "LONG/SHORT",
          text: row.extra,
          x: baseAnchor.side.x,
          y: baseAnchor.side.y,
          font: fontForTextId("side", baseSizes),
          fill: String(row.extra).toUpperCase() === "SHORT" ? COLORS.red : COLORS.accent,
          recordHitbox: recordHitboxes,
        });
      }
    });

    // 선택 강조 표시(미리보기)
    if (recordHitboxes && selectedTextId) {
      const b = lastHitboxes.find((x) => x.id === selectedTextId);
      if (b) {
        targetCtx.save();
        targetCtx.strokeStyle = "rgba(255,255,255,0.55)";
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        targetCtx.restore();
      }
    }
  }

  function renderPreview() {
    // 생성된 결과가 있으면 그 중 선택된(또는 첫번째) 것을 미리보기로
    if (generatedItems.length > 0) {
      if (previewIndex < 0 || previewIndex >= generatedItems.length) previewIndex = 0;
      const it = generatedItems[previewIndex];
      drawCardTo(ctx, it.percent, it.profit, { recordHitboxes: true, entryOverride: it.entry });
      return;
    }
    // 생성된 결과가 없을 때: 기준진입가 마지막 자리 +-2 랜덤 적용
    const baseEntry = (els.entry?.value || "").trim();
    if (sampleEntry == null || lastEntryBase !== baseEntry) {
      sampleEntry = randomEntryFromBase(baseEntry);
      lastEntryBase = baseEntry;
    }
    const { percent, profit } = rerollIfNeeded(false);
    drawCardTo(ctx, percent, profit, { recordHitboxes: true, entryOverride: sampleEntry });
  }

  function renderGallery() {
    // (생성 결과 UI 제거됨)
  }

  function renderAll() {
    renderPreview();
  }

  function setSide(value, { closeModal = true } = {}) {
    if (els.side) els.side.value = value;
    if (sideUi.longBtn) sideUi.longBtn.classList.toggle("active", value === "LONG");
    if (sideUi.shortBtn) sideUi.shortBtn.classList.toggle("active", value === "SHORT");
    renderAll();
    scheduleSave();
  }

  function bindSideUi() {
    // 메인 버튼
    if (sideUi.longBtn)
      sideUi.longBtn.addEventListener("click", () => {
        setSide("LONG", { closeModal: false });
        setTs(LS_SIDE_TS);
      });
    if (sideUi.shortBtn)
      sideUi.shortBtn.addEventListener("click", () => {
        setSide("SHORT", { closeModal: false });
        setTs(LS_SIDE_TS);
      });
  }


  function computeCropRect() {
    const W = CANVAS_W;
    const H = CANVAS_H;

    // 15%: 세로 전체 글씨 포함 / 15%: 거의 전체 이미지 / 70%: 수익률+수익금 포함 랜덤
    const mode = Math.random();

    // (2) 15% - 전체 이미지
    if (mode >= 0.15 && mode < 0.30) {
      return { x: 0, y: 0, w: W, h: H };
    }

    // 글씨가 절대 안 짤리도록 여유(패딩) 넉넉하게
    const padL = randInt(24, 48);
    const padT = randInt(18, 44);
    const padR = randInt(24, 48);
    const padB = randInt(18, 44);

    let boxes = [];
    if (mode < 0.15) {
      boxes = lastHitboxes.slice(); // 전체 글씨
    } else {
      const wanted = ["percentNum", "percentSign", "profit"]; // 수익률/수익금
      boxes = lastHitboxes.filter((b) => wanted.includes(b.id));
    }
    if (boxes.length === 0) boxes = lastHitboxes.slice();
    if (boxes.length === 0) return { x: 0, y: 0, w: W, h: H };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    boxes.forEach((b) => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });

    const reqX = Math.max(0, Math.floor(minX - padL));
    const reqY = Math.max(0, Math.floor(minY - padT));
    const reqMaxX = Math.min(W, Math.ceil(maxX + padR));
    const reqMaxY = Math.min(H, Math.ceil(maxY + padB));
    const reqW = Math.max(1, reqMaxX - reqX);
    const reqH = Math.max(1, reqMaxY - reqY);

    const extraW = mode < 0.15 ? randInt(80, 260) : randInt(40, 220);
    const extraH = mode < 0.15 ? randInt(60, 160) : randInt(20, 120);
    const w = Math.min(W, randInt(reqW, Math.min(W, reqW + extraW)));
    const h = Math.min(H, randInt(reqH, Math.min(H, reqH + extraH)));

    const xMin = Math.max(0, reqMaxX - w);
    const xMax = Math.min(W - w, reqX);
    const yMin = Math.max(0, reqMaxY - h);
    const yMax = Math.min(H - h, reqY);

    const x = randInt(xMin, xMax);
    const y = randInt(yMin, yMax);
    return { x, y, w, h };
  }

  async function ensureFontsReady() {
    // 폰트 로딩 대기(가능한 경우) + 실제 사용 폰트 프리로드
    if (!document.fonts) return;
    try {
      // load()로 명시적으로 로드해두면 캔버스 렌더링이 안정적입니다.
      await Promise.all([
        document.fonts.load(`400 16px "${FONT_FAMILY.regular}"`),
        document.fonts.load(`500 32px "${FONT_FAMILY.medium}"`),
        document.fonts.load(`600 34px "${FONT_FAMILY.bold}"`),
      ]);
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  function downloadPng() {
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "screenshot.png";
      a.click();
    } catch (e) {
      alert(
        "PNG 내보내기에 실패했습니다. (파일을 더블클릭으로 열면 보안 정책 때문에 실패할 수 있어요)\n\n" +
          "권장: python -m http.server 로 서버 실행 후 http://localhost:8000/index.html 로 접속해서 다시 시도해주세요."
      );
    }
  }

  function dataUrlToUint8Array(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function downloadZip() {
    if (!window.JSZip) {
      alert("JSZip 로딩에 실패했습니다. 인터넷 연결을 확인해주세요.");
      return;
    }

    const n = getCount();
    const prefix = (els.prefix.value || "screenshot").trim() || "screenshot";

    const zip = new JSZip();

    // 오프스크린 캔버스에서 렌더링
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const offCtx = off.getContext("2d");

    function renderTo(targetCtx, percentValue, profitValue, entryOverride) {
      drawCardTo(targetCtx, percentValue, profitValue, { recordHitboxes: false, entryOverride });
    }

    // 폰트 로딩 대기(가능한 경우)
    await ensureFontsReady();

    for (let i = 1; i <= n; i++) {
      const { percent: pv, profit: fv } = randomPercentProfit();
      const entryV = randomEntryFromBase((els.entry?.value || "").trim());
      renderTo(offCtx, pv, fv, entryV);
      const dataUrl = off.toDataURL("image/png");
      const bytes = dataUrlToUint8Array(dataUrl);
      const name = `${prefix}_${String(i).padStart(4, "0")}.png`;
      zip.file(name, bytes);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function bind() {
    const reRender = () => {
      renderAll();
      scheduleSave();
    };
    Object.values(els).forEach((el) => {
      if (!el) return;
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        el.addEventListener("input", reRender);
        el.addEventListener("change", reRender);
      }
    });

    // 기준진입가를 수정하면 "최근 1시간 내 확인"으로 간주
    if (els.entry) {
      const mark = () => setTs(LS_ENTRY_TS);
      els.entry.addEventListener("input", mark);
      els.entry.addEventListener("change", mark);
    }

    // 줌 입력은 3자리 소수로 정리
    if (els.bgZoom) {
      const fmt = () => {
        const v = Number(els.bgZoom.value);
        if (Number.isFinite(v)) els.bgZoom.value = v.toFixed(3);
      };
      els.bgZoom.addEventListener("change", fmt);
      els.bgZoom.addEventListener("blur", fmt);
    }

    const doGenerate = () => {
      const n = getCount();
      const baseEntry = (els.entry?.value || "").trim();
      generatedItems = Array.from({ length: n }, () => {
        const { percent, profit } = randomPercentProfit();
        return { percent, profit, entry: randomEntryFromBase(baseEntry) };
      });
      previewIndex = generatedItems.length > 0 ? 0 : -1;
      renderAll();
    };

    if (els.generate)
      els.generate.addEventListener("click", () => {
        showSideHint();
        doGenerate();
      });

    // (프리셋 UI 제거됨)
    if (els.downloadZip) els.downloadZip.addEventListener("click", downloadZip);
    if (els.reroll)
      els.reroll.addEventListener("click", () => {
        if (generatedItems.length > 0) {
          const baseEntry = (els.entry?.value || "").trim();
          generatedItems = generatedItems.map(() => {
            const { percent, profit } = randomPercentProfit();
            return { percent, profit, entry: randomEntryFromBase(baseEntry) };
          });
          previewIndex = generatedItems.length > 0 ? Math.min(Math.max(previewIndex, 0), generatedItems.length - 1) : -1;
          renderAll();
        } else {
          rerollIfNeeded(true);
          // 미리보기(단건)도 생성할 때마다 진입가 랜덤 변경
          const baseEntry = (els.entry?.value || "").trim();
          sampleEntry = randomEntryFromBase(baseEntry);
          lastEntryBase = baseEntry;
          renderAll();
        }
      });
    if (els.reset)
      els.reset.addEventListener("click", () => {
      if (els.percentMin) els.percentMin.value = DEFAULTS.percentMin;
      if (els.percentMax) els.percentMax.value = DEFAULTS.percentMax;
      if (els.profitMin) els.profitMin.value = DEFAULTS.profitMin;
      if (els.profitMax) els.profitMax.value = DEFAULTS.profitMax;
      els.symbol.value = DEFAULTS.symbol;
      els.side.value = DEFAULTS.side;
      els.leverage.value = DEFAULTS.leverage;
      els.entry.value = DEFAULTS.entry;
      els.bgZoom.value = String(DEFAULTS.bgZoom.toFixed(2));
      bgShiftX = 0;
      bgShiftY = 28;
      els.count.value = String(DEFAULTS.count);
      els.prefix.value = DEFAULTS.prefix;
      if (els.padX) els.padX.value = "18";
      if (els.topPercentY) els.topPercentY.value = "44";
      if (els.topProfitY) els.topProfitY.value = "76";
      if (els.percentSignDy) els.percentSignDy.value = "3";
      if (els.sectionStartY) els.sectionStartY.value = "118";
      if (els.rowGap) els.rowGap.value = "58";
      if (els.labelToValueGap) els.labelToValueGap.value = "24";
      if (els.sideDx) els.sideDx.value = "6";
      if (els.sideDy) els.sideDy.value = "0";
      if (els.r1LabelDy) els.r1LabelDy.value = "0";
      if (els.r1ValueDy) els.r1ValueDy.value = "0";
      if (els.r2LabelDy) els.r2LabelDy.value = "0";
      if (els.r2ValueDy) els.r2ValueDy.value = "0";
      if (els.r3LabelDy) els.r3LabelDy.value = "0";
      if (els.r3ValueDy) els.r3ValueDy.value = "0";
      if (els.r4LabelDy) els.r4LabelDy.value = "0";
      if (els.r4ValueDy) els.r4ValueDy.value = "0";
      // 생성 결과/선택/개별 조정 초기화
      generatedItems = [];
      previewIndex = -1;
      selectedTextId = null;
      Object.keys(textAdjust).forEach((k) => delete textAdjust[k]);
      Object.keys(baseAnchor).forEach((k) => delete baseAnchor[k]);
      sampleEntry = null;
      lastEntryBase = null;
      rerollIfNeeded(true);
      renderAll();
      });

    const bump = (key, delta) => {
      if (key === "x") bgShiftX = Math.round(bgShiftX) + delta;
      else bgShiftY = Math.round(bgShiftY) + delta;
      updateBgUi();
      renderAll();
      scheduleSave();
    };
    if (els.shiftUp) els.shiftUp.addEventListener("click", () => bump("y", -1));
    if (els.shiftDown) els.shiftDown.addEventListener("click", () => bump("y", +1));
    if (els.shiftLeft) els.shiftLeft.addEventListener("click", () => bump("x", -1));
    if (els.shiftRight) els.shiftRight.addEventListener("click", () => bump("x", +1));
    if (els.shiftReset)
      els.shiftReset.addEventListener("click", () => {
        bgShiftX = 0;
        bgShiftY = 28;
        updateBgUi();
        renderAll();
        scheduleSave();
      });

    // 좌표 입력으로 이동
    const applyBgPos = () => {
      const x = Number(els.bgX?.value);
      const y = Number(els.bgY?.value);
      bgShiftX = Number.isFinite(x) ? Math.round(x) : Math.round(bgShiftX);
      bgShiftY = Number.isFinite(y) ? Math.round(y) : Math.round(bgShiftY);
      updateBgUi();
      renderAll();
      scheduleSave();
    };
    if (els.bgApply) els.bgApply.addEventListener("click", applyBgPos);
    if (els.bgX)
      els.bgX.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyBgPos();
      });
    if (els.bgY)
      els.bgY.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyBgPos();
      });

    // 텍스트 항목별 1px 이동 버튼
    document.querySelectorAll(".text-move-pad").forEach((pad) => {
      const id = pad.getAttribute("data-text-id");
      if (!id) return;

      const move = (dx, dy) => {
        selectedTextId = id;
        const adj = getOrInitAdjust(id);
        adj.dx += dx;
        adj.dy += dy;
        renderAll();
        scheduleSave();
      };

      pad.querySelectorAll(".text-move-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const dir = btn.getAttribute("data-dir");
          if (dir === "up") return move(0, -1);
          if (dir === "down") return move(0, +1);
          if (dir === "left") return move(-1, 0);
          if (dir === "right") return move(+1, 0);
        });
      });

      const resetBtn = pad.querySelector(".text-move-reset");
      if (resetBtn)
        resetBtn.addEventListener("click", () => {
          selectedTextId = id;
          delete textAdjust[id];
          renderAll();
          scheduleSave();
        });

      // 글씨 크기 +/- (항목별)
      pad.querySelectorAll(".text-size-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedTextId = id;
          const dir = btn.getAttribute("data-size");
          const delta = dir === "down" ? -1 : +1;
          const baseSizes = getBaseSizes();
          const baseFont = fontForTextId(id, baseSizes);
          const baseSize = parseFontSizePx(baseFont, 16);
          const adj = getOrInitAdjust(id);
          const cur = adj.size == null ? baseSize : adj.size;
          adj.size = Math.max(1, Math.round(cur + delta));
          renderAll();
          scheduleSave();
        });
      });

      // 볼드 토글 (항목별)
      const boldBtn = pad.querySelector(".text-bold-btn");
      if (boldBtn) {
        const sync = () => {
          const adj = getOrInitAdjust(id);
          boldBtn.classList.toggle("active", adj.bold === true);
        };
        sync();
        boldBtn.addEventListener("click", () => {
          selectedTextId = id;
          const adj = getOrInitAdjust(id);
          adj.bold = adj.bold === true ? false : true;
          sync();
          renderAll();
          scheduleSave();
        });
      }
    });

    // 캔버스에서 텍스트 클릭 선택
    canvas.addEventListener("click", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_H;
      const hit = lastHitboxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      selectedTextId = hit ? hit.id : null;
      renderPreview();
    });
  }

  async function init() {
    // Supabase 연결 확인
    if (!sb) {
      console.error("[supabase] client not initialized. Check supabase-js script loading.");
      showToast("Supabase 연결 실패");
    } else {
      // 디버깅 편의용(콘솔에서 window.sb 확인 가능)
      window.sb = sb;
      // 원격 설정 먼저 적용 (가능한 경우)
      await loadSettingsFromSupabase();
    }

    bind();
    bindSideUi();

    // 배경 좌표 UI 초기 동기화
    updateBgUi();
    await ensureFontsReady();

    if (bgImg.complete) {
      rerollIfNeeded(true);
      renderAll();
    } else {
      bgImg.addEventListener(
        "load",
        () => {
          rerollIfNeeded(true);
          renderAll();
        },
        { once: true }
      );
      bgImg.addEventListener(
        "error",
        () => {
          // bg.jpg 로드 실패 시 bg.png로 자동 폴백
          if (String(bgImg.src || "").includes("bg.jpg")) {
            bgImg.src = BG_FALLBACK;
            return;
          }
          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = "#fff";
          ctx.font = `400 14px "${FONT_FAMILY.regular}", Arial`;
          ctx.fillText(`배경 이미지 로드 실패: ${BG_PRIMARY} / ${BG_FALLBACK}`, 12, 24);
        },
        { once: true }
      );
    }

    // 최초 렌더 이후부터 저장 허용
    isReadyForSave = true;
  }

  init();
})();
