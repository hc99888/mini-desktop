


/* ================= 常量与数据加载 ================= */
const STORAGE_KEY = 'ledger_records';
const ATTENDANCE_KEY = 'attendance_records';
const CREW_ATTENDANCE_KEY = 'crew_attendance';
const CREW_LIST_KEY = 'crew_list';
const ADVANCE_KEY = 'advance_records';
const LAST_INPUT_KEY = 'ledger_last_input';
const SALARY_PAID_KEY = 'salary_paid';
const LOAN_KEY = 'loan_records';
const DAILY_SALARY_KEY = 'daily_salary_records';
const OVERTIME_RULE_KEY = 'overtime_rule';
const GITEE_CFG_KEY = 'my_notes_gitee_cfg';
const GITEE_API = 'https://gitee.com/api/v5';
const LEDGER_DIR = '我的数据库';

let currentYear, currentMonth;
let records = [], attendanceRecords = {}, crewAttendance = {}, crewList = [], advances = [];
let salaryPaid = {}, loanRecords = [], dailySalary = {}, overtimeRule = {};
let selectedDate = null;
let lastInput = { category: '', note: '' };
let currentForm = 'expense';
let crewMode = 'single';
let crewLockTimer = null;
let currentSelectedPerson = null;
let selectedAttType = null;
let crewLocked = false;
let attendanceModal = null;
const STANDARD_HOURS = 9;

function formatAmount(amount) {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absAmount >= 10000) return sign + '¥' + (absAmount / 10000).toFixed(1) + 'w';
  if (absAmount >= 1000) return sign + '¥' + (absAmount / 1000).toFixed(1) + 'k';
  return sign + '¥' + absAmount.toFixed(1);
}
function getAmountFontSize(text) {
  const len = text.length;
  if (len <= 4) return '0.65rem';
  if (len <= 5) return '0.58rem';
  if (len <= 6) return '0.52rem';
  return '0.46rem';
}
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
function loadSalaryPaid() { const raw = localStorage.getItem(SALARY_PAID_KEY); salaryPaid = raw ? JSON.parse(raw) : {}; }
function saveSalaryPaid() { localStorage.setItem(SALARY_PAID_KEY, JSON.stringify(salaryPaid)); }
function loadLoanRecords() { const raw = localStorage.getItem(LOAN_KEY); loanRecords = raw ? JSON.parse(raw) : []; }
function saveLoanRecords() { localStorage.setItem(LOAN_KEY, JSON.stringify(loanRecords)); }
function loadDailySalary() { const raw = localStorage.getItem(DAILY_SALARY_KEY); dailySalary = raw ? JSON.parse(raw) : {}; }
function saveDailySalary() { localStorage.setItem(DAILY_SALARY_KEY, JSON.stringify(dailySalary)); }
function loadOvertimeRule() { const raw = localStorage.getItem(OVERTIME_RULE_KEY); overtimeRule = raw ? JSON.parse(raw) : {}; }
function saveOvertimeRule() { localStorage.setItem(OVERTIME_RULE_KEY, JSON.stringify(overtimeRule)); }
function saveLastInput(category, note) { lastInput = { category, note }; localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(lastInput)); }
function loadLastInput() { const raw = localStorage.getItem(LAST_INPUT_KEY); lastInput = raw ? JSON.parse(raw) : { category: '', note: '' }; }

/* ================= 日薪 / 加班规则 ================= */
function getMonthlyDailySalary(project, year, month) {
  if (!dailySalary[project]) return 0;
  const key = `${year}-${String(month).padStart(2,'0')}`;
  if (dailySalary[project][key] !== undefined) return dailySalary[project][key];
  const keys = Object.keys(dailySalary[project]).sort();
  let lastRate = 0;
  for (const k of keys) { if (k <= key) lastRate = dailySalary[project][k]; }
  return lastRate;
}
function setMonthlyDailySalary(project, year, month, salary) {
  if (!dailySalary[project]) dailySalary[project] = {};
  dailySalary[project][`${year}-${String(month).padStart(2,'0')}`] = salary;
  saveDailySalary();
}
function getOvertimeRule(project) {
  const r = overtimeRule[project];
  if (!r) return { mode: 'hourly', hours: 3 };
  if (r.mode === 'half') return { mode: 'half', hours: r.hours || 3 };
  return { mode: 'hourly', hours: 3 };
}
function setOvertimeRule(project, mode, hours) {
  if (mode === 'half') overtimeRule[project] = { mode: 'half', hours: hours || 3 };
  else overtimeRule[project] = { mode: 'hourly' };
  saveOvertimeRule();
}
function calcOvertimeSalary(project, hours, dailyRate) {
  if (!hours || hours <= 0 || dailyRate === 0) return 0;
  const hourlyRate = dailyRate / STANDARD_HOURS;
  const rule = getOvertimeRule(project);
  if (rule.mode === 'hourly') return hours * hourlyRate;
  const N = rule.hours || 3;
  const halfDays = Math.floor(hours / N);
  return halfDays * (dailyRate / 2) + (hours - halfDays * N) * hourlyRate;
}
function calcAttendanceSalary(att) {
  const project = att.project || '未分类';
  const dateStr = att.date || selectedDate;
  if (!dateStr) return 0;
  const [y, m] = dateStr.split('-').map(Number);
  const dailyRate = getMonthlyDailySalary(project, y, m);
  if (att.type === 'full') return dailyRate || att.salary || 0;
  if (att.type === 'morning' || att.type === 'afternoon') {
    if (dailyRate === 0) return 0;
    return (att.hours || 0) * (dailyRate / STANDARD_HOURS);
  }
  if (att.type === 'overtime') return calcOvertimeSalary(project, att.hours || 0, dailyRate);
  return 0;
}
function getAttendanceDays(att) {
  if (att.type === 'full') return 1;
  if (att.type === 'morning' || att.type === 'afternoon') return 0.5;
  if (att.type === 'overtime') {
    const rule = getOvertimeRule(att.project || '未分类');
    if (rule.mode === 'half') return Math.floor((att.hours || 0) / (rule.hours || 3)) * 0.5;
  }
  return 0;
}
function getAttendanceStatsByProject(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const stats = {};
  Object.entries(attendanceRecords).forEach(([date, att]) => {
    if (date.startsWith(prefix)) {
      const project = att.project || '未分类';
      if (!stats[project]) stats[project] = { full: 0, morning: 0, afternoon: 0, overtime: 0, overtimeDays: 0, rest: 0, total: 0, salary: 0 };
      if (att.type === 'full') { stats[project].full++; stats[project].total += 1; }
      else if (att.type === 'morning') { stats[project].morning++; stats[project].total += 0.5; }
      else if (att.type === 'afternoon') { stats[project].afternoon++; stats[project].total += 0.5; }
      else if (att.type === 'overtime') {
        stats[project].overtime += (att.hours || 0);
        const d = getAttendanceDays(att);
        stats[project].overtimeDays += d;
        stats[project].total += d;
      } else if (att.type === 'rest') { stats[project].rest++; }
      stats[project].salary += calcAttendanceSalary(att);
    }
  });
  return stats;
}
function getTotalSalary(project) {
  let totalDays = 0, totalAmount = 0;
  const monthSet = new Set();
  Object.entries(attendanceRecords).forEach(([date, att]) => {
    if ((att.project || '未分类') === project) {
      const dateStr = att.date || date;
      const [y, m] = dateStr.split('-');
      monthSet.add(`${y}-${m}`);
    }
  });
  monthSet.forEach(ym => {
    const [y, m] = ym.split('-').map(Number);
    const ms = getAttendanceStatsByProject(y, m);
    if (ms[project]) { totalDays += ms[project].total; totalAmount += ms[project].salary; }
  });
  return { totalDays, totalAmount };
}
function getTotalPaid(project) { return (salaryPaid[project] || []).reduce((s, i) => s + i.amount, 0); }
function getPaymentList(project) {
  return [...(salaryPaid[project] || [])].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
}
function getLoanStatsByPerson() {
  const m = new Map();
  loanRecords.forEach(l => {
    if (!m.has(l.person)) m.set(l.person, { lend: 0, borrow: 0, records: [] });
    const p = m.get(l.person);
    if (l.direction === 'lend') p.lend += l.amount; else p.borrow += l.amount;
    p.records.push(l);
  });
  return m;
}
function getTotalLend() { return loanRecords.filter(l => l.direction === 'lend').reduce((s, l) => s + l.amount, 0); }
function getTotalBorrow() { return loanRecords.filter(l => l.direction === 'borrow').reduce((s, l) => s + l.amount, 0); }

/* ================= 出勤保存 ================= */
window.saveAttendanceHandler = function() {
  if (!selectedDate) { showToast('请先选择日期'); return; }
  const project = document.getElementById('attendanceProject').value.trim() || '未分类';
  const ruleMode = document.getElementById('overtimeRuleMode').value;
  const ruleHours = parseFloat(document.getElementById('overtimeRuleHours').value) || 3;
  setOvertimeRule(project, ruleMode, ruleHours);

  if (!selectedAttType || selectedAttType === 'none') {
    if (attendanceRecords[selectedDate]) {
      delete attendanceRecords[selectedDate];
      saveAttendance();
      if (attendanceModal) attendanceModal.classList.remove('active');
      renderCalendar();
      showToast('✅ 已取消标记');
    } else showToast('请选择出勤类型');
    return;
  }
  if (selectedAttType === 'rest') {
    attendanceRecords[selectedDate] = { type: 'rest', project, date: selectedDate };
    saveAttendance();
    if (attendanceModal) attendanceModal.classList.remove('active');
    renderCalendar();
    showToast('✅ 已标记休息');
    return;
  }
  if (selectedAttType === 'full') {
    let salary = parseFloat(document.getElementById('fullSalary').value.trim());
    if (isNaN(salary) || salary <= 0) {
      const [y, m] = selectedDate.split('-').map(Number);
      salary = getMonthlyDailySalary(project, y, m);
      if (salary === 0) { showToast('请输入全天工资'); return; }
    }
    const [y, m] = selectedDate.split('-').map(Number);
    setMonthlyDailySalary(project, y, m, salary);
    attendanceRecords[selectedDate] = { type: 'full', project, salary, date: selectedDate };
    saveAttendance();
    if (attendanceModal) attendanceModal.classList.remove('active');
    renderCalendar();
    showToast(`✅ 全天已保存 ¥${salary.toFixed(2)}`);
    return;
  }
  if (selectedAttType === 'morning' || selectedAttType === 'afternoon') {
    const hours = parseFloat(document.getElementById(selectedAttType === 'morning' ? 'morningHours' : 'afternoonHours').value.trim());
    if (isNaN(hours) || hours <= 0) { showToast('请输入有效小时数'); return; }
    const [y, m] = selectedDate.split('-').map(Number);
    const dailyRate = getMonthlyDailySalary(project, y, m);
    if (dailyRate === 0) { showToast('请先输入全天工资'); return; }
    attendanceRecords[selectedDate] = { type: selectedAttType, project, hours, date: selectedDate };
    saveAttendance();
    if (attendanceModal) attendanceModal.classList.remove('active');
    renderCalendar();
    showToast(`✅ ${selectedAttType === 'morning' ? '上午' : '下午'} ${hours}小时 = ¥${(hours * (dailyRate / STANDARD_HOURS)).toFixed(2)}`);
    return;
  }
  if (selectedAttType === 'overtime') {
    const hours = parseFloat(document.getElementById('overtimeHours').value.trim());
    if (isNaN(hours) || hours <= 0) { showToast('请输入有效加班小时'); return; }
    const [y, m] = selectedDate.split('-').map(Number);
    const dailyRate = getMonthlyDailySalary(project, y, m);
    if (dailyRate === 0) { showToast('请先输入全天工资'); return; }
    attendanceRecords[selectedDate] = { type: 'overtime', project, hours, date: selectedDate };
    saveAttendance();
    if (attendanceModal) attendanceModal.classList.remove('active');
    renderCalendar();
    showToast(`✅ 加班 ${hours}小时 = ¥${calcOvertimeSalary(project, hours, dailyRate).toFixed(2)}`);
  }
};

