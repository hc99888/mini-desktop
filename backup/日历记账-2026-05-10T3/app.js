
  


    const STORAGE_KEY = 'ledger_records';
    const LAST_INPUT_KEY = 'ledger_last_input';
    
    let currentYear, currentMonth;
    let records = [];
    let selectedDate = null;
    
    let lastInput = {
      category: '',
      note: ''
    };

    function loadRecords() {
      const raw = localStorage.getItem(STORAGE_KEY);
      records = raw ? JSON.parse(raw) : [];
    }

    function saveRecords() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
    
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
          summary[r.category] = {
            total: 0,
            records: []
          };
        }
        summary[r.category].total += r.amount;
        const day = parseInt(r.date.split('-')[2]);
        summary[r.category].records.push({
          day: day,
          amount: r.amount,
          note: r.note,
          date: r.date
        });
      });
      
      for (const cat in summary) {
        summary[cat].records.sort((a, b) => a.day - b.day);
      }
      
      return summary;
    }

    function renderCalendar() {
      const title = document.getElementById('monthTitle');
      title.textContent = `${currentYear}年 ${currentMonth}月`;

      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const startDayOfWeek = firstDay.getDay();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

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

          if (cellDateStr === todayStr) {
            cell.classList.add('today');
          }

          const total = getDayTotal(cellDateStr);
          if (total > 0) {
            cell.classList.add('has-record');
            const amtSpan = document.createElement('span');
            amtSpan.className = 'amount';
            amtSpan.textContent = `¥${total.toFixed(1)}`;
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
      
      categories.forEach(cat => {
        const data = summary[cat];
        grandTotal += data.total;
        
        const daysList = [...new Set(data.records.map(r => r.day))]
          .sort((a, b) => a - b);
        
        const daysHtml = daysList.map(d => `<span>${d}号</span>`).join('');
        
        html += `
          <div class="summary-category">
            <div class="summary-category-header">
              <div class="summary-category-left">
                <span class="summary-category-name">${cat}</span>
                <button class="export-cat-btn" data-category="${cat}">📷 导出</button>
              </div>
              <span class="summary-category-amount">¥${data.total.toFixed(2)}</span>
            </div>
            <div class="summary-category-days">
              ${daysHtml}
            </div>
          </div>
        `;
      });
      
      html += `<div class="summary-total"><span>合计</span><span>¥${grandTotal.toFixed(2)}</span></div>`;
      
      summaryDiv.innerHTML = html;
      
      summaryDiv.querySelectorAll('.export-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const category = btn.getAttribute('data-category');
          exportCategoryToImage(category);
        });
      });
    }

    async function exportCategoryToImage(categoryName) {
      const summary = getDetailedSummary(currentYear, currentMonth);
      const data = summary[categoryName];
      
      if (!data || data.records.length === 0) {
        alert('该分类没有记录');
        return;
      }
      
      document.getElementById('loadingOverlay').classList.add('active');
      
      const monthStr = `${currentYear}年${currentMonth}月`;
      
      let html = `
        <div class="export-area">
          <div class="export-title">📌 ${categoryName}</div>
          <div class="export-subtitle">${monthStr} 消费明细</div>
          <div class="export-category">
      `;
      
      data.records.forEach(r => {
        html += `
          <div class="export-detail-item">
            <span>
              <span class="detail-date">${r.day}号</span>
              ${r.note ? `<span class="detail-note"> - ${r.note}</span>` : ''}
            </span>
            <span class="detail-amount">¥${r.amount.toFixed(2)}</span>
          </div>
        `;
      });
      
      html += `
            <div class="export-category-total">
              <span>小计</span>
              <span style="color:#d9534f;">¥${data.total.toFixed(2)}</span>
            </div>
          </div>
          <div style="text-align:center; margin-top:15px; color:#999; font-size:0.75rem;">
            导出时间：${new Date().toLocaleString()}
          </div>
        </div>
      `;
      
      const template = document.getElementById('exportTemplate');
      template.innerHTML = html;
      
      try {
        const canvas = await html2canvas(template.querySelector('.export-area'), {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const link = document.createElement('a');
        link.download = `${categoryName}_${monthStr}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
      } catch (error) {
        console.error('导出失败：', error);
        alert('导出失败，请重试');
      }
      
      document.getElementById('loadingOverlay').classList.remove('active');
      template.innerHTML = '';
    }

    function openModal(dateStr) {
      selectedDate = dateStr;
      document.getElementById('modalDate').textContent = `📅 ${dateStr}`;
      renderModalRecords();
      fillLastInput();
      
      // 锁定背景滚动
      document.body.classList.add('modal-open');
      document.getElementById('modal').classList.add('active');
      
      // 弹窗滚动到顶部
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
        html += `
          <div class="record-item">
            <div class="info">
              <strong>${r.category}</strong>
              ${r.note ? `<small>${r.note}</small>` : ''}
            </div>
            <span class="amount-text">¥${r.amount.toFixed(2)}</span>
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

    // 添加记录
    document.getElementById('addRecord').addEventListener('click', () => {
      if (!selectedDate) return;
      
      const categoryInput = document.getElementById('category');
      const amountInput = document.getElementById('amount');
      const noteInput = document.getElementById('note');
      
      const category = categoryInput.value.trim();
      const amount = parseFloat(amountInput.value);
      const note = noteInput.value.trim();
      
      if (!category) {
        alert('请输入分类名称');
        categoryInput.focus();
        return;
      }
      
      if (!amount || amount <= 0) {
        alert('请输入有效金额');
        amountInput.focus();
        return;
      }
      
      saveLastInput(category, note);
      
      const newRecord = {
        id: Date.now(),
        date: selectedDate,
        category,
        amount,
        note
      };
      
      records.push(newRecord);
      saveRecords();
      
      amountInput.value = '';
      amountInput.focus();
      
      renderModalRecords();
      renderCalendar();
    });
    
    document.getElementById('clearForm').addEventListener('click', () => {
      clearForm();
    });

    // 关闭弹窗
    document.getElementById('closeModal').addEventListener('click', closeModal);
    
    // 点击遮罩关闭
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal')) {
        closeModal();
      }
    });
    
    // 阻止弹窗内触摸事件冒泡到背景
    document.getElementById('modalContent').addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // 月份切换
    document.getElementById('prevMonth').addEventListener('click', () => {
      if (currentMonth === 1) {
        currentMonth = 12;
        currentYear--;
      } else {
        currentMonth--;
      }
      renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
      if (currentMonth === 12) {
        currentMonth = 1;
        currentYear++;
      } else {
        currentMonth++;
      }
      renderCalendar();
    });

    // 启动
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadRecords();
    loadLastInput();
    renderCalendar();

    // 监听输入框聚焦，自动滚动弹窗
    const inputs = document.querySelectorAll('#modalContent input');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
    });
  