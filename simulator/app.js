(function () {
  'use strict';

  var DEFAULT_NETLIST = [
    '* RC Low-Pass Filter',
    'V1 in 0 DC 5 AC 1',
    'R1 in out 1k',
    'C1 out 0 1u',
    '.control',
    'tran 0.1m 5m',
    'plot V(in) V(out)',
    '.endc',
    '.end'
  ].join('\n');

  var EXAMPLES = {
    'rc_lowpass': DEFAULT_NETLIST,
    'rlc_bandpass': [
      '* RLC Band-Pass Filter',
      'V1 in 0 DC 0 AC 1',
      'R1 in 1 50',
      'L1 1 out 1m',
      'C1 out 0 10n',
      '.control',
      'ac dec 100 1k 1Meg',
      'plot V(in) V(out)',
      '.endc',
      '.end'
    ].join('\n'),
    'diode_iv': [
      '* Diode I-V Curve',
      'V1 n1 0 DC 0',
      'D1 n1 0 1N4148',
      '.model 1N4148 D(Is=2.52n Rs=0.568 N=1.752 Cjo=4p M=0.333 tt=20n Ikv=1000)',
      '.control',
      'dc V1 -1 1 0.01',
      'plot V(in) V(out)',
      '.endc',
      '.end'
    ].join('\n')
  };

  var spiceModule = null;
  var currentChart = null;

  document.addEventListener('DOMContentLoaded', function () {
    var html = document.documentElement;
    var themeToggle = document.getElementById('theme-toggle');

    function getThemeColors() {
      var style = getComputedStyle(html);
      return {
        text: style.getPropertyValue('--text-primary').trim(),
        muted: style.getPropertyValue('--text-muted').trim(),
        border: style.getPropertyValue('--border').trim(),
        gold: style.getPropertyValue('--accent-gold').trim(),
        nile: style.getPropertyValue('--accent-nile').trim(),
        green: style.getPropertyValue('--accent-green').trim(),
        terracotta: style.getPropertyValue('--accent-terracotta').trim(),
        purple: style.getPropertyValue('--accent-purple').trim(),
        bg: style.getPropertyValue('--bg-primary').trim()
      };
    }

    function setTheme(theme) {
      html.setAttribute('data-theme', theme);
      localStorage.setItem('spice-theme', theme);
      if (currentChart) {
        applyChartTheme();
      }
    }

    var saved = localStorage.getItem('spice-theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        var current = html.getAttribute('data-theme') || 'light';
        setTheme(current === 'light' ? 'dark' : 'light');
      });
    }

    function applyChartTheme() {
      if (!currentChart) return;
      var c = getThemeColors();
      currentChart.setOption({
        title: { textStyle: { color: c.text } },
        legend: { textStyle: { color: c.text } },
        xAxis: {
          axisLine: { lineStyle: { color: c.text } },
          splitLine: { lineStyle: { type: 'dashed', color: c.border } },
          nameTextStyle: { color: c.muted }
        },
        yAxis: {
          axisLine: { lineStyle: { color: c.text } },
          splitLine: { lineStyle: { type: 'dashed', color: c.border } },
          nameTextStyle: { color: c.muted }
        }
      });
    }

    var editor = document.getElementById('netlist-editor');
    var lineNumbers = document.getElementById('line-numbers');
    var btnRun = document.getElementById('btn-run');
    var btnClear = document.getElementById('btn-clear');
    var selectExample = document.getElementById('select-example');
    var statusIndicator = document.getElementById('status-indicator');
    var consoleOut = document.getElementById('console-output');

    var tabConsole = document.getElementById('tab-console');
    var tabPlot = document.getElementById('tab-plot');
    var plotContainer = document.getElementById('plot-container');

    currentChart = echarts.init(document.getElementById('chart'));
    window.addEventListener('resize', function () { currentChart.resize(); });

    editor.value = DEFAULT_NETLIST;
    updateLineNumbers();

    editor.addEventListener('input', updateLineNumbers);
    editor.addEventListener('scroll', function () {
      lineNumbers.scrollTop = editor.scrollTop;
    });

    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        updateLineNumbers();
      }
    });

    function updateLineNumbers() {
      var lines = editor.value.split('\n').length;
      var nums = [];
      for (var i = 1; i <= lines; i++) {
        nums.push(i);
      }
      lineNumbers.innerHTML = nums.join('<br>');
    }

    selectExample.addEventListener('change', function (e) {
      if (EXAMPLES[e.target.value]) {
        editor.value = EXAMPLES[e.target.value];
        updateLineNumbers();
      }
    });

    btnClear.addEventListener('click', function () {
      consoleOut.innerHTML = '';
      currentChart.clear();
      tabConsole.click();
    });

    tabConsole.addEventListener('click', function () {
      tabConsole.classList.add('active');
      tabPlot.classList.remove('active');
      consoleOut.style.display = 'block';
      plotContainer.style.display = 'none';
    });

    tabPlot.addEventListener('click', function () {
      tabPlot.classList.add('active');
      tabConsole.classList.remove('active');
      consoleOut.style.display = 'none';
      plotContainer.style.display = 'block';
      currentChart.resize();
    });

    var resizeHandle = document.getElementById('resize-handle');
    var editorPane = document.getElementById('editor-pane');
    var isResizing = false;

    resizeHandle.addEventListener('mousedown', function () {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', function (e) {
      if (!isResizing) return;
      var mainRect = document.getElementById('main-content').getBoundingClientRect();
      var newWidth = e.clientX - mainRect.left;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > mainRect.width - 200) newWidth = mainRect.width - 200;
      editorPane.style.flex = 'none';
      editorPane.style.width = newWidth + 'px';
      currentChart.resize();
    });

    document.addEventListener('mouseup', function () {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
      }
    });

    function log(msg, type) {
      var span = document.createElement('span');
      if (type === 'error') span.className = 'log-error';
      else if (type === 'success') span.className = 'log-success';
      else if (type === 'warning') span.className = 'log-warning';
      span.textContent = msg;
      consoleOut.appendChild(span);
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    (function () {
      if (typeof SpiceModule === 'undefined') {
        log('Error: SpiceModule not found. Check spice_engine.js loaded.\n', 'error');
        statusIndicator.textContent = 'Error loading WASM';
        statusIndicator.className = 'status-error';
        return;
      }

      log('Loading WebAssembly module...\n');
      SpiceModule().then(function (mod) {
        spiceModule = mod;
        statusIndicator.textContent = 'Ready';
        statusIndicator.className = 'status-ready';
        btnRun.disabled = false;
        log('WASM Module loaded successfully.\n', 'success');
      }).catch(function (err) {
        statusIndicator.textContent = 'Error loading WASM';
        statusIndicator.className = 'status-error';
        log('Failed to load WASM module. Check console.\n', 'error');
        console.error(err);
      });
    })();

    btnRun.addEventListener('click', function () {
      if (!spiceModule) return;

      btnRun.disabled = true;
      btnRun.classList.add('running');
      statusIndicator.textContent = 'Running...';
      statusIndicator.className = 'status-loading';
      consoleOut.innerHTML = '';

      try {
        var netlist = editor.value;
        var resultStr = spiceModule.simulate(netlist);
        var result = JSON.parse(resultStr);

        if (result.console_log) {
          log(result.console_log);
        }

        if (result.status === 'error') {
          log('Simulation completed with errors.\n', 'error');
        } else {
          log('Simulation finished successfully.\n', 'success');
        }

        var lines = editor.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (line.toLowerCase().indexOf('plot ') === 0) {
            log('Executing postprocess: ' + line + '\n');
            var ppStr = spiceModule.postprocess(line);
            var ppRes = JSON.parse(ppStr);
            if (ppRes.console_log) {
              log(ppRes.console_log);
            }
            if (ppRes.plot_data) {
              renderPlot(ppRes.plot_data);
              tabPlot.click();
            }
          }
        }
      } catch (err) {
        log('Error: ' + err + '\n', 'error');
      } finally {
        btnRun.disabled = false;
        btnRun.classList.remove('running');
        statusIndicator.textContent = 'Ready';
        statusIndicator.className = 'status-ready';
      }
    });

    function renderPlot(data) {
      if (!data) return;

      currentChart.clear();

      var c = getThemeColors();

      if (data.type === 'normal') {
        var series = [];
        var yAxis = [];

        var hasY2 = false;
        data.traces.forEach(function (t) {
          if (t.axis === 2) hasY2 = true;
        });

        yAxis.push({
          type: 'value',
          name: data.y_label,
          position: 'left',
          axisLine: { show: true, lineStyle: { color: c.text } },
          splitLine: { show: true, lineStyle: { type: 'dashed', color: c.border } },
          nameTextStyle: { color: c.muted }
        });

        if (hasY2) {
          yAxis.push({
            type: 'value',
            name: 'Current (A)',
            position: 'right',
            axisLine: { show: true, lineStyle: { color: c.text } },
            splitLine: { show: false },
            nameTextStyle: { color: c.muted }
          });
        }

        var plotColors = [c.nile, c.terracotta, c.green, c.purple, c.gold];
        data.traces.forEach(function (t, idx) {
          var lineData = data.x_data.map(function (x, i) { return [x, t.y_data[i]]; });
          series.push({
            name: t.name,
            type: 'line',
            showSymbol: false,
            data: lineData,
            yAxisIndex: t.axis === 2 ? 1 : 0,
            lineStyle: { width: 2, color: plotColors[idx % plotColors.length] }
          });
        });

        var option = {
          title: { text: data.title, textStyle: { color: c.text }, left: 'center' },
          tooltip: { trigger: 'axis' },
          legend: { top: 30, textStyle: { color: c.text } },
          grid: { left: '10%', right: hasY2 ? '10%' : '5%', bottom: '15%', top: 80 },
          xAxis: {
            type: 'value',
            name: data.x_label,
            nameLocation: 'middle',
            nameGap: 30,
            axisLine: { show: true, lineStyle: { color: c.text } },
            splitLine: { show: true, lineStyle: { type: 'dashed', color: c.border } },
            nameTextStyle: { color: c.muted }
          },
          yAxis: yAxis,
          series: series,
          backgroundColor: 'transparent'
        };

        currentChart.setOption(option);

      } else if (data.type === 'bode') {
        var magSeries = [];
        var phaseSeries = [];

        var plotColorsBode = [c.nile, c.terracotta, c.green];

        data.traces.forEach(function (t, idx) {
          var color = plotColorsBode[idx % plotColorsBode.length];
          var magData = data.x_data.map(function (x, i) { return [x, t.mag_data[i]]; });
          var phaseData = data.x_data.map(function (x, i) { return [x, t.phase_data[i]]; });

          magSeries.push({
            name: t.name + ' (Mag)',
            type: 'line',
            showSymbol: false,
            data: magData,
            yAxisIndex: 0,
            lineStyle: { width: 2, color: color }
          });

          phaseSeries.push({
            name: t.name + ' (Phase)',
            type: 'line',
            showSymbol: false,
            data: phaseData,
            yAxisIndex: 1,
            lineStyle: { width: 2, type: 'dashed', color: color }
          });
        });

        var option = {
          title: { text: data.title, textStyle: { color: c.text }, left: 'center' },
          tooltip: { trigger: 'axis' },
          legend: { top: 30, textStyle: { color: c.text } },
          grid: { left: '10%', right: '10%', bottom: '15%', top: 80 },
          xAxis: {
            type: 'log',
            name: 'Frequency (Hz)',
            nameLocation: 'middle',
            nameGap: 30,
            axisLine: { show: true, lineStyle: { color: c.text } },
            splitLine: { show: true, lineStyle: { type: 'dashed', color: c.border } },
            nameTextStyle: { color: c.muted }
          },
          yAxis: [
            {
              type: 'value',
              name: '|V| (dB)',
              position: 'left',
              axisLine: { show: true, lineStyle: { color: c.text } },
              splitLine: { show: true, lineStyle: { type: 'dashed', color: c.border } },
              nameTextStyle: { color: c.muted }
            },
            {
              type: 'value',
              name: 'Phase (°)',
              position: 'right',
              axisLine: { show: true, lineStyle: { color: c.text } },
              splitLine: { show: false },
              nameTextStyle: { color: c.muted },
              min: -180,
              max: 180,
              interval: 45
            }
          ],
          series: [].concat(magSeries, phaseSeries),
          backgroundColor: 'transparent'
        };

        currentChart.setOption(option);
      }

      applyChartTheme();
    }
  });
})();
