"use strict";

// 釣點清單；海況用外海一點，避免模型網格落在陸地
const SPOTS = [
  {
    id: "wanli", name: "萬里漁港",
    lat: 25.1788, lon: 121.6891, seaLat: 25.25, seaLon: 121.70, offshore: false,
    note: "北海岸常見的出海港口，受東北季風影響大，秋冬浪況變化快，出港前務必確認風浪。"
  },
  {
    id: "yehliu", name: "野柳",
    lat: 25.2085, lon: 121.6902, seaLat: 25.23, seaLon: 121.70, offshore: false,
    note: "岬角與礁岩地形，近岸水流複雜；浪大時請勿靠近岸邊礁石，船釣也要避開礁區。"
  },
  {
    id: "keelungislet", name: "基隆嶼",
    lat: 25.1917, lon: 121.7897, seaLat: 25.1917, seaLon: 121.7897, offshore: true,
    note: "離岸約 4–5 海浬的外海島嶼，風浪比近岸大、回港也較久，評分已額外保守，浪稍大就請改期。"
  }
];

// 常見魚種（北部海域的一般性參考，魚況每年不同）
const FISH = [
  { name: "白帶魚", months: [10, 11, 12, 1, 2], tip: "夜釣或船釣主力，需用鋼線，銀亮魚身。" },
  { name: "小卷（透抽）", months: [5, 6, 7, 8, 9], tip: "夜間燈火釣，北海岸夏季熱門目標。" },
  { name: "軟絲", months: [3, 4, 5, 6, 9, 10, 11], tip: "春季產卵、秋季成長，用木蝦搭配路亞。" },
  { name: "鬼頭刀", months: [4, 5, 6, 7, 8, 9], tip: "外海漂流或曳繩，海水溫暖時靠近岸邊。" },
  { name: "紅甘（青甘）", months: [9, 10, 11, 12, 1, 2, 3], tip: "基隆嶼周邊常見，力道強，適合拋投或慢速鐵板。" },
  { name: "黑鯛", months: [11, 12, 1, 2, 3], tip: "冬季礁岸或港灣魚種，餌以磯蟹、蝦為主。" },
  { name: "石斑", months: [4, 5, 6, 7, 8, 9, 10], tip: "礁區底棲魚，需控制好魚線避免鑽洞。" },
  { name: "土魠（鰆）", months: [11, 12, 1, 2, 3], tip: "冬季洄游，以拖釣或路亞為主。" },
  { name: "花腹鯖", months: [10, 11, 12, 1, 2], tip: "魚群時常成群靠近港邊，可用小鉤串釣。" }
];
const SEASONS = [
  ["春", [3, 4, 5]], ["夏", [6, 7, 8]], ["秋", [9, 10, 11]], ["冬", [12, 1, 2]]
];

function weatherUrl(s) {
  return "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon +
    "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max" +
    "&hourly=wind_speed_10m&wind_speed_unit=ms&timezone=Asia%2FTaipei&forecast_days=7";
}

function marineUrl(s) {
  return "https://marine-api.open-meteo.com/v1/marine?latitude=" + s.seaLat + "&longitude=" + s.seaLon +
    "&current=wave_height,wave_direction,wave_period,sea_surface_temperature" +
    "&hourly=sea_level_height_msl,wave_height" +
    "&daily=wave_height_max,wave_period_max&timezone=Asia%2FTaipei&forecast_days=7";
}

const $ = (id) => document.getElementById(id);
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function weatherInfo(code) {
  if (code === 0) return ["☀️", "晴"];
  if (code <= 2) return ["🌤️", "多雲時晴"];
  if (code === 3) return ["☁️", "陰"];
  if (code <= 48) return ["🌫️", "有霧"];
  if (code <= 57) return ["🌦️", "毛毛雨"];
  if (code <= 67) return ["🌧️", "雨"];
  if (code <= 77) return ["🌨️", "雪"];
  if (code <= 82) return ["🌦️", "陣雨"];
  if (code <= 86) return ["🌨️", "陣雪"];
  return ["⛈️", "雷雨"];
}

function windDir(deg) {
  const names = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
  return names[Math.round(deg / 45) % 8] + "風";
}

function beaufort(ms) {
  const limits = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  let i = 0;
  while (i < limits.length && ms >= limits[i]) i++;
  return i;
}

// 月齡：以 2000-01-06 18:14 UTC 新月為基準
function moonAge(date) {
  const synodic = 29.530588853;
  const base = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - base) / 86400000;
  return ((days % synodic) + synodic) % synodic;
}

