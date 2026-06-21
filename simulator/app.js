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
  var plotsData = [];
  var currentPlotIndex = -1;

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
    var ppInput = document.getElementById('pp-input');
    var btnPpRun = document.getElementById('btn-pp-run');
    var btnOpen = document.getElementById('btn-open');
    var fileInput = document.getElementById('file-input');
    var btnDlCsv = document.getElementById('btn-download-csv');
    var btnExportRaw = document.getElementById('btn-export-raw');
    var btnSaveLog = document.getElementById('btn-save-log');

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

    function download(filename, content, mime) {
      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function updateRecordButtons() {
      if (!spiceModule) { btnDlCsv.disabled = true; btnExportRaw.disabled = true; return; }
      var records = JSON.parse(spiceModule.dbRecords());
      var hasRecords = records.length > 0;
      btnDlCsv.disabled = !hasRecords;
      btnExportRaw.disabled = !hasRecords;
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
      plotsData = [];
      currentPlotIndex = -1;
      var tabBar = document.getElementById('plot-tab-bar');
      if (tabBar) { tabBar.style.display = 'none'; tabBar.innerHTML = ''; }
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
        updateRecordButtons();
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

        // Parse netlist plot directives
        var directives = parsePlotDirectives(netlist);
        var records = JSON.parse(spiceModule.dbRecords());

        if (directives.length > 0) {
          plotsData = [];
          directives.forEach(function (sigList) {
            var sigs = sigList.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            if (sigs.length === 0) return;
            var sigsLower = sigs.map(function (s) { return s.toLowerCase(); });
            // Find record that contains all these signals
            var matchedTag = null;
            for (var r = 0; r < records.length; r++) {
              var sigsInRecord = JSON.parse(spiceModule.dbSignals(records[r].tag));
              var sigsInRecLower = sigsInRecord.map(function (s) { return s.toLowerCase(); });
              var allFound = sigsLower.every(function (s) { return sigsInRecLower.indexOf(s) >= 0; });
              if (allFound) { matchedTag = records[r].tag; break; }
            }
            if (!matchedTag) {
              log('Plot directive "' + sigList + '" — signals not found in any record\n', 'warning');
              return;
            }
            var pdStr = spiceModule.plotData(matchedTag, sigs.join(','));
            if (!pdStr) return;
            try {
              var pd = JSON.parse(pdStr);
              if (!pd.error) {
                pd._title = pd.title;
                pd.title = 'Plot ' + (plotsData.length + 1) + ': ' + sigList;
                plotsData.push(pd);
              }
            } catch (e) {
              log('Plot parse error for "' + sigList + '"\n', 'error');
            }
          });
        }

        if (plotsData.length > 0) {
          currentPlotIndex = 0;
          renderPlot(plotsData[0]);
          updatePlotTabs();
          tabPlot.click();
        } else if (directives.length > 0) {
          log('No matching plots from netlist directives.\n', 'warning');
        }
      } catch (err) {
        log('Error: ' + err + '\n', 'error');
      } finally {
        btnRun.disabled = false;
        btnRun.classList.remove('running');
        statusIndicator.textContent = 'Ready';
        statusIndicator.className = 'status-ready';
        updateRecordButtons();
      }
    });

    // ── File I/O ──────────────────────────────────────────────────────────
    function arrayBufferToBinaryString(buf) {
      var bytes = new Uint8Array(buf);
      var s = '';
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return s;
    }

    function handleFile(file) {
      var reader = new FileReader();
      var isRaw = file.name.toLowerCase().endsWith('.raw');
      reader.onload = function (e) {
        var content = isRaw ? arrayBufferToBinaryString(e.target.result) : e.target.result;
        if (isRaw) {
          if (!spiceModule) { log('WASM not ready yet.\n', 'error'); return; }
          var res = JSON.parse(spiceModule.loadRawFile(file.name, content));
          if (res.status === 'success') {
            log('Loaded .raw file "' + file.name + '" as tag "' + res.tag + '"\n', 'success');
            updateRecordButtons();
          } else {
            log('Error loading .raw file: ' + res.msg + '\n', 'error');
          }
        } else {
          editor.value = content;
          updateLineNumbers();
          log('Loaded netlist from "' + file.name + '" (' + content.split('\n').length + ' lines)\n', 'success');
        }
      };
      if (isRaw) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }

    btnOpen.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      handleFile(file);
      fileInput.value = '';
    });

    // ── Drag & Drop on editor ─────────────────────────────────────────────
    var editorContainer = document.querySelector('.editor-container');

    editorContainer.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      editorContainer.classList.add('drag-over');
    });

    editorContainer.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      editorContainer.classList.remove('drag-over');
    });

    editorContainer.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      editorContainer.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (!file) return;
      handleFile(file);
    });

    // ── Download All as CSV ───────────────────────────────────────────────
    btnDlCsv.addEventListener('click', function () {
      if (!spiceModule) return;
      var records = JSON.parse(spiceModule.dbRecords());
      if (records.length === 0) { log('No records to export.\n', 'warning'); return; }
      records.forEach(function (rec) {
        var csv = spiceModule.exportCSV(rec.tag, "");
        if (csv) {
          download(rec.tag + '.csv', csv, 'text/csv');
        }
      });
      log('Downloaded ' + records.length + ' CSV file(s).\n', 'success');
    });

    // ── Export RAW ────────────────────────────────────────────────────────
    btnExportRaw.addEventListener('click', function () {
      if (!spiceModule) return;
      var records = JSON.parse(spiceModule.dbRecords());
      if (records.length === 0) { log('No records to export.\n', 'warning'); return; }
      records.forEach(function (rec) {
        var raw = spiceModule.exportRaw(rec.tag);
        if (raw) {
          download(rec.tag + '.raw', raw, 'application/octet-stream');
        }
      });
      log('Downloaded ' + records.length + ' RAW file(s).\n', 'success');
    });

    // ── Save Console Log ──────────────────────────────────────────────────
    btnSaveLog.addEventListener('click', function () {
      var text = consoleOut.innerText || consoleOut.textContent;
      if (!text) { log('Console is empty.\n', 'warning'); return; }
      var dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      download('simulation_log_' + dateStr + '.txt', text, 'text/plain');
      log('Console log saved.\n', 'success');
    });

    // ── Parse netlist plot directives ────────────────────────────────────
    function parsePlotDirectives(netlist) {
      var lines = netlist.split('\n');
      var inControl = false;
      var plots = [];
      var analysisTypes = ['tran','transient','ac','dc','op'];

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var lower = line.toLowerCase();

        if (lower === '.control') { inControl = true; continue; }
        if (lower === '.endc')    { inControl = false; continue; }

        if (inControl && lower.startsWith('plot ')) {
          var sigs = line.substring(5).trim();
          if (sigs) plots.push(sigs);
        }

        if (!inControl && lower.startsWith('.plot ')) {
          var rest = line.substring(6).trim();
          var parts = rest.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
          if (parts.length > 0 && analysisTypes.indexOf(parts[0].toLowerCase()) >= 0) {
            parts = parts.slice(1);
          }
          if (parts.length > 0) plots.push(parts.join(' '));
        }
      }
      return plots;
    }

    // ── Multi-plot switching ─────────────────────────────────────────────
    function switchPlot(index) {
      if (index < 0 || index >= plotsData.length) return;
      currentPlotIndex = index;
      renderPlot(plotsData[index]);
      var tabs = document.querySelectorAll('.plot-subtab');
      tabs.forEach(function (t, i) { t.classList.toggle('active', i === index); });
    }

    function updatePlotTabs() {
      var tabBar = document.getElementById('plot-tab-bar');
      if (plotsData.length <= 1) { tabBar.style.display = 'none'; return; }
      tabBar.style.display = 'flex';
      tabBar.innerHTML = '';
      plotsData.forEach(function (pd, idx) {
        var tab = document.createElement('div');
        tab.className = 'plot-subtab' + (idx === currentPlotIndex ? ' active' : '');
        // Extract short label from pd.title (e.g. "Plot 1: V(in) V(out)")
        var label = pd.title || 'Plot ' + (idx + 1);
        tab.textContent = label;
        tab.addEventListener('click', function () { switchPlot(idx); });
        tabBar.appendChild(tab);
      });
    }

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

    // ── PostProcess command dispatch ──────────────────────────────────────
    function executePPCommand(cmd) {
      if (!cmd || !spiceModule) return;
      log('spice> ' + cmd + '\n');

      var parts = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      var action = parts[0].toLowerCase();

      function resolveRecord(recs, arg) {
        for (var i = 0; i < recs.length; i++) {
          if (recs[i].tag === arg) return recs[i];
        }
        var lower = arg.toLowerCase();
        for (var i = 0; i < recs.length; i++) {
          if (recs[i].type.toLowerCase() === lower) return recs[i];
        }
        return null;
      }

      switch (action) {
        case 'calc': {
          var expr = parts.slice(1).join(' ');
          if (!expr) { log('  Usage: calc <expression>\n', 'error'); break; }
          var res = JSON.parse(spiceModule.calc(expr));
          if (res.status === 'error') {
            log('  Error: ' + res.error + '\n', 'error');
          } else if (res.type === 'scalar') {
            log('  = ' + res.value + '\n');
          } else {
            log('  [wave, ' + res.size + ' pts]\n');
          }
          break;
        }
        case 'meas': {
          var measCmd = parts.slice(1).join(' ');
          if (!measCmd) { log('  Usage: meas <type> <signal> [params]\n', 'error'); break; }
          var res = JSON.parse(spiceModule.meas(measCmd));
          if (res.status === 'error') {
            log('  Error: ' + res.error + '\n', 'error');
          } else {
            log('  ' + res.name + ' ' + res.signal + ' = ' + res.value + ' ' + res.unit + '\n');
          }
          break;
        }
        case 'db':
        case 'records': {
          var records = JSON.parse(spiceModule.dbRecords());
          if (records.length === 0) { log('  (no records loaded)\n'); break; }
          log('  Tag                    Type   Points  Signals\n');
          log('  ' + '-'.repeat(55) + '\n');
          records.forEach(function (r) {
            var tag = (r.tag + '                    ').slice(0, 22);
            var pts = String(r.numPoints);
            var sigs = String(r.numSignals);
            log('  ' + tag + (r.type + '      ').slice(0, 7) +
                (pts + '      ').slice(0, 7) + sigs + '\n');
          });
          break;
        }
        case 'signals':
        case 'list': {
          var tag = parts[1] || '';
          var recs = JSON.parse(spiceModule.dbRecords());
          if (recs.length === 0) { log('  (no records loaded)\n'); break; }
          if (!tag) {
            var seen = {}, count = 0, typeStr = '', firstType = '';
            for (var i = 0; i < recs.length; i++) {
              var t = recs[i].type;
              if (!seen[t]) {
                seen[t] = true;
                if (count > 0) typeStr += ', ';
                typeStr += t;
                if (count === 0) firstType = t;
                count++;
              }
            }
            log('  Number of analysis is ' + count + ': ' + typeStr + '\n');
            log('    Use list <type> for signals (e.g. list ' + firstType.toLowerCase() + ')\n');
            break;
          }
          var rec = resolveRecord(recs, tag);
          if (!rec) { log('  Record not found: "' + tag + '"\n', 'error'); break; }
          var signals = JSON.parse(spiceModule.dbSignals(rec.tag));
          log('  Signals in "' + rec.tag + '":\n');
          log('    ' + rec.xName + ' [X-axis]\n');
          signals.forEach(function (s) { log('    ' + s + '\n'); });
          break;
        }
        case 'info': {
          var recs = JSON.parse(spiceModule.dbRecords());
          if (recs.length === 0) { log('  (no records loaded)\n'); break; }
          var tag = parts[1] || '';
          if (!tag) {
            var seen = {}, count = 0, typeStr = '', firstType = '';
            for (var i = 0; i < recs.length; i++) {
              var t = recs[i].type;
              if (!seen[t]) {
                seen[t] = true;
                if (count > 0) typeStr += ', ';
                typeStr += t;
                if (count === 0) firstType = t;
                count++;
              }
            }
            log('  Number of analysis is ' + count + ': ' + typeStr + '\n');
            log('    Use info <type> for details (e.g. info ' + firstType.toLowerCase() + ')\n');
            break;
          }
          var rec = resolveRecord(recs, tag);
          if (!rec) { log('  Record not found: "' + tag + '"\n', 'error'); break; }
          log('  Tag:      ' + rec.tag + '\n');
          log('  Type:     ' + rec.type + '\n');
          log('  Title:    ' + (rec.title || '(none)') + '\n');
          log('  Date:     ' + (rec.date || '(none)') + '\n');
          log('  Points:   ' + rec.numPoints + '\n');
          log('  X-axis:   ' + rec.xName + '\n');
          log('  Signals:  ' + rec.numSignals + '\n');
          log('  Complex:  ' + (rec.isComplex ? 'yes' : 'no') + '\n');
          break;
        }
        case 'print': {
          if (parts.length < 2) { log('  Usage: print <tag> <sig1> [sig2...]\n', 'error'); break; }
          var tag = parts[1];
          var recs = JSON.parse(spiceModule.dbRecords());
          var rec = resolveRecord(recs, tag);
          if (!rec) { log('  Record not found: "' + tag + '"\n', 'error'); break; }
          tag = rec.tag;
          var sigNames = parts.slice(2);
          if (sigNames.length === 0) {
            sigNames = JSON.parse(spiceModule.dbSignals(tag));
          }
          if (sigNames.length === 0) { log('  (no signals in "' + tag + '")\n'); break; }
          var maxRows = 50;
          var totalPts = 0;
          var allData = [];
          // Collect X data and Y data for each signal
          var xData = null;
          for (var si = 0; si < sigNames.length; si++) {
            var sd = JSON.parse(spiceModule.dbSignalData(tag, sigNames[si]));
            if (sd.error) { log('  Error: ' + sd.error + '\n', 'error'); continue; }
            if (!xData) xData = sd.x;
            if (si === 0) totalPts = sd.x.length;
            allData.push({ name: sigNames[si], y: sd.y });
          }
          if (!xData || allData.length === 0) break;
          // Print header
          var header = '  ' + (xData.length > 0 ? 'x'.padEnd(20) : '');
          allData.forEach(function (d) { header += d.name.padEnd(22); });
          log(header + '\n');
          log('  ' + '-'.repeat(header.length - 2) + '\n');
          var rowsToShow = Math.min(maxRows, totalPts);
          for (var ri = 0; ri < rowsToShow; ri++) {
            var row = '  ' + String(xData[ri]).padEnd(20);
            allData.forEach(function (d) {
              var val = ri < d.y.length ? d.y[ri] : 0;
              row += Number(val).toExponential(6).padEnd(22);
            });
            log(row + '\n');
          }
          if (totalPts > maxRows) {
            log('  (showing ' + maxRows + ' of ' + totalPts + ' points — use export for full data)\n');
          }
          break;
        }
        case 'load': {
          log('  Opening file dialog for .raw files...\n');
          fileInput.accept = '.raw';
          fileInput.click();
          fileInput.accept = '.cir,.sp,.net,.txt,.raw';
          break;
        }
        case 'source':
        case 'run': {
          log('  Use the Run Simulation button (▶) to simulate a netlist.\n');
          break;
        }
        case 'plot': {
          var tag = parts[1] || '';
          if (!tag) { log('  Usage: plot <tag> [sig1 sig2...] [--title t]\n', 'error'); break; }
          var recs = JSON.parse(spiceModule.dbRecords());
          var rec = resolveRecord(recs, tag);
          if (!rec) { log('  Record not found: "' + tag + '"\n', 'error'); break; }
          tag = rec.tag;
          var ySigs = [];
          var title = '';
          for (var pi = 2; pi < parts.length; pi++) {
            if (parts[pi] === '--title' && pi + 1 < parts.length) {
              title = parts[++pi];
            } else {
              ySigs.push(parts[pi]);
            }
          }
          var pd = JSON.parse(spiceModule.plotData(tag, ySigs.join(',')));
          if (pd.error) { log('  Error: ' + pd.error + '\n', 'error'); break; }
          if (title) { pd.title = title; }
          plotsData = [pd];
          currentPlotIndex = 0;
          updatePlotTabs();
          renderPlot(pd);
          log('  Plot rendered for "' + tag + '"\n');
          tabPlot.click();
          break;
        }
        case 'export': {
          var tag = parts[1] || '';
          if (!tag) { log('  Usage: export <tag> [sig1 sig2...]\n', 'error'); break; }
          var recs = JSON.parse(spiceModule.dbRecords());
          var rec = resolveRecord(recs, tag);
          if (!rec) { log('  Record not found: "' + tag + '"\n', 'error'); break; }
          tag = rec.tag;
          var sigs = parts.slice(2).join(',');
          var csv = spiceModule.exportCSV(tag, sigs);
          if (!csv) { log('  (no data)\n'); break; }
          download(tag + '.csv', csv, 'text/csv');
          log('  Downloaded "' + tag + '.csv"\n');
          break;
        }
        case 'help': {
          log('  Commands:\n');
          log('    load                Open .raw file for post-processing\n');
          log('    db / records        List all loaded records\n');
          log('    info [tag]          Show record metadata\n');
          log('    signals / list <tag>  List signals in a record\n');
          log('    print <tag> [sigs]  Print signal values (max 50 rows)\n');
          log('    calc <expr>         Evaluate expression (e.g. V(out)*2)\n');
          log('    meas <type> <sig>   Measurement (max, min, avg, rms, trise...)\n');
          log('    plot <tag> [y1 y2]  Plot signals for a record\n');
          log('    export <tag> [sigs] Download CSV\n');
          log('    help                Show this help\n');
          break;
        }
        default:
          log('  Unknown command: "' + action + '". Type "help" for available commands.\n', 'error');
      }
    }

    // ── PostProcess UI events ─────────────────────────────────────────────
    btnPpRun.addEventListener('click', function () {
      executePPCommand(ppInput.value.trim());
      ppInput.value = '';
    });

    ppInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        executePPCommand(ppInput.value.trim());
        ppInput.value = '';
      }
    });
  });
})();
