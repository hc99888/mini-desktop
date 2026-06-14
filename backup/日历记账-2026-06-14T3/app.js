


    const STORAGE_KEY = 'ledger_records';
    const ATTENDANCE_KEY = 'attendance_records';
    const CREW_ATTENDANCE_KEY = 'crew_attendance';
    const CREW_LIST_KEY = 'crew_list';
    const ADVANCE_KEY = 'advance_records';
    const LAST_INPUT_KEY = 'ledger_last_input';

    let currentYear, currentMonth;
    let records = [];
    let attendanceRecords = {};
    let crewAttendance = {};
    let crewList = [];
    let advances = [];
    let selectedDate = null;
    let lastInput = { category: '', note: '' };
    let currentForm = 'expense';
    let crewMode = 'single';
    let crewLockTimer = null;
    let currentSelectedPerson = null;

    function showToast(msg, duration = 2000) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }

    function loadRecords() { const raw = localStorage.getItem(STORAGE_KEY); records = raw ? JSON.parse(raw) : []; }
    function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
    function loadAttendance() { const raw = localStorage.getItem(ATTENDANCE_KEY); attendanceRecords = raw ? JSON.parse(raw) : {}; }
    function saveAttendance() { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords)); }
    function loadCrewList() { const raw = localStorage.getItem(CREW_LIST_KEY); crewList = raw ? JSON.parse(raw) : []; }
    function saveCrewList() { localStorage.setItem(CREW_LIST_KEY, JSON.stringify(crewList)); }
    function loadCrewAttendance() { const raw = localStorage.getItem(CREW_ATTENDANCE_KEY); crewAttendance = raw ? JSON.parse(raw) : {}; }
    function saveCrewAttendance() { localStorage.setItem(CREW_ATTENDANCE_KEY, JSON.stringify(crewAttendance)); }
    function loadAdvances() { const raw = localStorage.getItem(ADVANCE_KEY); advances = raw ? JSON.parse(raw) : []; }
    function saveAdvances() { localStorage.setItem(ADVANCE_KEY, JSON.stringify(advances)); }
    function loadLastInput() { const raw = localStorage.getItem(LAST_INPUT_KEY); lastInput = raw ? JSON.parse(raw) : { category: '', note: '' }; }
    function saveLastInput(category, note) { lastInput = { category, note }; localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(lastInput)); }

    function updateAdvanceSelect() {
      const select = document.getElementById('advanceSelect');
      select.innerHTML = '';
      const balanceMap = new Map();
      advances.forEach(adv => {
        if (adv.balance > 0) {
          const current = balanceMap.get(adv.name) || 0;
          balanceMap.set(adv.name, current + adv.balance);
        }
      });
      const sortedEntries = Array.from(balanceMap.entries()).sort((a, b) => b[1] - a[1]);
      for (const [name, totalBalance] of sortedEntries) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${name} (余额 ¥${totalBalance.toFixed(2)})`;
        select.appendChild(opt);
      }
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '不使用预付款';
      select.appendChild(defaultOpt);
    }

    function getPersonTotalBalance(name) {
      let total = 0;
      advances.forEach(adv => {
        if (adv.name === name && adv.balance > 0) total += adv.balance;
      });
      return total;
    }

    function deductFromPerson(name, amount) {
      const personAdvances = advances.filter(adv => adv.name === name && adv.balance > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      let remaining = amount;
      for (let adv of personAdvances) {
        if (remaining <= 0) break;
        const deduct = Math.min(adv.balance, remaining);
        adv.balance -= deduct;
        remaining -= deduct;
      }
      saveAdvances();
      return remaining === 0;
    }

    // 删除消费记录时，恢复预付款余额（按到账日期倒序加回，即从最近的记录开始恢复）
    function addBackToPerson(name, amount) {
      const personAdvances = advances.filter(adv => adv.name === name)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // 倒序，从最近的开始恢复
      let remaining = amount;
      for (let adv of personAdvances) {
        if (remaining <= 0) break;
        const addBack = Math.min(adv.amount - adv.balance, remaining);
        adv.balance += addBack;
        remaining -= addBack;
      }
      saveAdvances();
      return remaining === 0;
    }

    function deleteCrewMember(name) {
      if (confirm(`确定要删除人员 "${name}" 吗？该人员的所有出勤记录也会被删除。`)) {
        crewList = crewList.filter(n => n !== name);
        saveCrewList();
        Object.keys(crewAttendance).forEach(date => {
          if (crewAttendance[date][name]) {
            delete crewAttendance[date][name];
            if (Object.keys(crewAttendance[date]).length === 0) delete crewAttendance[date];
          }
        });
        saveCrewAttendance();
        renderCrewTable();
        resetCrewLock();
        renderSummary();
        showToast(`✅ 已删除 ${name}`);
      }
    }

    function editCrewMember(oldName) {
      const newName = prompt('请输入新的姓名：', oldName);
      if (newName && newName.trim() && newName.trim() !== oldName) {
        const newNameTrimmed = newName.trim();
        if (crewList.includes(newNameTrimmed)) {
          alert('该姓名已存在！');
          return;
        }
        const index = crewList.indexOf(oldName);
        if (index !== -1) crewList[index] = newNameTrimmed;
        saveCrewList();
        const newCrewAttendance = {};
        Object.entries(crewAttendance).forEach(([date, dayData]) => {
          newCrewAttendance[date] = {};
          Object.entries(dayData).forEach(([name, val]) => {
            const newNameKey = name === oldName ? newNameTrimmed : name;
            newCrewAttendance[date][newNameKey] = val;
          });
        });
        crewAttendance = newCrewAttendance;
        saveCrewAttendance();
        renderCrewTable();
        resetCrewLock();
        renderSummary();
        showToast(`✅ 已重命名为 ${newNameTrimmed}`);
      }
    }

    function openPersonMenu(name) {
      currentSelectedPerson = name;
      document.getElementById('personMenuName').textContent = name;
      document.getElementById('personMenuModal').classList.add('active');
    }

    function closePersonMenu() {
      document.getElementById('personMenuModal').classList.remove('active');
      currentSelectedPerson = null;
    }

    function getAdvancesByDate(dateStr) { return advances.filter(adv => adv.date === dateStr); }
    function getCrewCountByDate(dateStr) {
      const dayData = crewAttendance[dateStr];
      if (!dayData) return 0;
      return Object.keys(dayData).filter(name => {
        const val = dayData[name];
        return val && val.type !== 'rest' && val.type !== 'none';
      }).length;
    }

    function getCrewStats(year, month) {
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      const stats = {};
      crewList.forEach(name => { stats[name] = { full: 0, half: 0, overtime: 0, rest: 0, total: 0 }; });
      Object.entries(crewAttendance).forEach(([date, dayData]) => {
        if (date.startsWith(prefix)) {
          Object.entries(dayData).forEach(([name, val]) => {
            if (stats[name]) {
              const type = val.type || val;
              const days = val.days !== undefined ? val.days : 1;
              if (type === 'full') { stats[name].full++; stats[name].total++; }
              else if (type === 'half') { stats[name].half++; stats[name].total += 0.5; }
              else if (type === 'overtime') { stats[name].overtime += days; stats[name].total += days; }
              else if (type === 'rest') { stats[name].rest++; }
            }
          });
        }
      });
      return stats;
    }

    function getRecordsByDate(dateStr) { return records.filter(r => r.date === dateStr); }
    function getRecordsByMonth(year, month) { const prefix = `${year}-${String(month).padStart(2,'0')}`; return records.filter(r => r.date.startsWith(prefix)); }
    function getDayTotal(dateStr) { return getRecordsByDate(dateStr).reduce((sum, r) => sum + r.amount, 0); }
    function getAttendanceByDate(dateStr) { return attendanceRecords[dateStr] || null; }

    function getAttendanceStats(year, month) {
      let full = 0, half = 0, overtime = 0, rest = 0;
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      Object.entries(attendanceRecords).forEach(([date, att]) => {
        if (date.startsWith(prefix)) {
          if (att.type === 'full') full++;
          else if (att.type === 'half') half += 0.5;
          else if (att.type === 'overtime') overtime += (att.value || 0);
          else if (att.type === 'rest') rest++;
        }
      });
      return { full, half, overtime, rest, total: full + half + overtime };
    }

    function getDetailedSummary(year, month) {
      const monthRecords = getRecordsByMonth(year, month);
      const summary = {};
      monthRecords.forEach(r => {
        if (!summary[r.category]) summary[r.category] = { total: 0, records: [] };
        summary[r.category].total += r.amount;
        const day = parseInt(r.date.split('-')[2]);
        summary[r.category].records.push({ day, amount: r.amount, note: r.note, date: r.date });
      });
      Object.values(summary).forEach(cat => cat.records.sort((a, b) => a.day - b.day));
      return summary;
    }

    function renameCategory(oldName, newName) {
      newName = newName.trim();
      if (!newName) return alert('分类名不能为空');
      if (oldName === newName) return;
      if (getRecordsByMonth(currentYear, currentMonth).some(r => r.category === newName)) return alert(`"${newName}" 已存在`);
      records.forEach(r => { if (r.category === oldName) r.category = newName; });
      saveRecords();
      renderCalendar();
    }

    function renderCalendar() {
      document.getElementById('monthTitle').textContent = `${currentYear}年 ${currentMonth}月`;
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const startDay = firstDay.getDay();
      const prev = startDay;
      const totalCells = 42;
      const cal = document.getElementById('calendar');
      cal.innerHTML = '';
      ['日','一','二','三','四','五','六'].forEach(d => {
        const label = document.createElement('div'); label.className = 'day-label'; label.textContent = d; cal.appendChild(label);
      });
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      for (let i = 0; i < totalCells; i++) {
        const offset = i - prev + 1;
        const cellDate = new Date(currentYear, currentMonth - 1, offset);
        const cellMonth = cellDate.getMonth() + 1;
        const cellYear = cellDate.getFullYear();
        const dateStr = `${cellYear}-${String(cellMonth).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
        const cell = document.createElement('div');
        if (cellMonth !== currentMonth) { cell.className = 'day-cell empty'; }
        else {
          cell.className = 'day-cell';
          const content = document.createElement('div'); content.className = 'cell-content';
          const dateSpan = document.createElement('span'); dateSpan.textContent = cellDate.getDate(); content.appendChild(dateSpan);
          if (dateStr === todayStr) cell.classList.add('today');
          const total = getDayTotal(dateStr);
          if (total !== 0) {
            cell.classList.add('has-record');
            const amtSpan = document.createElement('span'); amtSpan.className = 'amount';
            if (total < 0) amtSpan.classList.add('negative');
            amtSpan.textContent = total < 0 ? `-¥${Math.abs(total).toFixed(1)}` : `¥${total.toFixed(1)}`;
            content.appendChild(amtSpan);
          }
          const att = getAttendanceByDate(dateStr);
          if (att) {
            const dot = document.createElement('span'); dot.className = 'attendance-dot';
            dot.style.backgroundColor = { full: '#007aff', half: '#fd7e14', overtime: '#dc3545', rest: '#28a745' }[att.type] || '#28a745';
            content.insertBefore(dot, content.firstChild);
          }
          cell.appendChild(content);
          cell.addEventListener('click', () => openModal(dateStr));
        }
        cal.appendChild(cell);
      }
      renderSummary();
    }

    function renderSummary() {
      const container = document.getElementById('summaryContent');
      const summary = getDetailedSummary(currentYear, currentMonth);
      const cats = Object.keys(summary);
      let html = '';
      if (cats.length === 0) { html += '<p style="color:#888;">这个月还没有消费记录</p>'; }
      else {
        cats.sort((a,b) => summary[b].total - summary[a].total);
        let grandTotal = 0;
        cats.forEach((cat, i) => {
          const data = summary[cat]; grandTotal += data.total;
          const days = [...new Set(data.records.map(r => r.day))].sort((a,b)=>a-b);
          const daysHtml = days.map(d => `<span>${d}号</span>`).join('');
          const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
          html += `<div class="summary-category"><div class="summary-category-header"><div class="summary-category-name-row"><span class="summary-category-name" id="catName_${i}">${cat}</span><span class="edit-category-row" id="editRow_${i}" style="display:none;"><input type="text" id="editInput_${i}" value="${cat}"><button class="btn-sm btn-edit-confirm" onclick="confirmRename('${cat}',${i})">✓</button><button class="btn-sm btn-edit-cancel" onclick="cancelEdit(${i})">✕</button></span></div><span class="summary-category-amount ${data.total<0?'negative':''}">${totalDisplay}</span></div><div class="summary-category-days">${daysHtml}</div><div style="margin-top:6px;"><button class="btn-sm btn-edit" onclick="startEdit(${i})">✏️ 改名</button><button class="btn-sm btn-export" onclick="event.stopPropagation(); exportCategoryToImage('${cat}')">📷 导出</button></div></div>`;
        });
        html += `<div class="summary-total"><span>本月合计</span><span>${grandTotal<0?'-¥'+Math.abs(grandTotal).toFixed(2):'¥'+grandTotal.toFixed(2)}</span></div>`;
      }

      if (advances.length > 0) {
        const personMap = new Map();
        let totalOriginalAll = 0;
        advances.forEach(adv => {
          if (!personMap.has(adv.name)) personMap.set(adv.name, { records: [], totalBalance: 0, totalOriginal: 0 });
          const person = personMap.get(adv.name);
          person.records.push({ date: adv.date, amount: adv.amount, balance: adv.balance });
          person.totalBalance += adv.balance;
          person.totalOriginal += adv.amount;
          totalOriginalAll += adv.amount;
        });
        html += `<div class="advance-card"><div style="display:flex; justify-content:space-between; align-items:center;"><h4>💰 预付款余额</h4><span style="font-weight:bold; color:#e65100;">合计 ¥${totalOriginalAll.toFixed(2)}</span></div>`;
        for (const [name, person] of personMap) {
          html += `<div style="margin-top:12px;"><div style="font-weight:bold; margin-bottom:5px;">${name}</div>`;
          person.records.forEach(rec => {
            html += `<div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#666; margin-left:8px;"><span>到账：${rec.date || '未知日期'}</span><span>总额 ¥${rec.amount.toFixed(2)}</span></div>`;
          });
          html += `<div style="display:flex; justify-content:space-between; margin-top:5px; padding-top:3px; border-top:1px dashed #ffe0b2; font-weight:bold;"><span>剩余余额</span><span style="color:#e65100;">¥${person.totalBalance.toFixed(2)}</span></div></div>`;
        }
        html += `</div>`;
      }

      const att = getAttendanceStats(currentYear, currentMonth);
      if (att.total > 0 || att.rest > 0) {
        html += `<div class="attendance-stats"><h4><span>📅 本月出勤统计（单人）</span><button class="btn-sm btn-export" id="exportAttendanceBtn">📷 导出</button></h4><div class="stat-row"><span>🔵 全天</span><span>${att.full} 天</span></div><div class="stat-row"><span>🟠 半天</span><span>${att.half} 天</span></div><div class="stat-row"><span>🔴 加班</span><span>${att.overtime.toFixed(1)} 天</span></div><div class="stat-row"><span>🟢 休息</span><span>${att.rest} 天</span></div><div class="stat-row" style="font-weight:bold;"><span>📌 合计出勤</span><span>${att.total.toFixed(1)} 天</span></div></div>`;
      }

      const crewStats = getCrewStats(currentYear, currentMonth);
      const crewNames = Object.keys(crewStats);
      const hasCrewData = crewNames.some(n => crewStats[n].total > 0 || crewStats[n].rest > 0);
      if (hasCrewData || crewList.length > 0) {
        html += `<div class="attendance-stats" style="background:#e3f2fd;"><h4>👥 多人出勤统计</h4>`;
        let grandTotalCrew = 0;
        crewNames.forEach(name => {
          const s = crewStats[name];
          if (s.total > 0 || s.rest > 0) {
            grandTotalCrew += s.total;
            html += `<div class="stat-row"><span>${name}</span><span>🔵${s.full}天 🟠${s.half}天 🔴${s.overtime.toFixed(1)}天 合计${s.total.toFixed(1)}天</span></div>`;
          }
        });
        html += `<div class="stat-row" style="font-weight:bold; border-top:1px solid #ccc; padding-top:4px;"><span>👥 总计</span><span>${grandTotalCrew.toFixed(1)} 天</span></div>`;
        const todayStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
        const todayCrewCount = getCrewCountByDate(todayStr);
        html += `<div class="stat-row" style="color:#007aff; font-weight:bold;"><span>📌 今天出勤</span><span>👥 ${todayCrewCount} 人</span></div>`;
        html += `</div>`;
      }
      container.innerHTML = html;
      if (att.total > 0 || att.rest > 0) document.getElementById('exportAttendanceBtn')?.addEventListener('click', exportAttendanceToImage);
    }

    function switchForm(form) {
      currentForm = form;
      document.getElementById('expenseForm').style.display = form === 'expense' ? 'block' : 'none';
      document.getElementById('advanceForm').style.display = form === 'advance' ? 'block' : 'none';
      document.getElementById('switchExpense').classList.toggle('active', form === 'expense');
      document.getElementById('switchAdvance').classList.toggle('active', form === 'advance');
    }

    function openModal(dateStr) {
      selectedDate = dateStr;
      document.getElementById('modalDate').textContent = `📅 ${dateStr}`;
      renderAllRecords();
      updateAdvanceSelect();
      document.getElementById('advanceDate').value = dateStr;
      switchForm('expense');
      document.body.classList.add('modal-open');
      document.getElementById('modal').classList.add('active');
      document.getElementById('modalContent').scrollTop = 0;
    }

    function closeModal() { document.getElementById('modal').classList.remove('active'); document.body.classList.remove('modal-open'); selectedDate = null; }

    function renderAllRecords() {
      const container = document.getElementById('modalRecords');
      const dayRecs = getRecordsByDate(selectedDate);
      const dayAdvances = getAdvancesByDate(selectedDate);
      const allItems = [
        ...dayAdvances.map(adv => ({ type: 'advance', data: adv, timestamp: adv.id })),
        ...dayRecs.map(rec => ({ type: 'expense', data: rec, timestamp: rec.id }))
      ].sort((a, b) => b.timestamp - a.timestamp);
      if (allItems.length === 0) { container.innerHTML = '<p style="color:#888;text-align:center;padding:10px;">当天暂无记录</p>'; return; }
      container.innerHTML = allItems.map(item => {
        if (item.type === 'advance') {
          const adv = item.data;
          const used = adv.amount - adv.balance;
          return `<div class="record-item"><div class="info"><strong>💰 预支 - ${adv.name}</strong><small>总额 ¥${adv.amount.toFixed(2)} | 已用 ¥${used.toFixed(2)} | 余额 ¥${adv.balance.toFixed(2)}</small></div><span class="amount-text advance">+¥${adv.amount.toFixed(2)}</span><button class="delete-btn" data-id="${adv.id}" data-type="advance">×</button></div>`;
        } else {
          const r = item.data;
          const cls = r.amount < 0 ? 'negative' : 'positive';
          const disp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
          return `<div class="record-item"><div class="info"><strong>💸 ${r.category}</strong>${r.note ? `<small>${r.note}</small>` : ''}</div><span class="amount-text ${cls}">${disp}</span><button class="delete-btn" data-id="${r.id}" data-type="expense">×</button></div>`;
        }
      }).join('');
      
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = parseInt(btn.dataset.id);
          const type = btn.dataset.type;
          if (type === 'expense') {
            // 找到要删除的记录
            const record = records.find(r => r.id === id);
            // 如果这条消费使用了预付款，需要将金额加回预付款余额
            if (record && record.advancePerson && record.advancePerson !== '') {
              addBackToPerson(record.advancePerson, Math.abs(record.amount));
            }
            records = records.filter(r => r.id !== id);
            saveRecords();
            updateAdvanceSelect();
          } else if (type === 'advance') {
            advances = advances.filter(a => a.id !== id);
            saveAdvances();
            updateAdvanceSelect();
          }
          renderAllRecords();
          renderCalendar();
          showToast('✅ 已删除');
        });
      });
    }

    function clearAllForms() {
      document.getElementById('category').value = '';
      document.getElementById('amount').value = '';
      document.getElementById('note').value = '';
      document.getElementById('advanceName').value = '';
      document.getElementById('advanceAmount').value = '';
    }

    function openAttendance() {
      if (!selectedDate) return;
      document.getElementById('attendanceDateTitle').textContent = `出勤设置 - ${selectedDate}`;
      const cur = getAttendanceByDate(selectedDate);
      selectedAttType = cur ? cur.type : null;
      if (cur?.type === 'overtime') document.getElementById('overtimeHours').value = cur.value;
      else document.getElementById('overtimeHours').value = '';
      updateAttUI();
      crewMode = 'single';
      document.getElementById('singleMode').style.display = 'block';
      document.getElementById('crewMode').style.display = 'none';
      document.getElementById('switchSingle').classList.add('active');
      document.getElementById('switchCrew').classList.remove('active');
      unlockCrew();
      attendanceModal.classList.add('active');
    }

    function addExpense() {
      if (!selectedDate) return;
      const category = document.getElementById('category').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      const note = document.getElementById('note').value.trim();
      const advancePerson = document.getElementById('advanceSelect').value;
      if (!category) return alert('请输入分类名称');
      if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
      if (advancePerson && advancePerson !== '') {
        const totalBalance = getPersonTotalBalance(advancePerson);
        if (amount > totalBalance) return alert(`余额不足！${advancePerson} 当前总余额 ¥${totalBalance.toFixed(2)}`);
        deductFromPerson(advancePerson, amount);
      }
      saveLastInput(category, note);
      records.push({ id: Date.now(), date: selectedDate, category, amount: -Math.abs(amount), note, advancePerson: advancePerson || null });
      saveRecords();
      document.getElementById('amount').value = '';
      updateAdvanceSelect();
      renderAllRecords();
      renderCalendar();
      showToast('✅ 记账已保存');
    }

    function addAdvance() {
      if (!selectedDate) return;
      const name = document.getElementById('advanceName').value.trim();
      const amount = parseFloat(document.getElementById('advanceAmount').value);
      const date = document.getElementById('advanceDate').value;
      if (!name) return alert('请输入预付款名称');
      if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
      advances.push({ id: Date.now(), name, amount, balance: amount, date: date || selectedDate });
      saveAdvances();
      document.getElementById('advanceName').value = '';
      document.getElementById('advanceAmount').value = '';
      updateAdvanceSelect();
      renderAllRecords();
      renderCalendar();
      showToast('✅ 预支已添加');
    }

    document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
    document.getElementById('addAdvanceBtn').addEventListener('click', addAdvance);
    document.getElementById('clearFormBtn').addEventListener('click', clearAllForms);
    document.getElementById('clearFormBtn2').addEventListener('click', clearAllForms);
    document.getElementById('openAttendanceBtn').addEventListener('click', openAttendance);
    document.getElementById('openAttendanceBtn2').addEventListener('click', openAttendance);
    document.getElementById('switchExpense').addEventListener('click', () => switchForm('expense'));
    document.getElementById('switchAdvance').addEventListener('click', () => switchForm('advance'));
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });
    document.getElementById('modalContent').addEventListener('touchmove', e => e.stopPropagation(), { passive: false });

    const attendanceModal = document.getElementById('attendanceModal');
    let selectedAttType = null;
    let crewLocked = false;

    function updateAttUI() {
      document.querySelectorAll('#attendanceOptions .attendance-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.type === selectedAttType);
        const input = o.querySelector('input');
        if (input) input.style.display = (selectedAttType === 'overtime') ? 'inline-block' : 'none';
      });
    }

    function renderCrewTable() {
      const tbody = document.getElementById('crewTableBody');
      const dayData = crewAttendance[selectedDate] || {};
      if (crewList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">暂无人员，点击下方按钮添加</td></tr>';
        return;
      }
      tbody.innerHTML = crewList.map(name => {
        const currentVal = dayData[name];
        let type = null, overtimeDays = null;
        if (currentVal) {
          if (typeof currentVal === 'object') { type = currentVal.type; overtimeDays = currentVal.days; }
          else { type = currentVal; }
        }
        const fullSelected = type === 'full';
        const halfSelected = type === 'half';
        const overtimeSelected = type === 'overtime';
        const restSelected = type === 'rest';
        const overtimeDisplay = overtimeSelected && overtimeDays ? overtimeDays.toFixed(1) : '';
        return `<tr>
          <td class="check-col"><input type="checkbox" class="crew-check" data-name="${name}"></td>
          <td class="name-col" data-name="${name}">${name}</td>
          <td class="clickable ${fullSelected ? 'selected' : ''}" data-type="full" data-name="${name}">${fullSelected ? '●' : ''}</td>
          <td class="clickable ${halfSelected ? 'selected' : ''}" data-type="half" data-name="${name}">${halfSelected ? '●' : ''}</td>
          <td class="overtime-cell ${overtimeSelected ? 'selected' : ''}" data-type="overtime" data-name="${name}">${overtimeDisplay}</td>
          <td class="clickable ${restSelected ? 'selected' : ''}" data-type="rest" data-name="${name}">${restSelected ? '●' : ''}</td>
         </tr>`;
      }).join('');
      
      tbody.querySelectorAll('.name-col').forEach(cell => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (crewLocked) return;
          const name = cell.dataset.name;
          openPersonMenu(name);
        });
      });
      
      tbody.querySelectorAll('.clickable').forEach(cell => {
        const type = cell.dataset.type;
        if (!type) return;
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (crewLocked) return;
          const name = cell.dataset.name;
          setCrewAttendanceSimple(name, type);
          renderCrewTable();
          resetCrewLock();
        });
      });
      
      tbody.querySelectorAll('.overtime-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (crewLocked) return;
          const name = cell.dataset.name;
          const currentVal = crewAttendance[selectedDate]?.[name];
          let currentDays = 1;
          if (currentVal && currentVal.type === 'overtime') currentDays = currentVal.days || 1;
          const newDays = prompt('请输入加班天数（如 1.5 表示一天半）：', currentDays);
          if (newDays !== null) {
            const days = parseFloat(newDays);
            if (isNaN(days) || days <= 0) { alert('请输入有效的正数天数'); return; }
            setCrewAttendanceOvertime(name, days);
            renderCrewTable();
            resetCrewLock();
          }
        });
      });
    }

    function setCrewAttendanceSimple(name, type) {
      if (!crewAttendance[selectedDate]) crewAttendance[selectedDate] = {};
      if (type === 'none') { 
        delete crewAttendance[selectedDate][name]; 
        if (Object.keys(crewAttendance[selectedDate]).length === 0) delete crewAttendance[selectedDate];
      } else { 
        crewAttendance[selectedDate][name] = { type: type }; 
      }
      saveCrewAttendance();
    }

    function setCrewAttendanceOvertime(name, days) {
      if (!crewAttendance[selectedDate]) crewAttendance[selectedDate] = {};
      crewAttendance[selectedDate][name] = { type: 'overtime', days: days };
      saveCrewAttendance();
    }

    function batchSetCrew(type) {
      if (crewLocked) return;
      const checks = document.querySelectorAll('#crewTable .crew-check:checked');
      if (checks.length === 0) { alert('请先勾选人员'); return; }
      checks.forEach(cb => {
        const name = cb.dataset.name;
        if (type === 'overtime') setCrewAttendanceOvertime(name, 1);
        else setCrewAttendanceSimple(name, type);
      });
      saveCrewAttendance();
      renderCrewTable();
      resetCrewLock();
    }

    function resetCrewLock() {
      if (crewLockTimer) clearTimeout(crewLockTimer);
      document.getElementById('lockStatus').textContent = '⏳ 5秒后自动锁定...';
      crewLocked = false;
      document.getElementById('crewTable').classList.remove('crew-locked');
      crewLockTimer = setTimeout(() => {
        crewLocked = true;
        document.getElementById('crewTable').classList.add('crew-locked');
        document.getElementById('lockStatus').textContent = '🔒 已锁定（点此解锁可编辑）';
      }, 5000);
    }

    function unlockCrew() {
      if (crewLockTimer) clearTimeout(crewLockTimer);
      crewLocked = false;
      document.getElementById('crewTable').classList.remove('crew-locked');
      document.getElementById('lockStatus').textContent = '';
    }

    document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
      if (!selectedDate) return;
      if (!selectedAttType || selectedAttType === 'none') { delete attendanceRecords[selectedDate]; }
      else if (selectedAttType === 'overtime') {
        const val = parseFloat(document.getElementById('overtimeHours').value);
        if (isNaN(val) || val <= 0) return alert('请输入有效加班天数');
        attendanceRecords[selectedDate] = { type: 'overtime', value: val };
      } else { attendanceRecords[selectedDate] = { type: selectedAttType }; }
      saveAttendance();
      attendanceModal.classList.remove('active');
      renderCalendar();
      showToast('✅ 出勤已更新');
    });

    document.getElementById('batchFull').addEventListener('click', () => batchSetCrew('full'));
    document.getElementById('batchHalf').addEventListener('click', () => batchSetCrew('half'));
    document.getElementById('batchOvertime').addEventListener('click', () => batchSetCrew('overtime'));
    document.getElementById('batchRest').addEventListener('click', () => batchSetCrew('rest'));
    document.getElementById('selectAllCrew').addEventListener('change', (e) => { document.querySelectorAll('#crewTable .crew-check').forEach(cb => cb.checked = e.target.checked); });
    document.getElementById('addCrewMemberBtn').addEventListener('click', () => {
      const name = prompt('请输入人员姓名：');
      if (name && name.trim()) { 
        if (crewList.includes(name.trim())) { alert('该人员已存在！'); return; }
        crewList.push(name.trim()); 
        saveCrewList(); 
        if (document.getElementById('crewMode').style.display !== 'none') renderCrewTable(); 
        renderSummary();
        showToast('✅ 已添加 ' + name); 
      }
    });
    document.getElementById('closeAttendanceModal').addEventListener('click', () => attendanceModal.classList.remove('active'));
    attendanceModal.addEventListener('click', e => { if (e.target === attendanceModal) attendanceModal.classList.remove('active'); });
    document.getElementById('lockStatus').addEventListener('click', () => { if (crewLocked) unlockCrew(); });
    document.getElementById('attendanceOptions').addEventListener('click', e => {
      const opt = e.target.closest('.attendance-option');
      if (!opt) return;
      selectedAttType = opt.dataset.type;
      updateAttUI();
    });
    document.getElementById('switchSingle').addEventListener('click', () => {
      crewMode = 'single';
      document.getElementById('singleMode').style.display = 'block';
      document.getElementById('crewMode').style.display = 'none';
      document.getElementById('switchSingle').classList.add('active');
      document.getElementById('switchCrew').classList.remove('active');
    });
    document.getElementById('switchCrew').addEventListener('click', () => {
      crewMode = 'crew';
      document.getElementById('singleMode').style.display = 'none';
      document.getElementById('crewMode').style.display = 'block';
      document.getElementById('switchSingle').classList.remove('active');
      document.getElementById('switchCrew').classList.add('active');
      renderCrewTable();
      unlockCrew();
    });

    document.getElementById('personMenuEdit').addEventListener('click', () => {
      if (currentSelectedPerson) editCrewMember(currentSelectedPerson);
      closePersonMenu();
    });
    document.getElementById('personMenuDelete').addEventListener('click', () => {
      if (currentSelectedPerson) deleteCrewMember(currentSelectedPerson);
      closePersonMenu();
    });
    document.getElementById('personMenuCancel').addEventListener('click', closePersonMenu);
    document.getElementById('personMenuModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('personMenuModal')) closePersonMenu();
    });

    function getAvailableMonths() {
      const months = new Set();
      records.forEach(r => { const p = r.date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
      Object.keys(attendanceRecords).forEach(date => { const p = date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
      Object.keys(crewAttendance).forEach(date => { const p = date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
      advances.forEach(adv => { if (adv.date) { const p = adv.date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); } });
      if (months.size === 0) { const y = new Date().getFullYear(); for (let m = 1; m <= 12; m++) months.add(`${y}-${String(m).padStart(2,'0')}`); }
      return Array.from(months).sort();
    }

    function exportSelectedMonths(selectedMonths) {
      if (!selectedMonths.length) return alert('请选择月份');
      const fRecords = records.filter(r => selectedMonths.includes(`${r.date.split('-')[0]}-${r.date.split('-')[1]}`));
      const fAttendance = {};
      Object.entries(attendanceRecords).forEach(([date, att]) => { if (selectedMonths.includes(`${date.split('-')[0]}-${date.split('-')[1]}`)) fAttendance[date] = att; });
      const fCrewAttendance = {};
      Object.entries(crewAttendance).forEach(([date, dayData]) => { if (selectedMonths.includes(`${date.split('-')[0]}-${date.split('-')[1]}`)) fCrewAttendance[date] = dayData; });
      const fAdvances = advances.filter(adv => adv.date && selectedMonths.includes(`${adv.date.split('-')[0]}-${adv.date.split('-')[1]}`));
      const data = { version: 3, exportTime: new Date().toISOString(), records: fRecords, attendance: fAttendance, crewAttendance: fCrewAttendance, crewList, advances: fAdvances };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.download = `记账备份_${selectedMonths.join('_')}.json`; a.href = URL.createObjectURL(blob);
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); }, 200);
      showToast(`✅ 已导出 ${fRecords.length} 条消费，${fAdvances.length} 条预支`);
    }

    function importData(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (confirm('确定替换现有数据？取消则合并')) {
            records = data.records || [];
            attendanceRecords = data.attendance || {};
            crewAttendance = data.crewAttendance || {};
            crewList = data.crewList || [];
            advances = data.advances || [];
          } else {
            const ids = new Set(records.map(r => r.id));
            records = [...records, ...(data.records||[]).filter(r => !ids.has(r.id))];
            if (data.attendance) Object.assign(attendanceRecords, data.attendance);
            if (data.crewAttendance) Object.assign(crewAttendance, data.crewAttendance);
            if (data.crewList) { const cSet = new Set(crewList); crewList = [...crewList, ...data.crewList.filter(n => !cSet.has(n))]; }
            if (data.advances) { const aIds = new Set(advances.map(a => a.id)); advances = [...advances, ...data.advances.filter(a => !aIds.has(a.id))]; }
          }
          saveRecords(); saveAttendance(); saveCrewAttendance(); saveCrewList(); saveAdvances();
          renderCalendar(); updateAdvanceSelect();
          showToast('✅ 导入成功');
        } catch (err) { alert('导入失败'); }
      };
      reader.readAsText(file);
    }

    async function exportCategoryToImage(cat) {
      const data = getDetailedSummary(currentYear, currentMonth)[cat];
      if (!data) return alert('无记录');
      document.getElementById('loadingOverlay').classList.add('active');
      const ms = `${currentYear}年${currentMonth}月`;
      let inner = `<div class="export-area"><div class="export-title">📌 ${cat}</div><div class="export-subtitle">${ms} 消费明细</div><div class="export-category">`;
      data.records.forEach(r => { inner += `<div class="export-detail-item"><span><span class="detail-date">${r.day}号</span>${r.note?`<span class="detail-note"> - ${r.note}</span>`:''}</span><span class="detail-amount ${r.amount<0?'negative':'positive'}">${r.amount<0?'-¥'+Math.abs(r.amount).toFixed(2):'¥'+r.amount.toFixed(2)}</span></div>`; });
      inner += `<div class="export-category-total"><span>小计</span><span class="detail-amount ${data.total<0?'negative':'positive'}">${data.total<0?'-¥'+Math.abs(data.total).toFixed(2):'¥'+data.total.toFixed(2)}</span></div></div><div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div></div>`;
      document.getElementById('exportTemplate').innerHTML = inner;
      try {
        const canvas = await html2canvas(document.querySelector('.export-area'), { backgroundColor: '#fff', scale: 2 });
        const a = document.createElement('a'); a.download = `${cat}_${ms}.png`; a.href = canvas.toDataURL('image/png'); a.click();
      } catch (e) { alert('导出失败'); }
      document.getElementById('loadingOverlay').classList.remove('active');
    }

    async function exportAttendanceToImage() {
      const att = getAttendanceStats(currentYear, currentMonth);
      const ms = `${currentYear}年${currentMonth}月`;
      const div = document.createElement('div');
      div.style.cssText = 'padding:20px;background:white;font-family:system-ui;width:400px;';
      div.innerHTML = `<h3 style="text-align:center;margin-bottom:10px;">📅 ${ms} 出勤统计</h3><div style="background:#e8f5e9;padding:15px;border-radius:10px;"><div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🔵 全天</span><span>${att.full} 天</span></div><div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🟠 半天</span><span>${att.half} 天</span></div><div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🔴 加班</span><span>${att.overtime.toFixed(1)} 天</span></div><div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🟢 休息</span><span>${att.rest} 天</span></div><div style="border-top:2px solid #333;margin-top:8px;padding-top:5px;font-weight:bold;display:flex;justify-content:space-between;"><span>📌 合计出勤</span><span>${att.total.toFixed(1)} 天</span></div></div><div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div>`;
      document.body.appendChild(div);
      try {
        const canvas = await html2canvas(div, { backgroundColor: '#fff', scale: 2 });
        const a = document.createElement('a'); a.download = `出勤统计_${ms}.png`; a.href = canvas.toDataURL('image/png'); a.click();
      } catch (e) { alert('导出失败'); }
      document.body.removeChild(div);
    }

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      document.getElementById('monthList').innerHTML = getAvailableMonths().map(m => { const [y, mo] = m.split('-'); return `<div class="month-item"><input type="checkbox" id="chk_${m}" value="${m}" checked><label for="chk_${m}">${y}年${mo}月</label></div>`; }).join('');
      document.getElementById('monthSelectModal').classList.add('active');
    });
    document.getElementById('closeMonthSelect').addEventListener('click', () => document.getElementById('monthSelectModal').classList.remove('active'));
    document.getElementById('selectAllMonths').addEventListener('click', () => document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = true));
    document.getElementById('deselectAllMonths').addEventListener('click', () => document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = false));
    document.getElementById('confirmExportBtn').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('#monthList input[type="checkbox"]:checked')).map(cb => cb.value);
      document.getElementById('monthSelectModal').classList.remove('active');
      exportSelectedMonths(checked);
    });

    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', e => { if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; } });

    let confirmCb = null;
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      document.getElementById('confirmMessage').textContent = '确定清空所有数据？';
      confirmCb = () => { records = []; attendanceRecords = {}; crewAttendance = {}; advances = []; saveRecords(); saveAttendance(); saveCrewAttendance(); saveAdvances(); renderCalendar(); showToast('🗑️ 已清空'); };
      document.getElementById('confirmDialog').classList.add('active');
    });
    document.getElementById('confirmCancel').addEventListener('click', () => document.getElementById('confirmDialog').classList.remove('active'));
    document.getElementById('confirmOk').addEventListener('click', () => { document.getElementById('confirmDialog').classList.remove('active'); if (confirmCb) confirmCb(); });

    document.getElementById('prevMonth').addEventListener('click', () => { if (currentMonth===1) { currentMonth=12; currentYear--; } else currentMonth--; renderCalendar(); });
    document.getElementById('nextMonth').addEventListener('click', () => { if (currentMonth===12) { currentMonth=1; currentYear++; } else currentMonth++; renderCalendar(); });

    window.startEdit = i => { document.getElementById(`catName_${i}`).style.display='none'; document.getElementById(`editRow_${i}`).style.display='flex'; document.getElementById(`editInput_${i}`).focus(); };
    window.cancelEdit = i => { document.getElementById(`catName_${i}`).style.display='inline'; document.getElementById(`editRow_${i}`).style.display='none'; };
    window.confirmRename = (old, i) => renameCategory(old, document.getElementById(`editInput_${i}`).value);
    window.exportCategoryToImage = exportCategoryToImage;

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadRecords();
    loadAttendance();
    loadCrewList();
    loadCrewAttendance();
    loadAdvances();
    loadLastInput();
    renderCalendar();
    updateAdvanceSelect();
  