function moonInfo(age) {
  const phases = [
    [1.85, "🌑", "新月"], [5.54, "🌒", "眉月"], [9.23, "🌓", "上弦月"],
    [12.92, "🌔", "盈凸月"], [16.61, "🌕", "滿月"], [20.30, "🌖", "虧凸月"],
    [23.99, "🌗", "下弦月"], [27.68, "🌘", "殘月"], [29.54, "🌑", "新月"]
  ];
  const p = phases.find((x) => age < x[0]);
  const fromSpring = Math.min(age, Math.abs(age - 14.77), 29.53 - age); // 距離朔望的天數
  return { icon: p[1], name: p[2], spring: fromSpring <= 2 };
}

// 釣魚適合度（船釣）：0–100
function score(d) {
  let s = 100;
  const reasons = [];
  const w = d.wave, v = d.wind, g = d.gust, r = d.rain;

  if (w != null) {
    if (w > 2.5) { s -= 70; reasons.push("浪高 " + w.toFixed(1) + " m，海況惡劣"); }
    else if (w > 2.0) { s -= 50; reasons.push("浪高 " + w.toFixed(1) + " m，偏大"); }
    else if (w > 1.5) { s -= 30; reasons.push("浪高 " + w.toFixed(1) + " m，搖晃明顯"); }
    else if (w > 1.0) { s -= 12; reasons.push("浪高 " + w.toFixed(1) + " m，略有湧浪"); }
    else reasons.push("浪高 " + w.toFixed(1) + " m，海面平穩");
  }
  if (v > 12) { s -= 45; reasons.push("風速 " + v.toFixed(1) + " m/s，風大"); }
  else if (v > 8) { s -= 28; reasons.push("風速 " + v.toFixed(1) + " m/s，偏強"); }
  else if (v > 5.5) { s -= 10; reasons.push("風速 " + v.toFixed(1) + " m/s，微強"); }
  else reasons.push("風速 " + v.toFixed(1) + " m/s，風勢溫和");

  if (g > 15) { s -= 15; reasons.push("陣風可達 " + g.toFixed(0) + " m/s"); }
  if (r >= 70) { s -= 20; reasons.push("降雨機率 " + r + "%"); }
  else if (r >= 40) { s -= 8; reasons.push("降雨機率 " + r + "%"); }

  if (d.spring) { s += 5; reasons.push("接近大潮，水流較活"); }
  if (d.offshore) { s -= 8; reasons.push("外海離島，風浪影響比近岸大"); }

  s = Math.max(0, Math.min(100, Math.round(s)));
  let level = "bad", label = "不建議出海";
  if (s >= 75) { level = "good"; label = "適合出海"; }
  else if (s >= 50) { level = "ok"; label = "留意海況"; }
  return { s, level, label, reasons };
}

// 從逐時潮位找高低潮
function findTides(times, heights) {
  const out = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const a = heights[i - 1], b = heights[i], c = heights[i + 1];
    if (a == null || b == null || c == null) continue;
    if (b > a && b >= c) out.push({ t: times[i], h: b, type: "滿潮" });
    else if (b < a && b <= c) out.push({ t: times[i], h: b, type: "乾潮" });
  }
  return out;
}

