var titles = {
    dashboard: ["Welcome back, Matthew", "1st Semester enrollment, A.Y. 2026–2027"],
    advise: ["Advise & Enroll", "Confirm your advised courses before your window closes."],
    downpayment: ["Downpayment", "Your payment for this semester’s enrollment slot."],
    history: ["Course History", "Your full curriculum, term by term."]
  };

  var courses = [
    { id: "cis2101", code: "CIS 2101", title: "Data Structures and Algorithms", group: 3, type: "Block",
      days: ["M", "W"], start: "10:00", end: "12:30", room: "LB446 TC",
      faculty: "Sabandal, Gran G.", units: 3, enrolled: 22, cap: 30 },
    { id: "cis2102", code: "CIS 2102", title: "Web Development II", group: 1, type: "Block",
      days: ["T", "Th"], start: "15:00", end: "17:30", room: "LB446 TC",
      faculty: "Belarmino, Chris Ray B.", units: 3, enrolled: 18, cap: 25 },
    { id: "cis2103", code: "CIS 2103", title: "Object-Oriented Programming", group: 2, type: "Block",
      days: ["M", "W"], start: "15:00", end: "17:30", room: "LB467 TC",
      faculty: "Sabandal, Gran G. · Enriquez, Kirstine Mae N.", units: 3, enrolled: 9, cap: 30 },
    { id: "cis2105", code: "CIS 2105", title: "Networking II", group: 3, type: "Block",
      days: ["M", "W"], start: "12:30", end: "15:00", room: "LB470 TC",
      faculty: "Sebial, Archival J.", units: 3, enrolled: 30, cap: 30 },
    { id: "is3103", code: "IS 3103", title: "Application Development and Emerging Technologies", group: 1, type: "Block",
      days: ["T", "Th"], start: "10:00", end: "12:30", room: "LB468 TC",
      faculty: "Tongco, Rannzel Dwayne M.", units: 3, enrolled: 14, cap: 25 },
    { id: "is4103", code: "IS 4103", title: "Evaluation of Business Performance", group: 1, type: "Regular",
      days: ["F"], start: "10:30", end: "13:30", room: "LB486 TC",
      faculty: "Sionzon, Marian Concepcion R.", units: 3, enrolled: 30, cap: 40 }
  ];

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
      btn.textContent = "Download study load";
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

    setText(".js-cc-title", state.enrolled ? "Your study load" : "Advised courses");
    setText(".js-cc-sub", state.enrolled
      ? "This is your official study load for 1st Semester."
      : "Picked by your adviser for your block section, IS-A. Uncheck anything you don’t want to take.");
  }

  document.querySelector(".js-enroll").addEventListener("click", function(){
    if (state.enrolled){
      toast("Study load download is not part of this mock-up.");
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

  document.querySelector(".js-reset").addEventListener("click", function(){
    state.enrolled = false;
    state.waitlisted = {};
    courses.forEach(function(c){ state.selected[c.id] = !isFull(c); });
    windowEnd = Date.now() + (2 * 3600 + 14 * 60 + 9) * 1000;
    render();
    location.hash = "#dashboard";
  });

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

  render();
  tick();
  goToPage(location.hash.slice(1));
