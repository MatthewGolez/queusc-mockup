var titles = {
    dashboard: ["Welcome back", "1st Semester enrollment, A.Y. 2026-2027"],
    advise: ["Advise & Enroll", "Choose your courses, then pick your block or groups before your window closes."],
    studyload: ["Study Load", "Your official class schedule for 1st Semester."],
    downpayment: ["Downpayment", "Your payment for this semester\u2019s enrollment slot."],
    history: ["Course History", "Your prospectus, term by term, with what you\u2019ve passed and what you can take."]
  };

  // Courses this student may take this term: this term's curriculum, then anything from other terms whose prerequisites are passed.
  var courses = QueuCurriculum.offerable;
  var thisTerm = courses.filter(function(c){ return c.status === "current"; });
  var MAX_UNITS = QueuCurriculum.maxUnits;

  // Blocks: a fixed group for every course. Seats are held for the block as a whole.
  var blocks = {
    A: { picks: { cis2101: 3, cis2102: 1, cis2103: 2, cis2105: 3, geethics: 1, gefreelec2: 1, is3103: 1, is4103: 1, tpe2103: 1 }, enrolled: 31, cap: 40 },
    B: { picks: { cis2101: 1, cis2102: 4, cis2103: 5, cis2105: 2, geethics: 2, gefreelec2: 2, is3103: 4, is4103: 2, tpe2103: 2 }, enrolled: 37, cap: 40 }
  };

  // The guard in <head> already sent signed-out visitors to login.html.
  var currentUser = QueuAuth.current();

  var state;
  function freshState(){
    var advised = {};
    thisTerm.forEach(function(c){ advised[c.id] = true; });
    return { step: "advise", advised: advised, mode: null, block: null, groups: {}, enrolled: false, load: [], label: "" };
  }
  state = freshState();

  // Mock window: 2:14:09 left when the page loads.
  var windowEnd = Date.now() + (2 * 3600 + 14 * 60 + 9) * 1000;

  function toMin(t){ var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  function fmtTime(t){
    var m = toMin(t), h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
    return (h % 12 || 12) + ":" + mm + (h < 12 ? " AM" : " PM");
  }
  function $(sel){ return document.querySelectorAll(sel); }
  function setText(sel, text){ $(sel).forEach(function(el){ el.textContent = text; }); }
  function sumUnits(list){ return list.reduce(function(s, c){ return s + c.units; }, 0); }

  // A course in one specific group, flattened into what the timetable and PDF need.
  function section(c, n){
    var g = c.groups.filter(function(g){ return g[0] === n; })[0];
    return { id: c.id, code: c.code, title: c.title, units: c.units, color: c.color, group: g[0],
      days: g[1].split(" "), start: g[2], end: g[3], room: g[4], faculty: g[5], enrolled: g[6], cap: g[7] };
  }
  function isFull(sec){ return sec.enrolled >= sec.cap; }
  function when(sec){ return sec.days.join(" ") + " " + fmtTime(sec.start) + "\u2013" + fmtTime(sec.end); }

  function advisedCourses(){ return courses.filter(function(c){ return state.advised[c.id]; }); }
  // A block runs exactly this term's curriculum, so it's open only to students advising exactly those courses.
  function blockOpen(){
    var list = advisedCourses();
    return list.length === thisTerm.length && list.every(function(c){ return c.status === "current"; });
  }

  function picked(){
    if (state.mode === "block" && state.block && blockOpen()){
      var picks = blocks[state.block].picks;
      return thisTerm.map(function(c){ return section(c, picks[c.id]); });
    }
    if (state.mode === "custom"){
      return advisedCourses().filter(function(c){ return state.groups[c.id]; })
        .map(function(c){ return section(c, state.groups[c.id]); });
    }
    return [];
  }
  function sectionLabel(){ return state.mode === "block" ? "Block " + state.block : "Non-block"; }

  function conflicts(list){
    var hits = [];
    for (var i = 0; i < list.length; i++){
      for (var j = i + 1; j < list.length; j++){
        var a = list[i], b = list[j];
        var sharedDay = a.days.some(function(d){ return b.days.indexOf(d) > -1; });
        if (sharedDay && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) hits.push([a, b]);
      }
    }
    return hits;
  }

  function seatsHtml(enrolled, cap){
    var left = cap - enrolled;
    if (left <= 0) return '<span class="seat-full">Full</span>';
    return '<span class="seat-n' + (left <= 7 ? " low" : "") + '">' + left + " left</span>" +
      '<span class="meter"><span style="width:' + Math.round(enrolled / cap * 100) + '%"></span></span>' +
      '<span class="seat-of">' + enrolled + " of " + cap + "</span>";
  }

  /* ---------- Block option ---------- */

  function renderBlocks(){
    document.getElementById("blocks").innerHTML = Object.keys(blocks).map(function(key){
      var b = blocks[key], left = b.cap - b.enrolled;
      var list = thisTerm.map(function(c){ return section(c, b.picks[c.id]); });
      return '<label class="block-opt"><input type="radio" name="block" value="' + key + '"' + (state.block === key ? " checked" : "") + (left <= 0 ? " disabled" : "") + ">" +
        '<span class="bo-head"><b>Block ' + key + "</b>" +
        '<span class="bo-seats' + (left <= 5 ? " low" : "") + '">' + (left > 0 ? left + " seats left" : "Full") + "</span></span>" +
        '<span class="meter"><span style="width:' + Math.round(b.enrolled / b.cap * 100) + '%"></span></span>' +
        '<span class="bo-list">' + list.map(function(sec){
          return '<span class="bo-row"><span class="sl-swatch" style="background:' + sec.color + '"></span>' +
            "<b>" + sec.code + "</b><span>G" + sec.group + "</span><span>" + when(sec) + "</span></span>";
        }).join("") + "</span>" +
        '<span class="bo-foot">' + list.length + " courses &middot; " + sumUnits(list) + " units</span></label>";
    }).join("");
  }

  document.getElementById("blocks").addEventListener("change", function(e){
    if (e.target.name !== "block") return;
    state.block = e.target.value;
    render();
  });

  /* ---------- Build-my-own option ---------- */

  function renderGroups(list){
    var clashWith = {};
    conflicts(list).forEach(function(pair){
      clashWith[pair[0].id] = pair[1].code;
      clashWith[pair[1].id] = pair[0].code;
    });

    document.getElementById("group-body").innerHTML = advisedCourses().map(function(c){
      var n = state.groups[c.id];
      var sec = n ? section(c, n) : null;
      var options = (n ? "" : '<option value="" selected disabled>Choose a group</option>') + c.groups.map(function(g){
        var s = section(c, g[0]), full = isFull(s);
        return '<option value="' + g[0] + '"' + (n === g[0] ? " selected" : "") + (full ? " disabled" : "") + ">" +
          "Group " + g[0] + " \u00b7 " + when(s) + (full ? " \u00b7 Full" : "") + "</option>";
      }).join("");
      var clash = sec && clashWith[c.id];

      return '<tr class="grow' + (clash ? " has-clash" : "") + (sec ? "" : " is-skipped") + '">' +
        '<td class="g-course"><span class="code">' + c.code + '</span><span class="ctitle">' + c.title + "</span></td>" +
        '<td class="g-pick"><select data-course="' + c.id + '" aria-label="Group for ' + c.code + '">' + options + "</select>" +
          (clash ? '<span class="clash-msg">Overlaps with ' + clash + "</span>" : "") + "</td>" +
        '<td class="g-fac">' + (sec ? sec.room + '<span class="room">' + sec.faculty + "</span>" : '<span class="room">&mdash;</span>') + "</td>" +
        '<td class="c-seats">' + (sec ? seatsHtml(sec.enrolled, sec.cap) : "") + "</td>" +
        '<td class="c-units">' + (sec ? c.units.toFixed(1) : "&ndash;") + "</td></tr>";
    }).join("");
  }

  document.getElementById("group-body").addEventListener("change", function(e){
    var id = e.target.dataset.course;
    if (!id) return;
    state.groups[id] = e.target.value ? +e.target.value : null;
    render();
  });

  document.querySelector(".mode-pick").addEventListener("change", function(e){
    if (e.target.name !== "mode") return;
    state.mode = e.target.value;
    render();
  });

  /* ---------- Summary, dashboard, enroll ---------- */

  /* ---------- Course history (prospectus) ---------- */

  var STATUS = { passed: ["st-passed", "Passed"], current: ["st-current", "This term"], available: ["st-available", "Can take"],
    locked: ["st-locked", "Locked"], enrolled: ["st-enrolled", "Enrolled"] };

  function renderHistory(){
    var enrolled = {};
    if (state.enrolled) state.load.forEach(function(c){ enrolled[c.id] = c.group; });
    setText(".js-degree", QueuCurriculum.degree);
    setText(".js-effective", "Effective Year: " + QueuCurriculum.effective);

    document.getElementById("prospectus").innerHTML = QueuCurriculum.terms.map(function(t, ti){
      var rows = QueuCurriculum.catalog.filter(function(c){ return c.termIndex === ti; });
      var units = rows.reduce(function(s, c){ return s + c.units; }, 0);
      var done = rows.filter(function(c){ return c.status === "passed"; }).length;
      var isNow = t === QueuCurriculum.currentTerm;
      return '<div class="card hist-term' + (isNow ? " is-current" : "") + '">' +
        "<h3>" + QueuCurriculum.termName(t) + (isNow ? ' <span class="tag tag-gold">This term</span>' : "") +
        '<span class="hist-count">' + (done === rows.length ? "All passed" : done ? done + " of " + rows.length + " passed" : "") + "</span></h3>" +
        '<table class="pros-table"><thead><tr><th>Course</th><th>Description</th><th>Units</th><th>Requisite</th><th>Status</th></tr></thead><tbody>' +
        rows.map(function(c){
          var key = enrolled[c.id] ? "enrolled" : c.status;
          var st = STATUS[key];
          var note = key === "enrolled" ? "Group " + enrolled[c.id] : c.status === "locked" ? c.reason : "";
          return '<tr class="is-' + key + '"><td class="hist-code">' + c.code + "</td><td>" + c.title + "</td><td>" + c.units.toFixed(1) + "</td>" +
            '<td class="pt-req">' + (QueuCurriculum.reqText(c.req) || '<span class="pt-none">&mdash;</span>') + "</td>" +
            '<td class="pt-status"><span class="st ' + st[0] + '">' + st[1] + "</span>" + (note ? '<span class="pt-note">' + note + "</span>" : "") + "</td></tr>";
        }).join("") +
        '</tbody></table><div class="hist-total">Total units: <b>' + units.toFixed(1) + "</b></div></div>";
    }).join("");
  }

  /* ---------- Step 1: advise ---------- */

  function adviseItem(c){
    return '<li><label class="advise-item"><input type="checkbox" data-advise="' + c.id + '"' + (state.advised[c.id] ? " checked" : "") + ">" +
      '<span class="sl-swatch" style="background:' + c.color + '"></span>' +
      '<span class="ai-text"><b>' + c.code + "</b><span>" + c.title + "</span>" +
      (c.status === "available" ? '<span class="ai-from">' + c.termName + (c.req ? " \u00b7 " + QueuCurriculum.reqText(c.req) : "") + "</span>" : "") + "</span>" +
      '<span class="ai-units">' + c.units.toFixed(1) + " units</span></label></li>";
  }

  function renderAdvise(){
    document.getElementById("advise-current").innerHTML = thisTerm.map(adviseItem).join("");
    var extras = courses.filter(function(c){ return c.status === "available"; });
    document.getElementById("advise-extra").innerHTML = extras.map(adviseItem).join("");
    setText(".js-extra-count", extras.length);
    if (extras.some(function(c){ return state.advised[c.id]; })) document.querySelector(".js-extra").open = true;
    var locked = QueuCurriculum.catalog.filter(function(c){ return c.status === "locked"; });
    setText(".js-locked-count", locked.length);
    document.getElementById("advise-locked").innerHTML = locked.map(function(c){
      return '<li class="advise-item is-locked"><svg class="ic"><use href="#i-lock"/></svg>' +
        '<span class="ai-text"><b>' + c.code + "</b><span>" + c.title + '</span><span class="ai-from">' + c.termName + "</span></span>" +
        '<span class="ai-reason">' + c.reason + "</span></li>";
    }).join("");
  }

  document.querySelector(".js-advise-pane").addEventListener("change", function(e){
    var id = e.target.dataset.advise;
    if (!id) return;
    state.advised[id] = e.target.checked;
    if (!e.target.checked) delete state.groups[id];
    if (state.mode === "block" && !blockOpen()){ state.mode = null; state.block = null; }
    render();
  });

  document.querySelector(".js-back").addEventListener("click", function(){
    state.step = "advise";
    render();
    window.scrollTo(0, 0);
  });

  function render(){
    var closed = windowEnd - Date.now() <= 0;
    var list = state.enrolled ? state.load : picked();
    var units = sumUnits(list);
    var n = list.length;
    var clashes = conflicts(list);

    // Advise & Enroll
    document.querySelector(".js-advise-open").hidden = state.enrolled;
    document.querySelector(".js-advise-done").hidden = !state.enrolled;
    setText(".js-done-msg", state.label + " \u00b7 " + n + " courses, " + units + " units. Your study load has been sent to your school email.");

    var advising = state.step === "advise";
    var advised = advisedCourses();
    var advisedUnits = sumUnits(advised);
    document.querySelector(".js-advise-pane").hidden = !advising;
    document.querySelector(".js-enroll-step").hidden = advising;
    document.querySelector(".js-flow-advise").className = "js-flow-advise " + (advising ? "is-current" : "is-done");
    document.querySelector(".js-flow-enroll").className = "js-flow-enroll " + (advising ? "" : "is-current");
    document.querySelector(".js-flow-advise .fs-n").innerHTML = advising ? "1" : '<svg class="ic"><use href="#i-check"/></svg>';
    if (advising) renderAdvise();
    setText(".js-advised-summary", "Advised: " + advised.length + " courses \u00b7 " + advisedUnits + " units");

    var blockRadio = document.querySelector('input[name="mode"][value="block"]');
    blockRadio.disabled = !blockOpen();
    blockRadio.closest(".mode-opt").classList.toggle("is-disabled", !blockOpen());
    setText(".js-block-desc", blockOpen()
      ? "Join Block A or Block B. Your whole schedule is fixed, and you take every class with the same blockmates."
      : "Blocks run exactly this term\u2019s " + thisTerm.length + " courses. Advise those, and only those, to join one.");

    $('input[name="mode"]').forEach(function(r){ r.checked = r.value === state.mode; });
    document.querySelector(".js-block-pane").hidden = state.mode !== "block";
    document.querySelector(".js-custom-pane").hidden = state.mode !== "custom";
    if (state.mode === "block") renderBlocks();
    if (state.mode === "custom") renderGroups(list);

    var preview = document.querySelector(".js-preview");
    preview.hidden = state.enrolled || advising || !n;
    if (!preview.hidden) renderTimetable(list, "preview-tt", "preview-agenda", clashes);

    var bar = document.getElementById("enroll-bar");
    var btn = document.querySelector(".js-enroll");
    bar.hidden = !advising && !state.mode;
    bar.classList.remove("has-conflict");
    if (advising){
      setText(".js-eb-title", advised.length + (advised.length === 1 ? " course" : " courses") + " \u00b7 " + advisedUnits + " units advised");
      var over = advisedUnits - MAX_UNITS;
      setText(".js-eb-meta", !advised.length ? "Select at least one course"
        : over > 0 ? "Over the " + MAX_UNITS + "-unit limit by " + over + (over === 1 ? " unit" : " units")
        : "Next, choose your block or groups \u00b7 max " + MAX_UNITS + " units");
      bar.classList.toggle("has-conflict", over > 0);
      btn.textContent = "Continue to enroll";
      btn.disabled = closed || !advised.length || over > 0;
    } else if (state.mode === "block"){
      setText(".js-eb-title", state.block ? "Block " + state.block + " \u00b7 " + n + " courses \u00b7 " + units + " units" : "No block selected");
      setText(".js-eb-meta", state.block ? "Fixed schedule \u00b7 no time conflicts" : "Pick Block A or Block B above");
      btn.textContent = closed ? "Window closed" : state.block ? "Enroll in Block " + state.block : "Enroll";
      btn.disabled = closed || !state.block;
      bar.classList.remove("has-conflict");
    } else if (state.mode === "custom"){
      var missing = advised.length - n;
      setText(".js-eb-title", "Non-block \u00b7 " + n + " of " + advised.length + " courses scheduled \u00b7 " + units + " units");
      setText(".js-eb-meta", clashes.length
        ? "Time conflict: " + clashes[0][0].code + " and " + clashes[0][1].code
        : missing ? "Choose a group for " + missing + " more " + (missing === 1 ? "course" : "courses") : "No time conflicts");
      bar.classList.toggle("has-conflict", clashes.length > 0);
      btn.textContent = closed ? "Window closed" : "Enroll " + advised.length + (advised.length === 1 ? " course" : " courses");
      btn.disabled = closed || missing > 0 || clashes.length > 0;
    }

    // Dashboard
    document.querySelector(".js-hero-open").hidden = state.enrolled;
    document.querySelector(".js-hero-done").hidden = !state.enrolled;
    setText(".js-enr-section", state.label);
    setText(".js-enr-count", n);
    setText(".js-enr-units", units);
    $(".js-live").forEach(function(el){ el.hidden = state.enrolled || closed; });
    $(".js-window-foot, .js-window-pill").forEach(function(el){ el.hidden = state.enrolled; });

    var s3 = document.querySelector('[data-step="enroll"]');
    var s4 = document.querySelector('[data-step="complete"]');
    s3.className = state.enrolled ? "done" : "current";
    s4.className = state.enrolled ? "done" : "pending";
    [s3, s4].forEach(function(li, i){
      li.querySelector(".ck").innerHTML = state.enrolled ? '<svg class="ic"><use href="#i-check"/></svg>' : String(i + 3);
    });
    setText(".js-step3", state.enrolled ? state.label + " \u00b7 " + n + " courses, " + units + " units" : "Open until 6:00 PM");

    renderStudyLoad();
    renderHistory();
  }

  /* ---------- Study load page ---------- */

  var DAYS = [["M", "Monday", "Mon"], ["T", "Tuesday", "Tue"], ["W", "Wednesday", "Wed"], ["Th", "Thursday", "Thu"], ["F", "Friday", "Fri"], ["S", "Saturday", "Sat"]];
  var SLOT = 30;

  function pad12(m){
    var h = Math.floor(m / 60);
    return String(h % 12 || 12).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM");
  }
  function roomCode(c){ return c.room.replace(/\s+/g, ""); }

  // Weekly grid (desktop) and day-by-day agenda (phones) for a list of sections.
  function renderTimetable(list, ttId, agendaId, clashes){
    var clashing = {};
    (clashes || []).forEach(function(p){ clashing[p[0].id] = clashing[p[1].id] = true; });
    var days = DAYS.filter(function(d, i){
      return i < 5 || list.some(function(c){ return c.days.indexOf(d[0]) > -1; });
    });
    var first = Math.floor(Math.min.apply(null, list.map(function(c){ return toMin(c.start); })) / SLOT) * SLOT;
    var last = Math.ceil(Math.max.apply(null, list.map(function(c){ return toMin(c.end); })) / SLOT) * SLOT;
    var slots = (last - first) / SLOT;

    var tt = document.getElementById(ttId);
    // Two lanes per day, so clashing courses can sit side by side instead of hiding each other.
    tt.style.gridTemplateColumns = "minmax(150px, auto) repeat(" + days.length * 2 + ", 1fr)";
    tt.style.gridTemplateRows = "auto repeat(" + slots + ", 30px)";
    var html = '<div class="tt-head" style="grid-area:1/1">Time</div>';
    days.forEach(function(d, i){ html += '<div class="tt-head" style="grid-area:1/' + (i * 2 + 2) + "/2/" + (i * 2 + 4) + '">' + d[1] + "</div>"; });
    for (var s = 0; s < slots; s++){
      var t = first + s * SLOT;
      html += '<div class="tt-time" style="grid-area:' + (s + 2) + '/1">' + pad12(t) + " - " + pad12(t + SLOT) + "</div>";
    }
    days.forEach(function(d, di){
      var taken = [], lane = 0;
      list.forEach(function(c){
        if (c.days.indexOf(d[0]) < 0) return;
        var a = (toMin(c.start) - first) / SLOT, b = (toMin(c.end) - first) / SLOT;
        for (var k = a; k < b; k++) taken[k] = true;
        var col = di * 2 + 2, cols = col + "/" + (col + 2);
        if (clashing[c.id]){ cols = (col + lane % 2) + "/" + (col + lane % 2 + 1); lane++; }
        html += '<div class="tt-block' + (clashing[c.id] ? " is-clash" : "") + '" style="grid-area:' + (a + 2) + "/" + cols.split("/")[0] + "/" + (b + 2) + "/" + cols.split("/")[1] +
          ";background:" + c.color + '" title="' + c.title + " (Group " + c.group + ')"><b>' + c.code + "</b> " + roomCode(c) + "</div>";
      });
      for (var k = 0; k < slots; k++){
        if (!taken[k]) html += '<div class="tt-cell" style="grid-area:' + (k + 2) + "/" + (di * 2 + 2) + "/" + (k + 3) + "/" + (di * 2 + 4) + '"></div>';
      }
    });
    tt.innerHTML = html;

    var agenda = "";
    days.forEach(function(d){
      var todays = list.filter(function(c){ return c.days.indexOf(d[0]) > -1; })
        .sort(function(a, b){ return toMin(a.start) - toMin(b.start); });
      if (!todays.length) return;
      agenda += '<div class="ag-day"><h4>' + d[1] + "</h4>";
      todays.forEach(function(c){
        agenda += '<div class="ag-item' + (clashing[c.id] ? " is-clash" : "") + '" style="border-left-color:' + c.color + '"><span class="ag-time">' + fmtTime(c.start) + "&ndash;" + fmtTime(c.end) + "</span>" +
          "<b>" + c.code + "</b> " + c.title + '<span class="ag-room">Group ' + c.group + " &middot; " + c.room + "</span></div>";
      });
      agenda += "</div>";
    });
    document.getElementById(agendaId).innerHTML = agenda;
  }

  function renderStudyLoad(){
    var list = state.load;
    document.querySelector(".js-sl-empty").hidden = state.enrolled;
    document.querySelector(".js-sl-body").hidden = !state.enrolled;
    if (!state.enrolled) return;

    setText(".js-sl-section", state.label);
    setText(".js-sl-summary", list.length + " courses \u00b7 " + sumUnits(list) + " units");
    setText(".js-sl-units", sumUnits(list).toFixed(1));
    renderTimetable(list, "timetable", "agenda");

    document.getElementById("sl-courses").innerHTML = list.map(function(c){
      return '<tr><td><span class="sl-swatch" style="background:' + c.color + '"></span><span class="hist-code">' + c.code + "</span> &middot; Group " + c.group + "<br>" + c.title + "</td>" +
        "<td>" + when(c) + "</td>" +
        "<td>" + c.room + "</td><td>" + c.faculty + "</td><td>" + c.units.toFixed(1) + "</td></tr>";
    }).join("");
  }

  document.querySelector(".js-download").addEventListener("click", function(){
    if (checkSession()) downloadStudyLoad(this);
  });

  document.querySelector(".js-enroll").addEventListener("click", function(){
    if (!checkSession()) return;
    if (state.step === "advise"){
      if (!advisedCourses().length || sumUnits(advisedCourses()) > MAX_UNITS) return;
      state.step = "enroll";
      render();
      window.scrollTo(0, 0);
      return;
    }
    var list = picked();
    if (state.mode === "custom" && list.length < advisedCourses().length) return;
    if (!list.length || conflicts(list).length) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Enrolling\u2026";
    setTimeout(function(){
      state.load = list;
      state.label = sectionLabel();
      state.enrolled = true;
      render();
      toast("Done. You\u2019re enrolled" + (state.mode === "block" ? " in " + state.label : "") + ", " + list.length + " courses.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 700);
  });

  /* ---------- Study load PDF ---------- */

  var jspdfReady;
  function loadJsPdf(){
    if (window.jspdf) return Promise.resolve();
    jspdfReady = jspdfReady || new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = "js/vendor/jspdf.umd.min.js";
      s.onload = resolve;
      s.onerror = function(){ jspdfReady = null; reject(); };
      document.head.appendChild(s);
    });
    return jspdfReady;
  }

  function downloadStudyLoad(btn){
    var list = state.load;
    var label = btn.querySelector("span") || btn;
    var text = label.textContent;
    btn.disabled = true;
    label.textContent = "Preparing PDF\u2026";
    loadJsPdf().then(function(){
      var doc = buildStudyLoadPdf(list, {
        term: "1st Semester, A.Y. 2026-2027",
        student: QueuAuth.fullName(currentUser) + " \u00b7 " + currentUser.id + " \u00b7 " + QueuAuth.program,
        section: state.label,
        generated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        units: sumUnits(list)
      });
      doc.save("QueuSC-Study-Load-1st-Sem-2026-2027.pdf");
      toast("Study load downloaded.");
    }).catch(function(){
      toast("Couldn\u2019t load the PDF generator. Check your connection and try again.");
    }).then(function(){
      btn.disabled = false;
      label.textContent = text;
    });
  }

  function resetDemo(){
    state = freshState();
    windowEnd = Date.now() + (2 * 3600 + 14 * 60 + 9) * 1000;
    render();
  }

  document.querySelector(".js-reset").addEventListener("click", function(){
    resetDemo();
    location.hash = "#dashboard";
  });

  /* ---------- Session ---------- */

  function showUser(u){
    $(".js-avatar").forEach(function(el){
      el.textContent = u.first.charAt(0) + u.last.charAt(0);
      el.style.background = u.color;
      el.style.color = "#fff";
    });
    setText(".js-user-name", QueuAuth.shortName(u));
    titles.dashboard[0] = "Welcome back, " + u.first;
  }

  // Re-check the stored session: it may have expired, or another tab signed out or switched accounts.
  function checkSession(){
    var u = QueuAuth.current();
    if (!u){
      var page = location.hash.slice(1);
      QueuAuth.go("login.html?reason=ended" + (page ? "&next=" + encodeURIComponent(page) : ""));
      return false;
    }
    if (currentUser && u.id !== currentUser.id){ location.reload(); return false; }
    return true;
  }

  $(".js-signout").forEach(function(b){
    b.addEventListener("click", function(){
      QueuAuth.signOut();
      QueuAuth.go("login.html");
    });
  });

  window.addEventListener("storage", function(e){ if (!e.key || e.key === "queusc.session") checkSession(); });
  window.addEventListener("pageshow", function(e){ if (e.persisted) checkSession(); });
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) checkSession(); });
  setInterval(checkSession, 30000);

  /* ---------- Countdown ---------- */

  function tick(){
    var s = Math.max(0, Math.round((windowEnd - Date.now()) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    setText(".js-countdown", h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0"));
    if (s === 0 && !state.enrolled) render();
  }
  setInterval(tick, 1000);

  /* ---------- Toast ---------- */

  var toastTimer;
  function toast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 3200);
  }

  /* ---------- Routing ---------- */

  function goToPage(key){
    if (!titles[key]) key = "dashboard";
    $(".page").forEach(function(p){ p.classList.toggle("active", p.id === "page-" + key); });
    $("[data-page]").forEach(function(a){
      if (a.dataset.page === key) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.getElementById("page-title").textContent = titles[key][0];
    document.getElementById("page-sub").textContent = titles[key][1];
    document.body.dataset.page = key;
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", function(){ goToPage(location.hash.slice(1)); });

  if (currentUser){
    showUser(currentUser);
    render();
    tick();
    goToPage(location.hash.slice(1));
  }
