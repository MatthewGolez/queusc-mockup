/* Simulated sign-in shared by login.html and index.html. No passwords: a static site can't keep one secret. */
var QueuAuth = (function(){
    var KEY = "queusc.session";
    var TTL = 8 * 60 * 60 * 1000;
    var PAGES = ["dashboard", "advise", "downpayment", "history"];

    var users = [
      { id: "25100872", email: "25100872@usc.edu.ph", first: "Caroline", middle: "Sio Ang", last: "Gobonseng", color: "#7B57B8" },
      { id: "25100916", email: "25100916@usc.edu.ph", first: "Sebastian", middle: "Douglas Sauro", last: "Subang", color: "#2F5FB3" },
      { id: "22103502", email: "22103502@usc.edu.ph", first: "Matthew", middle: "Benedict", last: "Golez", color: "#8A5A4A" }
    ];

    // localStorage keeps the session across tabs; sessionStorage is the fallback when it's blocked.
    function store(){
      var kinds = ["localStorage", "sessionStorage"];
      for (var i = 0; i < kinds.length; i++){
        try {
          var s = window[kinds[i]];
          s.setItem(KEY + ".probe", "1");
          s.removeItem(KEY + ".probe");
          return s;
        } catch (e) {}
      }
      return null;
    }

    function byId(id){ return users.filter(function(u){ return u.id === id; })[0] || null; }

    function current(){
      var s = store();
      if (!s) return null;
      try {
        var session = JSON.parse(s.getItem(KEY));
        var user = session && byId(session.id);
        if (user && session.expires > Date.now()) return user;
      } catch (e) {}
      s.removeItem(KEY);
      return null;
    }

    function signIn(user){
      var s = store();
      if (!s || !byId(user.id)) return false;
      s.setItem(KEY, JSON.stringify({ id: user.id, expires: Date.now() + TTL }));
      return true;
    }

    function signOut(){
      var s = store();
      if (s) s.removeItem(KEY);
    }

    function safePage(name){ return PAGES.indexOf(name) > -1 ? name : "dashboard"; }

    function go(url){
      document.documentElement.style.visibility = "hidden";
      location.replace(url);
    }

    // index.html: bounce to the login page, remembering which page was asked for.
    function requireUser(){
      var user = current();
      if (!user){
        var page = location.hash.slice(1);
        go("login.html" + (PAGES.indexOf(page) > -1 ? "?next=" + page : ""));
      }
      return user;
    }

    // login.html: already signed in, so skip the picker.
    function redirectIfSignedIn(){
      if (current()) go("index.html#" + nextPage());
    }

    function nextPage(){
      var m = /[?&]next=([a-z]+)/.exec(location.search);
      return safePage(m && m[1]);
    }

    return {
      users: users,
      program: "BS Information Systems · 2nd Year, IS-A",
      current: current,
      signIn: signIn,
      signOut: signOut,
      requireUser: requireUser,
      redirectIfSignedIn: redirectIfSignedIn,
      nextPage: nextPage,
      go: go,
      findByEmail: function(email){ return users.filter(function(u){ return u.email === email; })[0] || null; },
      fullName: function(u){ return u.first + " " + u.middle + " " + u.last; },
      shortName: function(u){ return u.first + " " + u.last.charAt(0) + "."; }
    };
  })();
