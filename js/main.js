(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var mobileToggle = document.getElementById('mobileToggle');
  var navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (navbar && !navbar.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  window.addEventListener('scroll', function () {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Dropdown toggle (mobile + click)
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.nav-dropdown-trigger');
    if (trigger) {
      e.preventDefault();
      var dd = trigger.closest('.nav-dropdown');
      var isOpen = dd.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach(function (el) {
        el.classList.remove('open');
      });
      if (!isOpen) dd.classList.add('open');
    } else if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(function (el) {
        el.classList.remove('open');
      });
    }
  });
})();
