/* Builds the study load PDF: a weekly timetable plus a course list. Needs jsPDF (js/vendor). */
function buildStudyLoadPdf(courses, opts){
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    var DAYS = [["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["Th", "Thursday"], ["F", "Friday"], ["S", "Saturday"]];
    var FALLBACK = ["#F2D479", "#C9B6E8", "#F7B7C8", "#A9C4F5"];
    var INK = "#333333", MUTED = "#666666", LINE = "#333333", SLOT = 30;

    function toMin(t){ var p = t.split(":"); return +p[0] * 60 + +p[1]; }
    function clock(m){
      var h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
      return String(h % 12 || 12).padStart(2, "0") + ":" + mm + " " + (h < 12 ? "AM" : "PM");
    }
    function colorFor(c, i){ return c.color || FALLBACK[i % FALLBACK.length]; }
    function room(c){ return c.room.replace(/\s+/g, ""); }

    var pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    var mx = 12, y = 14;

    /* Header */
    doc.setTextColor(INK);
    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text("Study Load", mx, y);
    doc.setFont("helvetica", "normal").setFontSize(9.5);
    doc.text(opts.term, mx, y + 6);
    doc.text(opts.student, mx, y + 11);
    doc.setTextColor(MUTED).setFontSize(8.5);
    doc.text("QueuSC", pageW - mx, y, { align: "right" });
    doc.text("Generated " + opts.generated, pageW - mx, y + 6, { align: "right" });
    doc.text(opts.section + ": " + courses.length + " courses, " + opts.units.toFixed(1) + " units", pageW - mx, y + 11, { align: "right" });

    /* Timetable */
    var days = DAYS.filter(function(d, i){
      return i < 5 || courses.some(function(c){ return c.days.indexOf(d[0]) > -1; });
    });
    var first = Math.floor(Math.min.apply(null, courses.map(function(c){ return toMin(c.start); })) / SLOT) * SLOT;
    var last = Math.ceil(Math.max.apply(null, courses.map(function(c){ return toMin(c.end); })) / SLOT) * SLOT;
    var slots = (last - first) / SLOT;

    var gx = mx, gy = y + 17, timeW = 40, headH = 7;
    var dayW = (pageW - 2 * mx - timeW) / days.length;
    var rowH = Math.min(6, 92 / slots);

    doc.setDrawColor(LINE).setLineWidth(0.2).setTextColor(INK);
    doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.rect(gx, gy, timeW, headH);
    doc.text("Time", gx + timeW / 2, gy + headH / 2, { align: "center", baseline: "middle" });
    days.forEach(function(d, i){
      var x = gx + timeW + i * dayW;
      doc.rect(x, gy, dayW, headH);
      doc.text(d[1], x + dayW / 2, gy + headH / 2, { align: "center", baseline: "middle" });
    });

    doc.setFontSize(7.5);
    for (var s = 0; s < slots; s++){
      var ry = gy + headH + s * rowH, t = first + s * SLOT;
      doc.rect(gx, ry, timeW, rowH);
      doc.text(clock(t) + " - " + clock(t + SLOT), gx + timeW / 2, ry + rowH / 2, { align: "center", baseline: "middle" });
    }

    days.forEach(function(d, di){
      var x = gx + timeW + di * dayW;
      var taken = [];
      courses.forEach(function(c, ci){
        if (c.days.indexOf(d[0]) < 0) return;
        var a = (toMin(c.start) - first) / SLOT, b = (toMin(c.end) - first) / SLOT;
        for (var k = a; k < b; k++) taken[k] = true;
        var by = gy + headH + a * rowH, bh = (b - a) * rowH;
        doc.setFillColor(colorFor(c, ci));
        doc.rect(x, by, dayW, bh, "FD");
        doc.setFontSize(8);
        doc.text(c.code + " " + room(c), x + dayW / 2, by + bh / 2, { align: "center", baseline: "middle" });
      });
      for (var k = 0; k < slots; k++){
        if (!taken[k]) doc.rect(x, gy + headH + k * rowH, dayW, rowH);
      }
    });

    /* Course list */
    var ty = gy + headH + slots * rowH + 10;
    var cols = [["Course code", 24], ["Group", 14], ["Description", 72], ["Schedule", 50], ["Room", 20], ["Faculty", 73], ["Units", 20]];
    var listW = pageW - 2 * mx, lineH = 6;
    var scale = listW / cols.reduce(function(sum, col){ return sum + col[1]; }, 0);

    function row(cells, yy, bold, fill){
      var x = mx;
      if (fill){ doc.setFillColor(fill); doc.rect(mx, yy, listW, lineH, "F"); }
      doc.setFont("helvetica", bold ? "bold" : "normal");
      cells.forEach(function(text, i){
        var w = cols[i][1] * scale, right = i === cells.length - 1;
        var str = doc.splitTextToSize(String(text), w - 3)[0];
        doc.text(str, right ? x + w - 2 : x + 2, yy + lineH / 2, { align: right ? "right" : "left", baseline: "middle" });
        x += w;
      });
      doc.setDrawColor("#BBBBBB").line(mx, yy + lineH, mx + listW, yy + lineH);
    }

    // Keep the course list and total clear of the footer: move them to a second page when they won't fit.
    var footerTop = pageH - 14;
    if (ty + lineH * (courses.length + 1) + 8 > footerTop){
      doc.addPage();
      doc.setTextColor(INK).setFont("helvetica", "bold").setFontSize(12);
      doc.text("Study Load (continued)", mx, 16);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(opts.student, mx, 22);
      ty = 30;
    }

    doc.setFontSize(8).setTextColor(INK);
    row(cols.map(function(col){ return col[0]; }), ty, true, "#EEEEEE");
    courses.forEach(function(c, i){
      var rowY = ty + lineH * (i + 1);
      row([c.code, String(c.group), c.title, c.days.join(" ") + " " + clock(toMin(c.start)) + " - " + clock(toMin(c.end)), room(c), c.faculty, c.units.toFixed(1)], rowY, false);
    });
    var endY = ty + lineH * (courses.length + 1);
    doc.setFont("helvetica", "bold");
    doc.text("Total units: " + opts.units.toFixed(1), mx + listW - 2, endY + 5, { align: "right" });

    /* Footer on every page */
    var pages = doc.internal.getNumberOfPages();
    for (var pg = 1; pg <= pages; pg++){
      doc.setPage(pg);
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(MUTED);
      doc.text("Mock-up for QueuSC, CIS 2102 final project. Data is illustrative.", mx, pageH - 8);
      if (pages > 1) doc.text("Page " + pg + " of " + pages, pageW - mx, pageH - 8, { align: "right" });
    }

    return doc;
  }
