// app.js

const DEFAULT_NETLIST = `* RC Low-Pass Filter
V1 in 0 DC 5 AC 1
R1 in out 1k
C1 out 0 1u
.control
tran 0.1m 5m
plot V(in) V(out)
.endc
.end`;

const EXAMPLES = {
    'rc_lowpass': DEFAULT_NETLIST,
    'rlc_bandpass': `* RLC Band-Pass Filter
V1 in 0 DC 0 AC 1
R1 in 1 50
L1 1 out 1m
C1 out 0 10n
.control
ac dec 100 1k 1Meg
plot V(out)
.endc
.end`,
    'diode_iv': `* Diode I-V Curve
V1 n1 0 DC 0
D1 n1 0 1N4148
.model 1N4148 D(Is=2.52n Rs=0.568 N=1.752 Cjo=4p M=0.333 tt=20n Ikv=1000)
.control
dc V1 -1 1 0.01
plot I(V1)
.endc
.end`
};

let spiceModule = null;
let currentChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const editor = document.getElementById('netlist-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const btnRun = document.getElementById('btn-run');
    const btnClear = document.getElementById('btn-clear');
    const selectExample = document.getElementById('select-example');
    const statusIndicator = document.getElementById('status-indicator');
    const consoleOut = document.getElementById('console-output');
    
    // Tabs
    const tabConsole = document.getElementById('tab-console');
    const tabPlot = document.getElementById('tab-plot');
    const plotContainer = document.getElementById('plot-container');

    // Initialize ECharts
    currentChart = echarts.init(document.getElementById('chart'));
    window.addEventListener('resize', () => currentChart.resize());

    // Editor Logic
    editor.value = DEFAULT_NETLIST;
    updateLineNumbers();

    editor.addEventListener('input', updateLineNumbers);
    editor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = editor.scrollTop;
    });

    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + "    " + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 4;
            updateLineNumbers();
        }
    });

    function updateLineNumbers() {
        const lines = editor.value.split('\n').length;
        lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
    }

    // Load Example
    selectExample.addEventListener('change', (e) => {
        if (EXAMPLES[e.target.value]) {
            editor.value = EXAMPLES[e.target.value];
            updateLineNumbers();
        }
    });

    // Clear Output
    btnClear.addEventListener('click', () => {
        consoleOut.innerHTML = '';
        currentChart.clear();
        tabConsole.click();
    });

    // Tabs logic
    tabConsole.addEventListener('click', () => {
        tabConsole.classList.add('active');
        tabPlot.classList.remove('active');
        consoleOut.style.display = 'block';
        plotContainer.style.display = 'none';
    });

    tabPlot.addEventListener('click', () => {
        tabPlot.classList.add('active');
        tabConsole.classList.remove('active');
        consoleOut.style.display = 'none';
        plotContainer.style.display = 'block';
        currentChart.resize();
    });

    // Resize logic
    const resizeHandle = document.getElementById('resize-handle');
    const editorPane = document.getElementById('editor-pane');
    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const mainRect = document.getElementById('main-content').getBoundingClientRect();
        let newWidth = e.clientX - mainRect.left;
        
        // Boundaries
        if (newWidth < 200) newWidth = 200;
        if (newWidth > mainRect.width - 200) newWidth = mainRect.width - 200;
        
        editorPane.style.flex = 'none';
        editorPane.style.width = newWidth + 'px';
        currentChart.resize();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });

    // Logging
    function log(msg, type='normal') {
        const span = document.createElement('span');
        if (type === 'error') span.className = 'log-error';
        else if (type === 'success') span.className = 'log-success';
        else if (type === 'warning') span.className = 'log-warning';
        span.textContent = msg;
        consoleOut.appendChild(span);
        consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    // Load WASM Module
    try {
        log("Loading WebAssembly module...\n");
        spiceModule = await SpiceModule();
        statusIndicator.textContent = "Ready";
        statusIndicator.className = "status-ready";
        btnRun.disabled = false;
        log("WASM Module loaded successfully.\n", "success");
    } catch (err) {
        statusIndicator.textContent = "Error loading WASM";
        statusIndicator.className = "status-error";
        log("Failed to load WASM module. Check console.\n", "error");
        console.error(err);
    }

    // Run Simulation
    btnRun.addEventListener('click', async () => {
        if (!spiceModule) return;
        
        btnRun.disabled = true;
        btnRun.classList.add('running');
        statusIndicator.textContent = "Running...";
        statusIndicator.className = "status-loading";
        consoleOut.innerHTML = '';
        
        try {
            const netlist = editor.value;
            const resultStr = spiceModule.simulate(netlist);
            const result = JSON.parse(resultStr);
            
            if (result.console_log) {
                log(result.console_log);
            }

            if (result.status === 'error') {
                log("Simulation completed with errors.\n", "error");
            } else {
                log("Simulation finished successfully.\n", "success");
            }
            
            // Check for plot commands in the control block
            const lines = editor.value.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (line.toLowerCase().startsWith('plot ')) {
                    log(`Executing postprocess: ${line}\n`);
                    const ppStr = spiceModule.postprocess(line);
                    const ppRes = JSON.parse(ppStr);
                    if (ppRes.console_log) {
                        log(ppRes.console_log);
                    }
                    if (ppRes.plot_data) {
                        renderPlot(ppRes.plot_data);
                        tabPlot.click(); // auto-switch to plot
                    }
                }
            }
            
        } catch (err) {
            log("Error: " + err + "\n", "error");
        } finally {
            btnRun.disabled = false;
            btnRun.classList.remove('running');
            statusIndicator.textContent = "Ready";
            statusIndicator.className = "status-ready";
        }
    });

    function renderPlot(data) {
        if (!data) return;
        
        currentChart.clear();
        
        if (data.type === 'normal') {
            const series = [];
            const yAxis = [];
            
            let hasY2 = false;
            data.traces.forEach(t => {
                if (t.axis === 2) hasY2 = true;
            });
            
            yAxis.push({
                type: 'value',
                name: data.y_label,
                position: 'left',
                axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: 'var(--border)' } }
            });
            
            if (hasY2) {
                yAxis.push({
                    type: 'value',
                    name: "Current (A)",
                    position: 'right',
                    axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                    splitLine: { show: false }
                });
            }
            
            data.traces.forEach(t => {
                const lineData = data.x_data.map((x, i) => [x, t.y_data[i]]);
                series.push({
                    name: t.name,
                    type: 'line',
                    showSymbol: false,
                    data: lineData,
                    yAxisIndex: t.axis === 2 ? 1 : 0,
                    lineStyle: { width: 2 }
                });
            });
            
            const option = {
                title: { text: data.title, textStyle: { color: 'var(--text-primary)' }, left: 'center' },
                tooltip: { trigger: 'axis' },
                legend: { top: 30, textStyle: { color: 'var(--text-primary)' } },
                grid: { left: '10%', right: hasY2 ? '10%' : '5%', bottom: '15%', top: 80 },
                xAxis: {
                    type: 'value',
                    name: data.x_label,
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                    splitLine: { show: true, lineStyle: { type: 'dashed', color: 'var(--border)' } }
                },
                yAxis: yAxis,
                series: series,
                backgroundColor: 'transparent'
            };
            
            currentChart.setOption(option);
            
        } else if (data.type === 'bode') {
            const magSeries = [];
            const phaseSeries = [];
            
            data.traces.forEach(t => {
                const magData = data.x_data.map((x, i) => [x, t.mag_data[i]]);
                const phaseData = data.x_data.map((x, i) => [x, t.phase_data[i]]);
                
                magSeries.push({
                    name: t.name + " (Mag)",
                    type: 'line',
                    showSymbol: false,
                    data: magData,
                    yAxisIndex: 0,
                    lineStyle: { width: 2 }
                });
                
                phaseSeries.push({
                    name: t.name + " (Phase)",
                    type: 'line',
                    showSymbol: false,
                    data: phaseData,
                    yAxisIndex: 1,
                    lineStyle: { width: 2, type: 'dashed' }
                });
            });
            
            const option = {
                title: { text: data.title, textStyle: { color: 'var(--text-primary)' }, left: 'center' },
                tooltip: { trigger: 'axis' },
                legend: { top: 30, textStyle: { color: 'var(--text-primary)' } },
                grid: { left: '10%', right: '10%', bottom: '15%', top: 80 },
                xAxis: {
                    type: 'log',
                    name: 'Frequency (Hz)',
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                    splitLine: { show: true, lineStyle: { type: 'dashed', color: 'var(--border)' } }
                },
                yAxis: [
                    {
                        type: 'value',
                        name: '|V| (dB)',
                        position: 'left',
                        axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                        splitLine: { show: true, lineStyle: { type: 'dashed', color: 'var(--border)' } }
                    },
                    {
                        type: 'value',
                        name: 'Phase (°)',
                        position: 'right',
                        axisLine: { show: true, lineStyle: { color: 'var(--text-primary)' } },
                        splitLine: { show: false },
                        min: -180,
                        max: 180,
                        interval: 45
                    }
                ],
                series: [...magSeries, ...phaseSeries],
                backgroundColor: 'transparent'
            };
            
            currentChart.setOption(option);
        }
    }
});