/* ================= 项目 / 工资 / 清空 ================= */
window.renameSingleProject = function(oldName) {
  const newName = prompt('请输入新的项目名称：', oldName);
  if (newName === null) return;
  const t = newName.trim();
  if (!t) { showToast('项目名称不能为空'); return; }
  if (t === oldName) { showToast('新名称与旧名称相同'); return; }
  let n = 0;
  Object.keys(attendanceRecords).forEach(d => { if ((attendanceRecords[d].project || '未分类') === oldName) { attendanceRecords[d].project = t; n++; } });
  if (n === 0) { showToast('没有找到需要修改的记录'); return; }
  if (dailySalary[oldName]) { dailySalary[t] = dailySalary[oldName]; delete dailySalary[oldName]; saveDailySalary(); }
  if (salaryPaid[oldName]) { salaryPaid[t] = salaryPaid[oldName]; delete salaryPaid[oldName]; saveSalaryPaid(); }
  if (overtimeRule[oldName]) { overtimeRule[t] = overtimeRule[oldName]; delete overtimeRule[oldName]; saveOvertimeRule(); }
  saveAttendance(); renderCalendar();
  showToast(`✅ 已重命名为 "${t}"`);
};
window.markSalaryPaid = function(project) {
  const ts = getTotalSalary(project), tp = getTotalPaid(project);
  const remaining = ts.totalAmount - tp;
  if (ts.totalAmount === 0) { showToast(`${project} 还没有应发工资`); return; }
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const a = prompt(`【${project}】\n累计应发：¥${ts.totalAmount.toFixed(2)}\n已发工资：¥${tp.toFixed(2)}\n剩余未发：¥${remaining.toFixed(2)}\n\n请输入本次收到的工资金额：`, remaining > 0 ? remaining.toFixed(2) : '');
  if (a === null) return;
  const amount = parseFloat(a);
  if (isNaN(amount) || amount <= 0) { showToast('请输入有效金额'); return; }
  let d = prompt(`请输入收款日期（YYYY-MM-DD）：\n默认今天：${todayStr}`, todayStr);
  if (d === null) return;
  d = d.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { showToast('日期格式不正确，使用今天'); d = todayStr; }
  if (!salaryPaid[project]) salaryPaid[project] = [];
  salaryPaid[project].push({ amount, date: d, timestamp: Date.now() });
  saveSalaryPaid(); renderCalendar();
  showToast(`✅ 已记录 ${d} 收到 ¥${amount.toFixed(2)}`);
};
window.deletePayment = function(project, ts) {
  if (!salaryPaid[project]) return;
  salaryPaid[project] = salaryPaid[project].filter(i => i.timestamp !== ts);
  if (salaryPaid[project].length === 0) delete salaryPaid[project];
  saveSalaryPaid(); renderCalendar();
  showToast('✅ 已删除收款记录');
};
window.clearProject = function(project) {
  if (!confirm(`确定清空【${project}】的全部数据？\n\n包括考勤、日薪、加班规则、收款记录。\n此操作不可恢复！`)) return;
  let n = 0;
  Object.keys(attendanceRecords).forEach(d => { if ((attendanceRecords[d].project || '未分类') === project) { delete attendanceRecords[d]; n++; } });
  if (dailySalary[project]) { delete dailySalary[project]; saveDailySalary(); }
  if (salaryPaid[project]) { delete salaryPaid[project]; saveSalaryPaid(); }
  if (overtimeRule[project]) { delete overtimeRule[project]; saveOvertimeRule(); }
  saveAttendance(); renderCalendar();
  showToast(`✅ 已清空【${project}】（${n}条考勤）`);
};
window.deleteLoan = function(id) {
  if (!confirm('确定删除这条借贷记录？')) return;
  loanRecords = loanRecords.filter(l => l.id !== id);
  saveLoanRecords(); renderCalendar();
  showToast('✅ 已删除借贷记录');
};
window.clearPersonLoan = function(person) {
  if (!confirm(`确定清空【${person}】的所有借贷记录？`)) return;
  loanRecords = loanRecords.filter(l => l.person !== person);
  saveLoanRecords(); renderCalendar();
  showToast(`✅ 已清空【${person}】借贷记录`);
};
window.renameCrewProject = function(oldName) {
  const nn = prompt('请输入新的项目名称：', oldName);
  if (nn === null) return;
  const t = nn.trim();
  if (!t) { showToast('项目名称不能为空'); return; }
  if (t === oldName) { showToast('新名称与旧名称相同'); return; }
  let n = 0;
  Object.keys(crewAttendance).forEach(d => {
    Object.keys(crewAttendance[d]).forEach(name => {
      if ((crewAttendance[d][name].project || '未分类') === oldName) { crewAttendance[d][name].project = t; n++; }
    });
  });
  if (n === 0) { showToast('没有找到需要修改的记录'); return; }
  saveCrewAttendance(); renderCalendar();
  showToast(`✅ 已重命名为 "${t}"`);
};
window.clearCategory = function(cat) {
  const ms = getRecordsByMonth(currentYear, currentMonth).filter(r => r.category === cat);
  if (ms.length === 0) { showToast('该分类本月没有记录'); return; }
  if (!confirm(`确定清空本月【${cat}】的 ${ms.length} 条记录？\n\n只清空 ${currentYear}年${currentMonth}月，其他月份不受影响。`)) return;
  const ids = new Set(ms.map(r => r.id));
  ms.forEach(r => {
    if (r.advancePerson) {
      if (r.amount > 0) deductFromPersonPartial(r.advancePerson, Math.abs(r.amount));
      else addBackToPerson(r.advancePerson, Math.abs(r.amount));
    }
  });
  records = records.filter(r => !ids.has(r.id));
  saveRecords(); updateAdvanceSelect(); updateIncomeAdvanceSelect(); renderCalendar();
  showToast(`✅ 已清空【${cat}】本月记录`);
};
window.clearAdvance = function(name) {
  if (advances.filter(a => a.name === name).length === 0) return;
  if (!confirm(`确定清空【${name}】的所有预付款记录？\n\n此操作不可恢复！`)) return;
  advances = advances.filter(a => a.name !== name);
  saveAdvances(); updateAdvanceSelect(); updateIncomeAdvanceSelect(); renderCalendar();
  showToast(`✅ 已清空【${name}】预付款记录`);
};
window.clearCrewProject = function(project) {
  let n = 0;
  Object.keys(crewAttendance).forEach(d => {
    Object.keys(crewAttendance[d]).forEach(name => {
      if ((crewAttendance[d][name].project || '未分类') === project) { delete crewAttendance[d][name]; n++; }
    });
    if (Object.keys(crewAttendance[d]).length === 0) delete crewAttendance[d];
  });
  if (n === 0) { showToast('没有找到该项目的记录'); return; }
  if (!confirm(`确定清空【${project}】的所有多人考勤记录？\n\n共 ${n} 条，不可恢复！`)) return;
  saveCrewAttendance(); renderCalendar();
  showToast(`✅ 已清空【${project}】多人考勤（${n}条）`);
};

