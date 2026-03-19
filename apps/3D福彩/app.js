class LotterySystem {
    constructor() {
        this.data = [];
        this.filteredData = [];
        // 从缓存加载项目3状态，如果没有则使用默认值
        this.project3State = this.loadProject3StateFromCache() || {
            filters: { size: 'all', parity: 'all', prime: 'all', repeat: 'all', span: 'all', sum: 'all' },
            killNumbers: [],
            positionSelection: { hundred: [], ten: [], unit: [] }
        };
        this.isCopying = false; // 防止重复点击
        this.init();
    }

    // ========== 新增：项目3状态缓存 ==========
    saveProject3StateToCache() {
        try {
            localStorage.setItem('3d_project3_state', JSON.stringify(this.project3State));
        } catch (e) {
            console.error('保存项目3状态失败:', e);
        }
    }

    loadProject3StateFromCache() {
        try {
            const cached = localStorage.getItem('3d_project3_state');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.error('加载项目3状态失败:', e);
            return null;
        }
    }
    // ======================================

    init() {
        this.bindEvents();
        this.initProject3();
        this.resetStats();
        this.loadDataFromCache();
    }

    // 保存数据到持久化存储 (原有)
    saveDataToCache() {
        try {
            localStorage.setItem('3d_lottery_cache', JSON.stringify(this.data));
        } catch (e) {
            console.error("保存缓存失败:", e);
        }
    }

    // 从持久化存储加载数据 (原有)
    loadDataFromCache() {
        try {
            const cachedData = localStorage.getItem('3d_lottery_cache');
            if (cachedData) {
                this.data = JSON.parse(cachedData);
                this.filteredData = [...this.data];
                this.updateSelectors();
                this.updateDisplay();
            }
        } catch (e) {
            console.error("加载缓存失败:", e);
        }
    }

    resetStats() {
        document.getElementById('totalCount').textContent = '--';
        document.getElementById('currentPeriod').textContent = '--';
        document.getElementById('importRange').textContent = '--';
    }

    bindEvents() {
        document.getElementById('importIcon').addEventListener('click', () => this.importExcel());
        ['project1', 'project2', 'project3'].forEach(project => {
            const header = document.getElementById(`${project}Header`);
            const footer = document.getElementById(`${project}Footer`);
            header.addEventListener('click', () => this.toggleProject(project));
            footer.addEventListener('click', () => this.toggleProject(project));
        });
        document.getElementById('yearSelect').addEventListener('change', () => this.filterData());
        document.getElementById('periodSelect').addEventListener('change', () => this.filterData());
    }

    toggleProject(project) {
        const content = document.getElementById(`${project}Content`);
        const header = document.getElementById(`${project}Header`);
        const footer = document.getElementById(`${project}Footer`);
        content.classList.toggle('hidden');
        header.classList.toggle('collapsed');
        footer.classList.toggle('collapsed');
        const isHidden = content.classList.contains('hidden');
        header.querySelector('.project-arrow').textContent = isHidden ? '▲' : '▼';
        footer.querySelector('.project-arrow').textContent = isHidden ? '︽' : '︾';
        footer.querySelector('span:last-child').textContent = isHidden ? '展开' : '折叠';
    }

    importExcel() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls,.csv,.txt';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.processExcelFile(file);
        };
        fileInput.click();
    }

    processExcelFile(file) {
        const reader = new FileReader();
        const importIcon = document.getElementById('importIcon');

        importIcon.style.opacity = '0.5';
        importIcon.style.pointerEvents = 'none';
        importIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                this.parseWorkbook(workbook);

                this.saveDataToCache();
                this.showImportSuccess(`成功导入 ${this.data.length} 条数据到缓存`);

                setTimeout(() => {
                    this.resetImportIcon();
                }, 3000);

            } catch (error) {
                alert('文件解析失败：' + error.message);
                this.resetImportIcon();
            }
        };
        reader.onerror = () => {
            alert('文件读取失败');
            this.resetImportIcon();
        };
        reader.readAsArrayBuffer(file);
    }

    resetImportIcon() {
        const importIcon = document.getElementById('importIcon');
        importIcon.innerHTML = '<i class="fas fa-file-excel"></i>';
        importIcon.style.background = 'linear-gradient(145deg, #ffd700, #ffaa00)';
        importIcon.style.opacity = '1';
        importIcon.style.pointerEvents = 'auto';
    }

    showImportSuccess(message) {
        const existingMessage = document.getElementById('importSuccess');
        if (existingMessage) {
            existingMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'import-success';
        successDiv.id = 'importSuccess';
        successDiv.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
                    </div>
                    <div>${message}</div>
                `;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            this.hideImportSuccess();
        }, 3000);
    }

    hideImportSuccess() {
        const existingMessage = document.getElementById('importSuccess');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    parseWorkbook(workbook) {
        this.data = [];
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error('Excel文件中没有工作表');
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) throw new Error('工作表不存在或为空');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (jsonData.length <= 1) throw new Error('Excel文件中没有数据行');
        let validDataCount = 0;
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 2) continue;
            try {
                let period = row[0] ? row[0].toString().trim() : '';
                let prizeNumber = row[1] ? row[1].toString().trim() : '';
                if (!period || !prizeNumber) continue;
                period = period.replace(/\s+/g, '');
                prizeNumber = prizeNumber.replace(/\s+/g, '');
                if (/^\d+$/.test(prizeNumber)) {
                    const numValue = parseInt(prizeNumber);
                    if (numValue < 100) prizeNumber = numValue.toString().padStart(3, '0');
                }
                if (prizeNumber.length !== 3) continue;
                const numbers = [parseInt(prizeNumber[0]), parseInt(prizeNumber[1]), parseInt(prizeNumber[2])];
                if (numbers.some(isNaN) || !numbers.every(num => num >= 0 && num <= 9)) continue;
                const year = period.substring(0, 4);
                this.data.push({ period: period, numbers: numbers, displayNumber: prizeNumber, year: parseInt(year) || new Date().getFullYear() });
                validDataCount++;
            } catch (error) { continue; }
        }
        if (validDataCount === 0) throw new Error('没有找到有效的彩票数据');
        this.data.sort((a, b) => a.period.localeCompare(b.period));
        this.filteredData = [...this.data];
        this.updateSelectors();
        this.updateDisplay();
    }

    updateSelectors() {
        const yearSelect = document.getElementById('yearSelect');
        const periodSelect = document.getElementById('periodSelect');
        const years = [...new Set(this.data.map(item => item.year))].sort((a, b) => b - a);
        yearSelect.innerHTML = '<option value="">全部年份</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            if (year === years[0]) option.selected = true;
            yearSelect.appendChild(option);
        });
        yearSelect.disabled = false;
        periodSelect.innerHTML = '<option value="10" selected>最近10期</option><option value="30">最近30期</option><option value="50">最近50期</option><option value="100">最近100期</option><option value="200">最近200期</option><option value="300">最近300期</option><option value="all">全部数据</option>';
        periodSelect.disabled = false;
        this.filterData();
    }

    filterData() {
        const selectedYear = document.getElementById('yearSelect').value;
        const selectedPeriod = document.getElementById('periodSelect').value;
        let filtered = [...this.data];
        if (selectedYear) filtered = filtered.filter(item => item.year === parseInt(selectedYear));
        if (selectedPeriod !== 'all') filtered = filtered.slice(-parseInt(selectedPeriod));
        this.filteredData = filtered;
        this.updateDisplay();
    }

    updateDisplay() {
        this.updateStats();
        this.updateProject1();
        this.updateProject2();
    }

    updateStats() {
        if (this.filteredData.length === 0) {
            this.resetStats();
            return;
        }
        document.getElementById('totalCount').textContent = this.filteredData.length + '条';
        document.getElementById('currentPeriod').textContent = this.filteredData[this.filteredData.length - 1].period;
        document.getElementById('importRange').textContent = `${this.filteredData[0].period}-${this.filteredData[this.filteredData.length - 1].period}`;
    }

    updateProject1() {
        const tbody = document.getElementById('project1Body');
        tbody.innerHTML = '';
        if (this.filteredData.length === 0) return;
        const numberCounters = Array(10).fill(0);
        this.filteredData.forEach((item, index) => {
            const row = document.createElement('tr');
            const hotCold = this.calculateHotCold(index);
            item.numbers.forEach(num => numberCounters[num] = 0);
            for (let i = 0; i < 10; i++) if (!item.numbers.includes(i)) numberCounters[i]++;
            row.innerHTML = `<td>${item.period}</td><td><div class="ball-set">${item.numbers.map(num => `<div class="ball">${num}</div>`).join('')}</div></td><td class="empty-col"></td><td class="hot">${hotCold.hot.join(' ')}</td><td class="cold">${hotCold.cold.join(' ')}</td>${Array.from({ length: 10 }, (_, i) => item.numbers.includes(i) ? `<td><div class="dist-ball">${i}</div></td>` : `<td><div class="inc-number">${numberCounters[i]}</div></td>`).join('')}`;
            tbody.appendChild(row);
        });
        this.addPredictionRow();
    }

    calculateHotCold(currentIndex) {
        if (currentIndex < 3 || this.filteredData.length < 4) return { hot: ['-'], cold: ['-'] };
        const startIndex = Math.max(0, currentIndex - 3);
        const recentData = this.filteredData.slice(startIndex, currentIndex);
        const appearedNumbers = new Set();
        recentData.forEach(item => item.numbers.forEach(num => appearedNumbers.add(num)));
        const hot = Array.from(appearedNumbers).sort((a, b) => a - b);
        const allNumbers = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const cold = Array.from(allNumbers).filter(num => !appearedNumbers.has(num));
        return { hot: hot.length > 0 ? hot : ['-'], cold: cold.length > 0 ? cold : ['-'] };
    }

    addPredictionRow() {
        const tbody = document.getElementById('project1Body');
        if (this.filteredData.length === 0) return;
        const lastItem = this.filteredData[this.filteredData.length - 1];
        const nextPeriod = (parseInt(lastItem.period) + 1).toString();
        const hotCold = this.calculateHotCold(this.filteredData.length);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${nextPeriod}</td><td style="color: #888; font-style: italic;">未出球</td><td class="empty-col"></td><td class="hot">${hotCold.hot.join(' ')}</td><td class="cold">${hotCold.cold.join(' ')}</td>${Array.from({ length: 10 }, (_, i) => `<td class="number-cell selectable" data-number="${i}"><div class="select-placeholder" data-number="${i}"></div></td>`).join('')}`;
        tbody.appendChild(row);

        this.initManualSelection();
    }

    initManualSelection() {
        const selectableCells = document.querySelectorAll('.number-cell.selectable');
        selectableCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const placeholder = cell.querySelector('.select-placeholder');
                if (placeholder.innerHTML === '') {
                    const number = cell.getAttribute('data-number');
                    placeholder.innerHTML = `<div class="select-ball">${number}</div>`;
                } else {
                    placeholder.innerHTML = '';
                }
                e.stopPropagation();
            });
        });
    }

    updateProject2() {
        const tbody = document.getElementById('project2Body');
        tbody.innerHTML = '';
        this.filteredData.forEach(item => {
            const analysis = this.analyzeNumbers(item.numbers);
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.period}</td><td><div class="ball-set">${item.numbers.map(num => `<div class="ball">${num}</div>`).join('')}</div></td><td class="${analysis.sum >= 14 && analysis.sum <= 20 ? 'sum-yellow' : 'white'}">${analysis.sum}</td><td class="white">${analysis.span}</td><td class="empty-col"></td><td class="${this.get012Color(analysis.paths[0])}">${analysis.paths[0]}</td><td class="${this.get012Color(analysis.paths[1])}">${analysis.paths[1]}</td><td class="${this.get012Color(analysis.paths[2])}">${analysis.paths[2]}</td><td class="${this.get012CountColor(analysis.pathCounts[0])}">${analysis.pathCounts[0]}</td><td class="${this.get012CountColor(analysis.pathCounts[1])}">${analysis.pathCounts[1]}</td><td class="${this.get012CountColor(analysis.pathCounts[2])}">${analysis.pathCounts[2]}</td><td class="empty-col"></td><td class="${this.getOddEvenColor(analysis.oddEven[0])}">${analysis.oddEven[0]}</td><td class="${this.getOddEvenColor(analysis.oddEven[1])}">${analysis.oddEven[1]}</td><td class="${this.getOddEvenColor(analysis.oddEven[2])}">${analysis.oddEven[2]}</td><td class="${this.getOddEvenCountColor(analysis.oddCount)}">${analysis.oddCount}</td><td class="${this.getOddEvenCountColor(analysis.evenCount)}">${analysis.evenCount}</td><td class="empty-col"></td><td class="${this.getSizeColor(analysis.size[0])}">${analysis.size[0]}</td><td class="${this.getSizeColor(analysis.size[1])}">${analysis.size[1]}</td><td class="${this.getSizeColor(analysis.size[2])}">${analysis.size[2]}</td><td class="${this.getSizeCountColor(analysis.smallCount)}">${analysis.smallCount}</td><td class="${this.getSizeCountColor(analysis.bigCount)}">${analysis.bigCount}</td><td class="empty-col"></td><td class="${this.getPrimeColor(analysis.prime[0])}">${analysis.prime[0]}</td><td class="${this.getPrimeColor(analysis.prime[1])}">${analysis.prime[1]}</td><td class="${this.getPrimeColor(analysis.prime[2])}">${analysis.prime[2]}</td><td class="${this.getPrimeCountColor(analysis.primeCount)}">${analysis.primeCount}</td><td class="${this.getPrimeCountColor(analysis.compositeCount)}">${analysis.compositeCount}</td>`;
            tbody.appendChild(row);
        });
    }

    analyzeNumbers(numbers) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const span = Math.max(...numbers) - Math.min(...numbers);
        const paths = numbers.map(num => num % 3);
        const pathCounts = [0, 0, 0];
        paths.forEach(path => pathCounts[path]++);
        const oddEven = numbers.map(num => num % 2 === 0 ? '偶' : '奇');
        const oddCount = oddEven.filter(val => val === '奇').length;
        const evenCount = oddEven.filter(val => val === '偶').length;
        const size = numbers.map(num => num < 5 ? '小' : '大');
        const smallCount = size.filter(val => val === '小').length;
        const bigCount = size.filter(val => val === '大').length;
        const primes = [2, 3, 5, 7];
        const prime = numbers.map(num => primes.includes(num) ? '质' : '合');
        const primeCount = prime.filter(val => val === '质').length;
        const compositeCount = prime.filter(val => val === '合').length;
        return { sum, span, paths, pathCounts, oddEven, oddCount, evenCount, size, smallCount, bigCount, prime, primeCount, compositeCount };
    }

    get012Color(value) { const colors = { 0: 'pink', 1: 'light-green', 2: 'cyan' }; return colors[value] || 'white'; }
    get012CountColor(count) { if (count === 3) return 'red'; if (count === 2) return 'yellow'; if (count === 1) return 'dark-blue'; return 'dark-orange'; }
    getOddEvenColor(value) { return value === '奇' ? 'green' : 'brown'; }
    getOddEvenCountColor(count) { if (count === 3) return 'red'; if (count === 2) return 'yellow'; return count === 1 ? 'light-green' : 'pink'; }
    getSizeColor(value) { return value === '小' ? 'cyan' : 'pink'; }
    getSizeCountColor(count) { if (count === 3) return 'red'; if (count === 2) return 'yellow'; return count === 1 ? 'cyan' : 'pink'; }
    getPrimeColor(value) { return value === '质' ? 'orange' : 'blue'; }
    getPrimeCountColor(count) { if (count === 3) return 'red'; if (count === 2) return 'yellow'; return count === 1 ? 'light-green' : 'pink'; }

    initProject3() {
        const panel = document.getElementById('project3FilterPanel');
        panel.innerHTML = this.getProject3HTML();
        this.initProject3Events();
        // 从缓存的state恢复UI状态
        this.restoreProject3UI();
        // 生成过滤号码
        this.generateFilteredNumbers();
    }

    // ====== 新增：根据缓存的state恢复UI ======
    restoreProject3UI() {
        const state = this.project3State;

        // 恢复过滤器按钮
        document.querySelectorAll('.filter-options').forEach(container => {
            const type = container.getAttribute('data-type');
            const value = state.filters[type];
            const options = container.querySelectorAll('.filter-option');
            options.forEach(opt => opt.classList.remove('active'));
            const target = container.querySelector(`[data-value="${value}"]`);
            if (target) target.classList.add('active');
        });

        // 恢复杀码球
        document.querySelectorAll('.kill-ball').forEach(ball => {
            const num = parseInt(ball.getAttribute('data-number'));
            ball.classList.remove('include', 'exclude');
            if (state.killNumbers.includes(num)) {
                ball.classList.add('exclude');
            } else {
                ball.classList.add('include');
            }
        });

        // 恢复定位球
        ['hundred', 'ten', 'unit'].forEach(pos => {
            const balls = document.querySelectorAll(`.position-balls[data-position="${pos}"] .pos-ball`);
            balls.forEach(ball => {
                const num = parseInt(ball.getAttribute('data-number'));
                ball.classList.remove('selected');
                if (state.positionSelection[pos].includes(num)) {
                    ball.classList.add('selected');
                }
            });
            // 更新012路按钮状态
            this.updatePathButtonState(pos);
        });
    }

    getProject3HTML() {
        return `
                <div class="filter-group"><div class="filter-title">1. 大小形态：小 0-4  >< 大 5-9</div><div class="filter-options" data-type="size"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-big">全大</div><div class="filter-option" data-value="all-small">全小</div><div class="filter-option" data-value="2big1small">2大1小</div><div class="filter-option" data-value="2small1big">2小1大</div></div></div>
                <div class="filter-group"><div class="filter-title">2. 奇偶形态：奇 1 3 5 7 9 >< 偶 0 2 4 6 8</div><div class="filter-options" data-type="parity"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-odd">全奇</div><div class="filter-option" data-value="all-even">全偶</div><div class="filter-option" data-value="2odd1even">2奇1偶</div><div class="filter-option" data-value="2even1odd">2偶1奇</div></div></div>
                <div class="filter-group"><div class="filter-title">3. 质合形态：质 2 3 5 7  >< 合 0 1 4 6 8 9</div><div class="filter-options" data-type="prime"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-prime">全质</div><div class="filter-option" data-value="all-composite">全合</div><div class="filter-option" data-value="2prime1composite">2质1合</div><div class="filter-option" data-value="2composite1prime">2合1质</div></div></div>
                <div class="filter-group"><div class="filter-title">4. 重号条件</div><div class="filter-options" data-type="repeat"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="has-repeat">有重号</div><div class="filter-option" data-value="no-repeat">无重号</div></div></div>
                <div class="filter-group"><div class="filter-title">5. 跨度范围</div><div class="filter-options" data-type="span"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="small">小跨度(0-4)</div><div class="filter-option" data-value="medium">中跨度(5-7)</div><div class="filter-option" data-value="large">大跨度(8-9)</div></div></div>
                <div class="filter-group"><div class="filter-title">6. 和值范围</div><div class="filter-options" data-type="sum"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="small">小和值(0-13)</div><div class="filter-option" data-value="medium">中和值(14-20)</div><div class="filter-option" data-value="large">大和值(21-27)</div></div></div>
                <div class="kill-panel"><div class="filter-title">7. 杀码范围 (绿色选择，红色排除)</div><div class="kill-balls" id="killBalls">${Array.from({ length: 10 }, (_, i) => `<div class="kill-ball include" data-number="${i}">${i}</div>`).join('')}</div></div>
                <div class="position-panel"><div class="filter-title">8. 定位选择 (点亮球体表示选中)</div>
                    <!-- 百位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="hundred" data-path="0">0路百</div>
                                <div class="path-btn" data-position="hundred" data-path="1">1路百</div>
                                <div class="path-btn" data-position="hundred" data-path="2">2路百</div>
                            </div>
                            <div class="position-balls" data-position="hundred">${Array.from({ length: 10 }, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
                        </div>
                    </div>
                    <!-- 十位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="ten" data-path="0">0路十</div>
                                <div class="path-btn" data-position="ten" data-path="1">1路十</div>
                                <div class="path-btn" data-position="ten" data-path="2">2路十</div>
                            </div>
                            <div class="position-balls" data-position="ten">${Array.from({ length: 10 }, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
                        </div>
                    </div>
                    <!-- 个位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="unit" data-path="0">0路个</div>
                                <div class="path-btn" data-position="unit" data-path="1">1路个</div>
                                <div class="path-btn" data-position="unit" data-path="2">2路个</div>
                            </div>
                            <div class="position-balls" data-position="unit">${Array.from({ length: 10 }, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
                        </div>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="action-btn clear-btn" id="clearFilterBtn"><i class="fas fa-eraser"></i>一键清除</button>
                    <button class="action-btn" id="showGridBtn" style="background: linear-gradient(145deg, #9b59b6, #8e44ad); color: #000000; box-shadow: 0 6px 0 #ffffff;"><i class="fas fa-copy"></i>显示网格号码</button>
                </div>
                <div class="result-stats">
                    <div class="result-stat"><div class="result-value" id="totalRecommendations">0</div><div class="result-label">推荐号码</div></div>
                    <div class="result-stat"><div class="result-value" id="filterCount">0</div><div class="result-label">过滤条件</div></div>
                    <div class="result-stat"><div class="result-value" id="killCount">0</div><div class="result-label">杀码数量</div></div>
                    <div class="result-stat"><div class="result-value" id="positionCount">0</div><div class="result-label">定位选择</div></div>
                </div>
                <div class="table-wrapper result-table"><table class="num-table"><thead><tr>${Array.from({ length: 10 }, (_, i) => `<th>${i}</th>`).join('')}</tr></thead><tbody id="project3Results"></tbody></table></div>`;
    }

    initProject3Events() {
        document.querySelectorAll('.filter-options').forEach(container => {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-option')) {
                    const options = container.querySelectorAll('.filter-option');
                    options.forEach(opt => opt.classList.remove('active'));
                    e.target.classList.add('active');
                    const type = container.getAttribute('data-type');
                    const value = e.target.getAttribute('data-value');
                    this.project3State.filters[type] = value;
                    this.saveProject3StateToCache(); // 保存
                    this.generateFilteredNumbers();
                }
            });
        });

        document.getElementById('killBalls').addEventListener('click', (e) => {
            if (e.target.classList.contains('kill-ball')) {
                e.target.classList.toggle('include');
                e.target.classList.toggle('exclude');
                const number = parseInt(e.target.getAttribute('data-number'));
                const index = this.project3State.killNumbers.indexOf(number);
                if (index === -1) this.project3State.killNumbers.push(number);
                else this.project3State.killNumbers.splice(index, 1);
                this.saveProject3StateToCache(); // 保存
                this.generateFilteredNumbers();
            }
        });

        document.querySelectorAll('.position-balls').forEach(container => {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('pos-ball')) {
                    e.target.classList.toggle('selected');
                    const position = container.getAttribute('data-position');
                    const number = parseInt(e.target.getAttribute('data-number'));
                    const index = this.project3State.positionSelection[position].indexOf(number);
                    if (index === -1) this.project3State.positionSelection[position].push(number);
                    else this.project3State.positionSelection[position].splice(index, 1);
                    this.saveProject3StateToCache(); // 保存
                    this.generateFilteredNumbers();
                }
            });
        });

        document.querySelectorAll('.path-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const position = e.target.getAttribute('data-position');
                const path = parseInt(e.target.getAttribute('data-path'));

                const pathNumbers = [];
                for (let i = 0; i <= 9; i++) {
                    if (i % 3 === path) {
                        pathNumbers.push(i);
                    }
                }

                const ballsContainer = document.querySelector(`.position-balls[data-position="${position}"]`);
                const balls = ballsContainer.querySelectorAll('.pos-ball');

                const allSelected = pathNumbers.every(num => {
                    const ball = ballsContainer.querySelector(`.pos-ball[data-number="${num}"]`);
                    return ball.classList.contains('selected');
                });

                pathNumbers.forEach(num => {
                    const ball = ballsContainer.querySelector(`.pos-ball[data-number="${num}"]`);
                    if (allSelected) {
                        ball.classList.remove('selected');
                        const index = this.project3State.positionSelection[position].indexOf(num);
                        if (index !== -1) this.project3State.positionSelection[position].splice(index, 1);
                    } else {
                        ball.classList.add('selected');
                        if (!this.project3State.positionSelection[position].includes(num)) {
                            this.project3State.positionSelection[position].push(num);
                        }
                    }
                });

                this.updatePathButtonState(position);
                this.saveProject3StateToCache(); // 保存
                this.generateFilteredNumbers();
            });
        });

        document.getElementById('clearFilterBtn').addEventListener('click', () => {
            this.clearProject3Filters();
        });

        document.getElementById('showGridBtn').addEventListener('click', () => {
            this.showNumberGrid();
        });
    }

    updatePathButtonState(position) {
        const pathButtons = document.querySelectorAll(`.path-btn[data-position="${position}"]`);

        pathButtons.forEach(btn => {
            const path = parseInt(btn.getAttribute('data-path'));
            const ballsContainer = document.querySelector(`.position-balls[data-position="${position}"]`);

            const pathNumbers = [];
            for (let i = 0; i <= 9; i++) {
                if (i % 3 === path) {
                    pathNumbers.push(i);
                }
            }

            const allSelected = pathNumbers.every(num => {
                const ball = ballsContainer.querySelector(`.pos-ball[data-number="${num}"]`);
                return ball.classList.contains('selected');
            });

            if (allSelected) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    generateFilteredNumbers() {
        const allNumbers = this.generateAllPossibleNumbers();
        const filteredNumbers = this.applyFilters(allNumbers);

        document.getElementById('totalRecommendations').textContent = filteredNumbers.length;
        document.getElementById('filterCount').textContent = this.getActiveFilterCount();
        document.getElementById('killCount').textContent = this.getKillCount();
        document.getElementById('positionCount').textContent = this.getPositionCount();

        this.updateProject3Table(filteredNumbers);
    }

    generateAllPossibleNumbers() {
        const numbers = [];
        for (let i = 0; i <= 9; i++) {
            for (let j = 0; j <= 9; j++) {
                for (let k = 0; k <= 9; k++) {
                    numbers.push([i, j, k]);
                }
            }
        }
        return numbers;
    }

    applyFilters(numbers) {
        if (this.isDefaultFilterState()) {
            return [];
        }

        return numbers.filter(number => {
            return this.passSizeFilter(number) &&
                this.passParityFilter(number) &&
                this.passPrimeFilter(number) &&
                this.passRepeatFilter(number) &&
                this.passSpanFilter(number) &&
                this.passSumFilter(number) &&
                this.passKillFilter(number) &&
                this.passPositionFilter(number);
        });
    }

    isDefaultFilterState() {
        const { filters, killNumbers, positionSelection } = this.project3State;
        const allFiltersDefault = Object.values(filters).every(value => value === 'all');
        const noKillNumbers = killNumbers.length === 0;
        const noPositionSelection = Object.values(positionSelection).every(arr => arr.length === 0);
        return allFiltersDefault && noKillNumbers && noPositionSelection;
    }

    passSizeFilter(number) {
        const filter = this.project3State.filters.size;
        if (filter === 'all') return true;
        const bigCount = number.filter(n => n >= 5).length;
        const smallCount = number.filter(n => n < 5).length;
        switch (filter) {
            case 'all-big': return bigCount === 3;
            case 'all-small': return smallCount === 3;
            case '2big1small': return bigCount === 2 && smallCount === 1;
            case '2small1big': return smallCount === 2 && bigCount === 1;
            default: return true;
        }
    }

    passParityFilter(number) {
        const filter = this.project3State.filters.parity;
        if (filter === 'all') return true;
        const oddCount = number.filter(n => n % 2 === 1).length;
        const evenCount = number.filter(n => n % 2 === 0).length;
        switch (filter) {
            case 'all-odd': return oddCount === 3;
            case 'all-even': return evenCount === 3;
            case '2odd1even': return oddCount === 2 && evenCount === 1;
            case '2even1odd': return evenCount === 2 && oddCount === 1;
            default: return true;
        }
    }

    passPrimeFilter(number) {
        const filter = this.project3State.filters.prime;
        if (filter === 'all') return true;
        const primes = [2, 3, 5, 7];
        const primeCount = number.filter(n => primes.includes(n)).length;
        const compositeCount = 3 - primeCount;
        switch (filter) {
            case 'all-prime': return primeCount === 3;
            case 'all-composite': return compositeCount === 3;
            case '2prime1composite': return primeCount === 2 && compositeCount === 1;
            case '2composite1prime': return compositeCount === 2 && primeCount === 1;
            default: return true;
        }
    }

    passRepeatFilter(number) {
        const filter = this.project3State.filters.repeat;
        if (filter === 'all') return true;
        const uniqueNumbers = new Set(number);
        const hasRepeat = uniqueNumbers.size < 3;
        switch (filter) {
            case 'has-repeat': return hasRepeat;
            case 'no-repeat': return !hasRepeat;
            default: return true;
        }
    }

    passSpanFilter(number) {
        const filter = this.project3State.filters.span;
        if (filter === 'all') return true;
        const span = Math.max(...number) - Math.min(...number);
        switch (filter) {
            case 'small': return span >= 0 && span <= 4;
            case 'medium': return span >= 5 && span <= 7;
            case 'large': return span >= 8 && span <= 9;
            default: return true;
        }
    }

    passSumFilter(number) {
        const filter = this.project3State.filters.sum;
        if (filter === 'all') return true;
        const sum = number.reduce((a, b) => a + b, 0);
        switch (filter) {
            case 'small': return sum >= 0 && sum <= 13;
            case 'medium': return sum >= 14 && sum <= 20;
            case 'large': return sum >= 21 && sum <= 27;
            default: return true;
        }
    }

    passKillFilter(number) {
        return !number.some(n => this.project3State.killNumbers.includes(n));
    }

    passPositionFilter(number) {
        const [hundred, ten, unit] = number;
        const pos = this.project3State.positionSelection;
        if (pos.hundred.length > 0 && !pos.hundred.includes(hundred)) return false;
        if (pos.ten.length > 0 && !pos.ten.includes(ten)) return false;
        if (pos.unit.length > 0 && !pos.unit.includes(unit)) return false;
        return true;
    }

    getActiveFilterCount() {
        let count = 0;
        Object.values(this.project3State.filters).forEach(value => { if (value !== 'all') count++; });
        return count;
    }

    getKillCount() { return this.project3State.killNumbers.length; }
    getPositionCount() { return Object.values(this.project3State.positionSelection).reduce((sum, arr) => sum + arr.length, 0); }

    updateProject3Table(filteredNumbers) {
        const tbody = document.getElementById('project3Results');
        tbody.innerHTML = '';
        if (filteredNumbers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="10" style="text-align: center; padding: 20px; color: #888;">没有符合条件的号码</td>`;
            tbody.appendChild(row);
            return;
        }
        const groupedNumbers = {};
        for (let i = 0; i <= 9; i++) {
            groupedNumbers[i] = [];
        }
        filteredNumbers.forEach(number => {
            const hundredDigit = number[0];
            groupedNumbers[hundredDigit].push(number);
        });
        const maxRows = Math.max(...Object.values(groupedNumbers).map(arr => arr.length));
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = document.createElement('tr');
            for (let colIndex = 0; colIndex <= 9; colIndex++) {
                const cell = document.createElement('td');
                if (rowIndex < groupedNumbers[colIndex].length) {
                    const number = groupedNumbers[colIndex][rowIndex];
                    const [hundred, ten, unit] = number;
                    const hundredClass = this.project3State.positionSelection.hundred.length > 0 && this.project3State.positionSelection.hundred.includes(hundred) ? 'selected-digit' : '';
                    const tenClass = this.project3State.positionSelection.ten.length > 0 && this.project3State.positionSelection.ten.includes(ten) ? 'selected-digit' : '';
                    const unitClass = this.project3State.positionSelection.unit.length > 0 && this.project3State.positionSelection.unit.includes(unit) ? 'selected-digit' : '';
                    cell.innerHTML = `
                                <div class="num-group">
                                    <span class="num-digit ${hundredClass}">${hundred}</span>
                                    <span class="num-digit ${tenClass}">${ten}</span>
                                    <span class="num-digit ${unitClass}">${unit}</span>
                                </div>
                            `;
                }
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }
    }

    clearProject3Table() {
        const tbody = document.getElementById('project3Results');
        tbody.innerHTML = '';
        document.getElementById('totalRecommendations').textContent = '0';
        document.getElementById('filterCount').textContent = '0';
        document.getElementById('killCount').textContent = '0';
        document.getElementById('positionCount').textContent = '0';
    }

    clearProject3Filters() {
        this.project3State = {
            filters: { size: 'all', parity: 'all', prime: 'all', repeat: 'all', span: 'all', sum: 'all' },
            killNumbers: [],
            positionSelection: { hundred: [], ten: [], unit: [] }
        };

        this.saveProject3StateToCache(); // 保存清除后的状态

        document.querySelectorAll('.filter-options').forEach(container => {
            const options = container.querySelectorAll('.filter-option');
            options.forEach(opt => opt.classList.remove('active'));
            const allOption = container.querySelector('[data-value="all"]');
            if (allOption) allOption.classList.add('active');
        });

        document.querySelectorAll('.kill-ball').forEach(ball => {
            ball.classList.remove('exclude');
            ball.classList.add('include');
        });

        document.querySelectorAll('.pos-ball').forEach(ball => {
            ball.classList.remove('selected');
        });

        document.querySelectorAll('.path-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        this.clearProject3Table();
        this.generateFilteredNumbers();

        const existingModal = document.querySelector('.grid-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
            this.showNumberGrid();
        }
    }

    showNumberGrid() {
        const filteredNumbers = this.applyFilters(this.generateAllPossibleNumbers());

        const modal = document.createElement('div');
        modal.className = 'grid-modal';
        modal.innerHTML = `
                    <div class="grid-container">
                        <div class="number-grid" id="modalGridContainer"></div>
                        <div class="grid-controls">
                            <button class="grid-close-btn" id="modalCloseBtn" type="button">
                                <i class="fas fa-times"></i>退出
                            </button>
                            <div class="grid-stats" id="modalGridStats">
                                总计 ${filteredNumbers.length} 个号码
                            </div>
                            <button class="grid-copy-btn" id="modalCopyBtn" type="button">
                                <i class="fas fa-copy"></i>复制号码
                            </button>
                        </div>
                    </div>
                `;

        const gridContainer = modal.querySelector('#modalGridContainer');
        this.fillGridWithNumbers(gridContainer, filteredNumbers);

        const copyBtn = modal.querySelector('#modalCopyBtn');

        const copyHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (this.isCopying) return;
            this.isCopying = true;

            setTimeout(() => {
                this.copyGridNumbers(modal);
                this.isCopying = false;
            }, 300);
        };

        copyBtn.addEventListener('click', copyHandler, { once: false });

        const closeBtn = modal.querySelector('#modalCloseBtn');
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        gridContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.body.appendChild(modal);

        setTimeout(() => {
            copyBtn.blur();
            closeBtn.blur();
        }, 100);
    }

    fillGridWithNumbers(container, numbers) {
        container.innerHTML = '';

        const isDefaultState = this.isDefaultFilterState();

        if (numbers.length === 0 || isDefaultState) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'number-row';
            if (isDefaultState) {
                emptyRow.innerHTML = '<div style="color: #888; padding: 20px; text-align: center; width: 100%;">请选择过滤条件显示号码</div>';
            } else {
                emptyRow.innerHTML = '<div style="color: #888; padding: 20px; text-align: center; width: 100%;">没有符合条件的号码</div>';
            }
            container.appendChild(emptyRow);
            return;
        }

        const groupedNumbers = {};
        for (let i = 0; i <= 9; i++) {
            groupedNumbers[i] = [];
        }

        numbers.forEach(number => {
            const hundredDigit = number[0];
            groupedNumbers[hundredDigit].push(number.join(''));
        });

        for (let hundred = 0; hundred <= 9; hundred++) {
            const numbersForHundred = groupedNumbers[hundred].sort();

            if (numbersForHundred.length > 0) {
                const row = document.createElement('div');
                row.className = 'number-row';

                numbersForHundred.forEach(number => {
                    const numberItem = document.createElement('div');
                    numberItem.className = 'number-item';
                    numberItem.textContent = number;
                    row.appendChild(numberItem);
                });

                container.appendChild(row);
            }
        }
    }

    copyGridNumbers(modal) {
        try {
            const numbers = [];
            const rows = modal.querySelectorAll('.number-row');

            rows.forEach(row => {
                const rowNumbers = [];
                const numberItems = row.querySelectorAll('.number-item');

                numberItems.forEach(item => {
                    const number = item.textContent.trim();
                    if (number.length === 3 && /^\d+$/.test(number)) {
                        rowNumbers.push(number);
                    }
                });

                if (rowNumbers.length > 0) {
                    numbers.push(rowNumbers.join(' '));
                }
            });

            if (numbers.length > 0) {
                const text = numbers.join('\n');
                this.executeCopy(text);
            } else {
                this.showCopyMessage('❌ 没有号码可复制！');
            }
        } catch (error) {
            console.error('复制失败:', error);
            this.showCopyMessage('❌ 复制失败！');
        }
    }

    executeCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea);

        textArea.select();
        textArea.setSelectionRange(0, 99999);

        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                this.showCopyMessage('✅ 号码已复制到剪贴板！');
            } else {
                this.tryClipboardAPI(text);
            }
        } catch (err) {
            document.body.removeChild(textArea);
            this.tryClipboardAPI(text);
        }
    }

    tryClipboardAPI(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopyMessage('✅ 号码已复制到剪贴板！');
            }).catch(err => {
                console.error('Clipboard API 失败:', err);
                this.showCopyMessage('❌ 复制失败，请手动选择复制');
            });
        } else {
            this.showCopyMessage('❌ 复制失败，请手动选择复制');
        }
    }

    showCopyMessage(message) {
        const existingMsg = document.querySelector('.copy-notice');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgElement = document.createElement('div');
        msgElement.className = 'copy-notice';
        msgElement.textContent = message;

        document.body.appendChild(msgElement);

        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.remove();
            }
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.lotterySystem = new LotterySystem();
});