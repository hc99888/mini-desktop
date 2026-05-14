
  


    const STORAGE_KEY = 'ledger_records';
    const ATTENDANCE_KEY = 'attendance_records';
    const LAST_INPUT_KEY = 'ledger_last_input';

    let currentYear, currentMonth;
    let records = [];
    let attendanceRecords = {}; // { 'YYYY-MM-DD': { type: 'full'|'half'|'overtime', value: number } }
    let selectedDate = null;
    let lastInput = { category: '', note: '' };

    // ============ Toast ============
    function showToast(msg, duration = 2000) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }

    // ============ 数据管理 ============
    function loadRecords() {
      const raw = localStorage.getItem(STORAGE_KEY);
      records = raw ? JSON.parse(raw) : [];
    }

    function saveRecords() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function loadAttendance() {
      const raw = localStorage.getItem(ATTENDANCE_KEY);
      attendanceRecords = raw ? JSON.parse(raw) : {};
    }

    function saveAttendance() {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords));
    }

    function exportData() {
      const data = {
        version: 1,
        exportTime: new Date().toISOString(),
        totalRecords: records.length,
        records: records,
        attendance: attendanceRecords
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `记账数据备份_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✅ 已导出 ${records.length} 条记录`);
    }

    function importData(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.records || !Array.isArray(data.records)) throw new Error('数据格式不正确');
          const validRecords = data.records.filter(r => r.id && r.date && r.category && typeof r.amount === 'number');
          if (validRecords.length === 0) throw new Error('没有有效的记录');
          const mode = confirm('点击"确定"将替换现有数据\n点击"取消"将合并数据（追加）');
          if (mode) {
            records = validRecords;
            attendanceRecords = data.attendance || {};
          } else {
            const existingIds = new Set(records.map(r => r.id));
            const newRecords = validRecords.filter(r => !existingIds.has(r.id));
            records = [...records, ...newRecords];
            if (data.attendance) {
              attendanceRecords = { ...attendanceRecords, ...data.attendance };
            }
          }
          saveRecords();
          saveAttendance();
          renderCalendar();
          showToast(`✅ 成功导入 ${mode ? validRecords.length : records.length} 条记录`);
        } catch (error) {
          alert('导入失败：' + error.message);
        }
      };
      reader.readAsText(file);
    }

    function clearAllData() {
      records = [];
      attendanceRecords = {};
      saveRecords();
      saveAttendance();
      renderCalendar();
      showToast('🗑️ 数据已清空');
    }

    // ============ 上次输入记忆 ============
    function loadLastInput() {
      const raw = localStorage.getItem(LAST_INPUT_KEY);
      lastInput = raw ? JSON.parse(raw) : { category: '', note: '' };
    }

    function saveLastInput(category, note) {
      lastInput = { category, note };
      localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(lastInput));
    }

    function fillLastInput() {
      const categoryInput = document.getElementById('category');
      const noteInput = document.getElementById('note');
      document.getElementById('categoryHint').textContent = lastInput.category ? '已填入上次记录' : '';
      document.getElementById('noteHint').textContent = lastInput.note ? '已填入上次记录' : '';
      categoryInput.value = lastInput.category || '';
      noteInput.value = lastInput.note || '';
      document.getElementById('amount').value = '';
    }

    function clearForm() {
      document.getElementById('category').value = '';
      document.getElementById('amount').value = '';
      document.getElementById('note').value = '';
      document.getElementById('categoryHint').textContent = '';
      document.getElementById('noteHint').textContent = '';
      document.getElementById('amount').focus();
    }

    // ============ 数据查询 ============
    function getRecordsByDate(dateStr) { return records.filter(r => r.date === dateStr); }
    function getRecordsByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      return records.filter(r => r.date.startsWith(prefix));
    }
    function getDayTotal(dateStr) { return getRecordsByDate(dateStr).reduce((sum, r) => sum + r.amount, 0); }

    function getAttendanceByDate(dateStr) { return attendanceRecords[dateStr] || null; }
    function getAttendanceDaysInMonth(year, month) {
      let full = 0, half = 0, overtime = 0;
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      for (const [date, att] of Object.entries(attendanceRecords)) {
        if (date.startsWith(prefix)) {
          if (att.type === 'full') full += 1;
          else if (att.type === 'half') half += 0.5;
          else if (att.type === 'overtime') overtime += (att.value || 0);
        }
      }
      return { full, half, overtime, total: full + half + overtime };
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
      for (const cat in summary) summary[cat].records.sort((a, b) => a.day - b.day);
      return summary;
    }

    function renameCategory(oldName, newName) {
      newName = newName.trim();
      if (!newName) { alert('分类名称不能为空'); return false; }
      if (oldName === newName) return true;
      const monthRecords = getRecordsByMonth(currentYear, currentMonth);
      if (new Set(monthRecords.map(r => r.category)).has(newName)) {
        alert(`分类"${newName}"已存在`); return false;
      }
      records.forEach(r => { if (r.category === oldName) r.category = newName; });
      saveRecords();
      renderCalendar();
      return true;
    }

    // ============ 渲染 ============
    function renderCalendar() {
      document.getElementById('monthTitle').textContent = `${currentYear}年 ${currentMonth}月`;
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const startDayOfWeek = firstDay.getDay();
      const prevMonthDays = startDayOfWeek;
      const totalCells = 42;
      const calendarDiv = document.getElementById('calendar');
      calendarDiv.innerHTML = '';

      ['日','一','二','三','四','五','六'].forEach(d => {
        const label = document.createElement('div');
        label.className = 'day-label';
        label.textContent = d;
        calendarDiv.appendChild(label);
      });

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

      for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        const dayOffset = i - prevMonthDays + 1;
        const cellDate = new Date(currentYear, currentMonth - 1, dayOffset);
        const cellMonth = cellDate.getMonth() + 1;
        const cellYear = cellDate.getFullYear();
        const cellDateStr = `${cellYear}-${String(cellMonth).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;

        if (cellMonth !== currentMonth) {
          cell.className = 'day-cell empty';
        } else {
          cell.className = 'day-cell';
          const cellContent = document.createElement('div');
          cellContent.className = 'cell-content';
          const dateSpan = document.createElement('span');
          dateSpan.textContent = cellDate.getDate();
          cellContent.appendChild(dateSpan);

          if (cellDateStr === todayStr) cell.classList.add('today');

          // 金额显示
          const total = getDayTotal(cellDateStr);
          if (total !== 0) {
            cell.classList.add('has-record');
            const amtSpan = document.createElement('span');
            amtSpan.className = 'amount';
            if (total < 0) amtSpan.classList.add('negative');
            amtSpan.textContent = total < 0 ? `-¥${Math.abs(total).toFixed(1)}` : `¥${total.toFixed(1)}`;
            cellContent.appendChild(amtSpan);
          }

          // 出勤圆点
          const att = getAttendanceByDate(cellDateStr);
          if (att) {
            const dot = document.createElement('span');
            dot.className = 'attendance-dot';
            if (att.type === 'full') dot.style.backgroundColor = '#007aff';
            else if (att.type === 'half') dot.style.backgroundColor = '#fd7e14';
            else if (att.type === 'overtime') dot.style.backgroundColor = '#dc3545';
            cellContent.insertBefore(dot, cellContent.firstChild); // 放在日期前面
          }

          cell.appendChild(cellContent);
          cell.addEventListener('click', () => openModal(cellDateStr));
        }
        calendarDiv.appendChild(cell);
      }

      renderSummary();
    }

    function renderSummary() {
      const summaryDiv = document.getElementById('summaryContent');
      const summary = getDetailedSummary(currentYear, currentMonth);
      const categories = Object.keys(summary);
      let html = '';

      if (categories.length === 0) {
        html += '<p style="color:#888;">这个月还没有消费记录</p>';
      } else {
        categories.sort((a, b) => summary[b].total - summary[a].total);
        let grandTotal = 0;
        categories.forEach((cat, index) => {
          const data = summary[cat];
          grandTotal += data.total;
          const daysList = [...new Set(data.records.map(r => r.day))].sort((a,b)=>a-b);
          const daysHtml = daysList.map(d => `<span>${d}号</span>`).join('');
          const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
          html += `
            <div class="summary-category">
              <div class="summary-category-header">
                <div class="summary-category-name-row">
                  <span class="summary-category-name" id="catName_${index}">${cat}</span>
                  <span class="edit-category-row" id="editRow_${index}" style="display:none;">
                    <input type="text" id="editInput_${index}" value="${cat}">
                    <button class="btn-sm btn-edit-confirm" onclick="confirmRename('${cat}',${index})">✓</button>
                    <button class="btn-sm btn-edit-cancel" onclick="cancelEdit(${index})">✕</button>
                  </span>
                </div>
                <span class="summary-category-amount ${data.total<0?'negative':''}">${totalDisplay}</span>
              </div>
              <div class="summary-category-days">${daysHtml}</div>
              <div style="margin-top:6px;">
                <button class="btn-sm btn-edit" onclick="startEdit(${index})">✏️ 改名</button>
                <button class="btn-sm btn-export" onclick="event.stopPropagation(); exportCategoryToImage('${cat}')">📷 导出</button>
              </div>
            </div>`;
        });
        const grandDisplay = grandTotal < 0 ? `-¥${Math.abs(grandTotal).toFixed(2)}` : `¥${grandTotal.toFixed(2)}`;
        html += `<div class="summary-total"><span>合计</span><span>${grandDisplay}</span></div>`;
      }

      // 出勤统计
      const attStats = getAttendanceDaysInMonth(currentYear, currentMonth);
      if (attStats.total > 0 || Object.keys(attendanceRecords).some(d => d.startsWith(`${currentYear}-${String(currentMonth).padStart(2,'0')}`))) {
        html += `
          <div class="attendance-stats">
            <h4>📅 本月出勤统计</h4>
            <div class="stat-row"><span>☀️ 全天</span><span>${attStats.full} 天</span></div>
            <div class="stat-row"><span>🌤️ 半天</span><span>${attStats.half} 天</span></div>
            <div class="stat-row"><span>🌙 加班</span><span>${attStats.overtime.toFixed(1)} 天</span></div>
            <div class="stat-row" style="font-weight:bold;"><span>📌 合计出勤</span><span>${attStats.total.toFixed(1)} 天</span></div>
          </div>`;
      }

      summaryDiv.innerHTML = html;
    }

    window.startEdit = function(index) {
      document.getElementById(`catName_${index}`).style.display = 'none';
      document.getElementById(`editRow_${index}`).style.display = 'flex';
      document.getElementById(`editInput_${index}`).focus();
      document.getElementById(`editInput_${index}`).select();
    };
    window.cancelEdit = function(index) {
      document.getElementById(`catName_${index}`).style.display = 'inline';
      document.getElementById(`editRow_${index}`).style.display = 'none';
    };
    window.confirmRename = function(oldName, index) {
      renameCategory(oldName, document.getElementById(`editInput_${index}`).value);
    };

    window.exportCategoryToImage = async function(categoryName) {
      const summary = getDetailedSummary(currentYear, currentMonth);
      const data = summary[categoryName];
      if (!data || data.records.length === 0) { alert('该分类没有记录'); return; }
      document.getElementById('loadingOverlay').classList.add('active');
      const monthStr = `${currentYear}年${currentMonth}月`;
      let html = `<div class="export-area"><div class="export-title">📌 ${categoryName}</div><div class="export-subtitle">${monthStr} 消费明细</div><div class="export-category">`;
      data.records.forEach(r => {
        const amtClass = r.amount < 0 ? 'negative' : 'positive';
        const amtDisp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        html += `<div class="export-detail-item"><span><span class="detail-date">${r.day}号</span>${r.note?`<span class="detail-note"> - ${r.note}</span>`:''}</span><span class="detail-amount ${amtClass}">${amtDisp}</span></div>`;
      });
      const totalClass = data.total < 0 ? 'negative' : 'positive';
      const totalDisp = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
      html += `<div class="export-category-total"><span>小计</span><span class="detail-amount ${totalClass}">${totalDisp}</span></div></div><div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div></div>`;
      document.getElementById('exportTemplate').innerHTML = html;
      try {
        const canvas = await html2canvas(document.querySelector('.export-area'), { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = `${categoryName}_${monthStr}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (e) { alert('导出失败'); }
      document.getElementById('loadingOverlay').classList.remove('active');
    };

    // ============ 弹窗控制 ============
    function openModal(dateStr) {
      selectedDate = dateStr;
      document.getElementById('modalDate').textContent = `📅 ${dateStr}`;
      renderModalRecords();
      fillLastInput();
      document.body.classList.add('modal-open');
      document.getElementById('modal').classList.add('active');
      document.getElementById('modalContent').scrollTop = 0;
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.body.classList.remove('modal-open');
      selectedDate = null;
    }

    function renderModalRecords() {
      const container = document.getElementById('modalRecords');
      const dayRecords = getRecordsByDate(selectedDate);
      if (dayRecords.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center;padding:10px;">当天暂无记录</p>';
        return;
      }
      let html = '';
      dayRecords.forEach(r => {
        const amtClass = r.amount < 0 ? 'negative' : 'positive';
        const amtDisp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        html += `<div class="record-item"><div class="info"><strong>${r.category}</strong>${r.note?`<small>${r.note}</small>`:''}</div><span class="amount-text ${amtClass}">${amtDisp}</span><button class="delete-btn" data-id="${r.id}">×</button></div>`;
      });
      container.innerHTML = html;
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          records = records.filter(r => r.id != id);
          saveRecords();
          renderModalRecords();
          renderCalendar();
        });
      });
    }

    // ============ 出勤弹窗 ============
    const attendanceModal = document.getElementById('attendanceModal');
    let selectedAttendanceType = null;

    document.getElementById('openAttendanceBtn').addEventListener('click', () => {
      // 根据当前日期加载已有出勤
      const currentAtt = getAttendanceByDate(selectedDate);
      if (currentAtt) {
        selectedAttendanceType = currentAtt.type;
        if (currentAtt.type === 'overtime') {
          document.getElementById('overtimeHours').value = currentAtt.value;
        }
      } else {
        selectedAttendanceType = null;
        document.getElementById('overtimeHours').value = '';
      }
      document.getElementById('attendanceDateTitle').textContent = `出勤设置 - ${selectedDate}`;
      updateAttendanceOptionUI();
      attendanceModal.classList.add('active');
    });

    function updateAttendanceOptionUI() {
      document.querySelectorAll('#attendanceOptions .attendance-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.type === selectedAttendanceType) opt.classList.add('selected');
        if (opt.dataset.type === 'overtime') {
          const input = opt.querySelector('input');
          if (selectedAttendanceType === 'overtime') {
            input.style.display = 'inline-block';
          } else {
            input.style.display = 'none';
          }
        }
      });
    }

    document.getElementById('attendanceOptions').addEventListener('click', (e) => {
      const option = e.target.closest('.attendance-option');
      if (!option) return;
      const type = option.dataset.type;
      if (type === 'overtime') {
        // 点击加班选项，显示输入框并选中
        selectedAttendanceType = 'overtime';
        document.getElementById('overtimeHours').style.display = 'inline-block';
        document.getElementById('overtimeHours').focus();
      } else {
        selectedAttendanceType = type;
      }
      updateAttendanceOptionUI();
    });

    document.getElementById('overtimeHours').addEventListener('input', (e) => {
      if (selectedAttendanceType !== 'overtime') {
        selectedAttendanceType = 'overtime';
        updateAttendanceOptionUI();
      }
    });

    document.getElementById('closeAttendanceModal').addEventListener('click', () => {
      attendanceModal.classList.remove('active');
    });

    document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
      if (!selectedDate) return;
      if (selectedAttendanceType === 'none' || !selectedAttendanceType) {
        delete attendanceRecords[selectedDate];
      } else if (selectedAttendanceType === 'overtime') {
        const val = parseFloat(document.getElementById('overtimeHours').value);
        if (isNaN(val) || val <= 0) {
          alert('请输入有效的加班天数');
          return;
        }
        attendanceRecords[selectedDate] = { type: 'overtime', value: val };
      } else {
        attendanceRecords[selectedDate] = { type: selectedAttendanceType };
      }
      saveAttendance();
      attendanceModal.classList.remove('active');
      renderCalendar();
      showToast('✅ 出勤已更新');
    });

    // 点击遮罩关闭出勤弹窗
    attendanceModal.addEventListener('click', (e) => {
      if (e.target === attendanceModal) attendanceModal.classList.remove('active');
    });

    // ============ 记账添加 ============
    document.getElementById('addRecord').addEventListener('click', () => {
      if (!selectedDate) return;
      const category = document.getElementById('category').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      const note = document.getElementById('note').value.trim();
      if (!category) { alert('请输入分类名称'); return; }
      if (isNaN(amount) || amount === 0) { alert('请输入有效金额'); return; }
      saveLastInput(category, note);
      records.push({ id: Date.now(), date: selectedDate, category, amount, note });
      saveRecords();
      document.getElementById('amount').value = '';
      document.getElementById('amount').focus();
      renderModalRecords();
      renderCalendar();
    });

    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal')) closeModal();
    });
    document.getElementById('modalContent').addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });

    // 工具栏
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', (e) => {
      if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
    });
    let confirmCallback = null;
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      document.getElementById('confirmMessage').textContent = '确定清空所有数据吗？建议先导出备份。';
      confirmCallback = clearAllData;
      document.getElementById('confirmDialog').classList.add('active');
    });
    document.getElementById('confirmCancel').addEventListener('click', () => {
      document.getElementById('confirmDialog').classList.remove('active');
      confirmCallback = null;
    });
    document.getElementById('confirmOk').addEventListener('click', () => {
      document.getElementById('confirmDialog').classList.remove('active');
      if (confirmCallback) confirmCallback();
    });

    // 月份切换
    document.getElementById('prevMonth').addEventListener('click', () => {
      if (currentMonth === 1) { currentMonth = 12; currentYear--; }
      else { currentMonth--; }
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      if (currentMonth === 12) { currentMonth = 1; currentYear++; }
      else { currentMonth++; }
      renderCalendar();
    });

    // 输入框滚动
    document.querySelectorAll('#modalContent input').forEach(input => {
      input.addEventListener('focus', () => setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300));
    });

    // 启动
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadRecords();
    loadAttendance();
    loadLastInput();
    renderCalendar();
  