/* ================= 预付款 ================= */
function updateAdvanceSelect() {
  const select = document.getElementById('advanceSelect');
  select.innerHTML = '';
  const map = new Map();
  advances.forEach(a => { if (a.balance > 0) map.set(a.name, (map.get(a.name) || 0) + a.balance); });
  for (const [name, bal] of Array.from(map.entries()).sort((a, b) => b[1] - a[1])) {
    const o = document.createElement('option'); o.value = name; o.textContent = `${name} (余额 ¥${bal.toFixed(2)})`; select.appendChild(o);
  }
  const d = document.createElement('option'); d.value = ''; d.textContent = '不使用预付款'; select.appendChild(d);
}
function updateIncomeAdvanceSelect() {
  const select = document.getElementById('incomeAdvanceSelect');
  select.innerHTML = '';
  const set = new Set();
  advances.forEach(a => {
    if (!set.has(a.name)) {
      set.add(a.name);
      const bal = advances.filter(x => x.name === a.name).reduce((s, x) => s + x.balance, 0);
      const o = document.createElement('option'); o.value = a.name; o.textContent = `${a.name} (余额 ¥${bal.toFixed(2)})`; select.appendChild(o);
    }
  });
  const d = document.createElement('option'); d.value = ''; d.textContent = '请选择预付款'; select.prepend(d);
}
function getPersonTotalBalance(name) { let t = 0; advances.forEach(a => { if (a.name === name && a.balance > 0) t += a.balance; }); return t; }
function deductFromPersonPartial(name, amount) {
  const list = advances.filter(a => a.name === name && a.balance > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  let remaining = amount, deducted = 0;
  for (const a of list) { if (remaining <= 0) break; const d = Math.min(a.balance, remaining); a.balance -= d; deducted += d; remaining -= d; }
  saveAdvances();
  return deducted;
}
function addBackToPerson(name, amount) {
  const list = advances.filter(a => a.name === name).sort((a, b) => new Date(b.date) - new Date(a.date));
  let remaining = amount;
  for (const a of list) { if (remaining <= 0) break; const d = Math.min(a.amount - a.balance, remaining); a.balance += d; remaining -= d; }
  saveAdvances();
  return remaining === 0;
}

/* ================= 多人出勤 ================= */
function getCrewStatsByProject(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const stats = {};
  Object.entries(crewAttendance).forEach(([date, day]) => {
    if (date.startsWith(prefix)) {
      Object.entries(day).forEach(([name, val]) => {
        const project = val.project || '未分类';
        if (!stats[project]) stats[project] = {};
        if (!stats[project][name]) stats[project][name] = { full: 0, half: 0, overtime: 0, rest: 0, total: 0 };
        const type = val.type || val;
        const days = val.days !== undefined ? val.days : 1;
        const m = stats[project][name];
        if (type === 'full') { m.full++; m.total++; }
        else if (type === 'half') { m.half++; m.total += 0.5; }
        else if (type === 'overtime') { m.overtime += days; m.total += days; }
        else if (type === 'rest') { m.rest++; }
      });
    }
  });
  return stats;
}
function getCrewCountByProject(dateStr, project) {
  const day = crewAttendance[dateStr];
  if (!day) return 0;
  let c = 0;
  Object.keys(day).forEach(name => {
    const v = day[name], type = v.type || v, p = v.project || '未分类';
    if (p === project && type !== 'rest' && type !== 'none') c++;
  });
  return c;
}
function getSingleAttendanceInfo(dateStr) { const a = attendanceRecords[dateStr]; return a ? { type: a.type } : null; }
function hasCrewAttendance(dateStr) {
  const d = crewAttendance[dateStr];
  if (!d) return false;
  return Object.keys(d).some(n => { const v = d[n], t = v.type || v; return t !== 'rest' && t !== 'none'; });
}
function deleteCrewMember(name) {
  if (!confirm(`确定要删除人员 "${name}" 吗？该人员的所有出勤记录也会被删除。`)) return;
  crewList = crewList.filter(n => n !== name); saveCrewList();
  Object.keys(crewAttendance).forEach(d => {
    if (crewAttendance[d][name]) { delete crewAttendance[d][name]; if (Object.keys(crewAttendance[d]).length === 0) delete crewAttendance[d]; }
  });
  saveCrewAttendance();
  if (document.getElementById('crewMode').style.display !== 'none') renderCrewTable();
  resetCrewLock(); renderCalendar();
  showToast(`✅ 已删除 ${name}`);
}
function editCrewMember(oldName) {
  const nn = prompt('请输入新的姓名：', oldName);
  if (!nn || !nn.trim() || nn.trim() === oldName) return;
  const t = nn.trim();
  if (crewList.includes(t)) { alert('该姓名已存在！'); return; }
  const i = crewList.indexOf(oldName);
  if (i !== -1) crewList[i] = t;
  saveCrewList();
  const nca = {};
  Object.entries(crewAttendance).forEach(([d, day]) => {
    nca[d] = {};
    Object.entries(day).forEach(([n, v]) => { nca[d][n === oldName ? t : n] = v; });
  });
  crewAttendance = nca; saveCrewAttendance();
  if (document.getElementById('crewMode').style.display !== 'none') renderCrewTable();
  resetCrewLock(); renderCalendar();
  showToast(`✅ 已重命名为 ${t}`);
}
function openPersonMenu(name) { currentSelectedPerson = name; document.getElementById('personMenuName').textContent = name; document.getElementById('personMenuModal').classList.add('active'); }
function closePersonMenu() { document.getElementById('personMenuModal').classList.remove('active'); currentSelectedPerson = null; }
function getAdvancesByDate(d) { return advances.filter(a => a.date === d); }
function getRecordsByDate(d) { return records.filter(r => r.date === d); }
function getRecordsByMonth(y, m) { const p = `${y}-${String(m).padStart(2,'0')}`; return records.filter(r => r.date.startsWith(p)); }
function getDayTotal(d) { return getRecordsByDate(d).reduce((s, r) => s + r.amount, 0); }
function getAttendanceByDate(d) { return attendanceRecords[d] || null; }
function getDetailedSummary(y, m) {
  const ms = getRecordsByMonth(y, m);
  const s = {};
  ms.forEach(r => {
    if (!s[r.category]) s[r.category] = { total: 0, records: [] };
    s[r.category].total += r.amount;
    s[r.category].records.push({ day: parseInt(r.date.split('-')[2]), amount: r.amount, note: r.note, date: r.date });
  });
  Object.values(s).forEach(c => c.records.sort((a, b) => a.day - b.day));
  return s;
}
function renameCategory(oldName, newName) {
  newName = newName.trim();
  if (!newName) return alert('分类名不能为空');
  if (oldName === newName) return;
  if (getRecordsByMonth(currentYear, currentMonth).some(r => r.category === newName)) return alert(`"${newName}" 已存在`);
  records.forEach(r => { if (r.category === oldName) r.category = newName; });
  saveRecords(); renderCalendar();
}
function isFutureDate(dateStr) {
  const t = new Date();
  const ts = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  return dateStr > ts;
}

/* ================= 日历 ================= */
function renderCalendar() {
  document.getElementById('monthTitle').textContent = `${currentYear}年 ${currentMonth}月`;
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const startDay = firstDay.getDay();
  const totalCells = 42;
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  ['日','一','二','三','四','五','六'].forEach(d => { const l = document.createElement('div'); l.className = 'day-label'; l.textContent = d; cal.appendChild(l); });
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  for (let i = 0; i < totalCells; i++) {
    const offset = i - startDay + 1;
    const cd = new Date(currentYear, currentMonth - 1, offset);
    const cm = cd.getMonth() + 1, cy = cd.getFullYear();
    const ds = `${cy}-${String(cm).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
    const cell = document.createElement('div');
    if (cm !== currentMonth) { cell.className = 'day-cell empty'; }
    else {
      const locked = isFutureDate(ds);
      cell.className = 'day-cell';
      if (locked) cell.classList.add('locked');
      const content = document.createElement('div'); content.className = 'cell-content';
      if (locked) {
        const sp = document.createElement('span'); sp.textContent = cd.getDate(); sp.style.fontWeight = '500'; sp.style.lineHeight = '1.1'; content.appendChild(sp);
        const lk = document.createElement('div'); lk.className = 'lock-icon'; lk.textContent = '🔒'; content.appendChild(lk);
        cell.appendChild(content);
      } else {
        const si = getSingleAttendanceInfo(ds);
        const hc = hasCrewAttendance(ds);
        if (si || hc) {
          const dd = document.createElement('div'); dd.className = 'attendance-dots';
          if (si) { const d = document.createElement('span'); d.className = `attendance-dot ${si.type}`; dd.appendChild(d); }
          if (hc) { const d = document.createElement('span'); d.className = 'attendance-dot crew'; dd.appendChild(d); }
          content.appendChild(dd);
        } else { const p = document.createElement('div'); p.style.height = '12px'; content.appendChild(p); }
        const sp = document.createElement('span'); sp.textContent = cd.getDate(); sp.style.fontWeight = '500'; sp.style.lineHeight = '1.1'; content.appendChild(sp);
        if (ds === todayStr) cell.classList.add('today');
        const total = getDayTotal(ds);
        if (total !== 0) {
          cell.classList.add('has-record');
          const amt = document.createElement('span'); amt.className = 'amount';
          const f = formatAmount(total);
          amt.classList.add(total < 0 ? 'negative' : 'positive');
          amt.textContent = f; amt.style.fontSize = getAmountFontSize(f); amt.style.lineHeight = '1.1';
          content.appendChild(amt);
        }
        cell.appendChild(content);
        cell.addEventListener('click', () => openModal(ds));
      }
    }
    cal.appendChild(cell);
  }
  renderSummary();
}

/* ================= 汇总渲染 ================= */
function renderSummary() {
  const container = document.getElementById('summaryContent');
  const summary = getDetailedSummary(currentYear, currentMonth);
  const cats = Object.keys(summary);
  let html = '';
  if (cats.length === 0) html += '<p style="color:#888;">这个月还没有消费记录</p>';
  else {
    cats.sort((a, b) => summary[b].total - summary[a].total);
    let grand = 0;
    cats.forEach((cat, i) => {
      const data = summary[cat]; grand += data.total;
      const days = [...new Set(data.records.map(r => r.day))].sort((a, b) => a - b);
      const daysHtml = days.map(d => `<span>${d}号</span>`).join('');
      const totalDisplay = data.total < 0 ? `-¥${Math.abs(data.total).toFixed(2)}` : `+¥${data.total.toFixed(2)}`;
      const cls = data.total < 0 ? 'negative' : 'positive';
      html += `<div class="summary-category"><div class="summary-category-header"><div class="summary-category-name-row"><span class="summary-category-name" id="catName_${i}">${cat}</span><span class="edit-category-row" id="editRow_${i}" style="display:none;"><input type="text" id="editInput_${i}" value="${cat}"><button class="btn-sm btn-edit-confirm" onclick="confirmRename('${cat}',${i})">✓</button><button class="btn-sm btn-edit-cancel" onclick="cancelEdit(${i})">✕</button></span></div><div style="display:flex;align-items:center;gap:6px;"><span class="summary-category-amount ${cls}">${totalDisplay}</span><button class="btn-card-clear" onclick="window.clearCategory('${cat}')" title="清空本月该分类">🗑️</button></div></div><div class="summary-category-days">${daysHtml}</div><div style="margin-top:6px;"><button class="btn-sm btn-edit" onclick="startEdit(${i})">✏️ 改名</button><button class="btn-sm btn-export" onclick="event.stopPropagation(); exportCategoryToImage('${cat}')">📷 导出</button></div></div>`;
    });
    const gd = grand < 0 ? `-¥${Math.abs(grand).toFixed(2)}` : `+¥${grand.toFixed(2)}`;
    html += `<div class="summary-total"><span>本月合计</span><span>${gd}</span></div>`;
  }
  if (advances.length > 0) {
    const map = new Map(); let totalAll = 0;
    advances.forEach(a => {
      if (!map.has(a.name)) map.set(a.name, { records: [], totalBalance: 0, totalOriginal: 0 });
      const p = map.get(a.name);
      p.records.push({ date: a.date, amount: a.amount, balance: a.balance });
      p.totalBalance += a.balance; p.totalOriginal += a.amount; totalAll += a.amount;
    });
    html += `<div class="advance-card"><div style="display:flex; justify-content:space-between; align-items:center;"><h4>💰 预付款余额</h4><span style="font-weight:bold; color:#e65100;">¥${totalAll.toFixed(2)}</span></div>`;
    for (const [name, p] of map) {
      html += `<div style="margin-top:12px;"><div style="font-weight:bold; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span>${name}</span><button class="btn-card-clear" onclick="window.clearAdvance('${name}')" title="清空该人预付款">🗑️</button></div>`;
      p.records.forEach(r => { html += `<div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#666; margin-left:8px;"><span>到账：${r.date || '未知日期'}</span><span>总额 ¥${r.amount.toFixed(2)}</span></div>`; });
      html += `<div style="display:flex; justify-content:space-between; margin-top:5px; padding-top:3px; border-top:1px dashed #ffe0b2; font-weight:bold;"><span>剩余余额</span><span style="color:#e65100;">¥${p.totalBalance.toFixed(2)}</span></div></div>`;
    }
    html += `</div>`;
  }
  if (loanRecords.length > 0) {
    const map = getLoanStatsByPerson();
    const net = getTotalLend() - getTotalBorrow();
    html += `<div class="loan-card"><div style="display:flex; justify-content:space-between; align-items:center;"><h4>💳 借贷统计</h4><span style="font-weight:bold; color:#e67e22;">净借出 ¥${net.toFixed(2)}</span></div>`;
    for (const [person, data] of map) {
      const n = data.lend - data.borrow;
      let st = '', sc = '';
      if (n > 0) { st = `⚠️ 欠我 ¥${n.toFixed(2)}`; sc = '#e67e22'; }
      else if (n < 0) { st = `📥 我欠 ¥${Math.abs(n).toFixed(2)}`; sc = '#3498db'; }
      else { st = `✅ 已结清`; sc = '#28a745'; }
      html += `<div style="margin-top:10px;padding:8px;background:#fff5e6;border-radius:6px;"><div style="font-weight:bold;display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span>【${person}】<span style="color:${sc};font-size:0.85rem;margin-left:6px;">${st}</span></span><button class="btn-card-clear" onclick="window.clearPersonLoan('${person}')" title="清空该人借贷">🗑️</button></div>`;
      [...data.records].sort((a, b) => b.date.localeCompare(a.date)).forEach(l => {
        const lend = l.direction === 'lend';
        html += `<div class="loan-row"><div class="loan-info"><span class="loan-type">${lend ? '💸 借出' : '📥 借入'}</span> <span class="loan-date">${l.date}${l.note ? ' · ' + l.note : ''}</span></div><span class="loan-amount ${lend ? 'out' : 'in'}">¥${l.amount.toFixed(2)}</span><button class="loan-delete" onclick="window.deleteLoan(${l.id})">×</button></div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }
  const ps = getAttendanceStatsByProject(currentYear, currentMonth);
  const pn = Object.keys(ps);
  const hasSingle = pn.some(n => { const s = ps[n]; return s.total > 0 || s.rest > 0 || s.overtime > 0; });
  if (hasSingle) {
    html += `<div class="attendance-stats"><h4><span>📅 本月出勤统计（单人）</span></h4>`;
    pn.forEach(name => {
      const s = ps[name];
      if (s.total > 0 || s.rest > 0 || s.overtime > 0) {
        const ts = getTotalSalary(name), tp = getTotalPaid(name);
        const remaining = ts.totalAmount - tp;
        const pl = getPaymentList(name);
        const [y, m] = [currentYear, currentMonth];
        const rate = getMonthlyDailySalary(name, y, m);
        const rule = getOvertimeRule(name);
        const ruleText = rule.mode === 'half' ? `满${rule.hours}小时算半天` : '按小时';
        html += `<div style="margin-top:8px;padding:8px;background:#f0f4ff;border-radius:6px;"><div style="font-weight:bold;color:#007aff;display:flex;justify-content:space-between;align-items:center;"><span>【${name}】日薪 ¥${rate}</span><div><button class="btn-sm btn-edit" onclick="window.renameSingleProject('${name}')" style="font-size:0.7rem;">✏️ 改名</button></div></div>`;
        html += `<div class="stat-row"><span>加班折算</span><span>${ruleText}</span></div>`;
        html += `<div class="stat-row"><span>🔵 全天</span><span>${s.full} 次</span></div>`;
        html += `<div class="stat-row"><span>🟠 上午</span><span>${s.morning} 次</span></div>`;
        html += `<div class="stat-row"><span>🟠 下午</span><span>${s.afternoon} 次</span></div>`;
        html += `<div class="stat-row"><span>🔴 加班</span><span>${s.overtime.toFixed(1)} 小时${s.overtimeDays > 0 ? '（折' + s.overtimeDays.toFixed(1) + '天）' : ''}</span></div>`;
        html += `<div class="stat-row"><span>🟢 休息</span><span>${s.rest} 天</span></div>`;
        html += `<div class="stat-row" style="font-weight:bold;border-top:1px dashed #ccc;padding-top:4px;margin-top:4px;"><span>📌 本月出勤</span><span>${s.total.toFixed(1)} 天</span></div>`;
        html += `<div class="stat-row" style="font-weight:bold;"><span>💰 本月应发</span><span>¥${s.salary.toFixed(2)}</span></div>`;
        html += `<div style="margin-top:6px;padding-top:6px;border-top:2px solid #007aff;">`;
        html += `<div class="stat-row" style="font-weight:bold;"><span>📌 累计出勤</span><span>${ts.totalDays.toFixed(1)} 天</span></div>`;
        html += `<div class="stat-row" style="font-weight:bold;"><span>💰 累计应发</span><span>¥${ts.totalAmount.toFixed(2)}</span></div>`;
        html += `<div class="stat-row received"><span>✅ 已发工资</span><span>¥${tp.toFixed(2)}</span></div>`;
        html += `<div class="stat-row remaining"><span>⚠️ 剩余未发</span><span>¥${remaining.toFixed(2)}</span></div>`;
        html += `</div>`;
        if (pl.length > 0) {
          html += `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #ccc;"><div style="font-size:0.75rem;color:#666;margin-bottom:3px;">📋 收款记录（${pl.length}条）</div>`;
          pl.forEach(p => { html += `<div class="payment-record"><span class="payment-date">${p.date}</span><span class="payment-amount">+¥${p.amount.toFixed(2)}</span><button class="payment-delete" onclick="window.deletePayment('${name}', ${p.timestamp})">×</button></div>`; });
          html += `</div>`;
        }
        html += `<div style="margin-top:6px;text-align:right;"><button class="btn-sm btn-salary-paid" onclick="window.markSalaryPaid('${name}')" style="font-size:0.7rem;">💰 收到工资</button> <button class="btn-sm btn-salary-clear" onclick="window.clearProject('${name}')" style="font-size:0.7rem;">🗑️ 清空</button></div></div>`;
      }
    });
    html += `</div>`;
  }
  const cs = getCrewStatsByProject(currentYear, currentMonth);
  const cn = Object.keys(cs);
  const hasCrew = cn.length > 0 && crewList.length > 0;
  if (hasCrew || crewList.length > 0) {
    html += `<div class="attendance-stats" style="background:#e3f2fd;"><h4>👥 多人出勤统计 <span class="attendance-dot crew" style="display:inline-block; width:10px; height:10px; vertical-align:middle;"></span></h4>`;
    if (hasCrew) {
      const todayStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
      cn.forEach(project => {
        const members = cs[project];
        const names = Object.keys(members);
        if (names.length > 0) {
          let pt = 0;
          const todayCrew = getCrewCountByProject(todayStr, project);
          html += `<div style="margin-top:8px;padding:8px;background:#f0f4ff;border-radius:6px;"><div style="font-weight:bold;color:#007aff;display:flex;justify-content:space-between;align-items:center;"><span>【${project}】</span><div><button class="btn-sm btn-edit" onclick="window.renameCrewProject('${project}')" style="font-size:0.7rem;">✏️ 改名</button> <button class="btn-card-clear" onclick="window.clearCrewProject('${project}')" title="清空该项目多人考勤">🗑️</button></div></div>`;
          names.forEach(name => { const s = members[name]; pt += s.total; html += `<div class="stat-row"><span>${name}</span><span>🔵${s.full}天 🟠${(s.half/2).toFixed(1)}天 🔴${s.overtime.toFixed(1)}天 合计${s.total.toFixed(1)}天</span></div>`; });
          html += `<div class="stat-row" style="font-weight:bold;border-top:1px solid #ccc;padding-top:4px;"><span>📌 今天出勤</span><span>👥 ${todayCrew} 人</span></div>`;
          html += `<div class="stat-row" style="font-weight:bold;"><span>📌 总计</span><span>${pt.toFixed(1)} 天</span></div></div>`;
        }
      });
    } else {
      html += `<div style="color:#888;padding:8px;text-align:center;">暂无出勤记录</div>`;
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

/* ================= 弹窗 / 表单 ================= */
function switchForm(form) {
  currentForm = form;
  document.getElementById('expenseForm').style.display = form === 'expense' ? 'block' : 'none';
  document.getElementById('advanceForm').style.display = form === 'advance' ? 'block' : 'none';
  document.getElementById('incomeForm').style.display = form === 'income' ? 'block' : 'none';
  document.getElementById('loanForm').style.display = form === 'loan' ? 'block' : 'none';
  document.getElementById('switchExpense').classList.toggle('active', form === 'expense');
  document.getElementById('switchAdvance').classList.toggle('active', form === 'advance');
  document.getElementById('switchIncome').classList.toggle('active', form === 'income');
  document.getElementById('switchLoan').classList.toggle('active', form === 'loan');
}
function openModal(dateStr) {
  if (isFutureDate(dateStr)) { showToast('未来日期暂不可记账'); return; }
  selectedDate = dateStr;
  document.getElementById('modalDate').textContent = `📅 ${dateStr}`;
  renderAllRecords();
  updateAdvanceSelect(); updateIncomeAdvanceSelect();
  document.getElementById('advanceDate').value = dateStr;
  document.getElementById('category').value = lastInput.category || '';
  document.getElementById('note').value = lastInput.note || '';
  switchForm('expense');
  document.body.classList.add('modal-open');
  document.getElementById('modal').classList.add('active');
  document.getElementById('modalContent').scrollTop = 0;
}
function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.classList.remove('modal-open');
  selectedDate = null;
}
function renderAllRecords() {
  const container = document.getElementById('modalRecords');
  const dayRecs = getRecordsByDate(selectedDate);
  const dayAdv = getAdvancesByDate(selectedDate);
  const dayLoans = loanRecords.filter(l => l.date === selectedDate);
  const dayInc = dayRecs.filter(r => r.amount > 0);
  const dayExp = dayRecs.filter(r => r.amount < 0);
  const items = [
    ...dayAdv.map(a => ({ type: 'advance', data: a, ts: a.id })),
    ...dayLoans.map(l => ({ type: 'loan', data: l, ts: l.id })),
    ...dayInc.map(i => ({ type: 'income', data: i, ts: i.id })),
    ...dayExp.map(e => ({ type: 'expense', data: e, ts: e.id }))
  ].sort((a, b) => b.ts - a.ts);
  if (items.length === 0) { container.innerHTML = '<p style="color:#888;text-align:center;padding:10px;">当天暂无记录</p>'; return; }
  container.innerHTML = items.map(item => {
    if (item.type === 'advance') {
      const a = item.data, used = a.amount - a.balance;
      return `<div class="record-item"><div class="info"><strong>💰 预支 - ${a.name}</strong><small>总额 ¥${a.amount.toFixed(2)} | 已用 ¥${used.toFixed(2)} | 余额 ¥${a.balance.toFixed(2)}</small></div><span class="amount-text advance">+¥${a.amount.toFixed(2)}</span><button class="delete-btn" data-id="${a.id}" data-type="advance">×</button></div>`;
    }
    if (item.type === 'loan') {
      const l = item.data, lend = l.direction === 'lend';
      return `<div class="record-item"><div class="info"><strong>💳 ${lend ? '💸 借出给' : '📥 借入自'} ${l.person}</strong>${l.note ? `<small>${l.note}</small>` : ''}</div><span class="amount-text loan">${lend ? '-' : '+'}¥${l.amount.toFixed(2)}</span><button class="delete-btn" data-id="${l.id}" data-type="loan">×</button></div>`;
    }
    if (item.type === 'income') {
      const r = item.data;
      return `<div class="record-item"><div class="info"><strong>💵 退款 - ${r.category || r.advancePerson}</strong>${r.note ? `<small>${r.note}</small>` : ''}</div><span class="amount-text income">+¥${r.amount.toFixed(2)}</span><button class="delete-btn" data-id="${r.id}" data-type="expense">×</button></div>`;
    }
    const r = item.data;
    const cls = r.amount < 0 ? 'negative' : 'positive';
    const disp = r.amount < 0 ? `-¥${Math.abs(r.amount).toFixed(2)}` : `¥${r.amount.toFixed(2)}`;
    const extra = r.splitAmount ? `<small>💡 其中 ¥${r.splitAmount.toFixed(2)} 使用预付款</small>` : '';
    return `<div class="record-item"><div class="info"><strong>💸 ${r.category}</strong>${r.note ? `<small>${r.note}</small>` : ''}${extra}</div><span class="amount-text ${cls}">${disp}</span><button class="delete-btn" data-id="${r.id}" data-type="expense">×</button></div>`;
  }).join('');
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      if (type === 'expense') {
        const r = records.find(x => x.id === id);
        if (r && r.advancePerson) {
          if (r.amount > 0) deductFromPersonPartial(r.advancePerson, Math.abs(r.amount));
          else addBackToPerson(r.advancePerson, Math.abs(r.amount));
        }
        records = records.filter(x => x.id !== id); saveRecords();
        updateAdvanceSelect(); updateIncomeAdvanceSelect();
      } else if (type === 'advance') {
        advances = advances.filter(x => x.id !== id); saveAdvances();
        updateAdvanceSelect(); updateIncomeAdvanceSelect();
      } else if (type === 'loan') {
        loanRecords = loanRecords.filter(x => x.id !== id); saveLoanRecords();
      }
      renderAllRecords(); renderCalendar();
      showToast('✅ 已删除');
    });
  });
}
function clearAllForms() {
  ['category','amount','note','advanceName','advanceAmount','incomeAmount','incomeNote','attendanceProject','crewProject','loanPerson','loanAmount','loanNote'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  lastInput = { category: '', note: '' };
  localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(lastInput));
}
function openAttendance() {
  if (!selectedDate) return;
  document.getElementById('attendanceDateTitle').textContent = `出勤设置 - ${selectedDate}`;
  const cur = getAttendanceByDate(selectedDate);
  selectedAttType = cur ? cur.type : null;
  document.getElementById('attendanceProject').value = cur && cur.project ? cur.project : '';
  const projectForRule = document.getElementById('attendanceProject').value.trim() || '未分类';
  const rule = getOvertimeRule(projectForRule);
  document.getElementById('overtimeRuleMode').value = rule.mode;
  document.getElementById('overtimeRuleHours').value = rule.hours || 3;
  toggleOvertimeHoursVisibility();
  document.getElementById('fullSalary').value = '260';
  document.getElementById('morningHours').value = '4.5';
  document.getElementById('afternoonHours').value = '4.5';
  document.getElementById('overtimeHours').value = '';
  if (cur) {
    if (cur.type === 'full' && cur.salary) document.getElementById('fullSalary').value = cur.salary;
    else if (cur.type === 'morning' && cur.hours) document.getElementById('morningHours').value = cur.hours;
    else if (cur.type === 'afternoon' && cur.hours) document.getElementById('afternoonHours').value = cur.hours;
    else if (cur.type === 'overtime' && cur.hours) document.getElementById('overtimeHours').value = cur.hours;
  } else {
    const p = document.getElementById('attendanceProject').value.trim();
    if (p) {
      const [y, m] = selectedDate.split('-').map(Number);
      const r = getMonthlyDailySalary(p, y, m);
      if (r > 0) document.getElementById('fullSalary').value = r;
    }
  }
  updateAttUI();
  crewMode = 'single';
  document.getElementById('singleMode').style.display = 'block';
  document.getElementById('crewMode').style.display = 'none';
  document.getElementById('switchSingle').classList.add('active');
  document.getElementById('switchCrew').classList.remove('active');
  unlockCrew();
  if (attendanceModal) attendanceModal.classList.add('active');
}
function addExpense() {
  if (!selectedDate) return;
  const category = document.getElementById('category').value.trim();
  let amount = parseFloat(document.getElementById('amount').value);
  const note = document.getElementById('note').value.trim();
  const adv = document.getElementById('advanceSelect').value;
  if (!category) return alert('请输入分类名称');
  if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
  saveLastInput(category, note);
  const toAdd = [];
  if (adv) {
    if (getPersonTotalBalance(adv) > 0) {
      const deducted = deductFromPersonPartial(adv, amount);
      if (deducted > 0) {
        toAdd.push({ id: Date.now(), date: selectedDate, category, amount: -deducted, note: note + (deducted < amount ? ` (使用预付款¥${deducted.toFixed(2)})` : ''), advancePerson: adv, splitAmount: deducted });
        amount -= deducted;
        if (amount > 0) showToast(`预付款不足，剩余 ¥${amount.toFixed(2)} 使用现金支付`, 3000);
      }
    }
  }
  if (amount > 0) toAdd.push({ id: Date.now() + 1, date: selectedDate, category, amount: -amount, note: note + (adv ? ` (现金支付¥${amount.toFixed(2)})` : ''), advancePerson: null, splitAmount: null });
  records.push(...toAdd); saveRecords();
  document.getElementById('amount').value = '';
  updateAdvanceSelect(); updateIncomeAdvanceSelect();
  renderAllRecords(); renderCalendar();
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
  updateAdvanceSelect(); updateIncomeAdvanceSelect();
  renderAllRecords(); renderCalendar();
  showToast('✅ 预支已添加');
}
function addIncome() {
  if (!selectedDate) return;
  const person = document.getElementById('incomeAdvanceSelect').value;
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const note = document.getElementById('incomeNote').value.trim();
  if (!person) return alert('请选择要退款的预付款');
  if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
  const pa = advances.filter(a => a.name === person);
  if (pa.length === 0) return alert(`没有找到 "${person}" 的预付款记录`);
  const totalOriginal = pa.reduce((s, a) => s + a.amount, 0);
  const totalBalance = pa.reduce((s, a) => s + a.balance, 0);
  if (amount > totalOriginal - totalBalance) return alert(`只能退回最多 ¥${(totalOriginal - totalBalance).toFixed(2)}`);
  if (!addBackToPerson(person, amount)) return alert('退款失败');
  records.push({ id: Date.now(), date: selectedDate, category: `退款-${person}`, amount: Math.abs(amount), note: note || `退款到 ${person}`, advancePerson: person, splitAmount: null });
  saveRecords();
  document.getElementById('incomeAmount').value = '';
  document.getElementById('incomeNote').value = '';
  updateAdvanceSelect(); updateIncomeAdvanceSelect();
  renderAllRecords(); renderCalendar();
  showToast(`✅ 已退款 ¥${amount.toFixed(2)}`);
}
function addLoan() {
  if (!selectedDate) return;
  const direction = document.getElementById('loanDirection').value;
  const person = document.getElementById('loanPerson').value.trim();
  const amount = parseFloat(document.getElementById('loanAmount').value);
  const note = document.getElementById('loanNote').value.trim();
  if (!person) return alert('请输入对方姓名');
  if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
  loanRecords.push({ id: Date.now(), person, direction, amount, date: selectedDate, note });
  saveLoanRecords();
  document.getElementById('loanPerson').value = '';
  document.getElementById('loanAmount').value = '';
  document.getElementById('loanNote').value = '';
  renderAllRecords(); renderCalendar();
  showToast(direction === 'lend' ? `✅ 已记录借出给 ${person} ¥${amount.toFixed(2)}` : `✅ 已记录向 ${person} 借入 ¥${amount.toFixed(2)}`);
}
function updateAttUI() { document.querySelectorAll('#attendanceOptions .attendance-option').forEach(o => o.classList.toggle('selected', o.dataset.type === selectedAttType)); }
function toggleOvertimeHoursVisibility() { document.getElementById('overtimeRuleHours').style.display = document.getElementById('overtimeRuleMode').value === 'half' ? 'block' : 'none'; }
function setCrewAttendanceSimple(name, type, project) {
  if (!crewAttendance[selectedDate]) crewAttendance[selectedDate] = {};
  if (type === 'none') {
    delete crewAttendance[selectedDate][name];
    if (Object.keys(crewAttendance[selectedDate]).length === 0) delete crewAttendance[selectedDate];
  } else crewAttendance[selectedDate][name] = { type, project: project || '未分类' };
  saveCrewAttendance();
}
function setCrewAttendanceOvertime(name, days, project) {
  if (!crewAttendance[selectedDate]) crewAttendance[selectedDate] = {};
  crewAttendance[selectedDate][name] = { type: 'overtime', days, project: project || '未分类' };
  saveCrewAttendance();
}
function renderCrewTable() {
  const tbody = document.getElementById('crewTableBody');
  const day = crewAttendance[selectedDate] || {};
  if (crewList.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">暂无人员，点击下方按钮添加</td></tr>'; return; }
  tbody.innerHTML = crewList.map(name => {
    const v = day[name];
    let type = null, od = null;
    if (v) { if (typeof v === 'object') { type = v.type; od = v.days; } else type = v; }
    const fs = type === 'full', hs = type === 'half', os = type === 'overtime', rs = type === 'rest';
    return `<tr><td class="check-col"><input type="checkbox" class="crew-check" data-name="${name}"></td><td class="name-col" data-name="${name}">${name}</td><td class="clickable ${fs ? 'selected' : ''}" data-type="full" data-name="${name}">${fs ? '●' : ''}</td><td class="clickable ${hs ? 'selected' : ''}" data-type="half" data-name="${name}">${hs ? '●' : ''}</td><td class="overtime-cell ${os ? 'selected' : ''}" data-type="overtime" data-name="${name}">${os && od ? od.toFixed(1) : ''}</td><td class="clickable ${rs ? 'selected' : ''}" data-type="rest" data-name="${name}">${rs ? '●' : ''}</td></tr>`;
  }).join('');
  tbody.querySelectorAll('.name-col').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); if (!crewLocked) openPersonMenu(c.dataset.name); }));
  tbody.querySelectorAll('.clickable').forEach(c => {
    const type = c.dataset.type;
    if (!type) return;
    c.addEventListener('click', e => {
      e.stopPropagation();
      if (crewLocked) return;
      setCrewAttendanceSimple(c.dataset.name, type, document.getElementById('crewProject').value.trim() || '未分类');
      renderCrewTable(); resetCrewLock(); renderCalendar();
    });
  });
  tbody.querySelectorAll('.overtime-cell').forEach(c => c.addEventListener('click', e => {
    e.stopPropagation();
    if (crewLocked) return;
    const cur = crewAttendance[selectedDate]?.[c.dataset.name];
    let d = 1;
    if (cur && cur.type === 'overtime') d = cur.days || 1;
    const nd = prompt('请输入加班天数（如 1.5 表示一天半）：', d);
    if (nd !== null) {
      const n = parseFloat(nd);
      if (isNaN(n) || n <= 0) { alert('请输入有效的正数天数'); return; }
      setCrewAttendanceOvertime(c.dataset.name, n, document.getElementById('crewProject').value.trim() || '未分类');
      renderCrewTable(); resetCrewLock(); renderCalendar();
    }
  }));
}
function batchSetCrew(type) {
  if (crewLocked) return;
  const checks = document.querySelectorAll('#crewTable .crew-check:checked');
  if (checks.length === 0) { alert('请先勾选人员'); return; }
  const project = document.getElementById('crewProject').value.trim() || '未分类';
  checks.forEach(cb => { if (type === 'overtime') setCrewAttendanceOvertime(cb.dataset.name, 1, project); else setCrewAttendanceSimple(cb.dataset.name, type, project); });
  saveCrewAttendance(); renderCrewTable(); resetCrewLock(); renderCalendar();
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

/* ================= 导出/导入备份 ================= */
function getAvailableMonths() {
  const months = new Set();
  records.forEach(r => { const p = r.date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
  Object.keys(attendanceRecords).forEach(d => { const p = d.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
  Object.keys(crewAttendance).forEach(d => { const p = d.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); });
  advances.forEach(a => { if (a.date) { const p = a.date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); } });
  loanRecords.forEach(l => { if (l.date) { const p = l.date.split('-'); if (p.length >= 2) months.add(`${p[0]}-${p[1]}`); } });
  if (months.size === 0) { const y = new Date().getFullYear(); for (let m = 1; m <= 12; m++) months.add(`${y}-${String(m).padStart(2,'0')}`); }
  return Array.from(months).sort();
}
function exportSelectedMonths(selectedMonths) {
  if (!selectedMonths.length) return alert('请选择月份');
  const fRecords = records.filter(r => selectedMonths.includes(`${r.date.split('-')[0]}-${r.date.split('-')[1]}`));
  const fAtt = {};
  Object.entries(attendanceRecords).forEach(([d, a]) => { if (selectedMonths.includes(`${d.split('-')[0]}-${d.split('-')[1]}`)) fAtt[d] = a; });
  const fCrew = {};
  Object.entries(crewAttendance).forEach(([d, a]) => { if (selectedMonths.includes(`${d.split('-')[0]}-${d.split('-')[1]}`)) fCrew[d] = a; });
  const fAdv = advances.filter(a => a.date && selectedMonths.includes(`${a.date.split('-')[0]}-${a.date.split('-')[1]}`));
  const fLoans = loanRecords.filter(l => l.date && selectedMonths.includes(`${l.date.split('-')[0]}-${l.date.split('-')[1]}`));
  const data = { version: 7, exportTime: new Date().toISOString(), records: fRecords, attendance: fAtt, crewAttendance: fCrew, crewList, advances: fAdv, salaryPaid, loanRecords: fLoans, dailySalary, overtimeRule };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.download = `记账备份_${selectedMonths.join('_')}.json`; a.href = URL.createObjectURL(blob);
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); }, 200);
  showToast(`✅ 已导出 ${fRecords.length} 条记录`);
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
        salaryPaid = data.salaryPaid || {};
        loanRecords = data.loanRecords || [];
        dailySalary = data.dailySalary || {};
        overtimeRule = data.overtimeRule || {};
      } else {
        const ids = new Set(records.map(r => r.id));
        records = [...records, ...(data.records || []).filter(r => !ids.has(r.id))];
        if (data.attendance) Object.assign(attendanceRecords, data.attendance);
        if (data.crewAttendance) Object.assign(crewAttendance, data.crewAttendance);
        if (data.crewList) { const s = new Set(crewList); crewList = [...crewList, ...data.crewList.filter(n => !s.has(n))]; }
        if (data.advances) { const s = new Set(advances.map(a => a.id)); advances = [...advances, ...data.advances.filter(a => !s.has(a.id))]; }
        if (data.salaryPaid) Object.assign(salaryPaid, data.salaryPaid);
        if (data.loanRecords) { const s = new Set(loanRecords.map(l => l.id)); loanRecords = [...loanRecords, ...data.loanRecords.filter(l => !s.has(l.id))]; }
        if (data.dailySalary) Object.assign(dailySalary, data.dailySalary);
        if (data.overtimeRule) Object.assign(overtimeRule, data.overtimeRule);
      }
      saveRecords(); saveAttendance(); saveCrewAttendance(); saveCrewList(); saveAdvances(); saveSalaryPaid(); saveLoanRecords(); saveDailySalary(); saveOvertimeRule();
      renderCalendar(); updateAdvanceSelect(); updateIncomeAdvanceSelect();
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
  data.records.forEach(r => {
    const sign = r.amount < 0 ? '-' : '+';
    inner += `<div class="export-detail-item"><span><span class="detail-date">${r.day}号</span>${r.note ? `<span class="detail-note"> - ${r.note}</span>` : ''}</span><span class="detail-amount ${r.amount < 0 ? 'negative' : 'positive'}">${sign}¥${Math.abs(r.amount).toFixed(2)}</span></div>`;
  });
  inner += `<div class="export-category-total"><span>小计</span><span class="detail-amount ${data.total < 0 ? 'negative' : 'positive'}">${data.total < 0 ? '-¥' + Math.abs(data.total).toFixed(2) : '+¥' + data.total.toFixed(2)}</span></div></div><div style="text-align:center;margin-top:15px;color:#999;font-size:0.75rem;">导出时间：${new Date().toLocaleString()}</div></div>`;
  document.getElementById('exportTemplate').innerHTML = inner;
  try {
    const canvas = await html2canvas(document.querySelector('.export-area'), { backgroundColor: '#fff', scale: 2 });
    const a = document.createElement('a'); a.download = `${cat}_${ms}.png`; a.href = canvas.toDataURL('image/png'); a.click();
  } catch (e) { alert('导出失败'); }
  document.getElementById('loadingOverlay').classList.remove('active');
}

