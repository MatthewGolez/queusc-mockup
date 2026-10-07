/* BS Information Systems prospectus (effective 2023), what the student has passed, and the class groups on offer. */
var QueuCurriculum = (function(){
    // [code, title, units, requisite]. A requisite is a list of course codes, or a year standing like "3rd".
    var terms = [
      { year: 1, term: "1st", courses: [
        ["CIS 1101", "Programming I", 3],
        ["CIS 1102N", "Introduction to Computing", 3],
        ["CIS 1103", "Discrete Structures I", 3],
        ["CIS 1104", "Human-Computer Interaction", 3],
        ["EDM 1", "The Carolinian Missionary", 3],
        ["GE-MMW", "Mathematics in the Modern World", 3],
        ["GE-PC", "Purposive Communication", 3],
        ["GE-UTS", "Understanding the Self", 3],
        ["NSTP 1", "National Service Training Program 1", 3],
        ["TPE 1101", "PATH-Fit I - Movement Enhancement", 2] ] },
      { year: 1, term: "2nd", courses: [
        ["CIS 1201", "Programming II", 3, ["CIS 1101"]],
        ["CIS 1202", "Web Development I", 3, ["CIS 1104", "CIS 1101"]],
        ["CIS 1204", "Information Management I", 3, ["CIS 1101"]],
        ["CIS 1205", "Networking I", 3, ["CIS 1102N"]],
        ["CIS 2106N", "Computer Hardware Servicing NC II", 1],
        ["EDM 2", "The Mission of Prophetic Dialogue", 3, ["EDM 1"]],
        ["GE-FREELEC 1", "General Education Free Electives 1", 3],
        ["IS 3204", "Accounting for IS", 3, ["CIS 1102N"]],
        ["NSTP 2", "National Service Training Program 2", 3, ["NSTP 1"]],
        ["TPE 1202", "PATH-Fit II - Fitness Exercises", 2, ["TPE 1101"]] ] },
      { year: 1, term: "Summer", courses: [
        ["CIS 2104", "Information Management II", 3, ["CIS 1204"]],
        ["CIS 2201", "Systems Analysis and Design", 3, ["CIS 1204"]],
        ["CIS 2202", "Digital Logic Design and Digital Computer Circuits", 3, ["CIS 1102N"]] ] },
      { year: 2, term: "1st", courses: [
        ["CIS 2101", "Data Structures and Algorithms", 3, ["CIS 1201"]],
        ["CIS 2102", "Web Development II", 3, ["CIS 1202"]],
        ["CIS 2103", "Object-Oriented Programming", 3, ["CIS 1201"]],
        ["CIS 2105", "Networking II", 3, ["CIS 1205"]],
        ["GE-ETHICS", "Ethics", 3],
        ["GE-FREELEC 2", "General Education Free Electives 2", 3],
        ["IS 3103", "Application Development and Emerging Technologies", 3, ["CIS 1104", "CIS 1204"]],
        ["IS 4103", "Evaluation of Business Performance", 3, ["CIS 1204"]],
        ["TPE 2103", "PATH-Fit III - Movement Education 1", 2, ["TPE 1202"]] ] },
      { year: 2, term: "2nd", courses: [
        ["CIS 2203N", "Mobile Development", 3, ["CIS 1201", "CIS 1202"]],
        ["CIS 2205", "Design Project", 3, ["CIS 2102", "CIS 2103"]],
        ["GE-FREELEC 3", "General Education Free Electives 3", 3],
        ["GE-LWR", "Rizal, Life and Works", 3],
        ["IS 3101N", "Introduction to Information Science", 3],
        ["IS 3102", "Financial Management", 3, ["IS 3204"]],
        ["IS 3106", "IS Project Management", 3, ["CIS 2201"]],
        ["IS 4104N", "Fundamentals of Information Systems", 3],
        ["IS ELEC", "IS Elective", 3, "2nd"],
        ["TPE 2204", "PATH-Fit IV - Movement Education 2", 2, ["TPE 1202"]] ] },
      { year: 2, term: "Summer", courses: [
        ["IS 3105", "Enterprise Architecture", 3],
        ["IS 3107", "Organization and Management Concepts", 3],
        ["IS 3201", "Capstone 1", 3, ["IS 3103", "IS 3106"]] ] },
      { year: 3, term: "1st", courses: [
        ["GE-ART", "Art Appreciation", 3],
        ["GE-TCW", "Contemporary World", 3],
        ["IS 3104", "Collection Management of Information Resources", 3],
        ["IS 3205", "Quantitative Methods", 3, "3rd"],
        ["IS 3206", "IS Strategy Management and Acquisition", 3, "3rd"],
        ["IS 4101", "Capstone 2", 3, ["IS 3201"]],
        ["IS 4102", "Practicum A", 3, "3rd"],
        ["IS FREE ELEC", "IS Free Elective", 3] ] },
      { year: 3, term: "2nd", courses: [
        ["CIS 1203", "Discrete Structures II", 3, ["CIS 1103"]],
        ["CIS 2204", "Technopreneurship", 3],
        ["CIS 2206N", "Programming NC IV", 1, "3rd"],
        ["GE-RPH", "Readings in Philippine History", 3],
        ["GE-STS", "Science, Technology and Society", 3],
        ["IS 3203", "Information Resources and Services", 3, ["IS 3104"]],
        ["IS 3207N", "Professional Issues", 3, "3rd"],
        ["IS 4201", "Seminars and Tours", 3, "3rd"],
        ["IS 4202", "Practicum B", 6, ["IS 4102"]] ] }
    ];

    // The demo student: enrolling for 2nd Year, 1st Semester, with every earlier term passed.
    var CURRENT = 3;
    var STANDING = 2;
    var MAX_UNITS = 30;

    var YEARS = ["", "1st", "2nd", "3rd", "4th"];
    function termName(t){
      return t.term === "Summer" ? YEARS[t.year] + " Year, Summer" : YEARS[t.year] + " Year, " + t.term + " Semester";
    }
    function idOf(code){ return code.toLowerCase().replace(/[^a-z0-9]/g, ""); }

    var passed = {};
    terms.slice(0, CURRENT).forEach(function(t){ t.courses.forEach(function(c){ passed[c[0]] = true; }); });

    // Each group: [number, days, start, end, room, faculty, enrolled, capacity]
    var groups = {
      cis2101: [
      [1, "T Th", "07:30", "10:00", "LB446 TC", "Sabandal, Gran G.", 27, 30],
      [2, "M W", "07:30", "10:00", "LB447 TC", "Enriquez, Kirstine Mae N.", 30, 30],
      [3, "M W", "10:00", "12:30", "LB446 TC", "Sabandal, Gran G.", 22, 30],
      [4, "T Th", "15:00", "17:30", "LB448 TC", "Enriquez, Kirstine Mae N.", 13, 30],
      [5, "S", "08:00", "13:00", "LB446 TC", "Sabandal, Gran G.", 6, 30] ],
      cis2102: [
      [1, "T Th", "15:00", "17:30", "LB446 TC", "Belarmino, Chris Ray B.", 18, 25],
      [2, "M W", "15:00", "17:30", "LB449 TC", "Belarmino, Chris Ray B.", 25, 25],
      [3, "T Th", "10:00", "12:30", "LB449 TC", "Tongco, Rannzel Dwayne M.", 12, 25],
      [4, "M W", "07:30", "10:00", "LB446 TC", "Belarmino, Chris Ray B.", 20, 25],
      [5, "F", "07:30", "12:30", "LB450 TC", "Tongco, Rannzel Dwayne M.", 6, 25] ],
      cis2103: [
      [1, "T Th", "07:30", "10:00", "LB467 TC", "Enriquez, Kirstine Mae N.", 25, 30],
      [2, "M W", "15:00", "17:30", "LB467 TC", "Sabandal, Gran G. / Enriquez, Kirstine Mae N.", 9, 30],
      [3, "M W", "10:00", "12:30", "LB468 TC", "Enriquez, Kirstine Mae N.", 30, 30],
      [4, "T Th", "15:00", "17:30", "LB467 TC", "Sabandal, Gran G.", 17, 30],
      [5, "T Th", "12:30", "15:00", "LB469 TC", "Enriquez, Kirstine Mae N.", 11, 30] ],
      cis2105: [
      [1, "T Th", "12:30", "15:00", "LB470 TC", "Sebial, Archival J.", 24, 30],
      [2, "M W", "10:00", "12:30", "LB470 TC", "Sebial, Archival J.", 19, 30],
      [3, "M W", "12:30", "15:00", "LB470 TC", "Sebial, Archival J.", 30, 30],
      [4, "T Th", "15:00", "17:30", "LB471 TC", "Sebial, Archival J.", 28, 30],
      [5, "S", "08:00", "13:00", "LB470 TC", "Sebial, Archival J.", 5, 30] ],
      is3103: [
      [1, "T Th", "10:00", "12:30", "LB468 TC", "Tongco, Rannzel Dwayne M.", 14, 25],
      [2, "M W", "07:30", "10:00", "LB468 TC", "Tongco, Rannzel Dwayne M.", 25, 25],
      [3, "T Th", "15:00", "17:30", "LB468 TC", "Tongco, Rannzel Dwayne M.", 21, 25],
      [4, "M W", "12:30", "15:00", "LB469 TC", "Tongco, Rannzel Dwayne M.", 16, 25],
      [5, "F", "07:30", "12:30", "LB468 TC", "Belarmino, Chris Ray B.", 8, 25] ],
      is4103: [
      [1, "F", "10:30", "13:30", "LB486 TC", "Sionzon, Marian Concepcion R.", 30, 40],
      [2, "F", "13:30", "16:30", "LB486 TC", "Sionzon, Marian Concepcion R.", 22, 40],
      [3, "T Th", "07:30", "09:00", "LB487 TC", "Sionzon, Marian Concepcion R.", 40, 40],
      [4, "M W", "17:30", "19:00", "LB486 TC", "Sionzon, Marian Concepcion R.", 12, 40],
      [5, "S", "07:30", "10:30", "LB487 TC", "Sionzon, Marian Concepcion R.", 3, 40] ],
      geethics: [
      [1, "T Th", "12:30", "15:00", "LB301 TC", "TBA", 28, 40],
      [2, "T Th", "10:00", "12:30", "LB302 TC", "TBA", 33, 40],
      [3, "M W", "07:30", "10:00", "LB301 TC", "TBA", 40, 40],
      [4, "M W", "15:00", "17:30", "LB303 TC", "TBA", 21, 40],
      [5, "S", "08:00", "11:00", "LB301 TC", "TBA", 9, 40] ],
      gefreelec2: [
      [1, "M W", "07:30", "10:00", "LB305 TC", "TBA", 25, 40],
      [2, "M W", "15:00", "17:30", "LB306 TC", "TBA", 30, 40],
      [3, "T Th", "07:30", "10:00", "LB305 TC", "TBA", 18, 40],
      [4, "F", "13:30", "16:30", "LB307 TC", "TBA", 40, 40],
      [5, "S", "13:00", "16:00", "LB305 TC", "TBA", 7, 40] ],
      tpe2103: [
      [1, "F", "14:00", "16:00", "Gym 1", "TBA", 30, 35],
      [2, "F", "08:00", "10:00", "Gym 1", "TBA", 26, 35],
      [3, "S", "08:00", "10:00", "Gym 2", "TBA", 35, 35],
      [4, "T Th", "17:30", "18:30", "Gym 2", "TBA", 12, 35],
      [5, "S", "10:00", "12:00", "Gym 1", "TBA", 4, 35] ]
    };

    // Courses from other terms get generated sample groups, spread across the week.
    var SLOTS3 = [["M W", "07:30", "10:00"], ["T Th", "10:00", "12:30"], ["F", "07:30", "10:30"], ["M W", "12:30", "15:00"],
      ["T Th", "15:00", "17:30"], ["S", "08:00", "11:00"], ["M W", "10:00", "12:30"], ["T Th", "07:30", "10:00"],
      ["F", "13:30", "16:30"], ["M W", "15:00", "17:30"], ["T Th", "12:30", "15:00"], ["S", "13:00", "16:00"]];
    var SLOTS_SHORT = [["F", "08:00", "10:00"], ["T Th", "17:30", "18:30"], ["S", "10:00", "12:00"], ["F", "14:00", "16:00"],
      ["M W", "17:30", "18:30"], ["S", "08:00", "10:00"], ["F", "10:00", "12:00"]];
    function generate(code, units){
      var h = 0;
      for (var i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 9973;
      var pool = units >= 3 ? SLOTS3 : SLOTS_SHORT, cap = units >= 3 ? 40 : 35, out = [];
      for (var j = 0; j < 5; j++){
        var slot = pool[(h + j * 5) % pool.length];
        var enrolled = (h + j * 7) % 6 === 0 ? cap : (h * 7 + j * 11) % cap;
        var room = units >= 3 ? "LB" + (300 + (h + j * 13) % 90) + " TC" : "Gym " + (1 + (h + j) % 2);
        out.push([j + 1, slot[0], slot[1], slot[2], room, "TBA", enrolled, cap]);
      }
      return out;
    }

    var COLORS = { "CIS 2101": "#E88080", "CIS 2102": "#45B3AA", "CIS 2103": "#F4A07C", "CIS 2105": "#B3D8E6",
      "IS 3103": "#9AEE8E", "IS 4103": "#C6853F", "GE-ETHICS": "#F2D479", "GE-FREELEC 2": "#C9B6E8", "TPE 2103": "#A9C4F5" };
    var PALETTE = ["#B8E0C8", "#F7B7C8", "#F5C28E", "#9FD3D9", "#D9C2F0", "#C5D88A", "#E3A6C9", "#A8C8F0", "#F0D58A", "#C9B8A6"];

    // Every course gets a status: passed, current (this term), available (prerequisites met), or locked.
    var catalog = [];
    terms.forEach(function(t, ti){
      t.courses.forEach(function(row){
        var code = row[0], req = row[3], status, reason = "";
        if (passed[code]) status = "passed";
        else if (ti === CURRENT) status = "current";
        else if (typeof req === "string" && parseInt(req, 10) > STANDING){ status = "locked"; reason = "Needs " + req + " year standing"; }
        else {
          var missing = (Array.isArray(req) ? req : []).filter(function(r){ return !passed[r]; });
          status = missing.length ? "locked" : "available";
          if (missing.length) reason = "Needs " + missing.join(" and ");
        }
        catalog.push({ id: idOf(code), code: code, title: row[1], units: row[2], req: req, term: t, termIndex: ti,
          termName: termName(t), status: status, reason: reason });
      });
    });

    var extra = 0;
    catalog.forEach(function(c){
      if (c.status !== "current" && c.status !== "available") return;
      c.color = COLORS[c.code] || PALETTE[extra++ % PALETTE.length];
      c.groups = groups[c.id] || generate(c.code, c.units);
    });

    function reqText(req){
      if (!req) return "";
      if (typeof req === "string") return req + " year standing";
      return "Prerequisite: " + req.join(", ");
    }

    return {
      degree: "Bachelor of Science in Information Systems",
      effective: 2023,
      terms: terms,
      termName: termName,
      currentTerm: terms[CURRENT],
      maxUnits: MAX_UNITS,
      catalog: catalog,
      reqText: reqText,
      offerable: catalog.filter(function(c){ return c.status === "current"; })
        .concat(catalog.filter(function(c){ return c.status === "available"; }))
    };
  })();
