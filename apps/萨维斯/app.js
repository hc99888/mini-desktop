
        // 主应用程序
        const App = {
            // 初始化
            init() {
                this.certificates = JSON.parse(localStorage.getItem('bankCertificates')) || [];
                this.editingId = null;
                this.currentMonthForCert = {};
                this.lockedCertificates = JSON.parse(localStorage.getItem('lockedCertificates')) || [];
                this.memoContent = localStorage.getItem('bankMemo') || '';
                this.isEditLocked = true;  // 默认锁定状态
                this.autoLockTimer = null;  // 自动锁定计时器
                this.lockTimeout = 30000;   // 30秒无操作锁定
                this.isModalOpen = false;   // 模态框状态
                
                // 设置默认日期
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const oneYearLater = new Date();
                oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                const oneYearLaterStr = oneYearLater.toISOString().split('T')[0];
                
                document.getElementById('depositDate').value = todayStr;
                document.getElementById('maturityDate').value = oneYearLaterStr;
                
                // 初始化续存选项状态
                this.initializeRenewalOption();
                
                // 初始化备忘录
                document.getElementById('memoContent').value = this.memoContent;
                this.updateMemoStats();
                
                // 加载数据
                this.loadCertificates();
                this.updateAllStats();
                this.initializeButtonStates();
                this.bindEvents();
                
                // 设置活动监听器
                this.setupActivityListeners();
                
                // 在初始化完成后，默认隐藏指定按钮（因为isEditLocked为true）
                document.getElementById('addCertificateBtn').classList.add('hidden');
                document.getElementById('refreshBtn').classList.add('hidden');
                document.getElementById('memoBtn').classList.add('hidden');
                document.getElementById('settingsBtn').classList.add('hidden');
                document.getElementById('helpBtn').classList.add('hidden');
                
                // 初始化后自动刷新一下
                setTimeout(() => {
                    this.autoRefresh();
                }, 500);
            },
            
	            // 自动刷新（用于初始化、添加、编辑后）
	            autoRefresh() {
                // 从localStorage重新加载数据以确保最新状态
                this.certificates = JSON.parse(localStorage.getItem('bankCertificates')) || [];
                
                // 刷新时也要对续存类型的存单重新计算利息
                this.certificates = this.certificates.map(cert => {
                    if (cert.duration === '续存') {
                        const startDate = new Date(cert.startDate || cert.depositDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        startDate.setHours(0, 0, 0, 0);
                        
                        // 计算实际天数差
                        const timeDiff = Math.max(0, today.getTime() - startDate.getTime()); // 确保不会是负数
                        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                        
                        // 根据实际天数重新计算利息
                        const principal = parseFloat(cert.amount) || parseFloat(cert.amount.toString().replace(/[^\d.-]/g, ''));
                        const annualRate = parseFloat(cert.interestRate) / 100;
                        const recalculatedInterest = principal * annualRate * (dayDiff / 365);
                        
                        // 更新状态和剩余天数
                        let status = cert.status;
                        let daysLeft = cert.daysLeft;
                        
                        // 对于续存类型，我们使用特殊的状态判断
                        status = 'renewal';
                        daysLeft = 9999; // 续存用9999表示无限期
                        
                        return {
                            ...cert,
                            calculatedInterest: recalculatedInterest,
                            interest: recalculatedInterest.toFixed(2),
                            daysLeft: daysLeft,
                            status: status
                        };
                    } else {
                        // 对于非续存类型，重新计算状态和剩余天数
                        const maturityDateObj = this.parseDateYYYYMMDD(cert.maturityDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysUntilMaturity = Math.floor((maturityDateObj - today) / (1000 * 60 * 60 * 24));
                        
                        return {
                            ...cert,
                            daysLeft: daysUntilMaturity,
                            status: this.getCertificateStatus(daysUntilMaturity, cert.reminderDays)
                        };
                    }
                });
                
                this.saveToLocalStorage(); // 保存更新后的利息计算结果
                this.loadCertificates();
                this.updateAllStats();
            },
            
            // 设置活动监听器
            setupActivityListeners() {
                // 监听所有用户活动事件
                const activityEvents = [
                    'click',        // 鼠标点击
                    'touchstart',   // 触摸开始（移动端）
                    'touchmove',    // 触摸移动
                    'keydown',      // 键盘按下
                    'keyup',        // 键盘松开
                    'input',        // 输入框输入
                    'change',       // 表单改变
                    'scroll',       // 滚动
                    'mousedown',    // 鼠标按下
                    'mousemove'     // 鼠标移动
                ];
                
                // 添加全局活动监听
                activityEvents.forEach(eventType => {
                    document.addEventListener(eventType, () => {
                        this.handleUserActivity();
                    }, { passive: true });
                });
                
                // 特别处理模态框内的事件
                const modal = document.getElementById('certificateModal');
                if (modal) {
                    activityEvents.forEach(eventType => {
                        modal.addEventListener(eventType, () => {
                            this.handleUserActivity();
                        }, { passive: true });
                    });
                }
                
                // 监听其他模态框内的活动
                const otherModals = ['memoModal', 'settingsModal', 'restoreModal', 'exportModal', 'helpModal'];
                otherModals.forEach(modalId => {
                    const modalEl = document.getElementById(modalId);
                    if (modalEl) {
                        activityEvents.forEach(eventType => {
                            modalEl.addEventListener(eventType, () => {
                                this.handleUserActivity();
                            }, { passive: true });
                        });
                    }
                });
            },
            
            // 处理用户活动
            handleUserActivity() {
                if (!this.isEditLocked && !this.isModalOpen) {
                    this.resetAutoLockTimer();
                }
            },
            
            // 重置自动锁定计时器
            resetAutoLockTimer() {
                // 清除现有的计时器
                if (this.autoLockTimer) {
                    clearTimeout(this.autoLockTimer);
                    this.autoLockTimer = null;
                }
                
                // 设置新的计时器
                this.autoLockTimer = setTimeout(() => {
                    if (!this.isEditLocked && !this.isModalOpen) {
                        this.executeAutoLock();
                    }
                }, this.lockTimeout);
            },
            
            // 执行自动锁定
            executeAutoLock() {
                if (!this.isEditLocked && !this.isModalOpen) {
                    this.toggleLockMode();
                    this.showMessage('因30秒无操作，编辑功能已自动锁定', 'info');
                }
            },
            
            // 初始化续存选项
            initializeRenewalOption() {
                const durationSelect = document.getElementById('duration');
                const maturityDateInput = document.getElementById('maturityDate');
                
                // 初始检查
                this.updateMaturityDateFieldState();
                
                // 监听存款期限变化
                durationSelect.addEventListener('change', () => {
                    this.updateMaturityDateFieldState();
                });
            },
            
            // 更新到期日期字段状态
            updateMaturityDateFieldState() {
                const durationSelect = document.getElementById('duration');
                const maturityDateInput = document.getElementById('maturityDate');
                const depositDateInput = document.getElementById('depositDate');
                
                if (durationSelect.value === '续存') {
                    // 续存情况下，清空到期日期字段
                    maturityDateInput.value = '';
                    maturityDateInput.disabled = true;
                    maturityDateInput.required = false;
                    maturityDateInput.placeholder = '续存中';
                    maturityDateInput.style.backgroundColor = '#f8fafc';
                    maturityDateInput.style.cursor = 'not-allowed';
                    
                    // 如果存入日期为空，设置为今天
                    if (!depositDateInput.value) {
                        const today = new Date();
                        const todayStr = today.toISOString().split('T')[0];
                        depositDateInput.value = todayStr;
                    }
                } else {
                    // 非续存情况，启用到期日期字段
                    maturityDateInput.disabled = false;
                    maturityDateInput.required = true;
                    maturityDateInput.placeholder = '到期日期';
                    maturityDateInput.style.backgroundColor = '';
                    maturityDateInput.style.cursor = 'text';
                    
                    // 计算到期日期
                    if (depositDateInput.value) {
                        this.calculateMaturityDate();
                    }
                }
            },
            
            // 计算到期日期
            calculateMaturityDate() {
                const depositDate = document.getElementById('depositDate').value;
                const duration = document.getElementById('duration').value;
                
                if (!depositDate) return;
                
                if (duration === '续存') {
                    return; // 续存不计算到期日期
                }
                
                const startDate = new Date(depositDate);
                let endDate = new Date(startDate);
                
                switch(duration) {
                    case '3个月':
                        endDate.setMonth(endDate.getMonth() + 3);
                        break;
                    case '6个月':
                        endDate.setMonth(endDate.getMonth() + 6);
                        break;
                    case '1年':
                        endDate.setFullYear(endDate.getFullYear() + 1);
                        break;
                    case '2年':
                        endDate.setFullYear(endDate.getFullYear() + 2);
                        break;
                    case '3年':
                        endDate.setFullYear(endDate.getFullYear() + 3);
                        break;
                    case '5年':
                        endDate.setFullYear(endDate.getFullYear() + 5);
                        break;
                    default:
                        endDate.setFullYear(endDate.getFullYear() + 1);
                }
                
                // 格式化日期为 YYYY-MM-DD
                const formattedEndDate = endDate.toISOString().split('T')[0];
                document.getElementById('maturityDate').value = formattedEndDate;
            },
            
            // 切换自定义银行输入框的显示/隐藏
            toggleCustomBankInput() {
                const bankSelect = document.getElementById('bankName');
                const customBankGroup = document.getElementById('customBankGroup');
                const customBankInput = document.getElementById('customBankName');
                
                if (bankSelect.value === 'custom') {
                    customBankGroup.classList.remove('hidden');
                    customBankInput.focus();
                } else {
                    customBankGroup.classList.add('hidden');
                    customBankInput.value = ''; // 清空自定义银行名称
                }
            },
            
            // 绑定所有事件
            bindEvents() {
                // 按钮事件
                document.getElementById('addCertificateBtn').addEventListener('click', () => this.openModal());
                document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
                document.getElementById('lockToggleBtn').addEventListener('click', () => this.toggleLockMode());
                document.getElementById('memoBtn').addEventListener('click', () => this.openMemoModal());
                document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
                document.getElementById('helpBtn').addEventListener('click', () => this.openHelpModal());
                
                // 模态框事件
                document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
                document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
                document.getElementById('certificateForm').addEventListener('submit', (e) => this.saveCertificate(e));
                
                // 存款日期变化时重新计算到期日期
                document.getElementById('depositDate').addEventListener('change', () => {
                    this.calculateMaturityDate();
                });
                
                // 存款期限变化时
                document.getElementById('duration').addEventListener('change', () => {
                    this.updateMaturityDateFieldState();
                });
                
                // 银行名称选择变化时
                document.getElementById('bankName').addEventListener('change', () => {
                    this.toggleCustomBankInput();
                });
                
                // 锁相关
                document.getElementById('closeLockModalBtn').addEventListener('click', () => this.closeLockModal());
                document.getElementById('cancelLockBtn').addEventListener('click', () => this.closeLockModal());
                document.getElementById('unlockBtn').addEventListener('click', () => this.unlockCertificate());
                
                // 备忘录相关
                document.getElementById('closeMemoModalBtn').addEventListener('click', () => this.closeMemoModal());
                document.getElementById('saveMemoBtn').addEventListener('click', () => this.saveMemo());
                document.getElementById('timeMemoBtn').addEventListener('click', () => this.insertTimeToMemo());
                document.getElementById('splitMemoBtn').addEventListener('click', () => this.insertSplitLineToMemo());
                document.getElementById('memoContent').addEventListener('input', () => this.updateMemoStats());
                
                // 设置相关
                document.getElementById('closeSettingsModalBtn').addEventListener('click', () => this.closeSettingsModal());
                document.getElementById('restoreDataOption').addEventListener('click', () => {
                    if (typeof AndroidInterface !== 'undefined') {
                        // 在Android环境中，使用原生接口
                        AndroidInterface.selectFileForRestore();
                        this.closeSettingsModal(); // 关闭设置模态框
                    } else {
                        // 在网页环境中，使用传统方式打开恢复数据模态框
                        this.openRestoreModal();
                    }
                });
                document.getElementById('exportDataOption').addEventListener('click', () => this.openExportModal());
                document.getElementById('clearDataOption').addEventListener('click', () => this.clearAllData());
                
                // 恢复数据相关
                document.getElementById('closeRestoreModalBtn').addEventListener('click', () => this.closeRestoreModal());
                document.getElementById('cancelRestoreBtn').addEventListener('click', () => this.closeRestoreModal());
                document.getElementById('restoreDataConfirmBtn').addEventListener('click', () => this.restoreData());
                document.getElementById('jsonFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
                
                // 导出数据相关
                document.getElementById('closeExportModalBtn').addEventListener('click', () => this.closeExportModal());
                document.getElementById('cancelExportBtn').addEventListener('click', () => this.closeExportModal());
                
                // 帮助相关
                document.getElementById('closeHelpModalBtn').addEventListener('click', () => this.closeHelpModal());
                
                // 滚动事件
                document.getElementById('certificatesContainer').addEventListener('scroll', () => this.updateActiveDotOnScroll());
                
                // 模态框外部点击关闭
                this.setupModalCloseListeners();
                
                // 初始提醒
                setTimeout(() => {
                    this.checkExpiringCertificates();
                }, 1000);
            },
            
            // 文件导出管理器
            FileExportManager: {
                // 检测运行环境
                detectEnvironment() {
                    // 检查是否是APK环境
                    const isAndroidAPK = typeof AndroidInterface !== 'undefined';
                    
                    return {
                        isAndroidAPK: isAndroidAPK,
                        isWeb: !isAndroidAPK
                    };
                },
                
                // 显示适合当前环境的导出选项
                showExportOptions() {
                    const env = this.detectEnvironment();
                    const exportOptions = document.getElementById('exportOptions');
                    
                    let optionsHTML = '';
                    
                    // APK环境（Android WebView）
                    if (env.isAndroidAPK) {
                        optionsHTML = `
                            <div class="export-option" onclick="App.exportViaAndroidFilePicker()">
                                <div class="export-option-title">📁 保存到文件</div>
                                <div class="export-option-desc">使用系统文件选择器选择保存位置</div>
                            </div>
                            <div class="export-option" onclick="App.exportToClipboard()">
                                <div class="export-option-title">📋 复制到剪贴板</div>
                                <div class="export-option-desc">将JSON数据复制到剪贴板</div>
                            </div>
                        `;
                    } 
                    // 网页环境
                    else {
                        optionsHTML = `
                            <div class="export-option" onclick="App.exportViaDownload()">
                                <div class="export-option-title">💾 下载文件</div>
                                <div class="export-option-desc">下载JSON文件到本地</div>
                            </div>
                            <div class="export-option" onclick="App.exportToClipboard()">
                                <div class="export-option-title">📋 复制到剪贴板</div>
                                <div class="export-option-desc">将JSON数据复制到剪贴板</div>
                            </div>
                        `;
                    }
                    
                    exportOptions.innerHTML = optionsHTML;
                },
                
                // 获取备份数据
                getBackupData() {
                    return {
                        certificates: (App.certificates || []),
                        lockedCertificates: (App.lockedCertificates || []),
                        memo: (App.memoContent || ''),
                        backupDate: new Date().toISOString(),
                        appVersion: '2.0',
                        totalCertificates: (App.certificates || []).length,
                        totalAmount: (App.certificates || []).reduce((sum, cert) => sum + (parseFloat(cert.amount) || 0), 0),
                        totalInterest: (App.certificates || []).reduce((sum, cert) => sum + (parseFloat(cert.interest) || 0), 0)
                    };
                },
                
                // 获取格式化的日期
                getFormattedDate() {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hour = String(now.getHours()).padStart(2, '0');
                    const minute = String(now.getMinutes()).padStart(2, '0');
                    return `${year}${month}${day}_${hour}${minute}`;
                }
            },
            
            // Android文件选择器导出
            exportViaAndroidFilePicker() {
                try {
                    if (this.isEditLocked) {
                        this.showMessage('请先解锁编辑功能', 'warning');
                        return;
                    }
                    
                    const backupData = this.FileExportManager.getBackupData();
                    const jsonString = JSON.stringify(backupData, null, 2);
                    const fileName = `存单数据_${this.FileExportManager.getFormattedDate()}.json`;
                    
                    // 在APK环境中，调用Android原生接口
                    if (typeof AndroidInterface !== 'undefined') {
                        // 方法1：使用文件选择器（推荐）
                        if (AndroidInterface.saveFileWithPicker) {
                            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                            AndroidInterface.saveFileWithPicker(base64Data, fileName);
                            this.showMessage('正在打开文件选择器...', 'info');
                            this.closeExportModal();
                            return;
                        }
                        
                        // 方法2：使用分享功能
                        if (AndroidInterface.shareText) {
                            AndroidInterface.shareText(jsonString, fileName);
                            this.showMessage('已调用分享功能', 'info');
                            this.closeExportModal();
                            return;
                        }
                        
                        // 方法3：保存到下载目录
                        if (AndroidInterface.saveToDownloads) {
                            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                            AndroidInterface.saveToDownloads(base64Data, fileName);
                            this.showMessage('正在保存到下载目录...', 'info');
                            this.closeExportModal();
                            return;
                        }
                    }
                    
                    // 如果Android接口都不可用，使用备用方案
                    this.showMessage('Android接口不可用，使用备用方案', 'warning');
                    this.exportViaDownload();
                    
                } catch (error) {
                    console.error('Android导出失败:', error);
                    this.showMessage('导出失败：' + error.message, 'error');
                }
            },
            
            // 网页环境下载
            exportViaDownload() {
                try {
                    if (this.isEditLocked) {
                        this.showMessage('请先解锁编辑功能', 'warning');
                        return;
                    }
                    
                    const backupData = this.FileExportManager.getBackupData();
                    const jsonString = JSON.stringify(backupData, null, 2);
                    const fileName = `存单数据_${this.FileExportManager.getFormattedDate()}.json`;
                    
                    // 创建Blob和下载链接
                    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    
                    link.href = url;
                    link.download = fileName;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    
                    // 清理
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 100);
                    
                    this.showMessage('文件下载开始', 'success');
                    this.closeExportModal();
                } catch (error) {
                    console.error('下载失败:', error);
                    this.showMessage('下载失败：' + error.message, 'error');
                }
            },
            
            // 复制到剪贴板
            exportToClipboard() {
                try {
                    if (this.isEditLocked) {
                        this.showMessage('请先解锁编辑功能', 'warning');
                        return;
                    }
                    
                    const backupData = this.FileExportManager.getBackupData();
                    const jsonString = JSON.stringify(backupData, null, 2);
                    
                    // 优先使用现代 Clipboard API
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(jsonString)
                            .then(() => {
                                this.showMessage('数据已复制到剪贴板', 'success');
                                this.closeExportModal();
                            })
                            .catch(err => {
                                // 如果现代API失败，使用传统方法
                                this.copyWithExecCommand(jsonString);
                            });
                    } else {
                        // 使用传统方法
                        this.copyWithExecCommand(jsonString);
                    }
                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage('复制失败，请手动选择文本复制', 'error');
                }
            },
            
            // 传统复制方法
            copyWithExecCommand(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.left = '-9999px';
                textarea.style.top = '-9999px';
                
                document.body.appendChild(textarea);
                textarea.select();
                textarea.setSelectionRange(0, textarea.value.length);
                
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    if (successful) {
                        this.showMessage('数据已复制到剪贴板', 'success');
                        this.closeExportModal();
                    } else {
                        throw new Error('execCommand复制失败');
                    }
                } catch (err) {
                    document.body.removeChild(textarea);
                    // 最后的手段：显示数据让用户手动复制
                    this.showCopyFallback(text);
                }
            },
            
            // 打开导出模态框
            openExportModal() {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能才能导出数据', 'warning');
                    return;
                }
                
                this.closeSettingsModal();
                this.FileExportManager.showExportOptions();
                document.getElementById('exportModal').style.display = 'flex';
            },
            
            // 关闭导出模态框
            closeExportModal() {
                document.getElementById('exportModal').style.display = 'none';
            },
            
            // 切换锁定模式
            toggleLockMode() {
                // 清除之前的自动锁定定时器
                if (this.autoLockTimer) {
                    clearTimeout(this.autoLockTimer);
                    this.autoLockTimer = null;
                }
                
                this.isEditLocked = !this.isEditLocked;
                const lockBtn = document.getElementById('lockToggleBtn');
                
                if (this.isEditLocked) {
                    lockBtn.innerHTML = '<span style="font-size:1rem;">🔒</span> 解锁编辑';
                    this.showMessage('编辑功能已锁定', 'info');
                    
                    // 锁定状态下不需要活动监听
                } else {
                    lockBtn.innerHTML = '<span style="font-size:1rem;">🔓</span> 锁定编辑';
                    this.showMessage('编辑功能已解锁', 'success');
                    
                    // 解锁后立即开始计时器
                    this.resetAutoLockTimer();
                }
                
                this.updateAllButtonStates();
                // 重新加载证书以确保所有UI元素状态同步
                this.loadCertificates();
            },
            
            openModal() {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能才能添加存单', 'warning');
                    return;
                }
                
                // 标记模态框打开状态
                this.isModalOpen = true;
                
                this.editingId = null;
                document.getElementById('modalTitle').textContent = '添加新存单';
                document.getElementById('saveBtn').textContent = '保存存单';
                
                // 重置表单
                document.getElementById('certificateForm').reset();
                
                // 设置默认日期
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                
                document.getElementById('depositDate').value = todayStr;
                document.getElementById('duration').value = '1年';
                document.getElementById('reminderDays').value = 7;
                
                // 重新计算到期日期
                this.calculateMaturityDate();
                
                // 确保续存状态正确
                this.updateMaturityDateFieldState();
                
                // 确保初始状态下自定义银行输入框是隐藏的
                this.toggleCustomBankInput();
                
                document.getElementById('certificateModal').style.display = 'flex';
            },
            
            saveCertificate(e) {
                e.preventDefault();
                
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                // 获取表单数据
                let bankNameValue = document.getElementById('bankName').value;
                // 如果选择了自定义银行，则使用自定义银行名称
                if (bankNameValue === 'custom') {
                    const customBankName = document.getElementById('customBankName').value.trim();
                    if (!customBankName) {
                        this.showMessage('请输入自定义银行名称', 'error');
                        return false;
                    }
                    bankNameValue = customBankName;
                }
                
                const formData = {
                    bankName: bankNameValue,
                    certificateNo: document.getElementById('certificateNo').value,
                    amount: parseFloat(document.getElementById('amount').value),
                    interestRate: parseFloat(document.getElementById('interestRate').value),
                    depositDate: document.getElementById('depositDate').value,
                    maturityDate: document.getElementById('maturityDate').value,
                    duration: document.getElementById('duration').value,
                    reminderDays: parseInt(document.getElementById('reminderDays').value)
                };
                
                // 验证数据
                if (!this.validateCertificateData(formData)) {
                    return;
                }
                
                // 计算利息和天数
                const depositDateObj = this.parseDateYYYYMMDD(formData.depositDate);
                let maturityDateObj;
                let daysDiff;
                let years;
                let daysUntilMaturity;

                // 续存情况的特殊处理
                if (formData.duration === '续存') {
                    // 续存没有固定到期日，但需要基于实际天数计算利息
                    // 默认计算从存入日至今天的利息，或者假设一个合理的续存天数
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    maturityDateObj = today; // 使用今天作为参考日期
                    daysDiff = Math.floor((today - depositDateObj) / (1000 * 60 * 60 * 24));
                    // 如果存款还未到今天，则设置最小值为实际天数
                    if (daysDiff <= 0) {
                        daysDiff = 2; // 默认2天用于预估计算
                    }
                    years = daysDiff / 365;
                    daysUntilMaturity = 9999; // 续存用9999表示无限期
                } else {
                    maturityDateObj = this.parseDateYYYYMMDD(formData.maturityDate);
                    daysDiff = Math.floor((maturityDateObj - depositDateObj) / (1000 * 60 * 60 * 24));
                    years = daysDiff / 365;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    daysUntilMaturity = Math.floor((maturityDateObj - today) / (1000 * 60 * 60 * 24));
                }

                const interest = formData.amount * (formData.interestRate / 100) * years;
                
                // 创建存单对象
                const certificate = {
                    id: this.editingId || Date.now().toString(),
                    bankName: formData.bankName,
                    certificateNo: formData.certificateNo,
                    amount: formData.amount,
                    interestRate: formData.interestRate,
                    depositDate: formData.depositDate,
                    maturityDate: formData.duration === '续存' ? '' : formData.maturityDate, // 续存时保存空字符串
                    duration: formData.duration,
                    reminderDays: formData.reminderDays,
                    interest: interest.toFixed(2),
                    daysLeft: daysUntilMaturity,
                    status: formData.duration === '续存' ? 'renewal' : this.getCertificateStatus(daysUntilMaturity, formData.reminderDays),
                    locked: false
                };

                // 保存或更新
                if (this.editingId) {
                    const index = this.certificates.findIndex(c => c.id === this.editingId);
                    this.certificates[index] = certificate;
                } else {
                    this.certificates.push(certificate);
                }
                
                this.saveToLocalStorage();
                this.closeModal();
                
                // 保存成功后立即执行自动刷新（加强版）
                this.autoRefresh();
                
                // 再次延迟刷新以确保UI完全更新
                setTimeout(() => {
                    this.loadCertificates();
                    this.updateAllStats();
                    this.updateCardButtonsState();
                }, 50);
                
                this.showMessage(this.editingId ? '存单更新成功！' : '存单添加成功！', 'success');
            },
            
            // 验证存单数据
            validateCertificateData(data) {
                if (!data.bankName) {
                    this.showMessage('请选择银行名称', 'error');
                    return false;
                }
                
                if (!data.certificateNo) {
                    this.showMessage('请输入存单编号', 'error');
                    return false;
                }
                
                if (!data.amount || data.amount <= 0) {
                    this.showMessage('请输入有效的存款金额', 'error');
                    return false;
                }
                
                if (!data.interestRate || data.interestRate < 0) {
                    this.showMessage('请输入有效的年利率', 'error');
                    return false;
                }
                
                if (!data.depositDate) {
                    this.showMessage('请选择存入日期', 'error');
                    return false;
                }
                
                // 对于续存，不需要到期日期验证
                if (data.duration === '续存') {
                    // 续存情况下，不需要验证到期日期
                } else {
                    // 非续存情况，需要验证到期日期
                    if (!data.maturityDate) {
                        this.showMessage('请选择到期日期', 'error');
                        return false;
                    }
                    
                    if (new Date(data.maturityDate) <= new Date(data.depositDate)) {
                        this.showMessage('到期日期必须晚于存入日期', 'error');
                        return false;
                    }
                }
                
                if (!data.reminderDays || data.reminderDays < 1 || data.reminderDays > 30) {
                    this.showMessage('提前提醒天数必须在1-30天之间', 'error');
                    return false;
                }
                
                return true;
            },
            
            // 刷新数据（带闪烁效果）
            refreshData() {
                // 获取刷新按钮
                const refreshBtn = document.getElementById('refreshBtn');
                
                // 如果按钮是隐藏或禁用的，不执行刷新
                if (refreshBtn.classList.contains('hidden') || refreshBtn.classList.contains('disabled')) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                // 添加刷新按钮旋转动画
                refreshBtn.classList.add('refreshing');
                setTimeout(() => {
                    refreshBtn.classList.remove('refreshing');
                }, 500);
                
                // 执行刷新（autoRefresh内部会处理数据同步、加载和统计更新）
                this.autoRefresh();
                
                // 添加卡片闪烁效果
                this.flashCards();
                
                this.showMessage('数据已刷新', 'success');
	            },
            
            // 卡片闪烁效果
            flashCards() {
                const cards = document.querySelectorAll('.certificate-card');
                cards.forEach(card => {
                    card.classList.add('flash');
                    setTimeout(() => {
                        card.classList.remove('flash');
                    }, 600);
                });
            },
            
            loadCertificates() {
                const scrollContainer = document.getElementById('certificatesScroll');
                
                if (this.certificates.length === 0) {
                    scrollContainer.innerHTML = `
                        <div class="empty-state">
                            <span style="font-size:3rem;">💰</span>
                            <h3>暂无存单记录</h3>
                            <p>点击"添加存单"按钮开始记录</p>
                        </div>
                    `;
                    this.updateNavDots();
                    return;
                }
                
                // 按存入日期排序
                this.certificates.sort((a, b) => new Date(a.depositDate) - new Date(b.depositDate));
                
                let html = '';
                
                this.certificates.forEach((cert, index) => {
                    if (!this.currentMonthForCert[cert.id]) {
                        // 默认显示本月而不是存入日期所在的月份
                        const today = new Date();
                        this.currentMonthForCert[cert.id] = new Date(today.getFullYear(), today.getMonth(), 1);
                    }
                    
                    // 对于续存类型，每次加载时都重新计算利息和天数
                    let updatedCert = {...cert}; // 创建副本避免直接修改原始数据
                    if (cert.duration === '续存') {
                        const depositDateObj = this.parseDateYYYYMMDD(cert.depositDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysDiff = Math.floor((today - depositDateObj) / (1000 * 60 * 60 * 24));
                        const years = daysDiff / 365;
                        const recalculatedInterest = cert.amount * (cert.interestRate / 100) * years;
                        updatedCert.interest = recalculatedInterest.toFixed(2);
                        updatedCert.daysLeft = 9999; // 续存用9999表示无限期
                    }
                    
                    const currentMonth = this.currentMonthForCert[cert.id];
                    const isRenewal = updatedCert.duration === '续存';
                    const statusClass = isRenewal ? 'renewal' : updatedCert.status;
                    const cardClass = `certificate-card ${isRenewal ? 'renewal' : updatedCert.status}`;
                    
                    // 计算显示文本
                    let daysText = '';
                    let daysTextClass = '';
                    if (updatedCert.duration === '续存') {
                        // 对于续存情况，计算从存入日到今天的天数
                        const depositDate = this.parseDateYYYYMMDD(updatedCert.depositDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysSinceDeposit = Math.floor((today - depositDate) / (1000 * 60 * 60 * 24));
                        daysText = `续存: ${daysSinceDeposit}天`;
                    } else if (updatedCert.daysLeft > 0) {
                        daysText = `剩余: ${updatedCert.daysLeft}天`;
                    } else if (updatedCert.daysLeft === 0) {
                        daysText = '今天到期';
                    } else {
                        daysText = `过期: ${Math.abs(updatedCert.daysLeft)}天`;
                        daysTextClass = 'expired-text'; // 添加过期文本类
                    }
                    
                    html += `
                        <div class="${cardClass}" data-id="${cert.id}">
                            <div class="bank-header">
                                <div class="bank-title" style="${cert.duration === '续存' ? 'color: #9333ea;' : (cert.status === 'expired' ? 'color: #dc2626;' : '')}">存单${index + 1}: ${cert.bankName}</div>
                            <div class="cert-actions">
                                    <button class="action-btn lock-btn ${this.isEditLocked ? 'hidden' : (cert.locked ? 'locked' : '')}" title="存单锁" data-id="${cert.id}" ${this.isEditLocked ? 'style="display: none;"' : ''}>
                                        <span>${cert.locked ? '🔒' : '🔓'}</span>
                                    </button>
                                    <button class="action-btn edit-btn ${this.isEditLocked ? 'hidden' : (cert.locked ? 'locked' : '')}" title="编辑" data-id="${cert.id}" ${this.isEditLocked ? 'style="display: none;"' : ''}>
                                        <span>🖊</span>
                                    </button>
                                    <button class="action-btn delete-btn ${this.isEditLocked ? 'hidden' : (cert.locked ? 'locked' : '')}" title="删除" data-id="${cert.id}" ${this.isEditLocked ? 'style="display: none;"' : ''}>
                                        <span>🗑</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="main-info">
                                <div class="left-section">
                                    <div class="info-row">
                                        <div class="info-label">存款金额</div>
                                        <div class="info-value amount">¥${this.formatNumber(cert.amount)}</div>
                                    </div>
                                    <div class="info-row">
                                        <div class="info-label">年利率</div>
                                        <div class="info-value">${cert.interestRate}%</div>
                                    </div>
                                    <div class="info-row">
                                        <div class="info-label">利息</div>
                                        <div class="info-value interest">¥${this.formatNumber(parseFloat(cert.interest))}</div>
                                    </div>
                                </div>
                                <div class="right-section">
                                    <div class="info-row">
                                        <div class="info-label">存入日期</div>
                                        <div class="info-value" style="color: #2e7d32;">
                                            ${this.formatYear(cert.depositDate)}年${this.formatMonthDay(cert.depositDate)}
                                        </div>
                                    </div>
                                    <div class="info-row">
                                        <div class="info-label">到期日期</div>
                                        <div class="info-value" style="${cert.duration === '续存' ? 'color: #9333ea;' : ''}">
                                            ${cert.duration === '续存' ? '续存中' : (cert.maturityDate ? this.formatYear(cert.maturityDate) + '年' + this.formatMonthDay(cert.maturityDate) : '未设置')}
                                        </div>
                                    </div>
                                    <div class="info-row">
                                        <div class="info-label">存款期限</div>
                                        <div class="info-value">${cert.duration}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="status-bar">
                                <div class="days-left ${daysTextClass}">${daysText}</div>
                                <div class="status ${statusClass}">${this.getStatusText(cert.status)}</div>
                            </div>
                            
                            <div class="calendar-section">
                                <div class="calendar-header">
                                    <div class="calendar-nav">
                                        <button class="nav-btn prev-month-btn ${this.isEditLocked ? 'disabled' : ''}" data-id="${cert.id}">
                                            <span>‹</span>
                                        </button>
                                        <div class="month-year" id="monthYear-${cert.id}">
                                            ${this.formatMonthYear(currentMonth)}
                                        </div>
                                        <button class="nav-btn next-month-btn ${this.isEditLocked ? 'disabled' : ''}" data-id="${cert.id}">
                                            <span>›</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="calendar-grid">
                                    <div class="weekdays">
                                        <div class="weekday">日</div><div class="weekday">一</div><div class="weekday">二</div>
                                        <div class="weekday">三</div><div class="weekday">四</div><div class="weekday">五</div>
                                        <div class="weekday">六</div>
                                    </div>
                                    <div class="days-grid" id="daysGrid-${cert.id}"></div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                scrollContainer.innerHTML = html;
                
                // 确保DOM完全更新后再添加事件监听器
                setTimeout(() => {
                    // 为每个存单渲染日历
                    this.certificates.forEach(cert => {
                        this.renderCalendarForCert(cert.id);
                    });
                    
                    // 添加事件监听器
                    this.addCardEventListeners();
                    this.updateCardButtonsState();
                    this.updateNavDots();
                }, 10); // 给一点时间让DOM完成渲染
            },
            
            // 工具方法
            formatNumber(num) {
                return num.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            },
            
            formatYear(dateString) {
                return this.parseDateYYYYMMDD(dateString).getFullYear();
            },
            
            formatMonthDay(dateString) {
                const date = this.parseDateYYYYMMDD(dateString);
                return (date.getMonth() + 1) + '月' + date.getDate() + '日';
            },
            
            formatMonthYear(date) {
                return `${date.getFullYear()}年${date.getMonth() + 1}月`;
            },
            
            parseDateYYYYMMDD(dateString) {
                const parts = dateString.split('-');
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            },
            
            getCertificateStatus(daysUntilMaturity, reminderDays) {
                if (daysUntilMaturity < 0) return 'expired';
                if (daysUntilMaturity <= reminderDays) return 'expiring';
                return 'active';
            },
            
            getStatusText(status) {
                switch(status) {
                    case 'active': return '正常';
                    case 'expiring': return '即将到期';
                    case 'expired': return '已到期';
                    case 'renewal': return '续存中';
                    default: return '正常';
                }
            },
            
            showMessage(message, type) {
                const oldToast = document.querySelector('.message-toast');
                if (oldToast) oldToast.remove();
                
                const toast = document.createElement('div');
                toast.className = 'message-toast';
                toast.textContent = message;
                
                if (type === 'success') toast.style.background = '#4caf50';
                else if (type === 'warning') toast.style.background = '#ff9800';
                else if (type === 'error') toast.style.background = '#f44336';
                else toast.style.background = '#2196f3';
                
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.animation = 'slideOut 0.3s ease-out forwards';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            },
            
            // 渲染存单日历
            renderCalendarForCert(id) {
                const cert = this.certificates.find(c => c.id === id);
                if (!cert) return;
                
                const gridElement = document.getElementById(`daysGrid-${id}`);
                if (!gridElement) return;
                
                const currentMonth = this.currentMonthForCert[id] || this.parseDateYYYYMMDD(cert.depositDate);
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                
                // 获取当月第一天和最后一天
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDate = new Date(firstDay);
                
                // 将startDate调整到当周的周日
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                // 创建日历格子
                gridElement.innerHTML = '';
                
                for (let i = 0; i < 42; i++) { // 最多6行7列
                    const cellDate = new Date(startDate);
                    cellDate.setDate(startDate.getDate() + i);
                    
                    const dayElement = document.createElement('div');
                    dayElement.className = 'day';
                    
                    // 检查是否是其他月份
                    if (cellDate.getMonth() !== month) {
                        dayElement.classList.add('other-month');
                    }
                    
                    // 添加日期文本
                    dayElement.textContent = cellDate.getDate();
                    
                    // 检查是否是今天
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (cellDate.getTime() === today.getTime()) {
                        dayElement.classList.add('today');
                    }
                    
                    // 检查是否是存入日期
                    const depositDate = this.parseDateYYYYMMDD(cert.depositDate);
                    depositDate.setHours(0, 0, 0, 0);
                    if (cellDate.getTime() === depositDate.getTime()) {
                        dayElement.classList.add('deposit-day');
                    }
                    
                    // 检查是否是到期日期（仅非续存情况）
                    if (cert.duration !== '续存' && cert.maturityDate) {
                        const maturityDate = this.parseDateYYYYMMDD(cert.maturityDate);
                        maturityDate.setHours(0, 0, 0, 0);
                        if (cellDate.getTime() === maturityDate.getTime()) {
                            dayElement.classList.add('maturity-day');
                        }
                        
                        // 检查是否在存款期间内（非续存情况下）
                        if (cellDate >= depositDate && cellDate <= maturityDate && cellDate <= today) {
                            dayElement.classList.add('deposit-period');
                        }
                    } else if (cert.duration === '续存') {
                        // 对于续存情况，从存入日起到今天的区间都标记为存款期间
                        if (cellDate >= depositDate && cellDate <= today) {
                            dayElement.classList.add('deposit-period');
                        }
                    }
                    
                    gridElement.appendChild(dayElement);
                }
                
                // 更新月份显示
                const monthYearElement = document.getElementById(`monthYear-${id}`);
                if (monthYearElement) {
                    monthYearElement.textContent = `${year}年${month + 1}月`;
                }
            },
            
            // 添加卡片事件监听器
            addCardEventListeners() {
                // 编辑按钮事件
                const editButtons = document.querySelectorAll('.edit-btn');
                editButtons.forEach(btn => {
                    btn.removeEventListener('click', this.handleEditClick); // 避免重复添加事件
                    btn.addEventListener('click', (e) => this.handleEditClick(e));
                });
                
                // 删除按钮事件
                const deleteButtons = document.querySelectorAll('.delete-btn');
                deleteButtons.forEach(btn => {
                    btn.removeEventListener('click', this.handleDeleteClick); // 避免重复添加事件
                    btn.addEventListener('click', (e) => this.handleDeleteClick(e));
                });
                
                // 锁定按钮事件
                const lockButtons = document.querySelectorAll('.lock-btn');
                lockButtons.forEach(btn => {
                    btn.removeEventListener('click', this.handleLockClick); // 避免重复添加事件
                    btn.addEventListener('click', (e) => this.handleLockClick(e));
                });
                
                // 上一个月按钮事件
                const prevMonthButtons = document.querySelectorAll('.prev-month-btn');
                prevMonthButtons.forEach(btn => {
                    btn.removeEventListener('click', this.handlePrevMonthClick); // 避免重复添加事件
                    btn.addEventListener('click', (e) => this.handlePrevMonthClick(e));
                });
                
                // 下一个月按钮事件
                const nextMonthButtons = document.querySelectorAll('.next-month-btn');
                nextMonthButtons.forEach(btn => {
                    btn.removeEventListener('click', this.handleNextMonthClick); // 避免重复添加事件
                    btn.addEventListener('click', (e) => this.handleNextMonthClick(e));
                });
            },
            
            // 处理编辑点击
            handleEditClick(e) {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                const cardId = e.currentTarget.getAttribute('data-id');
                const cert = this.certificates.find(c => c.id === cardId);
                
                if (cert) {
                    // 检查存单是否被锁定
                    if (cert.locked) {
                        this.showMessage('该存单已被锁定，无法编辑', 'warning');
                        return;
                    }
                    
                    this.editingId = cert.id;
                    document.getElementById('modalTitle').textContent = '编辑存单';
                    document.getElementById('saveBtn').textContent = '更新存单';
                    
                    // 填充表单数据
                    // 检查是否为预设银行，如果不是则选择"自定义银行"并填入自定义名称
                    const bankSelect = document.getElementById('bankName');
                    const customBankGroup = document.getElementById('customBankGroup');
                    const customBankInput = document.getElementById('customBankName');
                    
                    // 预设银行列表
                    const presetBanks = [
                        "中国工商银行", "中国建设银行", "中国农业银行", "中国银行", 
                        "交通银行", "招商银行", "邮政储蓄银行", "浦发银行", 
                        "中信银行", "民生银行", "兴业银行", "平安银行", 
                        "光大银行", "华夏银行", "广发银行", "浙商银行", 
                        "恒丰银行", "渤海银行", "余利宝银行", "零钱通银行", 
                        "余额宝银行", "其他银行"
                    ];
                    
                    if (presetBanks.includes(cert.bankName)) {
                        bankSelect.value = cert.bankName;
                        customBankGroup.classList.add('hidden');
                        customBankInput.value = ''; // 清空自定义银行输入框
                    } else {
                        // 如果不是预设银行，则认为是自定义银行
                        bankSelect.value = 'custom';
                        customBankGroup.classList.remove('hidden');
                        customBankInput.value = cert.bankName; // 设置自定义银行名称
                    }
                    
                    document.getElementById('certificateNo').value = cert.certificateNo;
                    document.getElementById('amount').value = cert.amount;
                    document.getElementById('interestRate').value = cert.interestRate;
                    document.getElementById('depositDate').value = cert.depositDate;
                    document.getElementById('maturityDate').value = cert.maturityDate || '';
                    document.getElementById('duration').value = cert.duration;
                    document.getElementById('reminderDays').value = cert.reminderDays;
                    
                    // 更新到期日期字段状态
                    this.updateMaturityDateFieldState();
                    
                    // 确保根据当前银行选择状态更新自定义银行输入框
                    this.toggleCustomBankInput();
                    
                    // 标记模态框打开
                    this.isModalOpen = true;
                    
                    document.getElementById('certificateModal').style.display = 'flex';
                }
            },
            
            // 处理删除点击
            handleDeleteClick(e) {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                const cardId = e.currentTarget.getAttribute('data-id');
                const cert = this.certificates.find(c => c.id === cardId);
                
                if (cert) {
                    // 检查存单是否被锁定
                    if (cert.locked) {
                        this.showMessage('该存单已被锁定，无法删除', 'warning');
                        return;
                    }
                    
                    if (confirm(`确定要删除 ${cert.bankName} 的存单吗？`)) {
                        this.certificates = this.certificates.filter(c => c.id !== cardId);
                        this.saveToLocalStorage();
                        this.autoRefresh();
                        this.showMessage('存单删除成功！', 'success');
                    }
                }
            },
            
            // 处理锁定点击
            handleLockClick(e) {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                const cardId = e.currentTarget.getAttribute('data-id');
                const cert = this.certificates.find(c => c.id === cardId);
                
                if (cert) {
                    cert.locked = !cert.locked; // 切换锁定状态
                    
                    // 更新按钮图标
                    const lockIcon = e.currentTarget.querySelector('span');
                    lockIcon.textContent = cert.locked ? '🔒' : '🔓';
                    
                    this.saveToLocalStorage();
                    this.showMessage(`${cert.bankName} 存单${cert.locked ? '已锁定' : '已解锁'}`, 'info');
                }
            },
            
            // 处理上一月点击
            handlePrevMonthClick(e) {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                const cardId = e.currentTarget.getAttribute('data-id');
                const currentMonth = this.currentMonthForCert[cardId];
                
                if (currentMonth) {
                    currentMonth.setMonth(currentMonth.getMonth() - 1);
                    this.renderCalendarForCert(cardId);
                }
            },
            
            // 处理下一月点击
            handleNextMonthClick(e) {
                if (this.isEditLocked) {
                    this.showMessage('请先解锁编辑功能', 'warning');
                    return;
                }
                
                const cardId = e.currentTarget.getAttribute('data-id');
                const currentMonth = this.currentMonthForCert[cardId];
                
                if (currentMonth) {
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                    this.renderCalendarForCert(cardId);
                }
            },
            
            updateAllStats() {
                // 更新头部统计信息
                document.getElementById('totalCertificatesHeader').textContent = this.certificates.length;
                
                const totalAmount = this.certificates.reduce((sum, cert) => sum + cert.amount, 0);
                document.getElementById('totalAmountHeader').textContent = `¥${this.formatNumber(totalAmount)}`;
                
                // 对于续存类型的存单，重新计算实时利息
                const totalInterest = this.certificates.reduce((sum, cert) => {
                    let interestToAdd = parseFloat(cert.interest);
                    
                    // 如果是续存类型，根据当前日期重新计算利息
                    if (cert.duration === '续存') {
                        const depositDateObj = this.parseDateYYYYMMDD(cert.depositDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysDiff = Math.floor((today - depositDateObj) / (1000 * 60 * 60 * 24));
                        const years = daysDiff / 365;
                        interestToAdd = cert.amount * (cert.interestRate / 100) * years;
                    }
                    
                    return sum + interestToAdd;
                }, 0);
                
                document.getElementById('totalInterestHeader').textContent = `¥${this.formatNumber(totalInterest)}`;
                
                // 计算各类状态的数量
                const expiringCount = this.certificates.filter(cert => cert.status === 'expiring').length;
                const expiredCount = this.certificates.filter(cert => cert.status === 'expired').length;
                const renewalCount = this.certificates.filter(cert => cert.duration === '续存').length;
                
                document.getElementById('expiringCountHeader').textContent = expiringCount;
                document.getElementById('expiredCountHeader').textContent = expiredCount;
                document.getElementById('renewalCountHeader').textContent = renewalCount;
            },
            
            // 初始化按钮状态
            initializeButtonStates() {
                this.updateAllButtonStates();
            },
            
            // 更新所有按钮状态
            updateAllButtonStates() {
                const addBtn = document.getElementById('addCertificateBtn');
                const refreshBtn = document.getElementById('refreshBtn');
                const memoBtn = document.getElementById('memoBtn');
                const settingsBtn = document.getElementById('settingsBtn');
                const helpBtn = document.getElementById('helpBtn');
                
                // 根据锁定状态设置按钮状态
                const buttonsToHandle = [addBtn, refreshBtn, memoBtn, settingsBtn, helpBtn];
                
                buttonsToHandle.forEach(btn => {
                    if (btn) {
                        if (this.isEditLocked) {
                            btn.classList.add('hidden');
                            btn.classList.remove('unlocked'); // 移除解锁时的样式
                            btn.classList.add('disabled');    // 保留禁用状态以保持视觉一致性
                        } else {
                            btn.classList.remove('hidden');
                            btn.classList.remove('disabled'); // 移除禁用状态
                            btn.classList.add('unlocked');    // 添加解锁时的高亮样式
                        }
                    }
                });
                
                // 更新锁按钮的文本
                const lockBtn = document.getElementById('lockToggleBtn');
                if (lockBtn) {
                    if (this.isEditLocked) {
                        lockBtn.innerHTML = '<span style="font-size:1rem;">🔒</span> 解锁编辑';
                    } else {
                        lockBtn.innerHTML = '<span style="font-size:1rem;">🔓</span> 锁定编辑';
                    }
                }
            },
            
            // 更新卡片按钮状态
            updateCardButtonsState() {
                const editButtons = document.querySelectorAll('.edit-btn');
                const deleteButtons = document.querySelectorAll('.delete-btn');
                const lockButtons = document.querySelectorAll('.lock-btn');
                const prevMonthButtons = document.querySelectorAll('.prev-month-btn');
                const nextMonthButtons = document.querySelectorAll('.next-month-btn');
                
                // 获取所有卡片对应的存单数据
                const certIds = this.certificates.map(cert => cert.id);
                
                // 分别处理每个卡片的按钮状态
                certIds.forEach(id => {
                    const cardElement = document.querySelector(`[data-id="${id}"]`);
                    if (!cardElement) return;
                    
                    // 获取当前卡片的存单信息
                    const cert = this.certificates.find(c => c.id === id);
                    if (!cert) return;
                    
                    // 更新该卡片上的所有按钮状态
                    const editBtn = cardElement.querySelector('.edit-btn');
                    const deleteBtn = cardElement.querySelector('.delete-btn');
                    const lockBtn = cardElement.querySelector('.lock-btn');
                    const prevMonthBtn = cardElement.querySelector('.prev-month-btn');
                    const nextMonthBtn = cardElement.querySelector('.next-month-btn');
                    
                    // 如果全局锁定或该存单被锁定，则禁用编辑和删除按钮
                    const shouldDisableEditing = this.isEditLocked || cert.locked;
                    
                    if (editBtn) {
                        if (shouldDisableEditing) {
                            editBtn.classList.add('disabled');
                            editBtn.disabled = true;
                        } else {
                            editBtn.classList.remove('disabled');
                            editBtn.disabled = false;
                        }
                    }
                    
                    if (deleteBtn) {
                        if (shouldDisableEditing) {
                            deleteBtn.classList.add('disabled');
                            deleteBtn.disabled = true;
                        } else {
                            deleteBtn.classList.remove('disabled');
                            deleteBtn.disabled = false;
                        }
                    }
                    
                    if (lockBtn) {
                        if (this.isEditLocked) {
                            lockBtn.classList.add('disabled');
                            lockBtn.disabled = true;
                        } else {
                            lockBtn.classList.remove('disabled');
                            lockBtn.disabled = false;
                        }
                    }
                    
                    if (prevMonthBtn) {
                        if (this.isEditLocked) {
                            prevMonthBtn.classList.add('disabled');
                            prevMonthBtn.disabled = true;
                        } else {
                            prevMonthBtn.classList.remove('disabled');
                            prevMonthBtn.disabled = false;
                        }
                    }
                    
                    if (nextMonthBtn) {
                        if (this.isEditLocked) {
                            nextMonthBtn.classList.add('disabled');
                            nextMonthBtn.disabled = true;
                        } else {
                            nextMonthBtn.classList.remove('disabled');
                            nextMonthBtn.disabled = false;
                        }
                    }
                });
            },
            
            // 打开备忘录模态框
            openMemoModal() {
                this.isModalOpen = true;
                document.getElementById('memoModal').style.display = 'flex';
            },
            
            // 关闭备忘录模态框
            closeMemoModal() {
                this.isModalOpen = false;
                document.getElementById('memoModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 保存备忘录
            saveMemo() {
                this.memoContent = document.getElementById('memoContent').value;
                localStorage.setItem('bankMemo', this.memoContent);
                this.updateMemoStats();
                this.showMessage('备忘录已保存', 'success');
                this.closeMemoModal();
            },
            
            // 清空备忘录
            clearMemo() {
                if (confirm('确定要清空备忘录吗？此操作不可恢复。')) {
                    this.memoContent = '';
                    document.getElementById('memoContent').value = '';
                    localStorage.setItem('bankMemo', '');
                    this.updateMemoStats();
                    this.showMessage('备忘录已清空', 'success');
                }
            },
            
            // 更新备忘录统计
            updateMemoStats() {
                const content = document.getElementById('memoContent').value;
                const charCount = content.length;
                document.getElementById('charCount').textContent = `${charCount} 个字符`;
                document.getElementById('lastSaved').textContent = `最后保存: ${new Date().toLocaleTimeString()}`;
            },
            
            // 插入时间到备忘录
            insertTimeToMemo() {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1; // getMonth返回0-11，所以要+1
                const day = now.getDate();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                
                const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                
                const textarea = document.getElementById('memoContent');
                const startPos = textarea.selectionStart;
                const endPos = textarea.selectionEnd;
                const currentValue = textarea.value;
                
                // 在光标位置插入时间字符串
                const newValue = currentValue.substring(0, startPos) + timeString + currentValue.substring(endPos);
                textarea.value = newValue;
                
                // 将光标移到插入文本的末尾
                const newPosition = startPos + timeString.length;
                textarea.setSelectionRange(newPosition, newPosition);
                
                this.updateMemoStats();
            },
            
            // 插入分割线到备忘录
            insertSplitLineToMemo() {
                const splitLine = '\n------------------------------------------------------------\n';
                
                const textarea = document.getElementById('memoContent');
                const startPos = textarea.selectionStart;
                const endPos = textarea.selectionEnd;
                const currentValue = textarea.value;
                
                // 在光标位置插入分割线
                const newValue = currentValue.substring(0, startPos) + splitLine + currentValue.substring(endPos);
                textarea.value = newValue;
                
                // 将光标移到插入文本的末尾
                const newPosition = startPos + splitLine.length;
                textarea.setSelectionRange(newPosition, newPosition);
                
                this.updateMemoStats();
            },
            
            // 打开设置模态框
            openSettingsModal() {
                this.isModalOpen = true;
                document.getElementById('settingsModal').style.display = 'flex';
            },
            
            // 关闭设置模态框
            closeSettingsModal() {
                this.isModalOpen = false;
                document.getElementById('settingsModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 选择文件进行恢复（调用Android接口）
            selectFileForRestore() {
                if (typeof AndroidInterface !== 'undefined' && AndroidInterface.selectFileForRestore) {
                    // 调用Android原生接口打开文件选择器
                    AndroidInterface.selectFileForRestore();
                    this.showMessage('正在打开文件选择器...', 'info');
                } else {
                    // 如果不在Android环境中，使用传统的文件输入方式
                    document.getElementById('jsonFileInput').click();
                }
            },
            
            // 打开帮助模态框
            openHelpModal() {
                this.isModalOpen = true;
                document.getElementById('helpModal').style.display = 'flex';
            },
            
            // 关闭帮助模态框
            closeHelpModal() {
                this.isModalOpen = false;
                document.getElementById('helpModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 打开恢复数据模态框
            openRestoreModal() {
                this.isModalOpen = true;
                document.getElementById('jsonDataInput').value = '';
                document.getElementById('jsonFileInput').value = '';
                document.getElementById('restoreModal').style.display = 'flex';
                this.closeSettingsModal();
            },
            
            // 关闭恢复数据模态框
            closeRestoreModal() {
                this.isModalOpen = false;
                document.getElementById('restoreModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 恢复数据
            restoreData() {
                let jsonData = document.getElementById('jsonDataInput').value.trim();
                
                if (!jsonData && document.getElementById('jsonFileInput').files.length === 0) {
                    this.showMessage('请选择文件或粘贴JSON数据', 'error');
                    return;
                }
                
                try {
                    let data;
                    if (jsonData) {
                        data = JSON.parse(jsonData);
                    } else {
                        this.showMessage('请选择要导入的文件', 'error');
                        return;
                    }
                    
                    if (data.certificates !== undefined) {
                        this.certificates = data.certificates.map(cert => {
                            // 对于续存类型的存单，在导入时也要重新计算利息
                            if (cert.duration === '续存') {
                                const depositDateObj = this.parseDateYYYYMMDD(cert.depositDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const daysDiff = Math.floor((today - depositDateObj) / (1000 * 60 * 60 * 24));
                                const years = daysDiff / 365;
                                const recalculatedInterest = cert.amount * (cert.interestRate / 100) * years;
                                
                                return {
                                    ...cert,
                                    interest: recalculatedInterest.toFixed(2),
                                    daysLeft: 9999 // 续存用9999表示无限期
                                };
                            }
                            return cert;
                        });
                        
                        if (data.lockedCertificates !== undefined) {
                            this.lockedCertificates = data.lockedCertificates;
                        }
                        if (data.memo !== undefined) {
                            this.memoContent = data.memo;
                            document.getElementById('memoContent').value = this.memoContent;
                        }
                        
                        this.saveToLocalStorage();
                        
                        // 重要：在导入数据后强制刷新整个界面状态
                        // 确保导入后处于解锁状态，以便用户可以立即编辑
                        this.isEditLocked = false; // 设置为解锁状态
                        
                        // 立即更新按钮状态以反映新的锁定状态
                        this.updateAllButtonStates();
                        
                        // 自动刷新数据
                        this.autoRefresh();
                        
                        // 延迟执行以确保DOM完全更新
                        setTimeout(() => {
                            this.addCardEventListeners();
                            
                            // 再次确保所有按钮状态正确
                            this.updateAllButtonStates();
                            this.updateCardButtonsState();
                            
                            // 添加卡片闪烁效果
                            this.flashCards();
                        }, 100);
                        
                        this.closeRestoreModal();
                        this.showMessage('数据恢复成功！', 'success');
                    } else {
                        this.showMessage('JSON格式不正确', 'error');
                    }
                } catch (error) {
                    this.showMessage('JSON格式错误: ' + error.message, 'error');
                }
            },
            
            // 处理文件选择
            handleFileSelect(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        document.getElementById('jsonDataInput').value = JSON.stringify(data, null, 2);
                    } catch (error) {
                        this.showMessage('文件格式错误: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            },
            
            // 清除所有数据
            clearAllData() {
                if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
                    this.certificates = [];
                    this.lockedCertificates = [];
                    this.memoContent = '';
                    
                    localStorage.removeItem('bankCertificates');
                    localStorage.removeItem('lockedCertificates');
                    localStorage.removeItem('bankMemo');
                    
                    document.getElementById('memoContent').value = '';
                    this.autoRefresh();
                    this.closeSettingsModal();
                    this.showMessage('所有数据已清除', 'success');
                }
            },
            
            // 保存到本地存储
            saveToLocalStorage() {
                localStorage.setItem('bankCertificates', JSON.stringify(this.certificates));
                localStorage.setItem('lockedCertificates', JSON.stringify(this.lockedCertificates));
                localStorage.setItem('bankMemo', this.memoContent);
            },
            
            // 检查即将到期的存单
            checkExpiringCertificates() {
                const expiringCerts = this.certificates.filter(cert => 
                    cert.status === 'expiring' && cert.daysLeft > 0 && cert.duration !== '续存'
                );
                
                if (expiringCerts.length > 0) {
                    const certNames = expiringCerts.map(cert => cert.bankName).join(', ');
                    this.showMessage(`有${expiringCerts.length}张存单即将到期: ${certNames}`, 'warning');
                }
            },
            
            // 更新导航点
            updateNavDots() {
                const container = document.getElementById('certificatesScroll');
                const cards = container.querySelectorAll('.certificate-card');
                const dotsContainer = document.getElementById('navDots');
                
                dotsContainer.innerHTML = '';
                
                cards.forEach((card, index) => {
                    const dot = document.createElement('div');
                    dot.className = 'nav-dot';
                    if (index === 0) dot.classList.add('active');
                    dot.addEventListener('click', () => {
                        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                    });
                    dotsContainer.appendChild(dot);
                });
            },
            
            // 滚动时更新活动导航点
            updateActiveDotOnScroll() {
                const container = document.getElementById('certificatesScroll');
                const cards = container.querySelectorAll('.certificate-card');
                const dots = document.querySelectorAll('.nav-dot');
                
                const scrollLeft = container.scrollLeft + container.offsetWidth / 2;
                
                cards.forEach((card, index) => {
                    const cardLeft = card.offsetLeft;
                    const cardRight = cardLeft + card.offsetWidth;
                    
                    if (scrollLeft >= cardLeft && scrollLeft <= cardRight) {
                        dots.forEach((dot, dotIndex) => {
                            dot.classList.toggle('active', dotIndex === index);
                        });
                    }
                });
            },
            
            // 关闭模态框
            closeModal() {
                this.isModalOpen = false;
                document.getElementById('certificateModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 关闭锁模态框
            closeLockModal() {
                this.isModalOpen = false;
                document.getElementById('lockConfirmModal').style.display = 'none';
                // 模态框关闭后重置自动锁定计时器
                this.resetAutoLockTimer();
            },
            
            // 解锁存单
            unlockCertificate() {
                // 这里可以添加解锁特定存单的逻辑
                this.closeLockModal();
                this.showMessage('存单解锁成功', 'success');
            },
            
            // 设置模态框关闭监听
            setupModalCloseListeners() {
                const modals = document.querySelectorAll('.modal');
                
                modals.forEach(modal => {
                    // 点击模态框外部关闭
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.isModalOpen = false;
                            modal.style.display = 'none';
                            // 模态框关闭后重置自动锁定计时器
                            this.resetAutoLockTimer();
                        }
                    });
                    
                    // 添加ESC键关闭功能
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && modal.style.display === 'flex') {
                            this.isModalOpen = false;
                            modal.style.display = 'none';
                            // 模态框关闭后重置自动锁定计时器
                            this.resetAutoLockTimer();
                        }
                    });
                });
            }
        };
        
        // 设置视口高度以解决移动设备上的显示问题
        function setViewportProperty() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        // 初始化时设置
        setViewportProperty();
        
        // 窗口大小改变时重新设置
        window.addEventListener('resize', setViewportProperty);
        window.addEventListener('orientationchange', setViewportProperty);
        
        // 初始化应用
        document.addEventListener('DOMContentLoaded', () => {
            App.init();
        });
        
        // 处理从Android选择的文件
        function handleSelectedFile(jsonContent) {
            try {
                const data = JSON.parse(jsonContent);
                
                if (data.certificates !== undefined) {
                    App.certificates = data.certificates.map(cert => {
                        // 对于续存类型的存单，在导入时也要重新计算利息
                        if (cert.duration === '续存') {
                            const depositDateObj = App.parseDateYYYYMMDD(cert.depositDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const daysDiff = Math.floor((today - depositDateObj) / (1000 * 60 * 60 * 24));
                            const years = daysDiff / 365;
                            const recalculatedInterest = cert.amount * (cert.interestRate / 100) * years;
                            
                            return {
                                ...cert,
                                interest: recalculatedInterest.toFixed(2),
                                daysLeft: 9999 // 续存用9999表示无限期
                            };
                        }
                        return cert;
                    });
                    
                    if (data.lockedCertificates !== undefined) {
                        App.lockedCertificates = data.lockedCertificates;
                    }
                    if (data.memo !== undefined) {
                        App.memoContent = data.memo;
                        document.getElementById('memoContent').value = App.memoContent;
                    }
                    
                    App.saveToLocalStorage();
                    
                    // 重要：在导入数据后强制刷新整个界面状态
                    // 确保导入后处于解锁状态，以便用户可以立即编辑
                    App.isEditLocked = false; // 设置为解锁状态
                    
                    // 立即更新按钮状态以反映新的锁定状态
                    App.updateAllButtonStates();
                    
                    // 自动刷新数据
                    App.autoRefresh();
                    
                    // 延迟执行以确保DOM完全更新
                    setTimeout(() => {
                        App.addCardEventListeners();
                        
                        // 再次确保所有按钮状态正确
                        App.updateAllButtonStates();
                        App.updateCardButtonsState();
                        
                        // 添加卡片闪烁效果
                        App.flashCards();
                    }, 100);
                    
                    App.closeRestoreModal();
                    App.showMessage('数据恢复成功！', 'success');
                } else {
                    App.showMessage('JSON格式不正确', 'error');
                }
            } catch (error) {
                console.error('解析JSON失败:', error);
                App.showMessage('JSON格式错误: ' + error.message, 'error');
            }
        }
    