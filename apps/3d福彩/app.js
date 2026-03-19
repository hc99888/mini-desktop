
    class LotterySystem {
        constructor() {
            this.data = [];
            this.filteredData = [];
            this.project3State = {
                filters: { size: 'all', parity: 'all', prime: 'all', repeat: 'all', span: 'all', sum: 'all' },
                killNumbers: [],
                positionSelection: { hundred: [], ten: [], unit: [] }
            };
            this.isCopying = false;
            this.init();
        }
        
        init() {
            this.bindEvents();
            this.initProject3();
            this.resetStats();
            this.loadDataFromCache();
            this.loadProject3StateFromCache();
        }
        
        // 保存数据到缓存
        saveDataToCache() {
            try {
                localStorage.setItem('3d_lottery_cache', JSON.stringify(this.data));
            } catch (e) {
                console.error("保存缓存失败:", e);
            }
        }

        // 保存项目3状态到缓存
        saveProject3StateToCache() {
            try {
                localStorage.setItem('3d_lottery_project3_state', JSON.stringify(this.project3State));
            } catch (e) {
                console.error("保存项目3状态失败:", e);
            }
        }

        // 从缓存加载项目3状态
        loadProject3StateFromCache() {
            try {
                const cachedState = localStorage.getItem('3d_lottery_project3_state');
                if (cachedState) {
                    this.project3State = JSON.parse(cachedState);
                    this.restoreProject3UI();
                }
            } catch (e) {
                console.error("加载项目3状态失败:", e);
            }
        }

        // 恢复项目3的UI状态
        restoreProject3UI() {
            // 恢复过滤器选项
            Object.entries(this.project3State.filters).forEach(([type, value]) => {
                const container = document.querySelector(`.filter-options[data-type="${type}"]`);
                if (container) {
                    const options = container.querySelectorAll('.filter-option');
                    options.forEach(opt => opt.classList.remove('active'));
                    const activeOption = container.querySelector(`[data-value="${value}"]`);
                    if (activeOption) activeOption.classList.add('active');
                }
            });
            
            // 恢复杀码状态
            document.querySelectorAll('.kill-ball').forEach(ball => {
                const number = parseInt(ball.getAttribute('data-number'));
                ball.classList.remove('include', 'exclude');
                if (this.project3State.killNumbers.includes(number)) {
                    ball.classList.add('exclude');
                } else {
                    ball.classList.add('include');
                }
            });
            
            // 恢复定位选择状态
            document.querySelectorAll('.pos-ball').forEach(ball => {
                ball.classList.remove('selected');
            });
            
            Object.entries(this.project3State.positionSelection).forEach(([position, numbers]) => {
                numbers.forEach(num => {
                    const ball = document.querySelector(`.position-balls[data-position="${position}"] .pos-ball[data-number="${num}"]`);
                    if (ball) ball.classList.add('selected');
                });
            });
            
            // 恢复012路按钮状态
            ['hundred', 'ten', 'unit'].forEach(position => {
                this.updatePathButtonState(position);
            });
            
            // 重新生成过滤号码
            this.generateFilteredNumbers();
        }

        // 从缓存加载数据
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
            importIcon.style.opacity = '1';
            importIcon.style.pointerEvents = 'auto';
            importIcon.innerHTML = '<i class="fas fa-file-excel"></i>';
        }
        
        parseWorkbook(workbook) {
            // 解析Excel文件的代码...
            // 这里需要您补充具体的解析逻辑
        }
        
        showImportSuccess(message) {
            // 显示导入成功消息的代码...
        }
        
        updateSelectors() {
            // 更新选择器的代码...
        }
        
        updateDisplay() {
            // 更新显示的代码...
        }
        
        filterData() {
            // 过滤数据的代码...
        }
        
        calculateHotCold(lookback) {
            // 计算热冷球的代码...
            return { hot: [], cold: [] };
        }
        
        addPredictionRow() {
            // 添加预测行的代码...
        }
        
        initManualSelection() {
            // 初始化手动选择的代码...
        }
        
        updateProject2() {
            // 更新项目2的代码...
        }
        
        analyzeNumbers(numbers) {
            // 分析号码的代码...
            return {
                sum: 0,
                span: 0,
                paths: [],
                pathCounts: [0,0,0],
                oddEven: [],
                oddCount: 0,
                evenCount: 0,
                size: [],
                smallCount: 0,
                bigCount: 0,
                prime: [],
                primeCount: 0,
                compositeCount: 0
            };
        }
        
        get012Color(value) { 
            const colors = {0: 'pink', 1: 'light-green', 2: 'cyan'}; 
            return colors[value] || 'white'; 
        }
        
        get012CountColor(count) { 
            if (count === 3) return 'red'; 
            if (count === 2) return 'yellow'; 
            if (count === 1) return 'dark-blue'; 
            return 'dark-orange'; 
        }
        
        getOddEvenColor(value) { 
            return value === '奇' ? 'green' : 'brown'; 
        }
        
        getOddEvenCountColor(count) { 
            if (count === 3) return 'red'; 
            if (count === 2) return 'yellow'; 
            return count === 1 ? 'light-green' : 'pink'; 
        }
        
        getSizeColor(value) { 
            return value === '小' ? 'cyan' : 'pink'; 
        }
        
        getSizeCountColor(count) { 
            if (count === 3) return 'red'; 
            if (count === 2) return 'yellow'; 
            return count === 1 ? 'cyan' : 'pink'; 
        }
        
        getPrimeColor(value) { 
            return value === '质' ? 'orange' : 'blue'; 
        }
        
        getPrimeCountColor(count) { 
            if (count === 3) return 'red'; 
            if (count === 2) return 'yellow'; 
            return count === 1 ? 'light-green' : 'pink'; 
        }
        
        initProject3() {
            const panel = document.getElementById('project3FilterPanel');
            panel.innerHTML = this.getProject3HTML();
            this.initProject3Events();
            this.clearProject3Table();
        }
        
        getProject3HTML() {
            return `
                <div class="filter-group"><div class="filter-title">1. 大小形态：小 0-4  >< 大 5-9</div><div class="filter-options" data-type="size"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-big">全大</div><div class="filter-option" data-value="all-small">全小</div><div class="filter-option" data-value="2big1small">2大1小</div><div class="filter-option" data-value="2small1big">2小1大</div></div></div>
                <div class="filter-group"><div class="filter-title">2. 奇偶形态：奇 1 3 5 7 9 >< 偶 0 2 4 6 8</div><div class="filter-options" data-type="parity"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-odd">全奇</div><div class="filter-option" data-value="all-even">全偶</div><div class="filter-option" data-value="2odd1even">2奇1偶</div><div class="filter-option" data-value="2even1odd">2偶1奇</div></div></div>
                <div class="filter-group"><div class="filter-title">3. 质合形态：质 2 3 5 7  >< 合 0 1 4 6 8 9</div><div class="filter-options" data-type="prime"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="all-prime">全质</div><div class="filter-option" data-value="all-composite">全合</div><div class="filter-option" data-value="2prime1composite">2质1合</div><div class="filter-option" data-value="2composite1prime">2合1质</div></div></div>
                <div class="filter-group"><div class="filter-title">4. 重号条件</div><div class="filter-options" data-type="repeat"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="has-repeat">有重号</div><div class="filter-option" data-value="no-repeat">无重号</div></div></div>
                <div class="filter-group"><div class="filter-title">5. 跨度范围</div><div class="filter-options" data-type="span"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="small">小跨度(0-4)</div><div class="filter-option" data-value="medium">中跨度(5-7)</div><div class="filter-option" data-value="large">大跨度(8-9)</div></div></div>
                <div class="filter-group"><div class="filter-title">6. 和值范围</div><div class="filter-options" data-type="sum"><div class="filter-option active" data-value="all">全部不选</div><div class="filter-option" data-value="small">小和值(0-13)</div><div class="filter-option" data-value="medium">中和值(14-20)</div><div class="filter-option" data-value="large">大和值(21-27)</div></div></div>
                <div class="kill-panel"><div class="filter-title">7. 杀码范围 (绿色选择，红色排除)</div><div class="kill-balls" id="killBalls">${Array.from({length: 10}, (_, i) => `<div class="kill-ball include" data-number="${i}">${i}</div>`).join('')}</div></div>
                <div class="position-panel"><div class="filter-title">8. 定位选择 (点亮球体表示选中)</div>
                    <!-- 百位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="hundred" data-path="0">0路 百</div>
                                <div class="path-btn" data-position="hundred" data-path="1">1路 百</div>
                                <div class="path-btn" data-position="hundred" data-path="2">2路 百</div>
                            </div>
                            <div class="position-balls" data-position="hundred">${Array.from({length: 10}, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
                        </div>
                    </div>
                    <!-- 十位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="ten" data-path="0">0路 十</div>
                                <div class="path-btn" data-position="ten" data-path="1">1路 十</div>
                                <div class="path-btn" data-position="ten" data-path="2">2路 十</div>
                            </div>
                            <div class="position-balls" data-position="ten">${Array.from({length: 10}, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
                        </div>
                    </div>
                    <!-- 个位选择 -->
                    <div class="position-row">
                        <div class="position-balls-container">
                            <div class="path-quick-select">
                                <div class="path-btn" data-position="unit" data-path="0">0路 个</div>
                                <div class="path-btn" data-position="unit" data-path="1">1路 个</div>
                                <div class="path-btn" data-position="unit" data-path="2">2路 个</div>
                            </div>
                            <div class="position-balls" data-position="unit">${Array.from({length: 10}, (_, i) => `<div class="pos-ball" data-number="${i}">${i}</div>`).join('')}</div>
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
                <div class="table-wrapper result-table"><table class="num-table"><thead><tr>${Array.from({length: 10}, (_, i) => `<th>${i}</th>`).join('')}</tr></thead><tbody id="project3Results"></tbody></table></div>`;
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
                        this.saveProject3StateToCache();
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
                    this.saveProject3StateToCache();
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
                        this.saveProject3StateToCache();
                        this.updatePathButtonState(position);
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
                    
                    const allSelected = pathNumbers.every(num => {
                        const ball = ballsContainer.querySelector(`.pos-ball[data-number="${num}"]`);
                        return ball && ball.classList.contains('selected');
                    });
                    
                    pathNumbers.forEach(num => {
                        const ball = ballsContainer.querySelector(`.pos-ball[data-number="${num}"]`);
                        if (ball) {
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
                        }
                    });
                    
                    this.updatePathButtonState(position);
                    this.saveProject3StateToCache(); 
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
            const positionSelection = this.project3State.positionSelection[position];
            
            pathButtons.forEach(btn => {
                const path = parseInt(btn.getAttribute('data-path'));
                const pathNumbers = [];
                for (let i = 0; i <= 9; i++) {
                    if (i % 3 === path) {
                        pathNumbers.push(i);
                    }
                }
                
                const allSelected = pathNumbers.every(num => positionSelection.includes(num));
                if (allSelected) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        generateFilteredNumbers() {
            if (this.isDefaultFilterState()) {
                this.clearProject3Table();
                document.getElementById('totalRecommendations').textContent = '0';
                return;
            }
            
            const allNumbers = this.generateAllPossibleNumbers();
            const filteredNumbers = this.applyFilters(allNumbers);
            
            this.updateProject3Table(filteredNumbers);
            document.getElementById('totalRecommendations').textContent = filteredNumbers.length;
            document.getElementById('filterCount').textContent = this.getActiveFilterCount();
            document.getElementById('killCount').textContent = this.getKillCount();
            document.getElementById('positionCount').textContent = this.getPositionCount();
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
            switch(filter) {
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
            switch(filter) {
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
            switch(filter) {
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
            switch(filter) {
                case 'has-repeat': return hasRepeat;
                case 'no-repeat': return !hasRepeat;
                default: return true;
            }
        }
        
        passSpanFilter(number) {
            const filter = this.project3State.filters.span;
            if (filter === 'all') return true;
            const span = Math.max(...number) - Math.min(...number);
            switch(filter) {
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
            switch(filter) {
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
        
        getKillCount() { 
            return this.project3State.killNumbers.length; 
        }
        
        getPositionCount() { 
            return Object.values(this.project3State.positionSelection).reduce((sum, arr) => sum + arr.length, 0); 
        }
        
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
            this.saveProject3StateToCache();
            
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
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
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
