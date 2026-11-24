(() => {
  "use strict";

  const REQ_STORE = "ftr_requests_v1";
  const MEET_STORE = "ftr_meetings_v2";
  const LANG_STORE = "ftr_lang";
  const PAGE = 20;
  const STATUSES = ["hal", "jarayon", "korib", "rad"];
  const STATUS_STYLE = {
    hal: { c: "b-ok", color: "var(--ok)" }, jarayon: { c: "b-warn", color: "var(--warn)" },
    korib: { c: "b-info", color: "var(--info)" }, rad: { c: "b-bad", color: "var(--bad)" }
  };
  // Masʼul tashkilotlar guruhi (bir yozuv bir nechta guruhga tushishi mumkin)
  const ORG_GROUPS = [
    [/инвестиция/i, "inv"], [/кадастр/i, "kad"], [/агро\s*банк/i, "agro"], [/халқ\s*банк/i, "xalq"],
    [/қурилиш/i, "qur"], [/архитектура/i, "arx"], [/ўринбосар/i, "orin"], [/қишлоқ\s*хўжалиг/i, "qx"],
    [/электр/i, "elek"], [/савдо-саноат/i, "ssp"]
  ];

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isAdmin = () => location.hash === "#admin";
  const load = (k, f) => { try { const s = localStorage.getItem(k); if (s) return JSON.parse(s); } catch (e) { /* eʼtiborsiz */ } return f; };

  // ---------- til ----------
  const LANGS = Object.keys(window.I18N);
  const fromUrl = new URLSearchParams(location.search).get("lang");
  let lang = LANGS.includes(fromUrl) ? fromUrl : (LANGS.includes(localStorage.getItem(LANG_STORE)) ? localStorage.getItem(LANG_STORE) : "uz");
  const L = () => window.I18N[lang];
  const t = (key, vars) => {
    let s = L()[key] ?? window.I18N.uz[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, v)));
    return s;
  };

  // Oʻzbek kirill -> lotin (reyestr matnlarini lotin va xorijiy tillarda koʻrsatish uchun)
  const CYR = { а:"a",б:"b",в:"v",г:"g",ғ:"gʻ",д:"d",ё:"yo",ж:"j",з:"z",и:"i",й:"y",к:"k",қ:"q",л:"l",м:"m",н:"n",о:"o",ў:"oʻ",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"x",ҳ:"h",ч:"ch",ш:"sh",щ:"sh",ъ:"ʼ",ь:"",ы:"i",э:"e",ю:"yu",я:"ya" };
  const IS_CYR = /[А-Яа-яЁёЎўҚқҒғҲҳ]/;
  const VOWEL_OR_SIGN = "аеёиоуўэюяъьыАЕЁИОУЎЭЮЯЪЬЫ";
  function translit(str) {
    if (!str || !IS_CYR.test(str)) return str || "";
    let out = "";
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], lo = ch.toLowerCase(), up = ch !== lo, prev = str[i - 1];
      let r;
      if (lo === "е") r = !prev || !IS_CYR.test(prev) || VOWEL_OR_SIGN.includes(prev) ? "ye" : "e";
      else if (lo === "ц") r = prev && VOWEL_OR_SIGN.includes(prev) ? "ts" : "s";
      else r = CYR[lo];
      if (r === undefined) { out += ch; continue; }
      if (up && r) {
        const next = str[i + 1];
        const allCaps = next && IS_CYR.test(next) && next !== next.toLowerCase();
        r = allCaps ? r.toUpperCase() : r[0].toUpperCase() + r.slice(1);
      }
      out += r;
    }
    return out;
  }
  // Reyestr maʼlumotini tanlangan tilda koʻrsatish: kirill va rus — asl holida, qolganlari — lotinda
  const D = (s) => (lang === "cy" || lang === "ru" ? (s || "") : translit(s));

  const fmt = (iso) => {
    const d = parse(iso);
    if (L().months) return `${d.getDate()}-${L().months[d.getMonth()]}, ${d.getFullYear()}`;
    return d.toLocaleDateString(L()._locale, { day: "numeric", month: "long", year: "numeric" });
  };
  const monthLabel = (ym) => {
    const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1);
    if (L().months) { const m = L().months[d.getMonth()]; return `${m[0].toUpperCase()}${m.slice(1)} ${d.getFullYear()}`; }
    return d.toLocaleDateString(L()._locale, { month: "long", year: "numeric" });
  };
  const dayMonth = (iso) => {
    const d = parse(iso);
    if (L().months) return [d.getDate(), L().months[d.getMonth()]];
    return [d.getDate(), d.toLocaleDateString(L()._locale, { month: "short" })];
  };
  const statusText = (k) => t("s_" + (STATUSES.includes(k) ? k : "korib"));
  const groupsOf = (org) => { const g = ORG_GROUPS.filter(([re]) => re.test(org)).map(([, id]) => id); return g.length ? g : ["none"]; };
  const orgName = (id) => L().orgs[id] || id;
  // Oʻzbek tillarida tashkilot asl nomi, boshqa tillarda — tarjima qilingan guruh nomi
  const orgText = (org) => (lang === "uz" || lang === "cy" ? D(org) : (org ? groupsOf(org).map(orgName).join(", ") : ""));

  const download = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const csv = (rows) => "﻿" + rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");

  // ---------- maʼlumotlar ----------
  const R = (window.REYESTR || []).map((r) => ({ ...r, _hay: "" }));
  R.forEach((r) => {
    const txt = [r.korxona, r.fish, r.faoliyat, r.muammo, r.natija, r.tashkilot, r.xodim].join(" ");
    r._hay = (txt + " " + translit(txt)).toLowerCase();
  });
  const META = window.REYESTR_META || {};
  let requests = load(REQ_STORE, []);
  let meetings = load(MEET_STORE, null) || (window.UCHRASHUVLAR || []);
  const saveMeetings = () => localStorage.setItem(MEET_STORE, JSON.stringify(meetings));
  const upcoming = () => meetings.filter((m) => parse(m.sana) >= today).sort((a, b) => a.sana.localeCompare(b.sana));
  const state = { status: "", shown: PAGE };

  const fillSelect = (sel, items, first) => {
    const keep = sel.value;
    sel.innerHTML = (first ? `<option value="">${esc(first)}</option>` : "") +
      items.map((i) => Array.isArray(i) ? `<option value="${esc(i[0])}">${esc(i[1])}</option>` : `<option>${esc(i)}</option>`).join("");
    if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
  };

  // ---------- statik matnlar ----------
  function applyStatic() {
    document.documentElement.lang = L()._html;
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    $("#today").textContent = t("today", { d: fmt(iso) });
    $("#asof").textContent = META.holatiga ? t("asof", { d: fmt(META.holatiga) }) : "";
    $("#footNote").textContent = t("footSource", { d: META.holatiga ? fmt(META.holatiga) : "—" });

    const months = [...new Set(R.map((r) => r.sana.slice(0, 7)))].sort().reverse();
    fillSelect($("#fMonth"), months.map((m) => [m, monthLabel(m)]), t("allMonths"));
    const orgs = new Set(); R.forEach((r) => groupsOf(r.tashkilot).forEach((g) => orgs.add(g)));
    fillSelect($("#fOrg"), [...orgs].map((id) => [id, orgName(id)]).sort((a, b) => a[1].localeCompare(b[1])), t("allOrgs"));
    fillSelect($("#reqMahalla"), window.SITE.mahallalar.map((m) => [m, D(m)]), t("choose"));
    fillSelect($("#reqSoha"), L().sohalar, t("choose"));
  }

  // ---------- statistika ----------
  function renderStats() {
    const c = { hal: 0, jarayon: 0, korib: 0, rad: 0 };
    R.forEach((r) => c[r.holat]++);
    const days = new Set(R.map((r) => r.sana)).size;
    const pct = R.length ? Math.round((c.hal / R.length) * 100) : 0;
    $("#stats").innerHTML = `
      <div class="stat"><b>${R.length}</b><span>${esc(t("stTotal"))}</span></div>
      <div class="stat"><b>${days}</b><span>${esc(t("stDays"))}</span></div>
      <div class="stat"><b>${c.hal}</b><span>${esc(t("stHal", { p: pct }))}</span><div class="meter"><i style="width:${pct}%"></i></div></div>
      <div class="stat"><b>${c.korib + c.jarayon}</b><span>${esc(t("stOpen"))}</span></div>`;

    const bars = (rows, colorOf, key) => {
      const max = Math.max(1, ...rows.map((r) => r[1]));
      return rows.map(([k, v, label]) => `<button class="bar-row" type="button" data-${key}="${esc(k)}" title="${esc(label)}">
        <span>${esc(label)}</span><div class="track"><i style="width:${(v / max) * 100}%;${colorOf ? "background:" + colorOf(k) : ""}"></i></div><b>${v}</b></button>`).join("");
    };
    $("#byStatus").innerHTML = bars(STATUSES.map((k) => [k, c[k], statusText(k)]), (k) => STATUS_STYLE[k].color, "status");
    const org = {};
    R.forEach((r) => groupsOf(r.tashkilot).forEach((g) => (org[g] = (org[g] || 0) + 1)));
    $("#byOrg").innerHTML = bars(Object.entries(org).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, orgName(k)]), null, "org");
    const mon = {};
    R.forEach((r) => { const k = r.sana.slice(0, 7); mon[k] = (mon[k] || 0) + 1; });
    $("#byMonth").innerHTML = bars(Object.entries(mon).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v, monthLabel(k)]), () => "var(--navy-2)", "month");
  }
  $("#statistika").addEventListener("click", (e) => {
    const b = e.target.closest(".bar-row");
    if (!b) return;
    if (b.dataset.status) state.status = b.dataset.status;
    if (b.dataset.org) $("#fOrg").value = b.dataset.org;
    if (b.dataset.month) $("#fMonth").value = b.dataset.month;
    state.shown = PAGE; renderRegistry();
    $("#reyestr").scrollIntoView();
  });

  // ---------- reyestr ----------
  function filtered(ignoreStatus) {
    const q = $("#fSearch").value.trim().toLowerCase();
    const m = $("#fMonth").value, o = $("#fOrg").value;
    return R.filter((r) => {
      if (!ignoreStatus && state.status && r.holat !== state.status) return false;
      if (m && !r.sana.startsWith(m)) return false;
      if (o && !groupsOf(r.tashkilot).includes(o)) return false;
      return !q || r._hay.includes(q);
    });
  }

  function renderRegistry() {
    const base = filtered(true);
    const cnt = { "": base.length }; base.forEach((r) => (cnt[r.holat] = (cnt[r.holat] || 0) + 1));
    $("#statusChips").innerHTML = [["", t("all")], ...STATUSES.map((k) => [k, statusText(k)])]
      .map(([k, txt]) => `<button type="button" class="chip ${state.status === k ? "on" : ""}" data-s="${k}">${esc(txt)} <b>${cnt[k] || 0}</b></button>`).join("");

    const rows = filtered();
    $("#registryEmpty").hidden = rows.length > 0;
    $("#resultCount").textContent = t("count", { n: rows.length });
    $("#registryBody").innerHTML = rows.slice(0, state.shown).map((r) => {
      const who = r.fish && r.fish !== r.korxona ? `<small>${esc(D(r.fish))}</small>` : "";
      return `<tr data-id="${r.id}" tabindex="0">
        <td class="n">${r.id}</td>
        <td class="date" data-l="${esc(t("thDate"))}">${fmt(r.sana)}</td>
        <td class="who"><b>${esc(D(r.korxona))}</b>${who}</td>
        <td class="issue"><span class="clamp">${esc(D(r.muammo))}</span></td>
        <td class="resp" data-l="${esc(t("thResp"))}">${esc(orgText(r.tashkilot) || "—")}${r.xodim ? `<small>${esc(D(r.xodim))}</small>` : ""}</td>
        <td><span class="badge ${STATUS_STYLE[r.holat].c}">${esc(statusText(r.holat))}</span></td>
      </tr>`;
    }).join("");
    $("#moreBtn").hidden = rows.length <= state.shown;
    $("#moreBtn").textContent = t("more", { n: rows.length - state.shown });
  }

  $("#statusChips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    state.status = b.dataset.s; state.shown = PAGE; renderRegistry();
  });
  ["#fSearch", "#fMonth", "#fOrg"].forEach((s) => $(s).addEventListener("input", () => { state.shown = PAGE; renderRegistry(); }));
  $("#moreBtn").addEventListener("click", () => { state.shown += PAGE; renderRegistry(); });
  $("#registryBody").addEventListener("click", (e) => { const tr = e.target.closest("tr"); if (tr) openDetail(+tr.dataset.id); });
  $("#registryBody").addEventListener("keydown", (e) => { if (e.key === "Enter") { const tr = e.target.closest("tr"); if (tr) openDetail(+tr.dataset.id); } });

  $("#exportCsv").addEventListener("click", () => {
    const head = [t("thNo"), t("thDate"), t("csvCompany"), t("csvFish"), t("dActivity"), t("dIssue"), t("dResult"), t("dOrg"), t("dStaff"), t("dStatus")];
    download("tadbirkorlar-reyestri.csv", csv([head, ...filtered().map((r) =>
      [r.id, r.sana, D(r.korxona), D(r.fish), D(r.faoliyat), D(r.muammo), D(r.natija), orgText(r.tashkilot), D(r.xodim), statusText(r.holat)])]), "text/csv");
  });

  // ---------- tafsilot ----------
  const dlg = $("#detail");
  let openId = null;
  function openDetail(id) {
    const r = R.find((x) => x.id === id);
    if (!r) return;
    openId = id;
    const para = (s) => esc(D(s)).split("\n").map((p) => `<p>${p}</p>`).join("");
    $("#detailBody").innerHTML = `
      <div class="d-head">
        <span class="badge ${STATUS_STYLE[r.holat].c}">${esc(statusText(r.holat))}</span>
        <h2>${esc(D(r.korxona))}</h2>
        <div class="meta">
          <span>№ ${r.id}</span>
          <span>🗓 ${fmt(r.sana)}</span>
          ${r.fish && r.fish !== r.korxona ? `<span>👤 ${esc(D(r.fish))}</span>` : ""}
        </div>
      </div>
      <div class="d-body">
        ${t("origNote") ? `<p class="orig-note">ⓘ ${esc(t("origNote"))}</p>` : ""}
        ${r.faoliyat ? `<h3>${esc(t("dActivity"))}</h3><div class="text">${para(r.faoliyat)}</div>` : ""}
        <h3>${esc(t("dIssue"))}</h3><div class="text">${para(r.muammo || "—")}</div>
        ${r.natija ? `<h3>${esc(t("dResult"))}</h3><div class="text result">${para(r.natija)}</div>` : ""}
        <div class="d-grid">
          <div><small>${esc(t("dOrg"))}</small><b>${esc(orgText(r.tashkilot) || "—")}</b></div>
          <div><small>${esc(t("dStaff"))}</small><b>${esc(D(r.xodim) || "—")}</b></div>
          <div><small>${esc(t("dStatus"))}</small><b>${esc(statusText(r.holat))}</b></div>
        </div>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  $("#closeDetail").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => (openId = null));

  // ---------- hero karta va kelgusi uchrashuvlar ----------
  function renderNext() {
    const up = upcoming();
    const card = $("#nextCard");
    if (up.length) {
      const m = up[0], days = Math.round((parse(m.sana) - today) / 864e5);
      const [d, mon] = dayMonth(m.sana);
      card.innerHTML = `<div class="label">${esc(t("nextLabel"))}</div>
        <div class="date"><span class="day">${d}</span><span class="mon">${esc(mon)}, ${esc(t("at", { t: m.vaqt }))}</span></div>
        <h3>${esc(m.mavzu)}</h3><p>📍 ${esc(m.joy)}</p>
        <span class="countdown">${esc(days === 0 ? t("todayW") : days === 1 ? t("tomorrow") : t("daysLeft", { n: days }))}</span>`;
      return;
    }
    const last = R[0];
    if (!last) { card.innerHTML = `<h3>${esc(t("noRecords"))}</h3>`; return; }
    const sameDay = R.filter((r) => r.sana === last.sana);
    const [d, mon] = dayMonth(last.sana);
    card.innerHTML = `<div class="label">${esc(t("lastLabel"))}</div>
      <div class="date"><span class="day">${d}</span><span class="mon">${esc(mon)}, ${parse(last.sana).getFullYear()}</span></div>
      <h3>${esc(t("lastCount", { n: sameDay.length }))}</h3>
      ${sameDay.slice(0, 3).map((r) => `<p>• ${esc(D(r.korxona))}</p>`).join("")}
      <a class="countdown" href="#reyestr">${esc(t("viewInReg"))}</a>`;
  }

  function renderUpcoming() {
    const up = upcoming();
    $("#kelgusi").hidden = !up.length;
    $("#navUpcoming").hidden = !up.length;
    $("#upcoming").innerHTML = up.map((m) => {
      const [d, mon] = dayMonth(m.sana);
      return `<article class="up-card">
        <div class="cal"><b>${d}</b><small>${esc(mon)}</small></div>
        <div><h3>${esc(m.mavzu)}</h3><p>🕙 ${fmt(m.sana)}, ${esc(t("at", { t: m.vaqt }))}</p><p>📍 ${esc(m.joy)}</p>
        <a class="btn btn-sm" href="#murojaat" data-pick="${esc(m.id)}">${esc(t("upBtn"))}</a></div>
      </article>`;
    }).join("");
    fillSelect($("#reqMeeting"), up.map((m) => [m.id, `${fmt(m.sana)} — ${m.mavzu}`]), t("anyMeeting"));
  }
  $("#upcoming").addEventListener("click", (e) => { if (e.target.dataset.pick) $("#reqMeeting").value = e.target.dataset.pick; });

  // ---------- murojaat formasi ----------
  $("#requestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    requests.unshift({ ...Object.fromEntries(new FormData(e.target)), til: lang, vaqt: new Date().toISOString() });
    localStorage.setItem(REQ_STORE, JSON.stringify(requests));
    e.target.reset();
    $("#reqNote").textContent = t("sent");
    setTimeout(() => ($("#reqNote").textContent = ""), 6000);
    renderAdmin();
  });

  // ---------- boshqaruv ----------
  function renderAdmin() {
    $("#admin").hidden = !isAdmin();
    if (!isAdmin()) return;
    $("#requestList").innerHTML = requests.length ? requests.map((r) => `<div class="req">
        <b>${esc(r.korxona)}</b> — ${esc(r.fish)}
        <p>${esc(r.telefon)} · ${esc(r.mahalla)} · ${esc(r.soha)}</p>
        <p>${esc(r.mazmun)}</p>
        <p><small>${new Date(r.vaqt).toLocaleString(L()._locale || "uz-UZ")}${r.til ? " · " + esc(r.til) : ""}</small></p>
      </div>`).join("") : `<p class="muted">${esc(t("noReq"))}</p>`;
    $("#meetingList").innerHTML = meetings.slice().sort((a, b) => a.sana.localeCompare(b.sana)).map((m) => `<div class="req">
        <b>${fmt(m.sana)}, ${esc(m.vaqt)}</b> — ${esc(m.mavzu)}
        <p>${esc(m.joy)}</p>
        <button type="button" class="link-btn" data-del="${esc(m.id)}">${esc(t("del"))}</button>
      </div>`).join("");
  }
  $("#meetingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    meetings.push({ id: `${d.sana}-${Date.now().toString(36)}`, ...d });
    saveMeetings(); e.target.reset(); renderNext(); renderUpcoming(); renderAdmin();
  });
  $("#meetingList").addEventListener("click", (e) => {
    const id = e.target.dataset.del;
    if (!id || !confirm(t("confirmDel"))) return;
    meetings = meetings.filter((m) => m.id !== id);
    saveMeetings(); renderNext(); renderUpcoming(); renderAdmin();
  });
  $("#exportReq").addEventListener("click", () => {
    download("kelgan-murojaatlar.csv", csv([["Vaqt", "F.I.Sh.", "Korxona", "Telefon", "Hudud", "Soha", "Uchrashuv", "Til", "Mazmun"],
      ...requests.map((r) => [r.vaqt, r.fish, r.korxona, r.telefon, r.mahalla, r.soha, r.uchrashuv, r.til, r.mazmun])]), "text/csv");
  });

  // ---------- umumiy ----------
  $("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
  $("#nav").addEventListener("click", (e) => { if (e.target.tagName === "A") $("#nav").classList.remove("open"); });
  window.addEventListener("hashchange", () => { renderAdmin(); if (isAdmin()) $("#admin").scrollIntoView(); });

  $("#lang").innerHTML = LANGS.map((k) => `<option value="${k}">${esc(window.I18N[k]._name)}</option>`).join("");
  $("#lang").addEventListener("change", (e) => {
    lang = e.target.value;
    localStorage.setItem(LANG_STORE, lang);
    renderAll();
  });

  function renderAll() {
    $("#lang").value = lang;
    applyStatic(); renderStats(); renderRegistry(); renderNext(); renderUpcoming(); renderAdmin();
    if (openId !== null && dlg.open) openDetail(openId);
  }
  renderAll();
})();