/* ================= Gitee 工具 ================= */
function getGiteeCfg() { try { return JSON.parse(localStorage.getItem(GITEE_CFG_KEY)) || {}; } catch (e) { return {}; } }
function saveGiteeCfg(cfg) { localStorage.setItem(GITEE_CFG_KEY, JSON.stringify(cfg)); }
function ledgerDirPath() { return LEDGER_DIR; }
function ledgerFileName() {
  const cfg = getGiteeCfg();
  let name = (cfg.ledgerFileName || '日历记账').trim();
  name = name.replace(/\.json$/i, '');
  return name || '日历记账';
}
function ledgerFilePath() { return `${LEDGER_DIR}/${ledgerFileName()}.json`; }
function encodeGiteePath(path) { return path.split('/').map(s => encodeURIComponent(s)).join('/'); }
async function giteeGet(path) {
  const cfg = getGiteeCfg();
  return fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${encodeURIComponent(cfg.token)}`);
}
async function giteePut(path, content, message, sha) {
  const cfg = getGiteeCfg();
  const body = { access_token: cfg.token, content, message: message || `同步 ${new Date().toLocaleString()}` };
  if (sha) body.sha = sha;
  return fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
async function giteeDelete(path, sha, message) {
  const cfg = getGiteeCfg();
  return fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: cfg.token, sha, message: message || `删除 ${new Date().toLocaleString()}` }) });
}
async function giteeListDir(dirPath) {
  const cfg = getGiteeCfg();
  const r = await fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(dirPath)}?access_token=${encodeURIComponent(cfg.token)}`);
  if (!r.ok) return null;
  return await r.json();
}
async function checkRemoteFileExists(fileName) {
  const list = await giteeListDir(ledgerDirPath());
  if (!Array.isArray(list)) return { exists: false, sha: null, name: fileName };
  const target = `${fileName}.json`;
  const hit = list.find(x => x.type === 'file' && x.name === target);
  return hit ? { exists: true, sha: hit.sha, name: fileName } : { exists: false, sha: null, name: fileName };
}
async function makeUniqueFileName(baseName) {
  const list = await giteeListDir(ledgerDirPath());
  const names = new Set((Array.isArray(list) ? list : []).map(x => x.name));
  let c = baseName, n = 2;
  while (names.has(`${c}.json`)) { c = `${baseName}-${n}`; n++; }
  return c;
}
function buildLedgerPayload() {
  return { _version: 8, _exportedAt: new Date().toISOString(), records, attendance: attendanceRecords, crewAttendance, crewList, advances, salaryPaid, loanRecords, dailySalary, overtimeRule };
}
function applyLedgerPayload(p) {
  if (!p) return false;
  records = p.records || [];
  attendanceRecords = p.attendance || {};
  crewAttendance = p.crewAttendance || {};
  crewList = p.crewList || [];
  advances = p.advances || [];
  salaryPaid = p.salaryPaid || {};
  loanRecords = p.loanRecords || [];
  dailySalary = p.dailySalary || {};
  overtimeRule = p.overtimeRule || {};
  saveRecords(); saveAttendance(); saveCrewAttendance(); saveCrewList();
  saveAdvances(); saveSalaryPaid(); saveLoanRecords(); saveDailySalary(); saveOvertimeRule();
  renderCalendar(); updateAdvanceSelect(); updateIncomeAdvanceSelect();
  return true;
}
function getLedgerLastId() {
  let max = 0;
  records.forEach(r => { if (r.id && r.id > max) max = r.id; });
  advances.forEach(a => { if (a.id && a.id > max) max = a.id; });
  loanRecords.forEach(l => { if (l.id && l.id > max) max = l.id; });
  return max;
}
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ================= Gitee 设置弹窗（带锁） ================= */
let gsetLocked = true;
let gsetLockTimer = null;
const GSET_LOCK_TIMEOUT = 10000;

