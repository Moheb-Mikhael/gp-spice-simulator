(function () {
  'use strict';

  /* ========== Data ========== */
  let commands = [];

  function loadCommands() {
    return fetch('data/commands.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        commands = data;
      })
      .catch(function () {
        console.warn('Failed to load commands.json — search will be unavailable.');
      });
  }

  /* ========== Navigation ========== */
  var navbar = document.getElementById('navbar');
  var mobileToggle = document.getElementById('mobileToggle');
  var navLinks = document.getElementById('navLinks');

  mobileToggle.addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });

  document.addEventListener('click', function (e) {
    if (!navbar.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });

  window.addEventListener('scroll', function () {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  /* ========== Search ========== */
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', function () {
      var query = searchInput.value.trim().toLowerCase();
      if (!query || commands.length === 0) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
      }

      var results = [];
      for (var i = 0; i < commands.length; i++) {
        var cmd = commands[i];
        var searchable = (cmd.name + ' ' + cmd.syntax + ' ' + cmd.description + ' ' + cmd.category).toLowerCase();
        if (searchable.indexOf(query) !== -1) {
          results.push(cmd);
        }
        if (results.length >= 30) break;
      }

      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No commands match "' + searchInput.value + '"</div>';
        searchResults.classList.add('active');
        return;
      }

      var html = '';
      for (var j = 0; j < results.length; j++) {
        var r = results[j];
        html += '<div class="search-result-item">';
        html += '  <div><span class="result-name">' + escapeHtml(r.name) + '</span>';
        html += '    <span class="result-category">' + escapeHtml(r.category) + '</span></div>';
        html += '  <div class="result-syntax">' + escapeHtml(r.syntax) + '</div>';
        html += '  <div class="result-desc">' + escapeHtml(r.description) + '</div>';
        html += '</div>';
      }

      searchResults.innerHTML = html;
      searchResults.classList.add('active');
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ========== Tutorial Filters ========== */
  var filterButtons = document.querySelectorAll('#tutorialFilters button');
  var tutorialCards = document.querySelectorAll('#tutorialGrid .tutorial-card');

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');

      tutorialCards.forEach(function (card) {
        if (filter === 'all' || card.getAttribute('data-tags').indexOf(filter) !== -1) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* ========== Init ========== */
  loadCommands();
})();
