


    const STORAGE_KEY = 'ledger_records';
    const ATTENDANCE_KEY = 'attendance_records';
    const LAST_INPUT_KEY = 'ledger_last_input';

    let currentYear, currentMonth;
    let records = [];
    let attendanceRecords = {};
    let selectedDate = null;
    let lastInput = { category: '', note: '' };

    function showToast(msg, duration = 2000) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }

    function loadRecords() {
      const raw = localStorage.getItem(STORAGE_KEY);
      records = raw ? JSON.parse(raw) : [];
    }
    function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }

    function loadAttendance() {
      const raw = localStorage.getItem(ATTENDANCE_KEY);
      attendanceRecords = raw ? JSON.parse(raw) : {};
    }
    function saveAttendance() { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords)); }

    function loadLastInput() {
      const raw = localStorage.getItem(LAST_INPUT_KEY);
      lastInput = raw ? JSON.parse(raw) : { category: '', note: '' };
    }
    function saveLastInput(category, note) {
      lastInput = { category, note };
      localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(lastInput));
    }

    function getAvailableMonths() {
      const months = new Set();
      records.forEach(r => {
        const parts = r.date.split('-');
        if (parts.length >= 2) months.add(`${parts[0]}-${parts[1]}`);
      });
      Object.keys(attendanceRecords).forEach(date => {
        const parts = date.split('-');
        if (parts.length >= 2) months.add(`${parts[0]}-${parts[1]}`);
      });
      if (months.size === 0) {
        const y = new Date().getFullYear();
        for (let m = 1; m <= 12; m++) {
          months.add(`${y}-${String(m).padStart(2,'0')}`);
        }
      }
      return Array.from(months).sort();
    }

    function exportSelectedMonths(selectedMonths) {
      if (selectedMonths.length === 0) {
        alert('请至少选择一个月份');
        return;
      }
      const filteredRecords = records.filter(r => {
        const parts = r.date.split('-');
        const key = `${parts[0]}-${parts[1]}`;
        return selectedMonths.includes(key);
      });
      const filteredAttendance = {};
      Object.entries(attendanceRecords).forEach(([date, att]) => {
        const parts = date.split('-');
        const key = `${parts[0]}-${parts[1]}`;
        if (selectedMonths.includes(key)) {
          filteredAttendance[date] = att;
        }
      });
      const data = {
        version: 1,
        exportTime: new Date().toISOString(),
        totalRecords: filteredRecords.length,
        records: filteredRecords,
        attendance: filteredAttendance
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const monthStr = selectedMonths.map(m => m.replace('-', '年') + '月').join('_');
      link.download = `记账数据备份_${monthStr}.json`;
      link.href = url;
      document.body.appendChild(link);
      // 关键修复：延迟移除，确保下载触发
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
      showToast(`✅ 已导出 ${filteredRecords.length} 条记录`);
    }

    function importData(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.records || !Array.isArray(data.records)) throw new Error('格式错误');
          const valid = data.records.filter(r => r.id && r.date && r.category && typeof r.amount === 'number');
          if (valid.length === 0) throw new Error('无有效记录');
          const mode = confirm('确定：替换现有数据\n取消：合并（追加）');
          if (mode) {
            records = valid;
            attendanceRecords = data.attendance || {};
          } else {
            const ids = new Set(records.map(r => r.id));
            records = [...records, ...valid.filter(r => !ids.has(r.id))];
            if (data.attendance) attendanceRecords = { ...attendanceRecords, ...data.attendance };
          }
          saveRecords();
          saveAttendance();
          renderCalendar();
          showToast('✅ 导入成功');
        } catch (err) { alert('导入失败：' + err.message); }
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

    function getRecordsByDate(dateStr) { return records.filter(r => r.date === dateStr); }
    function getRecordsByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      return records.filter(r => r.date.startsWith(prefix));
    }
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
        summary[r.category].records.push({
          day: parseInt(r.date.split('-')[2]),
          amount: r.amount,
          note: r.note,
          date: r.date
        });
      });
      Object.values(summary).forEach(cat => cat.records.sort((a, b) => a.day - b.day));
      return summary;
    }

    function renameCategory(oldName, newName) {
      newName = newName.trim();
      if (!newName) return alert('分类名不能为空');
      if (oldName === newName) return;
      if (getRecordsByMonth(currentYear, currentMonth).some(r => r.category === newName)) {
        return alert(`"${newName}" 已存在`);
      }
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
        const label = document.createElement('div');
        label.className = 'day-label';
        label.textContent = d;
        cal.appendChild(label);
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
        if (cellMonth !== currentMonth) {
          cell.className = 'day-cell empty';
        } else {
          cell.className = 'day-cell';
          const content = document.createElement('div');
          content.className = 'cell-content';
          const dateSpan = document.createElement('span');
          dateSpan.textContent = cellDate.getDate();
          content.appendChild(dateSpan);

          if (dateStr === todayStr) cell.classList.add('today');

          const total = getDayTotal(dateStr);
          if (total !== 0) {
            cell.classList.add('has-record');
            const amtSpan = document.createElement('span');
            amtSpan.className = 'amount';
            if (total < 0) amtSpan.classList.add('negative');
            amtSpan.textContent = total < 0 ? `-¥${Math.abs(total).toFixed(1)}` : `¥${total.toFixed(1)}`;
            content.appendChild(amtSpan);
          }

          const att = getAttendanceByDate(dateStr);
          if (att) {
            const dot = document.createElement('span');
            dot.className = 'attendance-dot';
            dot.style.backgroundColor = {
              full: '#007aff', half: '#fd7e14', overtime: '#dc3545', rest: '#28a745'
            }[att.type] || '#28a745';
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

      if (cats.length === 0) {
        html += '<p style="color:#888;">这个月还没有消费记录</p>';
      } else {
        cats.sort((a,b) => summary[b].total - summary[a].total);
        let grandTotal = 0;
        cats.forEach((cat, i) => {
          const data = summary[cat];
          grandTotal += data.total;
          const days = [...new Set(data.records.map(r => r.day))].sort((a,b)=>a-b);
          const daysHtml = days.map(d => `<span>${d}号</span>`).join('');
          const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
          html += `
            <div class="summary-category">
              <div class="summary-category-header">
                <div class="summary-category-name-row">
                  <span class="summary-category-name" id="catName_${i}">${cat}</span>
                  <span class="edit-category-row" id="editRow_${i}" style="display:none;">
                    <input type="text" id="editInput_${i}" value="${cat}">
                    <button class="btn-sm btn-edit-confirm" onclick="confirmRename('${cat}',${i})">✓</button>
                    <button class="btn-sm btn-edit-cancel" onclick="cancelEdit(${i})">✕</button>
                  </span>
                </div>
                <span class="summary-category-amount ${data.total<0?'negative':''}">${totalDisplay}</span>
              </div>
              <div class="summary-category-days">${daysHtml}</div>
              <div style="margin-top:6px;">
                <button class="btn-sm btn-edit" onclick="startEdit(${i})">✏️ 改名</button>
                <button class="btn-sm btn-export" onclick="event.stopPropagation(); exportCategoryToImage('${cat}')">📷 导出</button>
              </div>
            </div>`;
        });
        html += `<div class="summary-total"><span>合计</span><span>${grandTotal<0?'-¥'+Math.abs(grandTotal).toFixed(2):'¥'+grandTotal.toFixed(2)}</span></div>`;
      }

      const att = getAttendanceStats(currentYear, currentMonth);
      if (att.total > 0 || att.rest > 0) {
        html += `
          <div class="attendance-stats">
            <h4><span>📅 本月出勤统计</span><button class="btn-sm btn-export" id="exportAttendanceBtn">📷 导出</button></h4>
            <div class="stat-row"><span>🔵 全天</span><span>${att.full} 天</span></div>
            <div class="stat-row"><span>🟠 半天</span><span>${att.half} 天</span></div>
            <div class="stat-row"><span>🔴 加班</span><span>${att.overtime.toFixed(1)} 天</span></div>
            <div class="stat-row"><span>🟢 休息</span><span>${att.rest} 天</span></div>
            <div class="stat-row" style="font-weight:bold;"><span>📌 合计出勤</span><span>${att.total.toFixed(1)} 天</span></div>
          </div>`;
      }

      container.innerHTML = html;

      if (att.total > 0 || att.rest > 0) {
        document.getElementById('exportAttendanceBtn').addEventListener('click', exportAttendanceToImage);
      }
    }

    async function exportAttendanceToImage() {
      const att = getAttendanceStats(currentYear, currentMonth);
      const monthStr = `${currentYear}年${currentMonth}月`;
      const div = document.createElement('div');
      div.style.cssText = 'padding:20px;background:white;font-family:system-ui;width:400px;';
      div.innerHTML = `
        <h3 style="text-align:center;margin-bottom:10px;">📅 ${monthStr} 出勤统计</h3>
        <div style="background:#e8f5e9;padding:15px;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🔵 全天</span><span>${att.full} 天</span></div>
          <div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🟠 半天</span><span>${att.half} 天</span></div>
          <div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🔴 加班</span><span>${att.overtime.toFixed(1)} 天</span></div>
          <div style="display:flex;justify-content:space-between;margin:5px 0;"><span>🟢 休息</span><span>${att.rest} 天</span></div>
          <div style="border-top:2px solid #333;margin-top:8px;padding-top:5px;font-weight:bold;display:flex;justify-content:space-between;"><span>📌 合计出勤</span><span>${att.total.toFixed(1)} 天</span></div>
        </div>
        <div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div>
      `;
      document.body.appendChild(div);
      try {
        const canvas = await html2canvas(div, { backgroundColor: '#fff', scale: 2 });
        const a = document.createElement('a');
        a.download = `出勤统计_${monthStr}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      } catch (e) { alert('导出失败'); }
      document.body.removeChild(div);
    }

    window.startEdit = i => {
      document.getElementById(`catName_${i}`).style.display = 'none';
      document.getElementById(`editRow_${i}`).style.display = 'flex';
      document.getElementById(`editInput_${i}`).focus();
    };
    window.cancelEdit = i => {
      document.getElementById(`catName_${i}`).style.display = 'inline';
      document.getElementById(`editRow_${i}`).style.display = 'none';
    };
    window.confirmRename = (old, i) => renameCategory(old, document.getElementById(`editInput_${i}`).value);

    window.exportCategoryToImage = async function(cat) {
      const data = getDetailedSummary(currentYear, currentMonth)[cat];
      if (!data) return alert('无记录');
      document.getElementById('loadingOverlay').classList.add('active');
      const monthStr = `${currentYear}年${currentMonth}月`;
      let inner = `<div class="export-area"><div class="export-title">📌 ${cat}</div><div class="export-subtitle">${monthStr} 消费明细</div><div class="export-category">`;
      data.records.forEach(r => {
        const cls = r.amount < 0 ? 'negative' : 'positive';
        const disp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        inner += `<div class="export-detail-item"><span><span class="detail-date">${r.day}号</span>${r.note?`<span class="detail-note"> - ${r.note}</span>`:''}</span><span class="detail-amount ${cls}">${disp}</span></div>`;
      });
      const totalCls = data.total < 0 ? 'negative' : 'positive';
      const totalDisp = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
      inner += `<div class="export-category-total"><span>小计</span><span class="detail-amount ${totalCls}">${totalDisp}</span></div></div><div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div></div>`;
      document.getElementById('exportTemplate').innerHTML = inner;
      try {
        const canvas = await html2canvas(document.querySelector('.export-area'), { backgroundColor: '#fff', scale: 2 });
        const a = document.createElement('a');
        a.download = `${cat}_${monthStr}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      } catch (e) { alert('导出失败'); }
      document.getElementById('loadingOverlay').classList.remove('active');
    };

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

    function fillLastInput() {
      document.getElementById('category').value = lastInput.category || '';
      document.getElementById('note').value = lastInput.note || '';
      document.getElementById('categoryHint').textContent = lastInput.category ? '已填入上次记录' : '';
      document.getElementById('noteHint').textContent = lastInput.note ? '已填入上次记录' : '';
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

    function renderModalRecords() {
      const container = document.getElementById('modalRecords');
      const dayRecs = getRecordsByDate(selectedDate);
      if (!dayRecs.length) return container.innerHTML = '<p style="color:#888;text-align:center;padding:10px;">当天暂无记录</p>';
      container.innerHTML = dayRecs.map(r => {
        const cls = r.amount < 0 ? 'negative' : 'positive';
        const disp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        return `<div class="record-item"><div class="info"><strong>${r.category}</strong>${r.note?`<small>${r.note}</small>`:''}</div><span class="amount-text ${cls}">${disp}</span><button class="delete-btn" data-id="${r.id}">×</button></div>`;
      }).join('');
      container.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => {
        records = records.filter(r => r.id != e.target.dataset.id);
        saveRecords();
        renderModalRecords();
        renderCalendar();
      }));
    }

    const attendanceModal = document.getElementById('attendanceModal');
    let selectedAttType = null;

    function updateAttUI() {
      document.querySelectorAll('#attendanceOptions .attendance-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.type === selectedAttType);
        const input = o.querySelector('input');
        if (input) input.style.display = (selectedAttType === 'overtime') ? 'inline-block' : 'none';
      });
    }

    document.getElementById('openAttendanceBtn').addEventListener('click', () => {
      const cur = getAttendanceByDate(selectedDate);
      selectedAttType = cur ? cur.type : null;
      if (cur?.type === 'overtime') document.getElementById('overtimeHours').value = cur.value;
      else document.getElementById('overtimeHours').value = '';
      document.getElementById('attendanceDateTitle').textContent = `出勤设置 - ${selectedDate}`;
      updateAttUI();
      attendanceModal.classList.add('active');
    });

    document.getElementById('attendanceOptions').addEventListener('click', e => {
      const opt = e.target.closest('.attendance-option');
      if (!opt) return;
      selectedAttType = opt.dataset.type;
      updateAttUI();
    });

    document.getElementById('closeAttendanceModal').addEventListener('click', () => attendanceModal.classList.remove('active'));
    document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
      if (!selectedDate) return;
      if (!selectedAttType || selectedAttType === 'none') {
        delete attendanceRecords[selectedDate];
      } else if (selectedAttType === 'overtime') {
        const val = parseFloat(document.getElementById('overtimeHours').value);
        if (isNaN(val) || val <= 0) return alert('请输入有效加班天数');
        attendanceRecords[selectedDate] = { type: 'overtime', value: val };
      } else {
        attendanceRecords[selectedDate] = { type: selectedAttType };
      }
      saveAttendance();
      attendanceModal.classList.remove('active');
      renderCalendar();
      showToast('✅ 出勤已更新');
    });
    attendanceModal.addEventListener('click', e => { if (e.target === attendanceModal) attendanceModal.classList.remove('active'); });

    document.getElementById('addRecord').addEventListener('click', () => {
      if (!selectedDate) return;
      const category = document.getElementById('category').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      const note = document.getElementById('note').value.trim();
      if (!category) return alert('请输入分类名称');
      if (isNaN(amount) || amount === 0) return alert('请输入有效金额');
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
    document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });
    document.getElementById('modalContent').addEventListener('touchmove', e => e.stopPropagation(), { passive: false });

    // 导出备份按钮
    document.getElementById('exportDataBtn').addEventListener('click', () => {
      const months = getAvailableMonths();
      const monthList = document.getElementById('monthList');
      monthList.innerHTML = months.map(m => {
        const [y, mo] = m.split('-');
        return `<div class="month-item"><input type="checkbox" id="chk_${m}" value="${m}" checked><label for="chk_${m}">${y}年${mo}月</label></div>`;
      }).join('');
      document.getElementById('monthSelectModal').classList.add('active');
    });

    document.getElementById('closeMonthSelect').addEventListener('click', () => {
      document.getElementById('monthSelectModal').classList.remove('active');
    });

    document.getElementById('selectAllMonths').addEventListener('click', () => {
      document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
    document.getElementById('deselectAllMonths').addEventListener('click', () => {
      document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = false);
    });

    document.getElementById('confirmExportBtn').addEventListener('click', () => {
      const checked = Array.from(document.querySelectorAll('#monthList input[type="checkbox"]:checked')).map(cb => cb.value);
      document.getElementById('monthSelectModal').classList.remove('active');
      exportSelectedMonths(checked);
    });

    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', e => {
      if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
    });

    let confirmCb = null;
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      document.getElementById('confirmMessage').textContent = '确定清空所有数据？建议先导出备份。';
      confirmCb = clearAllData;
      document.getElementById('confirmDialog').classList.add('active');
    });
    document.getElementById('confirmCancel').addEventListener('click', () => {
      document.getElementById('confirmDialog').classList.remove('active');
    });
    document.getElementById('confirmOk').addEventListener('click', () => {
      document.getElementById('confirmDialog').classList.remove('active');
      if (confirmCb) confirmCb();
    });

    document.getElementById('prevMonth').addEventListener('click', () => {
      if (currentMonth === 1) { currentMonth = 12; currentYear--; }
      else currentMonth--;
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      if (currentMonth === 12) { currentMonth = 1; currentYear++; }
      else currentMonth++;
      renderCalendar();
    });

    document.querySelectorAll('#modalContent input').forEach(i => {
      i.addEventListener('focus', () => setTimeout(() => i.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300));
    });

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadRecords();
    loadAttendance();
    loadLastInput();
    renderCalendar();
  