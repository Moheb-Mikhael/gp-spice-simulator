(function () {
  'use strict';

  var commands = [];
  var activeCategory = 'all';
  var activeQuery = '';
  var activeCommandName = null;

  var searchInput = document.getElementById('searchInput');
  var resultsList = document.getElementById('resultsList');
  var detailPanel = document.getElementById('detailPanel');
  var detailContent = document.getElementById('detailContent');
  var detailBack = document.getElementById('detailBack');
  var categoryBtns = document.querySelectorAll('#categoryFilters button');

  function loadData() {
    return fetch('../data/commands.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        commands = data;
        init();
      })
      .catch(function () {
        resultsList.innerHTML = '<div class="search-page-no-results">Failed to load command data.</div>';
      });
  }

  function init() {
    renderResults();
    bindEvents();
    checkUrlParam();
  }

  function bindEvents() {
    searchInput.addEventListener('input', function () {
      activeQuery = searchInput.value.trim().toLowerCase();
      activeCommandName = null;
      hideDetail();
      renderResults();
    });

    categoryBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        categoryBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat');
        activeCommandName = null;
        hideDetail();
        renderResults();
      });
    });

    detailBack.addEventListener('click', function () {
      activeCommandName = null;
      hideDetail();
      renderResults();
      history.replaceState(null, '', 'index.html');
    });

    window.addEventListener('popstate', function () {
      var params = new URLSearchParams(location.search);
      var cmd = params.get('cmd');
      if (cmd) {
        showDetail(cmd);
      } else {
        activeCommandName = null;
        hideDetail();
        renderResults();
      }
    });
  }

  function getFiltered() {
    var results = [];
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      if (activeCategory !== 'all' && cmd.category !== activeCategory) continue;
      if (activeQuery) {
        var searchable = (cmd.name + ' ' + cmd.syntax + ' ' + cmd.description + ' ' + cmd.category).toLowerCase();
        if (searchable.indexOf(activeQuery) === -1) continue;
      }
      results.push(cmd);
    }
    return results;
  }

  function renderResults() {
    var filtered = getFiltered();

    if (filtered.length === 0) {
      resultsList.innerHTML = '<div class="search-page-no-results">No commands match your criteria.</div>';
      resultsList.classList.remove('sidebar');
      return;
    }

    resultsList.classList.add('sidebar');
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var cmd = filtered[i];
      var activeClass = (activeCommandName === cmd.name) ? ' active' : '';
      html += '<div class="result-card' + activeClass + '" data-name="' + escapeAttr(cmd.name) + '">';
      html += '  <div><span class="rc-name">' + escapeHtml(cmd.name) + '</span>';
      html += '    <span class="rc-cat">' + escapeHtml(cmd.category) + '</span></div>';
      html += '  <div class="rc-syntax">' + escapeHtml(cmd.syntax) + '</div>';
      html += '  <div class="rc-desc">' + escapeHtml(cmd.description) + '</div>';
      html += '</div>';
    }

    resultsList.innerHTML = html;

    resultsList.querySelectorAll('.result-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var name = card.getAttribute('data-name');
        showDetail(name);
      });
    });
  }

  function showDetail(name) {
    activeCommandName = name;
    var cmd = null;
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].name === name) {
        cmd = commands[i];
        break;
      }
    }
    if (!cmd) return;

    resultsList.classList.add('sidebar');
    detailPanel.classList.add('visible');

    resultsList.querySelectorAll('.result-card').forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-name') === name);
    });

    var aliasesHtml = '';
    if (cmd.aliases && cmd.aliases.length > 0) {
      aliasesHtml = '<div class="dc-aliases">Aliases: ' + cmd.aliases.map(function (a) { return '<code>' + escapeHtml(a) + '</code>'; }).join(' ') + '</div>';
    }

    var exampleHtml = '';
    if (cmd.example) {
      exampleHtml = '<div class="dc-example"><button class="dc-copy-btn" id="copyBtn">Copy</button>' + escapeHtml(cmd.example) + '</div>';
    }

    detailContent.innerHTML = '<div class="detail-card">'
      + '<div class="dc-header">'
      + '  <span class="dc-name">' + escapeHtml(cmd.name) + '</span>'
      + '  <span class="dc-cat">' + escapeHtml(cmd.category) + '</span>'
      + aliasesHtml
      + '</div>'
      + '<div class="dc-section">'
      + '  <h4>Description</h4>'
      + '  <p>' + escapeHtml(cmd.description) + '</p>'
      + '</div>'
      + '<div class="dc-section">'
      + '  <h4>Syntax</h4>'
      + '  <div class="dc-syntax-block">' + escapeHtml(cmd.syntax) + '</div>'
      + '</div>'
      + (cmd.example ? '<div class="dc-section"><h4>Example</h4>' + exampleHtml + '</div>' : '')
      + '</div>';

    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(cmd.example).then(function () {
          copyBtn.textContent = 'Copied!';
          setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
    }

    var newUrl = 'index.html?cmd=' + encodeURIComponent(name);
    history.pushState(null, '', newUrl);
  }

  function hideDetail() {
    detailPanel.classList.remove('visible');
    resultsList.querySelectorAll('.result-card').forEach(function (c) {
      c.classList.remove('active');
    });
  }

  function checkUrlParam() {
    var params = new URLSearchParams(location.search);
    var cmd = params.get('cmd');
    if (cmd) {
      searchInput.value = '';
      activeQuery = '';
      renderResults();
      setTimeout(function () { showDetail(cmd); }, 50);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  loadData();
})();