function setGsetLocked(locked) {
  gsetLocked = locked;
  const mask = document.getElementById('gsetLockMask');
  const saveBtn = document.getElementById('gsetSave');
  const unlockBtn = document.getElementById('gsetUnlock');
  const lockIcon = document.getElementById('gsetLockIcon');
  const inputs = document.querySelectorAll('#giteeSet .gset-body input');
  if (locked) {
    mask.style.display = 'flex';
    saveBtn.disabled = true;
    unlockBtn.textContent = '● 开启';
    lockIcon.textContent = '🔒';
    inputs.forEach(i => i.disabled = true);
    if (gsetLockTimer) { clearTimeout(gsetLockTimer); gsetLockTimer = null; }
    const pass = document.getElementById('gsetPass');
    if (pass) pass.type = 'password';
    updateTokenEye();
  } else {
    mask.style.display = 'none';
    saveBtn.disabled = false;
    unlockBtn.textContent = '🔓 已解锁';
    lockIcon.textContent = '🔓';
    inputs.forEach(i => i.disabled = false);
  }
}
function scheduleAutoLock() {
  if (gsetLockTimer) clearTimeout(gsetLockTimer);
  if (gsetLocked) return;
  gsetLockTimer = setTimeout(() => setGsetLocked(true), GSET_LOCK_TIMEOUT);
}
function updateTokenEye() {
  const eye = document.getElementById('gsetPassEye');
  const pass = document.getElementById('gsetPass');
  if (!eye || !pass) return;
  if (pass.type === 'password') { eye.textContent = '👁'; eye.title = '显示 Token'; }
  else { eye.textContent = '🙈'; eye.title = '隐藏 Token'; }
}
function openGiteeSet() {
  const cfg = getGiteeCfg();
  document.getElementById('gsetUser').value = cfg.owner || '';
  document.getElementById('gsetPass').value = cfg.token || '';
  document.getElementById('gsetRepo').value = cfg.repo || '';
  document.getElementById('gsetDir').value = LEDGER_DIR;
  document.getElementById('gsetFile').value = cfg.ledgerFileName || '日历记账';
  document.getElementById('gsetMsg').textContent = '';
  document.getElementById('gsetMsg').classList.remove('err');
  document.getElementById('gsetPass').type = 'password';
  updateTokenEye();
  setGsetLocked(true);
  document.getElementById('giteeSet').classList.add('show');
}
function closeGiteeSet() {
  document.getElementById('giteeSet').classList.remove('show');
  if (gsetLockTimer) { clearTimeout(gsetLockTimer); gsetLockTimer = null; }
  setGsetLocked(true);
}
function gsetMsg(msg, isErr) {
  const el = document.getElementById('gsetMsg');
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
}