function fmt(n, digits) {
  return n == null ? "—" : Number(n).toFixed(digits == null ? 1 : digits);
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function buildDays(wx, mr, spot) {
  const days = [];
  const tides = mr && mr.hourly ? findTides(mr.hourly.time, mr.hourly.sea_level_height_msl) : [];
  wx.daily.time.forEach((date, i) => {
    const dt = new Date(date + "T12:00:00+08:00");
    const moon = moonInfo(moonAge(dt));
    const d = {
      date, dt, moon,
      code: wx.daily.weather_code[i],
      tmax: wx.daily.temperature_2m_max[i],
      tmin: wx.daily.temperature_2m_min[i],
      rain: wx.daily.precipitation_probability_max[i] || 0,
      wind: wx.daily.wind_speed_10m_max[i],
      gust: wx.daily.wind_gusts_10m_max[i],
      wave: mr && mr.daily ? mr.daily.wave_height_max[i] : null,
      period: mr && mr.daily ? mr.daily.wave_period_max[i] : null,
      spring: moon.spring,
      offshore: spot.offshore,
      tides: tides.filter((x) => x.t.startsWith(date))
    };
    d.result = score(d);
    days.push(d);
  });
  return days;
}

function renderNow(wx, mr) {
  const c = wx.current;
  const [icon, text] = weatherInfo(c.weather_code);
  const mc = mr && mr.current ? mr.current : {};
  const moon = moonInfo(moonAge(new Date()));
  const items = [
    ["天氣", icon + " " + text, "體感 " + fmt(c.apparent_temperature, 0) + "°C"],
    ["氣溫", fmt(c.temperature_2m, 1) + "°C", ""],
    ["風", fmt(c.wind_speed_10m) + " m/s", windDir(c.wind_direction_10m) + "・" + beaufort(c.wind_speed_10m) + " 級"],
    ["陣風", fmt(c.wind_gusts_10m) + " m/s", ""],
    ["浪高", mc.wave_height != null ? fmt(mc.wave_height, 2) + " m" : "—", mc.wave_period != null ? "週期 " + fmt(mc.wave_period) + " 秒" : ""],
    ["海水溫", mc.sea_surface_temperature != null ? fmt(mc.sea_surface_temperature) + "°C" : "—", ""],
    ["月相", moon.icon + " " + moon.name, moon.spring ? "大潮期" : "小潮期"]
  ];
  $("now-grid").innerHTML = items.map((x) =>
    '<div class="stat"><div class="label">' + x[0] + '</div><div class="value">' + x[1] +
    '</div><div class="small">' + x[2] + "</div></div>").join("");
  $("now").classList.remove("hidden");
}

function renderDays(days) {
  $("days").innerHTML = days.map((d, i) => {
    const [icon] = weatherInfo(d.code);
    return '<button class="day" data-i="' + i + '">' +
      '<div class="date">' + (d.dt.getMonth() + 1) + "/" + d.dt.getDate() + "</div>" +
      '<div class="wk">週' + WEEK[d.dt.getDay()] + (i === 0 ? "・今天" : "") + "</div>" +
      '<div class="icon">' + icon + "</div>" +
      '<div class="meta">浪 ' + fmt(d.wave) + " m・風 " + fmt(d.wind, 0) + "</div>" +
      '<span class="badge ' + d.result.level + '">' + d.result.s + " 分</span></button>";
  }).join("");
  $("forecast").classList.remove("hidden");
  $("days").querySelectorAll(".day").forEach((b) =>
    b.addEventListener("click", () => select(days, Number(b.dataset.i))));
}

function select(days, i) {
  document.querySelectorAll(".day, .cal-cell").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.i) === i));
  const d = days[i];
  const [icon, text] = weatherInfo(d.code);
  const tideHtml = d.tides.length
    ? d.tides.map((t) => '<div class="tide"><b>' + t.type + "</b> " + t.t.slice(11) + "・" + fmt(t.h, 2) + " m</div>").join("")
    : '<div class="tide">無潮汐資料</div>';
  $("detail").innerHTML =
    '<div class="detail-head">' +
      '<div class="score-ring ' + d.result.level + '">' + d.result.s + "</div>" +
      "<div><div class=\"verdict\">" + (d.dt.getMonth() + 1) + "/" + d.dt.getDate() + " 週" + WEEK[d.dt.getDay()] +
      "・" + d.result.label + "</div>" +
      '<ul class="reasons">' + d.result.reasons.map((r) => "<li>" + r + "</li>").join("") + "</ul></div>" +
    "</div>" +
    '<div class="now-grid">' +
      '<div class="stat"><div class="label">天氣</div><div class="value">' + icon + " " + text + "</div></div>" +
      '<div class="stat"><div class="label">氣溫</div><div class="value">' + fmt(d.tmin, 0) + "–" + fmt(d.tmax, 0) + "°C</div></div>" +
      '<div class="stat"><div class="label">降雨機率</div><div class="value">' + d.rain + "%</div></div>" +
      '<div class="stat"><div class="label">最大風速</div><div class="value">' + fmt(d.wind) + " m/s</div><div class=\"small\">陣風 " + fmt(d.gust, 0) + " m/s</div></div>" +
      '<div class="stat"><div class="label">最大浪高</div><div class="value">' + fmt(d.wave, 2) + " m</div><div class=\"small\">週期 " + fmt(d.period) + " 秒</div></div>" +
      '<div class="stat"><div class="label">月相</div><div class="value">' + d.moon.icon + " " + d.moon.name + "</div><div class=\"small\">" + (d.spring ? "大潮期" : "小潮期") + "</div></div>" +
    "</div>" +
    '<h2 style="margin-top:16px">潮汐（模式推估）</h2><div class="tides">' + tideHtml + "</div>";
  $("detail").classList.remove("hidden");
}

