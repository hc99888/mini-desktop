
  


    const STORAGE_KEY = 'ledger_records';
    const LAST_INPUT_KEY = 'ledger_last_input';

    let currentYear, currentMonth;
    let records = [];
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

    // 导出数据为 JSON 文件
    function exportData() {
      const data = {
        version: 1,
        exportTime: new Date().toISOString(),
        totalRecords: records.length,
        records: records
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

    // 导入数据
    function importData(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.records || !Array.isArray(data.records)) {
            throw new Error('数据格式不正确');
          }

          // 验证每条记录
          const validRecords = data.records.filter(r => {
            return r.id && r.date && r.category && typeof r.amount === 'number';
          });

          if (validRecords.length === 0) {
            throw new Error('没有有效的记录');
          }

          // 合并还是替换？这里用替换（也可以改为合并）
          const mode = confirm('点击"确定"将替换现有数据\n点击"取消"将合并数据（追加）');
          
          if (mode) {
            records = validRecords;
          } else {
            // 合并：根据 id 去重
            const existingIds = new Set(records.map(r => r.id));
            const newRecords = validRecords.filter(r => !existingIds.has(r.id));
            records = [...records, ...newRecords];
          }

          saveRecords();
          renderCalendar();
          showToast(`✅ 成功导入 ${mode ? validRecords.length : records.length} 条记录`);
        } catch (error) {
          alert('导入失败：' + error.message);
        }
      };
      reader.readAsText(file);
    }

    // 清空所有数据
    function clearAllData() {
      records = [];
      saveRecords();
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
      const categoryHint = document.getElementById('categoryHint');
      const noteHint = document.getElementById('noteHint');

      if (lastInput.category) {
        categoryInput.value = lastInput.category;
        categoryHint.textContent = '已填入上次记录';
      } else {
        categoryInput.value = '';
        categoryHint.textContent = '';
      }
      if (lastInput.note) {
        noteInput.value = lastInput.note;
        noteHint.textContent = '已填入上次记录';
      } else {
        noteInput.value = '';
        noteHint.textContent = '';
      }
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
    function getRecordsByDate(dateStr) {
      return records.filter(r => r.date === dateStr);
    }

    function getRecordsByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2,'0')}`;
      return records.filter(r => r.date.startsWith(prefix));
    }

    function getDayTotal(dateStr) {
      return getRecordsByDate(dateStr).reduce((sum, r) => sum + r.amount, 0);
    }

    function getDetailedSummary(year, month) {
      const monthRecords = getRecordsByMonth(year, month);
      const summary = {};
      monthRecords.forEach(r => {
        if (!summary[r.category]) {
          summary[r.category] = { total: 0, records: [] };
        }
        summary[r.category].total += r.amount;
        const day = parseInt(r.date.split('-')[2]);
        summary[r.category].records.push({ day: day, amount: r.amount, note: r.note, date: r.date });
      });
      for (const cat in summary) {
        summary[cat].records.sort((a, b) => a.day - b.day);
      }
      return summary;
    }

    // ============ 重命名分类 ============
    function renameCategory(oldName, newName) {
      newName = newName.trim();
      if (!newName) { alert('分类名称不能为空'); return false; }
      if (oldName === newName) return true;
      const monthRecords = getRecordsByMonth(currentYear, currentMonth);
      const existingCategories = new Set(monthRecords.map(r => r.category));
      if (existingCategories.has(newName) && newName !== oldName) {
        alert(`分类"${newName}"已存在，请使用其他名称`);
        return false;
      }
      records.forEach(r => {
        if (r.category === oldName) r.category = newName;
      });
      saveRecords();
      renderCalendar();
      return true;
    }

    function getAmountClass(amount) { return amount < 0 ? 'negative' : 'positive'; }

    // ============ 渲染 ============
    function renderCalendar() {
      const title = document.getElementById('monthTitle');
      title.textContent = `${currentYear}年 ${currentMonth}月`;

      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const startDayOfWeek = firstDay.getDay();
      const prevMonthDays = startDayOfWeek;
      const totalCells = 42;
      const calendarDiv = document.getElementById('calendar');
      calendarDiv.innerHTML = '';

      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      weekDays.forEach(d => {
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
          cell.textContent = '';
        } else {
          cell.className = 'day-cell';
          cell.textContent = cellDate.getDate();
          if (cellDateStr === todayStr) cell.classList.add('today');

          const total = getDayTotal(cellDateStr);
          if (total !== 0) {
            cell.classList.add('has-record');
            const amtSpan = document.createElement('span');
            amtSpan.className = 'amount';
            if (total < 0) amtSpan.classList.add('negative');
            amtSpan.textContent = total < 0 ? `-¥${Math.abs(total).toFixed(1)}` : `¥${total.toFixed(1)}`;
            cell.appendChild(amtSpan);
          }
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

      if (categories.length === 0) {
        summaryDiv.innerHTML = '<p style="color:#888;">这个月还没有记录</p>';
        return;
      }

      categories.sort((a, b) => summary[b].total - summary[a].total);

      let html = '';
      let grandTotal = 0;

      categories.forEach((cat, index) => {
        const data = summary[cat];
        grandTotal += data.total;

        const daysList = [...new Set(data.records.map(r => r.day))].sort((a, b) => a - b);
        const daysHtml = daysList.map(d => `<span>${d}号</span>`).join('');
        const amountClass = data.total < 0 ? 'negative' : '';
        const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;

        html += `
          <div class="summary-category">
            <div class="summary-category-header">
              <div class="summary-category-name-row">
                <span class="summary-category-name" id="catName_${index}">${cat}</span>
                <span class="edit-category-row" id="editRow_${index}" style="display:none;">
                  <input type="text" id="editInput_${index}" value="${cat}">
                  <button class="btn-sm btn-edit-confirm" onclick="confirmRename('${cat}', ${index})">✓</button>
                  <button class="btn-sm btn-edit-cancel" onclick="cancelEdit(${index})">✕</button>
                </span>
              </div>
              <span class="summary-category-amount ${amountClass}">${totalDisplay}</span>
            </div>
            <div class="summary-category-days">${daysHtml}</div>
            <div style="margin-top:6px;">
              <button class="btn-sm btn-edit" onclick="startEdit(${index})">✏️ 改名</button>
              <button class="btn-sm btn-export" onclick="event.stopPropagation(); exportCategoryToImage('${cat}')">📷 导出</button>
            </div>
          </div>
        `;
      });

      const grandDisplay = grandTotal < 0 ? `-¥${Math.abs(grandTotal).toFixed(2)}` : `¥${grandTotal.toFixed(2)}`;
      html += `<div class="summary-total"><span>合计</span><span>${grandDisplay}</span></div>`;
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
      const newName = document.getElementById(`editInput_${index}`).value;
      renameCategory(oldName, newName);
    };

    window.exportCategoryToImage = async function(categoryName) {
      const summary = getDetailedSummary(currentYear, currentMonth);
      const data = summary[categoryName];
      if (!data || data.records.length === 0) { alert('该分类没有记录'); return; }

      document.getElementById('loadingOverlay').classList.add('active');
      const monthStr = `${currentYear}年${currentMonth}月`;

      let html = `
        <div class="export-area">
          <div class="export-title">📌 ${categoryName}</div>
          <div class="export-subtitle">${monthStr} 消费明细</div>
          <div class="export-category">
      `;

      data.records.forEach(r => {
        const amountClass = r.amount < 0 ? 'negative' : 'positive';
        const amountDisplay = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        html += `
          <div class="export-detail-item">
            <span><span class="detail-date">${r.day}号</span>${r.note ? `<span class="detail-note"> - ${r.note}</span>` : ''}</span>
            <span class="detail-amount ${amountClass}">${amountDisplay}</span>
          </div>
        `;
      });

      const totalClass = data.total < 0 ? 'negative' : 'positive';
      const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `¥${data.total.toFixed(2)}`;
      html += `
            <div class="export-category-total"><span>小计</span><span class="detail-amount ${totalClass}">${totalDisplay}</span></div>
          </div>
          <div style="text-align:center; margin-top:15px; color:#999; font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div>
        </div>
      `;

      const template = document.getElementById('exportTemplate');
      template.innerHTML = html;

      try {
        const canvas = await html2canvas(template.querySelector('.export-area'), { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = `${categoryName}_${monthStr}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        alert('导出失败，请重试');
      }
      document.getElementById('loadingOverlay').classList.remove('active');
      template.innerHTML = '';
    };

    // ============ 弹窗 ============
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
        container.innerHTML = '<p style="color:#888; text-align:center; padding:10px;">当天暂无记录</p>';
        return;
      }
      let html = '';
      dayRecords.forEach(r => {
        const amountClass = r.amount < 0 ? 'negative' : 'positive';
        const amountDisplay = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
        html += `
          <div class="record-item">
            <div class="info"><strong>${r.category}</strong>${r.note ? `<small>${r.note}</small>` : ''}</div>
            <span class="amount-text ${amountClass}">${amountDisplay}</span>
            <button class="delete-btn" data-id="${r.id}">×</button>
          </div>`;
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

    // ============ 事件绑定 ============
    document.getElementById('addRecord').addEventListener('click', () => {
      if (!selectedDate) return;
      const categoryInput = document.getElementById('category');
      const amountInput = document.getElementById('amount');
      const noteInput = document.getElementById('note');

      const category = categoryInput.value.trim();
      const amount = parseFloat(amountInput.value);
      const note = noteInput.value.trim();

      if (!category) { alert('请输入分类名称'); categoryInput.focus(); return; }
      if (isNaN(amount) || amount === 0) { alert('请输入有效金额（正数或负数）'); amountInput.focus(); return; }

      saveLastInput(category, note);
      records.push({ id: Date.now(), date: selectedDate, category, amount, note });
      saveRecords();

      amountInput.value = '';
      amountInput.focus();
      renderModalRecords();
      renderCalendar();
    });

    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal')) closeModal();
    });
    document.getElementById('modalContent').addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // 数据管理按钮
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    // 清空数据（确认弹窗）
    let confirmCallback = null;
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      document.getElementById('confirmMessage').textContent = '确定要清空所有数据吗？此操作不可恢复！建议先导出备份。';
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
      confirmCallback = null;
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

    // 输入框聚焦滚动
    const inputs = document.querySelectorAll('#modalContent input');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
      });
    });

    // 启动
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadRecords();
    loadLastInput();
    renderCalendar();
  