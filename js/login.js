(function(){
    var list = document.getElementById("accounts");
    var form = document.getElementById("login-form");
    var input = document.getElementById("login-email");
    var err = document.getElementById("login-error");

    if (/[?&]reason=ended/.test(location.search)){
      document.getElementById("login-sub").textContent = "Your session ended. Sign in again to continue.";
    }

    QueuAuth.users.forEach(function(u){
      var li = document.createElement("li");
      li.innerHTML = '<button type="button" class="account" data-user="' + u.id + '">' +
        '<span class="avatar" style="background:' + u.color + '">' + u.first.charAt(0) + "</span>" +
        '<span class="acct-text"><span class="acct-name"><b>' + u.first + "</b> " + u.middle + " <b>" + u.last + "</b></span>" +
        '<span class="acct-email">' + u.email + "</span></span>" +
        '<svg class="ic"><use href="#i-arrow"/></svg></button>';
      list.appendChild(li);
    });

    function enter(user){
      if (!QueuAuth.signIn(user)){
        err.textContent = "Your browser is blocking site storage, so QueuSC can’t keep you signed in. Allow site data and try again.";
        return;
      }
      QueuAuth.go("index.html#" + QueuAuth.nextPage());
    }

    list.addEventListener("click", function(e){
      var btn = e.target.closest("[data-user]");
      if (btn) enter(QueuAuth.users.filter(function(u){ return u.id === btn.dataset.user; })[0]);
    });

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var email = input.value.trim().toLowerCase();
      var match = QueuAuth.findByEmail(email);
      if (!email) err.textContent = "Enter your USC email.";
      else if (!/@usc\.edu\.ph$/.test(email)) err.textContent = "Use your @usc.edu.ph email.";
      else if (!match) err.textContent = "No QueuSC account found for " + email + ".";
      else { err.textContent = ""; enter(match); }
    });

    // Coming back to this page via the back button after signing in.
    window.addEventListener("pageshow", function(e){ if (e.persisted) QueuAuth.redirectIfSignedIn(); });
  })();
