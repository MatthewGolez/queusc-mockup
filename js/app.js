var titles = {
    dashboard: ["Welcome back", "1st Semester enrollment, A.Y. 2026–2027"],
    advise: ["Advise & Enroll", "Confirm your advised courses before your window closes."],
    studyload: ["Study Load", "Your official class schedule for 1st Semester."],
    downpayment: ["Downpayment", "Your payment for this semester’s enrollment slot."],
    history: ["Course History", "Your full curriculum, term by term."]
  };

  var courses = [
    { id: "cis2101", code: "CIS 2101", color: "#E88080", title: "Data Structures and Algorithms", group: 3, type: "Block",
      days: ["M", "W"], start: "10:00", end: "12:30", room: "LB446 TC",
      faculty: "Sabandal, Gran G.", units: 3, enrolled: 22, cap: 30 },
    { id: "cis2102", code: "CIS 2102", color: "#45B3AA", title: "Web Development II", group: 1, type: "Block",
      days: ["T", "Th"], start: "15:00", end: "17:30", room: "LB446 TC",
      faculty: "Belarmino, Chris Ray B.", units: 3, enrolled: 18, cap: 25 },
    { id: "cis2103", code: "CIS 2103", color: "#F4A07C", title: "Object-Oriented Programming", group: 2, type: "Block",
      days: ["M", "W"], start: "15:00", end: "17:30", room: "LB467 TC",
      faculty: "Sabandal, Gran G. · Enriquez, Kirstine Mae N.", units: 3, enrolled: 9, cap: 30 },
    { id: "cis2105", code: "CIS 2105", color: "#B3D8E6", title: "Networking II", group: 3, type: "Block",
      days: ["M", "W"], start: "12:30", end: "15:00", room: "LB470 TC",
      faculty: "Sebial, Archival J.", units: 3, enrolled: 30, cap: 30 },
    { id: "is3103", code: "IS 3103", color: "#9AEE8E", title: "Application Development and Emerging Technologies", group: 1, type: "Block",
      days: ["T", "Th"], start: "10:00", end: "12:30", room: "LB468 TC",
      faculty: "Tongco, Rannzel Dwayne M.", units: 3, enrolled: 14, cap: 25 },
    { id: "is4103", code: "IS 4103", color: "#C6853F", title: "Evaluation of Business Performance", group: 1, type: "Regular",
      days: ["F"], start: "10:30", end: "13:30", room: "LB486 TC",
      faculty: "Sionzon, Marian Concepcion R.", units: 3, enrolled: 30, cap: 40 }
  ];

  // The guard in <head> already sent signed-out visitors to login.html.
  var currentUser = QueuAuth.current();

  var state = { selected: {}, waitlisted: {}, enrolled: false };
  courses.forEach(function(c){ state.selected[c.id] = !isFull(c); });

  // Mock window: 2:14:09 left when the page loads.
  var windowEnd = Date.now() + (2 * 3600 + 14 * 60 + 9) * 1000;

  function isFull(c){ return c.enrolled >= c.cap; }
  function toMin(t){ var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  function fmtTime(t){
    var m = toMin(t), h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
    return (h % 12 || 12) + ":" + mm + (h < 12 ? " AM" : " PM");
  }
  function $(sel){ return document.querySelectorAll(sel); }
  function setText(sel, text){ $(sel).forEach(function(el){ el.textContent = text; }); }

  function picked(){
    return courses.filter(function(c){ return state.selected[c.id] && !isFull(c); });
  }

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

  /* ---------- Course table ---------- */

  function renderCourses(){
    var body = document.getElementById("course-body");
    body.innerHTML = "";
    courses.forEach(function(c){
      var full = isFull(c), left = c.cap - c.enrolled;
      var pct = Math.round(c.enrolled / c.cap * 100);
      var tr = document.createElement("tr");
      tr.className = "crow" + (full ? " is-full" : "") + (state.enrolled && state.selected[c.id] && !full ? " is-enrolled" : "");

      var sel;
      if (state.enrolled && !full){
        sel = state.selected[c.id]
          ? '<span class="row-ok" title="Enrolled"><svg class="ic"><use href="#i-check"/></svg></span>'
          : '<span class="row-skip" title="Not enrolled">&ndash;</span>';
      } else {
        sel = '<input type="checkbox" id="sel-' + c.id + '" data-id="' + c.id + '"' +
          (state.selected[c.id] && !full ? " checked" : "") + (full || state.enrolled ? " disabled" : "") +
          ' aria-label="Include ' + c.code + '">';
      }

      var seats;
      if (full){
        var wl = state.waitlisted[c.id];
        seats = '<span class="seat-full">Full</span>' +
          '<button type="button" class="btn btn-sm ' + (wl ? "btn-ghost" : "btn-warn") + '" data-waitlist="' + c.id + '">' +
          (wl ? "On waitlist · Undo" : "Join waitlist") + "</button>";
      } else {
        seats = '<span class="seat-n' + (left <= 7 ? " low" : "") + '">' + left + " left</span>" +
          '<span class="meter"><span style="width:' + pct + '%"></span></span>' +
          '<span class="seat-of">' + c.enrolled + " of " + c.cap + "</span>";
      }

      tr.innerHTML =
        '<td class="c-sel">' + sel + "</td>" +
        '<td class="c-course" data-label="Course"><label for="sel-' + c.id + '"><span class="code">' + c.code + "</span>" +
          '<span class="ctitle">' + c.title + "</span></label>" +
          '<span class="tag">' + (c.type === "Block" ? "Block section" : "Regular") + " &middot; Group " + c.group + "</span></td>" +
        '<td class="c-sched" data-label="Schedule"><b>' + c.days.join(" ") + "</b> " + fmtTime(c.start) + "&ndash;" + fmtTime(c.end) +
          '<span class="room">' + c.room + "</span></td>" +
        '<td class="c-fac" data-label="Faculty">' + c.faculty + "</td>" +
        '<td class="c-seats" data-label="Seats">' + seats + "</td>" +
        '<td class="c-units" data-label="Units">' + c.units.toFixed(1) + "</td>";
      body.appendChild(tr);
    });
  }

  document.getElementById("course-body").addEventListener("change", function(e){
    if (!e.target.dataset.id) return;
    state.selected[e.target.dataset.id] = e.target.checked;
    render();
  });

  document.getElementById("course-body").addEventListener("click", function(e){
    var btn = e.target.closest("[data-waitlist]");
    if (!btn) return;
    var id = btn.dataset.waitlist;
    state.waitlisted[id] = !state.waitlisted[id];
    render();
    toast(state.waitlisted[id]
      ? "You’re on the waitlist for CIS 2105. We’ll email you if a seat opens."
      : "Removed from the CIS 2105 waitlist.");
  });

  /* ---------- Summary, dashboard, enroll ---------- */

  function render(){
    var list = picked();
    var units = list.reduce(function(s, c){ return s + c.units; }, 0);
    var n = list.length;
    var clashes = conflicts(list);
    var waitN = Object.keys(state.waitlisted).filter(function(k){ return state.waitlisted[k]; }).length;
    var closed = windowEnd - Date.now() <= 0;

    renderCourses();

    setText(".js-sel-units", units);
    setText(".js-enr-count", n);
    setText(".js-enr-units", units);

    var bar = document.getElementById("enroll-bar");
    var btn = document.querySelector(".js-enroll");
    bar.classList.toggle("is-done", state.enrolled);
    if (state.enrolled){
      setText(".js-eb-title", "Enrolled · " + n + " courses, " + units + " units");
      setText(".js-eb-meta", "Your study load was sent to your school email." + (waitN ? " Waitlisted for 1 course." : ""));
      btn.textContent = "View study load";
      btn.disabled = false;
    } else {
      setText(".js-eb-title", n + (n === 1 ? " course" : " courses") + " · " + units + " units");
      var meta = clashes.length
        ? "Time conflict: " + clashes[0][0].code + " and " + clashes[0][1].code
        : n ? "No time conflicts" : "Select at least one course";
      if (waitN) meta += " · 1 waitlisted";
      setText(".js-eb-meta", meta);
      bar.classList.toggle("has-conflict", clashes.length > 0);
      btn.textContent = closed ? "Window closed" : "Enroll " + n + (n === 1 ? " course" : " courses");
      btn.disabled = closed || n === 0 || clashes.length > 0;
    }

    document.querySelector(".js-hero-open").hidden = state.enrolled;
    document.querySelector(".js-hero-done").hidden = !state.enrolled;
    $(".js-live").forEach(function(el){ el.hidden = state.enrolled || closed; });
    $(".js-window-foot, .js-window-pill").forEach(function(el){ el.hidden = state.enrolled; });

    setText(".js-full-msg", state.waitlisted.cis2105
      ? "You’re on the waitlist. We’ll email you if a seat opens, or change sections during adjustment, Aug 10–14."
      : "Join the waitlist so you’re added if a seat opens. Your other 5 courses can still be enrolled now.");
    document.querySelector(".js-full-alert").classList.toggle("is-calm", !!state.waitlisted.cis2105);

    var s3 = document.querySelector('[data-step="enroll"]');
    var s4 = document.querySelector('[data-step="complete"]');
    s3.className = state.enrolled ? "done" : "current";
    s4.className = state.enrolled ? "done" : "pending";
    [s3, s4].forEach(function(li, i){
      li.querySelector(".ck").innerHTML = state.enrolled ? '<svg class="ic"><use href="#i-check"/></svg>' : String(i + 3);
    });
    setText(".js-step3", state.enrolled ? n + " courses, " + units + " units" : "Open until 6:00 PM");

    setText(".js-cc-title", state.enrolled ? "Enrolled courses" : "Advised courses");
    setText(".js-cc-sub", state.enrolled
      ? "You\u2019re enrolled. Your timetable and PDF are under Study Load."
      : "Picked by your adviser for your block section, IS-A. Uncheck anything you don’t want to take.");

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

  function renderStudyLoad(){
    var list = picked();
    var units = list.reduce(function(s, c){ return s + c.units; }, 0);
    var waitlisted = courses.filter(function(c){ return state.waitlisted[c.id]; });

    document.querySelector(".js-sl-empty").hidden = state.enrolled;
    document.querySelector(".js-sl-body").hidden = !state.enrolled;
    if (!state.enrolled) return;

    setText(".js-sl-summary", list.length + " courses \u00b7 " + units + " units");
    setText(".js-sl-units", units.toFixed(1));
    var note = document.querySelector(".js-sl-note");
    note.hidden = !waitlisted.length;
    note.textContent = waitlisted.length
      ? "Waitlisted, not on this schedule: " + waitlisted.map(function(c){ return c.code + " " + c.title; }).join(", ") + "."
      : "";

    var days = DAYS.filter(function(d, i){
      return i < 5 || list.some(function(c){ return c.days.indexOf(d[0]) > -1; });
    });
    var first = Math.floor(Math.min.apply(null, list.map(function(c){ return toMin(c.start); })) / SLOT) * SLOT;
    var last = Math.ceil(Math.max.apply(null, list.map(function(c){ return toMin(c.end); })) / SLOT) * SLOT;
    var slots = (last - first) / SLOT;

    // Desktop: a grid like the printed study load. Course blocks span their slots.
    var tt = document.getElementById("timetable");
    tt.style.gridTemplateColumns = "minmax(150px, auto) repeat(" + days.length + ", 1fr)";
    tt.style.gridTemplateRows = "auto repeat(" + slots + ", 30px)";
    var html = '<div class="tt-head" style="grid-area:1/1">Time</div>';
    days.forEach(function(d, i){ html += '<div class="tt-head" style="grid-area:1/' + (i + 2) + '">' + d[1] + "</div>"; });
    for (var s = 0; s < slots; s++){
      var t = first + s * SLOT;
      html += '<div class="tt-time" style="grid-area:' + (s + 2) + '/1">' + pad12(t) + " - " + pad12(t + SLOT) + "</div>";
    }
    days.forEach(function(d, di){
      var taken = [];
      list.forEach(function(c){
        if (c.days.indexOf(d[0]) < 0) return;
        var a = (toMin(c.start) - first) / SLOT, b = (toMin(c.end) - first) / SLOT;
        for (var k = a; k < b; k++) taken[k] = true;
        html += '<div class="tt-block" style="grid-area:' + (a + 2) + "/" + (di + 2) + "/" + (b + 2) + "/" + (di + 3) +
          ";background:" + c.color + '" title="' + c.title + '"><b>' + c.code + "</b> " + roomCode(c) + "</div>";
      });
      for (var k = 0; k < slots; k++){
        if (!taken[k]) html += '<div class="tt-cell" style="grid-area:' + (k + 2) + "/" + (di + 2) + '"></div>';
      }
    });
    tt.innerHTML = html;

    // Mobile: the same week as a day-by-day agenda.
    var agenda = "";
    days.forEach(function(d){
      var todays = list.filter(function(c){ return c.days.indexOf(d[0]) > -1; })
        .sort(function(a, b){ return toMin(a.start) - toMin(b.start); });
      if (!todays.length) return;
      agenda += '<div class="ag-day"><h4>' + d[1] + "</h4>";
      todays.forEach(function(c){
        agenda += '<div class="ag-item" style="border-left-color:' + c.color + '"><span class="ag-time">' + fmtTime(c.start) + "&ndash;" + fmtTime(c.end) + "</span>" +
          "<b>" + c.code + "</b> " + c.title + '<span class="ag-room">' + c.room + "</span></div>";
      });
      agenda += "</div>";
    });
    document.getElementById("agenda").innerHTML = agenda;

    document.getElementById("sl-courses").innerHTML = list.map(function(c){
      return '<tr><td><span class="sl-swatch" style="background:' + c.color + '"></span><span class="hist-code">' + c.code + "</span><br>" + c.title + "</td>" +
        "<td>" + c.days.join(" ") + " " + fmtTime(c.start) + "&ndash;" + fmtTime(c.end) + "</td>" +
        "<td>" + c.room + "</td><td>" + c.faculty + "</td><td>" + c.units.toFixed(1) + "</td></tr>";
    }).join("");
  }

  document.querySelector(".js-download").addEventListener("click", function(){
    if (checkSession()) downloadStudyLoad(this);
  });

  document.querySelector(".js-enroll").addEventListener("click", function(){
    if (!checkSession()) return;
    if (state.enrolled){
      location.hash = "#studyload";
      return;
    }
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Enrolling…";
    setTimeout(function(){
      state.enrolled = true;
      render();
      toast("Done. You’re enrolled in " + picked().length + " courses.");
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
    var list = picked();
    var label = btn.querySelector("span") || btn;
    var text = label.textContent;
    btn.disabled = true;
    label.textContent = "Preparing PDF\u2026";
    loadJsPdf().then(function(){
      var doc = buildStudyLoadPdf(list, {
        term: "1st Semester, A.Y. 2026\u20132027",
        student: QueuAuth.fullName(currentUser) + " \u00b7 " + currentUser.id + " \u00b7 " + QueuAuth.program,
        generated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        units: list.reduce(function(s, c){ return s + c.units; }, 0),
        waitlisted: courses.filter(function(c){ return state.waitlisted[c.id]; }).map(function(c){ return c.code; })
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
    state.enrolled = false;
    state.waitlisted = {};
    courses.forEach(function(c){ state.selected[c.id] = !isFull(c); });
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
