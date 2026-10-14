
        // ============================================================
        // 1. 数据定义
        // ============================================================
        const zodiacs = ["猴", "鸡", "狗", "猪", "鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊"];

        const zodiacMap = {
            "鼠": { emoji: "🐭", trait: "机智灵活 · 善于理财" },
            "牛": { emoji: "🐮", trait: "勤劳踏实 · 稳重可靠" },
            "虎": { emoji: "🐯", trait: "勇敢自信 · 领导力强" },
            "兔": { emoji: "🐰", trait: "温柔善良 · 心思细腻" },
            "龙": { emoji: "🐲", trait: "气势磅礴 · 天生贵人" },
            "蛇": { emoji: "🐍", trait: "智慧深邃 · 冷静沉着" },
            "马": { emoji: "🐴", trait: "热情奔放 · 自由洒脱" },
            "羊": { emoji: "🐑", trait: "温和谦逊 · 艺术天赋" },
            "猴": { emoji: "🐵", trait: "聪明机灵 · 社交达人" },
            "鸡": { emoji: "🐔", trait: "勤奋守时 · 追求完美" },
            "狗": { emoji: "🐶", trait: "忠诚正直 · 守护家人" },
            "猪": { emoji: "🐷", trait: "福气满满 · 乐天知命" }
        };

        const matchData = {
            "鼠": { good: ["牛", "龙", "猴"], bad: ["马", "羊", "兔"] },
            "牛": { good: ["鼠", "蛇", "鸡"], bad: ["羊", "狗", "马"] },
            "虎": { good: ["马", "狗", "猪"], bad: ["蛇", "猴"] },
            "兔": { good: ["羊", "狗", "猪"], bad: ["龙", "鼠"] },
            "龙": { good: ["鼠", "猴", "鸡"], bad: ["狗", "兔"] },
            "蛇": { good: ["牛", "鸡"], bad: ["猴", "猪"] },
            "马": { good: ["羊", "虎", "狗"], bad: ["鼠", "牛", "兔"] },
            "羊": { good: ["马", "兔", "猪"], bad: ["鼠", "牛", "狗"] },
            "猴": { good: ["鼠", "龙"], bad: ["蛇", "虎", "猪"] },
            "鸡": { good: ["牛", "龙", "蛇"], bad: ["鼠", "兔", "狗"] },
            "狗": { good: ["兔", "虎", "马"], bad: ["龙", "牛", "羊"] },
            "猪": { good: ["羊", "兔", "虎"], bad: ["蛇", "猴", "猪"] }
        };

        const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
        const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

        // ============================================================
        // 2. 初始化
        // ============================================================
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const startYear = currentYear - 120;

        let currentZodiacName = null;
        let currentZodiacYear = null;
        let currentMode = 'birth';

        // ===== 获取所有下拉框和年龄输入框 =====
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        const daySelect = document.getElementById('daySelect');
        const ageInput = document.getElementById('ageInput');

        // ===== 下拉框选择后变红色 =====
        function handleSelectChange(select) {
            if (select.value && select.value !== '') {
                select.classList.add('has-value');
            } else {
                select.classList.remove('has-value');
            }
        }

        [yearSelect, monthSelect, daySelect].forEach(sel => {
            sel.addEventListener('change', function() {
                handleSelectChange(this);
            });
            // 初始化时检查是否有值
            setTimeout(() => handleSelectChange(sel), 100);
        });

        // ===== 年龄输入框：输入时变红色 =====
        ageInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.classList.add('has-value');
                this.style.color = '#e53e3e';
                this.style.fontWeight = '600';
            } else {
                this.classList.remove('has-value');
                this.style.color = '#e8edf3';
                this.style.fontWeight = '400';
            }
        });

        ageInput.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                this.style.color = '#e8edf3';
                this.style.fontWeight = '400';
            }
        });

        function updateHeader() {
            const idx = currentYear % 12;
            const name = zodiacs[idx];
            const emoji = zodiacMap[name]?.emoji || '🐴';
            document.getElementById('zodiacIcon').textContent = emoji;
        }
        updateHeader();

        function populateSelects() {
            const yearSel = document.getElementById('yearSelect');
            yearSel.innerHTML = '';
            for (let y = currentYear; y >= startYear; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                yearSel.appendChild(opt);
            }
            yearSel.value = 1981;
            // 初始化红色状态
            setTimeout(() => handleSelectChange(yearSel), 150);

            const monthSel = document.getElementById('monthSelect');
            monthSel.innerHTML = '';
            MONTHS.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = String(m).padStart(2, '0');
                monthSel.appendChild(opt);
            });
            monthSel.value = 1;
            setTimeout(() => handleSelectChange(monthSel), 150);

            const daySel = document.getElementById('daySelect');
            daySel.innerHTML = '';
            DAYS.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = String(d).padStart(2, '0');
                daySel.appendChild(opt);
            });
            daySel.value = 1;
            setTimeout(() => handleSelectChange(daySel), 150);
        }
        populateSelects();

        // ============================================================
        // 3. 模式切换
        // ============================================================
        function switchMode(mode) {
            currentMode = mode;

            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            document.getElementById('birthMode').style.display = (mode === 'birth') ? 'flex' : 'none';
            document.getElementById('ageMode').classList.toggle('show', mode === 'age');

            if (mode === 'age') {
                document.getElementById('ageInput').focus();
            }
        }

        // ============================================================
        // 4. 统一查询处理
        // ============================================================
        function handleQuery() {
            if (currentMode === 'birth') {
                calculateAge();
            } else {
                searchByAge();
            }
        }

        // ============================================================
        // 5. 按年龄查找
        // ============================================================
        function searchByAge() {
            const ageInput = document.getElementById('ageInput');
            const age = parseInt(ageInput.value);

            if (!age || age < 0 || age > 120) {
                alert('请输入 0-120 之间的有效年龄');
                return;
            }

            let birthYear = currentYear - age;

            const yearSel = document.getElementById('yearSelect');
            if (yearSel.querySelector(`option[value="${birthYear}"]`)) {
                yearSel.value = birthYear;
            } else {
                const options = Array.from(yearSel.options);
                const closest = options.reduce((prev, curr) => {
                    const pVal = parseInt(prev.value);
                    const cVal = parseInt(curr.value);
                    return Math.abs(cVal - birthYear) < Math.abs(pVal - birthYear) ? curr : prev;
                });
                yearSel.value = closest.value;
            }

            document.getElementById('monthSelect').value = currentMonth;
            document.getElementById('daySelect').value = currentDay;

            // 更新下拉框颜色
            [yearSel, document.getElementById('monthSelect'), document.getElementById('daySelect')].forEach(sel => {
                handleSelectChange(sel);
            });

            calculateAge();
            ageInput.value = '';
            ageInput.style.color = '#e8edf3';
            ageInput.style.fontWeight = '400';
            ageInput.classList.remove('has-value');
        }

        document.getElementById('ageInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                handleQuery();
            }
        });

        // ============================================================
        // 6. Tab 切换
        // ============================================================
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const target = this.dataset.tab;
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('panel-' + target).classList.add('active');

                if (target === 'match') {
                    updateMatchResult();
                }
            });
        });

        // ============================================================
        // 7. 年龄计算
        // ============================================================
        function calculateAge() {
            const year = parseInt(document.getElementById('yearSelect').value);
            const month = parseInt(document.getElementById('monthSelect').value);
            const day = parseInt(document.getElementById('daySelect').value);

            if (!year || !month || !day) {
                showAgeResult('请完整选择年月日', true);
                return;
            }

            const birthDate = new Date(year, month - 1, day);
            if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
                showAgeResult('❌ 日期不合法', true);
                return;
            }

            const isFuture = (currentYear < year) ||
                (currentYear === year && currentMonth < month) ||
                (currentYear === year && currentMonth === month && currentDay < day);
            if (isFuture) {
                showAgeResult('🔮 请选择今天或之前的日期', true);
                return;
            }

            let age = currentYear - year;
            if (currentMonth < month || (currentMonth === month && currentDay < day)) {
                age--;
            }

            const idx = year % 12;
            const zodiacName = zodiacs[idx];
            const info = zodiacMap[zodiacName] || { emoji: '🐉', trait: '' };
            const constellation = getConstellation(month, day);

            const birthdayPassed = (currentMonth > month || (currentMonth === month && currentDay >= day)) ? '✅ 已过' :
                '⏳ 未过';

            currentZodiacName = zodiacName;
            currentZodiacYear = year;

            const html = `
                <div class="result-item">
                    <div class="birth-info">
                        📅 ${year}.${String(month).padStart(2,'0')}.${String(day).padStart(2,'0')} &nbsp;·&nbsp; 今天 ${currentYear}.${String(currentMonth).padStart(2,'0')}.${String(currentDay).padStart(2,'0')}
                    </div>
                    <div class="birth-status">
                        今年生日 ${birthdayPassed}
                    </div>
                    <div class="age-number">
                        <span>${age}</span> 岁
                    </div>
                </div>
                <div class="result-item zodiac-display">
                    <span class="zodiac-emoji">${info.emoji}</span>
                    <span class="zodiac-name">${zodiacName}</span>
                </div>
                <div class="extra-info">
                    ⭐ ${constellation}  ·  ${info.trait}
                </div>
            `;

            showAgeResult(html, false);

            const matchPanel = document.getElementById('panel-match');
            if (matchPanel.classList.contains('active')) {
                updateMatchResult();
            }
        }

        function showAgeResult(html, isError) {
            const card = document.getElementById('resultCard');
            const content = document.getElementById('resultContent');
            content.innerHTML = html;
            if (isError) {
                card.classList.remove('has-result');
                content.style.color = '#e53e3e';
            } else {
                card.classList.add('has-result');
                content.style.color = '';
            }
        }

        // ============================================================
        // 8. 婚配自动更新
        // ============================================================
        function updateMatchResult() {
            if (!currentZodiacName || !currentZodiacYear) {
                showMatchResult(`
                    <div class="match-placeholder">
                        <span class="big-emoji">💑</span>
                        请先在「年龄属相」页查询<br>自动匹配婚配建议
                    </div>
                `, false);
                return;
            }

            const zodiacName = currentZodiacName;
            const info = zodiacMap[zodiacName] || { emoji: '🐴', trait: '' };
            const data = matchData[zodiacName];

            if (!data) {
                showMatchResult('暂无婚配数据', true);
                return;
            }

            const goodTags = data.good.map(z => {
                const emoji = zodiacMap[z]?.emoji || '';
                return `<span class="match-tag good"><span class="emoji">${emoji}</span>${z}</span>`;
            }).join('');

            const badTags = data.bad.map(z => {
                const emoji = zodiacMap[z]?.emoji || '';
                return `<span class="match-tag bad"><span class="emoji">${emoji}</span>${z}</span>`;
            }).join('');

            const matchZodiac = data.good[0] || '';
            const matchEmoji = zodiacMap[matchZodiac]?.emoji || '💕';

            const html = `
                <div class="match-main">
                    <div class="zodiac-item">
                        <span class="emoji">${info.emoji}</span>
                        <span class="name">${zodiacName}</span>
                    </div>
                    <span class="match-icon good">❤️</span>
                    <div class="zodiac-item">
                        <span class="emoji">${matchEmoji}</span>
                        <span class="name">${matchZodiac || '待定'}</span>
                    </div>
                </div>
                <div class="match-detail">
                    <div style="margin-bottom:6px;">
                        <span class="label">✅ 宜配：</span>
                    </div>
                    <div class="good-tags">${goodTags}</div>
                    <div style="margin:8px 0 4px;">
                        <span class="label">❌ 忌配：</span>
                    </div>
                    <div class="bad-tags">${badTags}</div>
                    <div class="match-tip">
                        💡 ${zodiacName} × ${matchZodiac || '?'} · 上等婚配
                    </div>
                </div>
            `;

            showMatchResult(html, false);
        }

        function showMatchResult(html, isError) {
            const card = document.getElementById('matchResultCard');
            const content = document.getElementById('matchResultContent');
            content.innerHTML = html;
            if (isError) {
                card.classList.remove('has-result');
                content.style.color = '#e53e3e';
            } else {
                card.classList.add('has-result');
                content.style.color = '';
            }
        }

        // ============================================================
        // 9. 辅助函数
        // ============================================================
        function getConstellation(month, day) {
            const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
            const names = ['摩羯', '水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手'];
            if (day < dates[month - 1]) {
                return names[month - 1];
            } else {
                return names[month % 12];
            }
        }

        // ============================================================
        // 10. 键盘 & 自动加载
        // ============================================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                handleQuery();
            }
        });

        window.addEventListener('load', function() {
            setTimeout(calculateAge, 300);
        });

        console.log('✅ 年月日+年龄输入后变红色，框内无提示，年龄框已加宽');
    