/* ================= Gitee 同步弹窗 ================= */
function openSyncPanel() {
  const cfg = getGiteeCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) { showToast('请先在 ⌘ 面板 → Gitee 设置'); return; }
  document.getElementById('syncInfo').innerHTML = `账号：<b>${escapeHtml(cfg.owner)}</b><br>仓库：<b>${escapeHtml(cfg.repo)}</b><br>文件夹：<b>${LEDGER_DIR}</b><br>文件名：<b>${escapeHtml(ledgerFileName())}.json</b>`;
  document.getElementById('syncMsg').textContent = '';
  document.getElementById('syncMsg').classList.remove('err');
  document.getElementById('syncFileListWrap').style.display = 'none';
  document.getElementById('syncFileList').innerHTML = '';
  document.getElementById('syncPanel').classList.add('show');
}
function closeSyncPanel() { document.getElementById('syncPanel').classList.remove('show'); }
function syncMsg(msg, isErr) {
  const el = document.getElementById('syncMsg');
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
}

async function doSyncUpload() {
  const cfg = getGiteeCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) { syncMsg('请先保存设置', true); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const prefix = prompt('请输入文件名前缀（比如 A厂、日历记账）：', '');
    if (!prefix) { syncMsg('已取消上传', true); return; }
    const trimmedPrefix = prefix.trim();
    if (!trimmedPrefix) { syncMsg('文件名前缀不能为空', true); return; }
    const btn = document.getElementById('syncUpload');
    btn.disabled = true;
    syncMsg('⏳ 正在读取文件…');
    try {
      const text = await file.text();
      try { JSON.parse(text); } catch (e) { throw new Error('文件不是有效 JSON'); }
      const dir = ledgerDirPath();
      const dateStr = getTodayStr();
      syncMsg('⏳ 正在检查远端文件…');
      const useFixed = confirm(
        `是否使用设置里的固定文件名？\n当前文件名：${ledgerFileName()}.json\n\n` +
        `点「确定」= 用固定名（会查重）\n` +
        `点「取消」= 用「前缀-日期T序号.json」自动命名`
      );
      let fileName;
      if (useFixed) {
        const baseName = ledgerFileName();
        const check = await checkRemoteFileExists(baseName);
        if (check.exists) {
          const choice = prompt(
            `远端已存在：我的数据库/${baseName}.json\n\n` +
            `输入「覆盖」= 覆盖\n` +
            `输入「改名」= 自动换名\n` +
            `其他 = 取消`,
            '覆盖'
          );
          if (choice === null) { syncMsg('已取消上传', true); btn.disabled = false; return; }
          const c = choice.trim();
          if (c === '覆盖') fileName = `${baseName}.json`;
          else if (c === '改名') fileName = `${await makeUniqueFileName(baseName)}.json`;
          else { syncMsg('已取消上传', true); btn.disabled = false; return; }
        } else {
          fileName = `${baseName}.json`;
        }
      } else {
        let existingNames = [];
        const list = await giteeListDir(dir);
        if (Array.isArray(list)) existingNames = list.map(x => x.name);
        let num = 1;
        while (true) {
          fileName = `${trimmedPrefix}-${dateStr}T${num}.json`;
          if (!existingNames.includes(fileName)) break;
          num++;
        }
      }
      const fullPath = dir ? `${dir}/${fileName}` : fileName;
      syncMsg(`⏳ 正在上传：${fileName}…`);
      const contentB64 = btoa(unescape(encodeURIComponent(text)));
      const r = await giteePut(fullPath, contentB64, `上传 ${fileName}`);
      if (r.ok) {
        syncMsg(`✅ 上传成功\n文件名：${fileName}\n大小：${(text.length/1024).toFixed(1)} KB`);
      } else {
        const err = await r.text();
        syncMsg(`❌ 上传失败：${r.status}\n${err}`, true);
      }
    } catch (e) {
      syncMsg('❌ 出错：' + e.message, true);
    }
    btn.disabled = false;
  };
  input.click();
}