// 出海日曆：一眼看出 7 天哪幾天適合出海
function renderCalendar(days) {
  const marks = { good: "✅", ok: "⚠️", bad: "⛔" };
  $("cal-grid").innerHTML = days.map((d, i) =>
    '<button class="cal-cell ' + d.result.level + '" data-i="' + i + '">' +
      '<span class="cal-wk">週' + WEEK[d.dt.getDay()] + "</span>" +
      '<span class="cal-date">' + (d.dt.getMonth() + 1) + "/" + d.dt.getDate() + "</span>" +
      '<span class="cal-mark">' + marks[d.result.level] + "</span>" +
      '<span class="cal-score">' + d.result.s + "</span></button>").join("");
  const good = days.map((d, i) => ({ d, i })).filter((x) => x.d.result.level === "good");
  let best = days[0], bi = 0;
  days.forEach((d, i) => { if (d.result.s > best.result.s) { best = d; bi = i; } });
  const bestTxt = (best.dt.getMonth() + 1) + "/" + best.dt.getDate() + "（週" + WEEK[best.dt.getDay()] + "）" + best.result.s + " 分";
  $("cal-summary").textContent = good.length
    ? "未來 7 天有 " + good.length + " 天適合出海，最佳日：" + bestTxt + "。"
    : "未來 7 天沒有特別適合出海的日子，相對最好的是 " + bestTxt + "。";
  $("cal-grid").querySelectorAll(".cal-cell").forEach((b) =>
    b.addEventListener("click", () => {
      select(days, Number(b.dataset.i));
      $("detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }));
  const bestCell = $("cal-grid").children[bi];
  if (bestCell) bestCell.insertAdjacentHTML("beforeend", '<span class="cal-best">最佳</span>');
  $("calendar").classList.remove("hidden");
}

// 逐時折線圖（純 SVG，不依賴外部套件）
function lineChart(el, times, values, opt) {
  const W = 720, H = 190, ml = 38, mr = 12, mt = 14, mb = 26;
  const pts = [];
  values.forEach((v, i) => { if (v != null) pts.push([i, v]); });
  if (pts.length < 2) { el.innerHTML = ""; return; }
  const n = values.length;
  const ymax = Math.max(opt.threshold * 1.25, Math.max.apply(null, pts.map((p) => p[1])) * 1.15);
  const x = (i) => ml + (i / (n - 1)) * (W - ml - mr);
  const y = (v) => mt + (1 - v / ymax) * (H - mt - mb);

  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + opt.title + '">';
  for (let k = 0; k <= 4; k++) {
    const v = (ymax / 4) * k;
    svg += '<line class="gl" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
      '<text class="ax" x="' + (ml - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v.toFixed(1) + "</text>";
  }
  times.forEach((t, i) => {
    if (t.endsWith("T00:00")) {
      const m = Number(t.slice(5, 7)), d = Number(t.slice(8, 10));
      svg += '<line class="gl day" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>' +
        '<text class="ax" x="' + (x(i) + 3) + '" y="' + (H - 8) + '">' + m + "/" + d + "</text>";
    }
  });
  svg += '<line class="th" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(opt.threshold) + '" y2="' + y(opt.threshold) + '"/>' +
    '<text class="th-t" x="' + (W - mr - 2) + '" y="' + (y(opt.threshold) - 4) + '" text-anchor="end">' + opt.thresholdLabel + "</text>";
  const line = pts.map((p) => x(p[0]).toFixed(1) + "," + y(p[1]).toFixed(1)).join(" ");
  svg += '<polygon class="area" style="fill:' + opt.color + '" points="' + x(pts[0][0]) + "," + y(0) + " " + line + " " + x(pts[pts.length - 1][0]) + "," + y(0) + '"/>' +
    '<polyline class="ln" style="stroke:' + opt.color + '" points="' + line + '"/>' +
    '<line class="cursor hidden" y1="' + mt + '" y2="' + (H - mb) + '"/>' +
    '<rect class="hit" x="' + ml + '" y="' + mt + '" width="' + (W - ml - mr) + '" height="' + (H - mt - mb) + '"/></svg>';
  el.innerHTML = '<div class="chart-read">' + opt.title + '（移動滑鼠或手指查看數值）</div>' + svg;

  const read = el.querySelector(".chart-read");
  const cur = el.querySelector(".cursor");
  const hit = el.querySelector(".hit");
  const svgEl = el.querySelector("svg");
  function move(ev) {
    const pt = ev.touches ? ev.touches[0] : ev;
    const r = svgEl.getBoundingClientRect();
    const px = ((pt.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - ml) / (W - ml - mr)) * (n - 1))));
    if (values[i] == null) return;
    cur.setAttribute("x1", x(i)); cur.setAttribute("x2", x(i)); cur.classList.remove("hidden");
    const t = times[i];
    read.textContent = Number(t.slice(5, 7)) + "/" + Number(t.slice(8, 10)) + " " + t.slice(11) +
      "　" + opt.label + " " + values[i].toFixed(1) + " " + opt.unit;
  }
  hit.addEventListener("mousemove", move);
  hit.addEventListener("touchmove", move, { passive: true });
  hit.addEventListener("touchstart", move, { passive: true });
}

function renderCharts(wx, mr) {
  lineChart($("chart-wave"), mr && mr.hourly && mr.hourly.wave_height ? mr.hourly.time : [],
    mr && mr.hourly && mr.hourly.wave_height ? mr.hourly.wave_height : [],
    { title: "浪高趨勢（7 天逐時）", label: "浪高", unit: "m", color: "#0b8fb3", threshold: 1.5, thresholdLabel: "1.5 m 留意線" });
  lineChart($("chart-wind"), wx.hourly.time, wx.hourly.wind_speed_10m,
    { title: "風速趨勢（7 天逐時）", label: "風速", unit: "m/s", color: "#2f9e8f", threshold: 8, thresholdLabel: "8 m/s 偏強線" });
  $("charts").classList.remove("hidden");
}

function renderSpots(current) {
  $("spots").innerHTML = SPOTS.map((s) =>
    '<button class="spot' + (s.id === current.id ? " active" : "") + '" data-id="' + s.id + '">' + s.name + "</button>").join("");
  $("spots").querySelectorAll(".spot").forEach((b) =>
    b.addEventListener("click", () => {
      location.hash = b.dataset.id;
    }));
  $("spot-note").textContent = current.note;
}

function renderFish() {
  const month = new Date().getMonth() + 1;
  const now = FISH.filter((f) => f.months.includes(month));
  $("fish-now").innerHTML = now.length
    ? now.map((f) => '<div class="fish"><b>' + f.name + "</b><span>" + f.tip + "</span></div>").join("")
    : '<div class="fish">本月較少特定目標魚種，可向船家詢問近期魚況。</div>';
  $("fish-month").textContent = month + " 月";
  $("fish-all").innerHTML = SEASONS.map((s) => {
    const names = FISH.filter((f) => f.months.some((m) => s[1].includes(m))).map((f) => f.name).join("、");
    return "<li><strong>" + s[0] + "季</strong>：" + names + "</li>";
  }).join("");
}

function currentSpot() {
  const id = location.hash.replace("#", "");
  return SPOTS.find((s) => s.id === id) || SPOTS[0];
}

let loadToken = 0;

async function init() {
  const spot = currentSpot();
  const token = ++loadToken;
  renderSpots(spot);
  $("status").textContent = "正在取得「" + spot.name + "」的最新氣象與海況…";
  $("status").className = "status";
  try {
    const [wx, mr] = await Promise.all([
      getJSON(weatherUrl(spot)),
      getJSON(marineUrl(spot)).catch(() => null)
    ]);
    if (token !== loadToken) return; // 已切換到其他釣點，丟棄舊結果
    const days = buildDays(wx, mr, spot);
    renderNow(wx, mr);
    renderCalendar(days);
    renderDays(days);
    renderCharts(wx, mr);
    select(days, 0);
    $("status").classList.add("hidden");
    $("updated").textContent = spot.name + "・更新時間：" + new Date().toLocaleString("zh-TW", { hour12: false });
    if (!mr) {
      $("status").textContent = "海況資料暫時無法取得，評分僅依天氣計算。";
      $("status").classList.remove("hidden");
    }
  } catch (e) {
    if (token !== loadToken) return;
    $("status").textContent = "無法取得氣象資料，請檢查網路後重新整理。（" + e.message + "）";
    $("status").classList.add("error");
    $("updated").textContent = "載入失敗";
  }
}

window.addEventListener("hashchange", init);
renderFish();
init();
