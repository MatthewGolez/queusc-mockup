var titles = {
    dashboard: ["Dashboard", "A quick look at where you stand this enrollment period."],
    downpayment: ["Downpayment", "Your payment status for this semester's enrollment slot."],
    advise: ["Advise and Enroll", "Plan your load, then enroll once your window opens."],
    history: ["Course History", "Your full curriculum, term by term, with remaining units."]
  };

  function goToPage(key){
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    document.getElementById('page-'+key).classList.add('active');
    document.querySelectorAll('nav.sidenav a[data-page], nav.mobile-nav a[data-page]').forEach(function(a){
      a.classList.toggle('active', a.dataset.page === key);
    });
    document.getElementById('page-title').textContent = titles[key][0];
    document.getElementById('page-sub').textContent = titles[key][1];
    window.scrollTo(0,0);
  }

  document.querySelectorAll('nav.sidenav a[data-page], nav.mobile-nav a[data-page]').forEach(function(a){
    a.addEventListener('click', function(){ goToPage(a.dataset.page); });
  });
  document.querySelectorAll('[data-goto]').forEach(function(card){
    card.addEventListener('click', function(){ goToPage(card.dataset.goto); });
  });

  document.querySelectorAll('.tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-'+tab.dataset.tab).classList.add('active');
    });
  });

  document.querySelectorAll('.crow').forEach(function(row){
    row.addEventListener('click', function(){
      document.getElementById('detail-'+row.dataset.row).classList.toggle('open');
    });
  });