async function doSyncDownload() {
  const cfg = getGiteeCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) { syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncDownload');
  btn.disabled = true;
  syncMsg('⏳ 正在读取远端文件列表…');
  try {
    const dir = ledgerDirPath();
    const list = await giteeListDir(dir);
    if (!list || !Array.isArray(list)) {
      syncMsg('❌ 无法列出目录（可能目录为空或路径不对）', true);
      btn.disabled = false;
      return;
    }
    const files = list.filter(x => x.type === 'file' && /\.json$/i.test(x.name)).sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (!files.length) { syncMsg('ℹ️ 目录里还没有 JSON 文件'); btn.disabled = false; return; }
    syncMsg(`📂 共 ${files.length} 个文件，点选要下载的：`);
    document.getElementById('syncFileListWrap').style.display = 'block';
    const listEl = document.getElementById('syncFileList');
    listEl.innerHTML = files.map((f, i) => {
      const size = f.size ? `${(f.size/1024).toFixed(1)} KB` : '';
      return `<div class="file-item" data-fi="${i}"><span class="fi-name">${escapeHtml(f.name)}</span><span class="fi-meta">${size}</span></div>`;
    }).join('');
    listEl._files = files;
    listEl._dir = dir;
  } catch (e) {
    syncMsg('❌ 出错：' + e.message, true);
  }
  btn.disabled = false;
}

let dlTargetFile = null;
let dlTargetDir = '';

