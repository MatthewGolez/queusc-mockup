var titles = {
    dashboard: ["Welcome back", "1st Semester enrollment, A.Y. 2026-2027"],
    advise: ["Advise & Enroll", "Choose your courses, then pick your block or groups before your window closes."],
    studyload: ["Study Load", "Your official class schedule for 1st Semester."],
    downpayment: ["Downpayment", "Your payment for this semester\u2019s enrollment slot."],
    history: ["Course History", "Your full curriculum, term by term."]
  };

  // Each group: [number, days, start, end, room, faculty, enrolled, capacity]
  var courses = [
    { id: "cis2101", code: "CIS 2101", color: "#E88080", title: "Data Structures and Algorithms", units: 3, groups: [
      [1, "T Th", "07:30", "10:00", "LB446 TC", "Sabandal, Gran G.", 27, 30],
      [2, "M W", "07:30", "10:00", "LB447 TC", "Enriquez, Kirstine Mae N.", 30, 30],
      [3, "M W", "10:00", "12:30", "LB446 TC", "Sabandal, Gran G.", 22, 30],
      [4, "T Th", "15:00", "17:30", "LB448 TC", "Enriquez, Kirstine Mae N.", 13, 30],
      [5, "S", "08:00", "13:00", "LB446 TC", "Sabandal, Gran G.", 6, 30] ] },
    { id: "cis2102", code: "CIS 2102", color: "#45B3AA", title: "Web Development II", units: 3, groups: [
      [1, "T Th", "15:00", "17:30", "LB446 TC", "Belarmino, Chris Ray B.", 18, 25],
      [2, "M W", "15:00", "17:30", "LB449 TC", "Belarmino, Chris Ray B.", 25, 25],
      [3, "T Th", "10:00", "12:30", "LB449 TC", "Tongco, Rannzel Dwayne M.", 12, 25],
      [4, "M W", "07:30", "10:00", "LB446 TC", "Belarmino, Chris Ray B.", 20, 25],
      [5, "F", "07:30", "12:30", "LB450 TC", "Tongco, Rannzel Dwayne M.", 6, 25] ] },
    { id: "cis2103", code: "CIS 2103", color: "#F4A07C", title: "Object-Oriented Programming", units: 3, groups: [
      [1, "T Th", "07:30", "10:00", "LB467 TC", "Enriquez, Kirstine Mae N.", 25, 30],
      [2, "M W", "15:00", "17:30", "LB467 TC", "Sabandal, Gran G. \u00b7 Enriquez, Kirstine Mae N.", 9, 30],
      [3, "M W", "10:00", "12:30", "LB468 TC", "Enriquez, Kirstine Mae N.", 30, 30],
      [4, "T Th", "15:00", "17:30", "LB467 TC", "Sabandal, Gran G.", 17, 30],
      [5, "T Th", "12:30", "15:00", "LB469 TC", "Enriquez, Kirstine Mae N.", 11, 30] ] },
    { id: "cis2105", code: "CIS 2105", color: "#B3D8E6", title: "Networking II", units: 3, groups: [
      [1, "T Th", "12:30", "15:00", "LB470 TC", "Sebial, Archival J.", 24, 30],
      [2, "M W", "10:00", "12:30", "LB470 TC", "Sebial, Archival J.", 19, 30],
      [3, "M W", "12:30", "15:00", "LB470 TC", "Sebial, Archival J.", 30, 30],
      [4, "T Th", "15:00", "17:30", "LB471 TC", "Sebial, Archival J.", 28, 30],
      [5, "S", "08:00", "13:00", "LB470 TC", "Sebial, Archival J.", 5, 30] ] },
    { id: "is3103", code: "IS 3103", color: "#9AEE8E", title: "Application Development and Emerging Technologies", units: 3, groups: [
      [1, "T Th", "10:00", "12:30", "LB468 TC", "Tongco, Rannzel Dwayne M.", 14, 25],
      [2, "M W", "07:30", "10:00", "LB468 TC", "Tongco, Rannzel Dwayne M.", 25, 25],
      [3, "T Th", "15:00", "17:30", "LB468 TC", "Tongco, Rannzel Dwayne M.", 21, 25],
      [4, "M W", "12:30", "15:00", "LB469 TC", "Tongco, Rannzel Dwayne M.", 16, 25],
      [5, "F", "07:30", "12:30", "LB468 TC", "Belarmino, Chris Ray B.", 8, 25] ] },
    { id: "is4103", code: "IS 4103", color: "#C6853F", title: "Evaluation of Business Performance", units: 3, groups: [
      [1, "F", "10:30", "13:30", "LB486 TC", "Sionzon, Marian Concepcion R.", 30, 40],
      [2, "F", "13:30", "16:30", "LB486 TC", "Sionzon, Marian Concepcion R.", 22, 40],
      [3, "T Th", "07:30", "09:00", "LB487 TC", "Sionzon, Marian Concepcion R.", 40, 40],
      [4, "M W", "17:30", "19:00", "LB486 TC", "Sionzon, Marian Concepcion R.", 12, 40],
      [5, "S", "07:30", "10:30", "LB487 TC", "Sionzon, Marian Concepcion R.", 3, 40] ] }
  ];

  // Blocks: a fixed group for every course. Seats are held for the block as a whole.
  var blocks = {
    A: { picks: { cis2101: 3, cis2102: 1, cis2103: 2, cis2105: 3, is3103: 1, is4103: 1 }, enrolled: 31, cap: 40 },
    B: { picks: { cis2101: 1, cis2102: 4, cis2103: 5, cis2105: 2, is3103: 4, is4103: 2 }, enrolled: 37, cap: 40 }
  };

  // The guard in <head> already sent signed-out visitors to login.html.
  var currentUser = QueuAuth.current();

  var state;
  function freshState(){
    var advised = {};
    courses.forEach(function(c){ advised[c.id] = true; });
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
  // Blocks run every course in the semester, so they're open only to students taking all of them.
  function blockOpen(){ return advisedCourses().length === courses.length; }

  function picked(){
    if (state.mode === "block" && state.block && blockOpen()){
      var picks = blocks[state.block].picks;
      return courses.map(function(c){ return section(c, picks[c.id]); });
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
      var list = courses.map(function(c){ return section(c, b.picks[c.id]); });
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

  /* ---------- Step 1: advise ---------- */

  function renderAdvise(){
    document.getElementById("advise-list").innerHTML = courses.map(function(c){
      return '<li><label class="advise-item"><input type="checkbox" data-advise="' + c.id + '"' + (state.advised[c.id] ? " checked" : "") + ">" +
        '<span class="sl-swatch" style="background:' + c.color + '"></span>' +
        '<span class="ai-text"><b>' + c.code + "</b><span>" + c.title + "</span></span>" +
        '<span class="ai-units">' + c.units.toFixed(1) + " units</span></label></li>";
    }).join("");
  }

  document.getElementById("advise-list").addEventListener("change", function(e){
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
      : "Blocks take all " + courses.length + " courses together. Advise every course to join one.");

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
      setText(".js-eb-meta", advised.length ? "Next, choose your block or groups" : "Select at least one course");
      btn.textContent = "Continue to enroll";
      btn.disabled = closed || !advised.length;
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
      if (!advisedCourses().length) return;
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