function openDownloadChoice(file, dir) {
  dlTargetFile = file;
  dlTargetDir = dir;
  document.getElementById('dlName').textContent = file.name;
  document.getElementById('dlMeta').textContent = file.size ? `${(file.size/1024).toFixed(1)} KB` : '';
  document.getElementById('dlChoice').classList.add('show');
}
function closeDownloadChoice() {
  document.getElementById('dlChoice').classList.remove('show');
  dlTargetFile = null;
  dlTargetDir = '';
}
async function downloadFileToPhone() {
  if (!dlTargetFile) return;
  const file = dlTargetFile, dir = dlTargetDir;
  closeDownloadChoice();
  syncMsg('⏳ 正在下载文件…');
  try {
    const cfg = getGiteeCfg();
    const fullPath = dir ? `${dir}/${file.name}` : file.name;
    const r = await fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(fullPath)}?access_token=${encodeURIComponent(cfg.token)}`);
    if (!r.ok) { syncMsg(`❌ 下载失败：${r.status}`, true); return; }
    const data = await r.json();
    let text = '';
    try { text = decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))); } catch (e) { text = ''; }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    syncMsg(`✅ 已下载到手机：${file.name}`);
  } catch (e) {
    syncMsg('❌ 下载出错：' + e.message, true);
  }
}
async function importFileToLedger() {
  if (!dlTargetFile) return;
  const file = dlTargetFile, dir = dlTargetDir;
  if (!confirm(`确定用「${file.name}」覆盖当前日历记账数据？\n\n当前记录会被替换。`)) return;
  closeDownloadChoice();
  syncMsg('⏳ 正在读取文件…');
  try {
    const cfg = getGiteeCfg();
    const fullPath = dir ? `${dir}/${file.name}` : file.name;
    const r = await fetch(`${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(fullPath)}?access_token=${encodeURIComponent(cfg.token)}`);
    if (!r.ok) { syncMsg(`❌ 读取失败：${r.status}`, true); return; }
    const data = await r.json();
    let text = '';
    try { text = decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))); } catch (e) { text = ''; }
    const payload = JSON.parse(text);
    if (!payload) { syncMsg('❌ 文件格式错误', true); return; }
    applyLedgerPayload(payload);
    syncMsg(`✅ 已导入（${records.length} 条记账）`);
    showToast('✅ 已导入日历记账');
  } catch (e) {
    syncMsg('❌ 导入出错：' + e.message, true);
  }
}
async function doSyncNow() {
  const cfg = getGiteeCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) { syncMsg('请先保存设置', true); return; }
  const btn = document.getElementById('syncNow');
  btn.disabled = true;
  syncMsg('⏳ 正在检查远端…');
  try {
    const path = ledgerFilePath();
    const url = `${GITEE_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGiteePath(path)}?access_token=${encodeURIComponent(cfg.token)}`;
    let remote = null;
    try {
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        let text = '';
        try { text = decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))); } catch (e) { text = ''; }
        const t = (text || '').trim();
        if (t && t !== '{}') { try { remote = JSON.parse(text); } catch (e) { remote = null; } }
      }
    } catch (e) {}
    if (!remote || !Array.isArray(remote.records)) {
      syncMsg('远端没有有效数据，正在新建备份…');
      btn.disabled = false;
      await doSyncNowUpload(true);
      return;
    }
    const localLastId = getLedgerLastId();
    const remoteLastId = (() => {
      let max = 0;
      (remote.records || []).forEach(r => { if (r.id && r.id > max) max = r.id; });
      (remote.advances || []).forEach(a => { if (a.id && a.id > max) max = a.id; });
      (remote.loanRecords || []).forEach(l => { if (l.id && l.id > max) max = l.id; });
      return max;
    })();
    if (remoteLastId > localLastId) {
      const use = confirm(`远端数据较新：\n本地最新记录 id: ${localLastId}\n远端最新记录 id: ${remoteLastId}\n\n点「确定」= 用远端覆盖本地\n点「取消」= 用本地覆盖远端（会再问一次）`);
      if (use) {
        applyLedgerPayload(remote);
        syncMsg(`✅ 已下载远端数据（${records.length} 条）`);
        showToast('✅ 已同步');
      } else {
        btn.disabled = false;
        await doSyncNowUpload(false);
        return;
      }
    } else {
      btn.disabled = false;
      await doSyncNowUpload(false);
      return;
    }
  } catch (e) {
    syncMsg('❌ 同步出错：' + e.message, true);
  }
  btn.disabled = false;
}
async function doSyncNowUpload(skipConfirm) {
  const cfg = getGiteeCfg();
  if (!cfg.owner || !cfg.token || !cfg.repo) { syncMsg('请先保存设置', true); return; }
  const baseName = ledgerFileName();
  const check = await checkRemoteFileExists(baseName);
  let finalName = baseName;
  if (check.exists && !skipConfirm) {
    const choice = prompt(
      `远端已存在同名文件：\n我的数据库/${baseName}.json\n\n` +
      `输入「覆盖」= 覆盖远端文件\n` +
      `输入「改名」= 自动换一个不冲突的名字\n` +
      `其他任意输入 = 取消上传`,
      '覆盖'
    );
    if (choice === null) { syncMsg('已取消上传'); return; }
    const c = choice.trim();
    if (c === '覆盖') { /* keep */ }
    else if (c === '改名') { finalName = await makeUniqueFileName(baseName); syncMsg(`将使用新文件名：${finalName}.json`); }
    else { syncMsg('已取消上传'); return; }
  }
  const path = `${LEDGER_DIR}/${finalName}.json`;
  let sha = null;
  try {
    const r1 = await giteeGet(path);
    if (r1.ok) { const data = await r1.json(); sha = data.sha; }
  } catch (e) {}
  if (sha && !skipConfirm) {
    const tmpText = JSON.stringify(buildLedgerPayload(), null, 2);
    const ok = confirm(`远端已存在文件：\n${path}\n\n本地当前 ${records.length} 条记账\n本次将上传大小约 ${(tmpText.length/1024).toFixed(1)} KB\n\n是否覆盖远端？`);
    if (!ok) { syncMsg('已取消上传'); return; }
  }
  if (sha) {
    syncMsg('⏳ 正在删除旧文件…');
    const rd = await giteeDelete(path, sha);
    if (!rd.ok) {
      const err = await rd.text();
      syncMsg(`❌ 删除旧文件失败：${rd.status}\n${err}`, true);
      return;
    }
  }
  syncMsg('⏳ 正在上传新文件…');
  const text = JSON.stringify(buildLedgerPayload(), null, 2);
  const content = btoa(unescape(encodeURIComponent(text)));
  const r2 = await giteePut(path, content, `同步 ${new Date().toLocaleString()}`);
  if (r2.ok) {
    syncMsg(`✅ 上传成功（${sha ? '已覆盖' : '新建'}）\n路径：${path}\n大小：${(text.length/1024).toFixed(1)} KB`);
    showToast('✅ 已同步到 Gitee');
  } else {
    const err = await r2.text();
    syncMsg(`❌ 上传失败：${r2.status}\n${err}`, true);
  }
}

/* ================= ⌘ 命令面板 ================= */
function openCmd() { document.getElementById('cmdPanel').classList.add('show'); }
function closeCmd() { document.getElementById('cmdPanel').classList.remove('show'); }
function openClearData() {
  closeCmd();
  setTimeout(() => {
    const input = prompt(`⚠️ 清空全部数据？\n\n将删除：\n· ${records.length} 条记账\n· ${Object.keys(attendanceRecords).length} 条考勤\n· ${advances.length} 条预支\n· ${loanRecords.length} 条借贷\n\n此操作不可撤销！\n如果确定，请输入「清空」两个字：`);
    if (input === null) return;
    if (input.trim() !== '清空') { showToast('已取消'); return; }
    if (!confirm('最后确认：清空所有数据？\n\n确定后不可恢复。')) return;
    records = []; attendanceRecords = {}; crewAttendance = {}; advances = [];
    salaryPaid = {}; loanRecords = []; dailySalary = {}; overtimeRule = {};
    saveRecords(); saveAttendance(); saveCrewAttendance();
    saveAdvances(); saveSalaryPaid(); saveLoanRecords();
    saveDailySalary(); saveOvertimeRule();
    renderCalendar(); updateAdvanceSelect(); updateIncomeAdvanceSelect();
    showToast('✅ 已清空全部数据');
  }, 100);
}

/* ================= 事件绑定 ================= */
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
document.getElementById('addAdvanceBtn').addEventListener('click', addAdvance);
document.getElementById('addIncomeBtn').addEventListener('click', addIncome);
document.getElementById('addLoanBtn').addEventListener('click', addLoan);
document.getElementById('clearFormBtn').addEventListener('click', clearAllForms);
document.getElementById('clearFormBtn2').addEventListener('click', clearAllForms);
document.getElementById('clearIncomeBtn').addEventListener('click', clearAllForms);
document.getElementById('clearLoanBtn').addEventListener('click', clearAllForms);
document.getElementById('openAttendanceBtn').addEventListener('click', openAttendance);
document.getElementById('openAttendanceBtn2').addEventListener('click', openAttendance);
document.getElementById('openAttendanceBtn3').addEventListener('click', openAttendance);
document.getElementById('openAttendanceBtn4').addEventListener('click', openAttendance);
document.getElementById('switchExpense').addEventListener('click', () => switchForm('expense'));
document.getElementById('switchAdvance').addEventListener('click', () => switchForm('advance'));
document.getElementById('switchIncome').addEventListener('click', () => switchForm('income'));
document.getElementById('switchLoan').addEventListener('click', () => switchForm('loan'));
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });
document.getElementById('modalContent').addEventListener('touchmove', e => e.stopPropagation(), { passive: false });

attendanceModal = document.getElementById('attendanceModal');
document.getElementById('batchFull').addEventListener('click', () => batchSetCrew('full'));
document.getElementById('batchHalf').addEventListener('click', () => batchSetCrew('half'));
document.getElementById('batchOvertime').addEventListener('click', () => batchSetCrew('overtime'));
document.getElementById('batchRest').addEventListener('click', () => batchSetCrew('rest'));
document.getElementById('selectAllCrew').addEventListener('change', e => { document.querySelectorAll('#crewTable .crew-check').forEach(cb => cb.checked = e.target.checked); });
document.getElementById('addCrewMemberBtn').addEventListener('click', () => {
  const name = prompt('请输入人员姓名：');
  if (name && name.trim()) {
    if (crewList.includes(name.trim())) { alert('该人员已存在！'); return; }
    crewList.push(name.trim()); saveCrewList();
    if (document.getElementById('crewMode').style.display !== 'none') renderCrewTable();
    renderCalendar();
    showToast('✅ 已添加 ' + name);
  }
});
document.getElementById('closeAttendanceModal').addEventListener('click', () => attendanceModal.classList.remove('active'));
attendanceModal.addEventListener('click', e => { if (e.target === attendanceModal) attendanceModal.classList.remove('active'); });
document.getElementById('lockStatus').addEventListener('click', () => { if (crewLocked) unlockCrew(); });
document.getElementById('attendanceOptions').addEventListener('click', e => {
  const opt = e.target.closest('.attendance-option');
  if (!opt) return;
  if (e.target.classList.contains('opt-input')) { selectedAttType = opt.dataset.type; updateAttUI(); return; }
  selectedAttType = opt.dataset.type; updateAttUI();
});
document.querySelectorAll('.attendance-option .opt-input').forEach(input => {
  input.addEventListener('focus', e => { const opt = e.target.closest('.attendance-option'); if (opt) { selectedAttType = opt.dataset.type; updateAttUI(); } });
});
document.getElementById('overtimeRuleMode').addEventListener('change', toggleOvertimeHoursVisibility);
document.getElementById('attendanceProject').addEventListener('change', () => {
  const p = document.getElementById('attendanceProject').value.trim() || '未分类';
  const r = getOvertimeRule(p);
  document.getElementById('overtimeRuleMode').value = r.mode;
  document.getElementById('overtimeRuleHours').value = r.hours || 3;
  toggleOvertimeHoursVisibility();
});
document.getElementById('attendanceProject').addEventListener('blur', () => {
  const p = document.getElementById('attendanceProject').value.trim() || '未分类';
  const r = getOvertimeRule(p);
  document.getElementById('overtimeRuleMode').value = r.mode;
  document.getElementById('overtimeRuleHours').value = r.hours || 3;
  toggleOvertimeHoursVisibility();
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
  renderCrewTable(); unlockCrew();
});
document.getElementById('personMenuEdit').addEventListener('click', () => { if (currentSelectedPerson) editCrewMember(currentSelectedPerson); closePersonMenu(); });
document.getElementById('personMenuDelete').addEventListener('click', () => { if (currentSelectedPerson) deleteCrewMember(currentSelectedPerson); closePersonMenu(); });
document.getElementById('personMenuCancel').addEventListener('click', closePersonMenu);
document.getElementById('personMenuModal').addEventListener('click', e => { if (e.target === document.getElementById('personMenuModal')) closePersonMenu(); });

document.getElementById('importFileInput').addEventListener('change', e => { if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; } });

document.getElementById('closeMonthSelect').addEventListener('click', () => document.getElementById('monthSelectModal').classList.remove('active'));
document.getElementById('selectAllMonths').addEventListener('click', () => document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = true));
document.getElementById('deselectAllMonths').addEventListener('click', () => document.querySelectorAll('#monthList input[type="checkbox"]').forEach(cb => cb.checked = false));
document.getElementById('confirmExportBtn').addEventListener('click', () => {
  const checked = Array.from(document.querySelectorAll('#monthList input[type="checkbox"]:checked')).map(cb => cb.value);
  document.getElementById('monthSelectModal').classList.remove('active');
  exportSelectedMonths(checked);
});

/* Gitee / 命令面板 */
document.getElementById('giteeBtn').addEventListener('click', openSyncPanel);
document.getElementById('cmdBtn').addEventListener('click', openCmd);
document.getElementById('cmdClose').addEventListener('click', closeCmd);
document.getElementById('cmdPanel').addEventListener('click', e => { if (e.target === document.getElementById('cmdPanel')) closeCmd(); });
document.getElementById('cmdExport').addEventListener('click', () => {
  closeCmd();
  document.getElementById('monthList').innerHTML = getAvailableMonths().map(m => {
    const [y, mo] = m.split('-');
    return `<div class="month-item"><input type="checkbox" id="chk_${m}" value="${m}" checked><label for="chk_${m}">${y}年${mo}月</label></div>`;
  }).join('');
  document.getElementById('monthSelectModal').classList.add('active');
});
document.getElementById('cmdImport').addEventListener('click', () => { closeCmd(); document.getElementById('importFileInput').click(); });
document.getElementById('cmdGiteeSync').addEventListener('click', () => { closeCmd(); openSyncPanel(); });
document.getElementById('cmdGiteeSet').addEventListener('click', () => { closeCmd(); openGiteeSet(); });
document.getElementById('cmdClear').addEventListener('click', openClearData);

/* 同步弹窗 */
document.getElementById('syncClose').addEventListener('click', closeSyncPanel);
document.getElementById('syncPanel').addEventListener('click', e => { if (e.target === document.getElementById('syncPanel')) closeSyncPanel(); });
document.getElementById('syncNow').addEventListener('click', () => { document.getElementById('syncFileListWrap').style.display = 'none'; doSyncNow(); });
document.getElementById('syncUpload').addEventListener('click', () => { document.getElementById('syncFileListWrap').style.display = 'none'; doSyncUpload(); });
document.getElementById('syncDownload').addEventListener('click', () => { document.getElementById('syncFileListWrap').style.display = 'none'; doSyncDownload(); });
document.getElementById('syncFileList').addEventListener('click', e => {
  const item = e.target.closest('.file-item');
  if (!item) return;
  const listEl = document.getElementById('syncFileList');
  const i = parseInt(item.dataset.fi, 10);
  const f = (listEl._files || [])[i];
  if (!f) return;
  openDownloadChoice(f, listEl._dir || '');
});

/* 下载选择 */
document.getElementById('dlCancel').addEventListener('click', closeDownloadChoice);
document.getElementById('dlChoice').addEventListener('click', e => { if (e.target === document.getElementById('dlChoice')) closeDownloadChoice(); });
document.getElementById('dlToPhone').addEventListener('click', downloadFileToPhone);
document.getElementById('dlToLib').addEventListener('click', importFileToLedger);

/* 设置弹窗 */
document.getElementById('gsetClose').addEventListener('click', closeGiteeSet);
document.getElementById('giteeSet').addEventListener('click', e => { if (e.target === document.getElementById('giteeSet')) closeGiteeSet(); });
document.getElementById('gsetUnlock').addEventListener('click', () => {
  if (gsetLocked) { setGsetLocked(false); scheduleAutoLock(); }
  else setGsetLocked(true);
});
document.getElementById('gsetPassEye').addEventListener('click', () => {
  if (gsetLocked) return;
  const pass = document.getElementById('gsetPass');
  if (pass.type === 'password') { pass.type = 'text'; updateTokenEye(); scheduleAutoLock(); }
  else { pass.type = 'password'; updateTokenEye(); scheduleAutoLock(); }
});
document.querySelectorAll('#giteeSet .gset-body input').forEach(inp => {
  inp.addEventListener('input', () => { if (!gsetLocked) scheduleAutoLock(); });
  inp.addEventListener('focus', () => { if (!gsetLocked) scheduleAutoLock(); });
});
document.getElementById('gsetSave').addEventListener('click', () => {
  if (gsetLocked) { gsetMsg('请先点「● 开启」解锁', true); return; }
  const owner = document.getElementById('gsetUser').value.trim();
  const token = document.getElementById('gsetPass').value.trim();
  const repo = document.getElementById('gsetRepo').value.trim();
  let fileName = document.getElementById('gsetFile').value.trim().replace(/\.json$/i, '');
  if (!owner) { gsetMsg('请填写 Gitee 用户名', true); return; }
  if (!token) { gsetMsg('请填写私人令牌', true); return; }
  if (!repo) { gsetMsg('请填写仓库名', true); return; }
  if (!fileName) { gsetMsg('请填写文件名', true); return; }
  const cfg = getGiteeCfg();
  saveGiteeCfg({ ...cfg, owner, token, repo, ledgerFileName: fileName });
  gsetMsg('✅ 已保存设置');
  scheduleAutoLock();
});

/* 快捷键 */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('cmdPanel').classList.contains('show')) closeCmd();
    if (document.getElementById('syncPanel').classList.contains('show')) closeSyncPanel();
    if (document.getElementById('giteeSet').classList.contains('show')) closeGiteeSet();
    if (document.getElementById('dlChoice').classList.contains('show')) closeDownloadChoice();
  }
});

document.getElementById('prevMonth').addEventListener('click', () => { if (currentMonth === 1) { currentMonth = 12; currentYear--; } else currentMonth--; renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { if (currentMonth === 12) { currentMonth = 1; currentYear++; } else currentMonth++; renderCalendar(); });

window.startEdit = i => { document.getElementById(`catName_${i}`).style.display = 'none'; document.getElementById(`editRow_${i}`).style.display = 'flex'; document.getElementById(`editInput_${i}`).focus(); };
window.cancelEdit = i => { document.getElementById(`catName_${i}`).style.display = 'inline'; document.getElementById(`editRow_${i}`).style.display = 'none'; };
window.confirmRename = (old, i) => renameCategory(old, document.getElementById(`editInput_${i}`).value);
window.exportCategoryToImage = exportCategoryToImage;

/* 启动 */
const now = new Date();
currentYear = now.getFullYear();
currentMonth = now.getMonth() + 1;
loadRecords(); loadAttendance(); loadCrewList(); loadCrewAttendance();
loadAdvances(); loadSalaryPaid(); loadLoanRecords(); loadDailySalary(); loadOvertimeRule(); loadLastInput();
renderCalendar();
updateAdvanceSelect();
updateIncomeAdvanceSelect();
