


    (function() {
      // ========== 页面切换 ==========
      const mainPage = document.getElementById('mainPage');
      const previewPage = document.getElementById('previewPage');
      const profilePage = document.getElementById('profilePage');
      const editProfileBtn = document.getElementById('editProfileBtn');
      const backBtn = document.getElementById('backFromProfileBtn');
      const runBtn = document.getElementById('runBtn');
      const backToEditorBtn = document.getElementById('backToEditorBtn');

      function showMainPage() {
        mainPage.style.display = 'flex';
        previewPage.classList.remove('active');
        profilePage.classList.remove('active');
      }
      function showPreviewPage() {
        mainPage.style.display = 'none';
        previewPage.classList.add('active');
        profilePage.classList.remove('active');
        updatePreview();
      }
      function showProfilePage() {
        mainPage.style.display = 'none';
        previewPage.classList.remove('active');
        profilePage.classList.add('active');
      }
      if(runBtn) runBtn.addEventListener('click', showPreviewPage);
      if(backToEditorBtn) backToEditorBtn.addEventListener('click', showMainPage);
      if(editProfileBtn) editProfileBtn.addEventListener('click', showProfilePage);
      if(backBtn) backBtn.addEventListener('click', showMainPage);

      // ========== 代码编辑器 ==========
      const fullModeDiv = document.getElementById('editorFullMode');
      const splitModeDiv = document.getElementById('editorSplitMode');
      const parseBtn = document.getElementById('parseToSplitBtn');
      const mergeBtn = document.getElementById('mergeToFullBtn');
      const modeToggleBtn = document.getElementById('modeToggleBtn');

      const fullTextarea = document.getElementById('fullCodeTextarea');
      const splitHtml = document.getElementById('splitHtmlTextarea');
      const splitCss = document.getElementById('splitCssTextarea');
      const splitJs = document.getElementById('splitJsTextarea');
      const previewIframe = document.getElementById('previewIframe');

      const splitTabs = document.querySelectorAll('.split-tab');
      const splitPanes = document.querySelectorAll('.split-pane');

      let currentMode = 'full';

      fullTextarea.value = '';
      splitHtml.value = '';
      splitCss.value = '';
      splitJs.value = '';

      function setMode(mode) {
        currentMode = mode;
        if (mode === 'full') {
          fullModeDiv.style.display = 'block';
          splitModeDiv.style.display = 'none';
          modeToggleBtn.textContent = '📄 完整HTML';
          modeToggleBtn.classList.add('active-mode');
          parseBtn.style.display = 'inline-block';
          mergeBtn.style.display = 'none';
        } else {
          fullModeDiv.style.display = 'none';
          splitModeDiv.style.display = 'block';
          modeToggleBtn.textContent = '📁 三文件区';
          modeToggleBtn.classList.remove('active-mode');
          parseBtn.style.display = 'none';
          mergeBtn.style.display = 'inline-block';
        }
      }

      if(modeToggleBtn) {
        modeToggleBtn.addEventListener('click', function() {
          if (currentMode === 'full') setMode('split');
          else setMode('full');
          updatePreview();
        });
      }

      splitTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const target = e.target.dataset.split;
          splitTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          splitPanes.forEach(p => p.classList.remove('active-pane'));
          if (target === 'html') document.getElementById('splitPaneHtml').classList.add('active-pane');
          else if (target === 'css') document.getElementById('splitPaneCss').classList.add('active-pane');
          else if (target === 'js') document.getElementById('splitPaneJs').classList.add('active-pane');
        });
      });

      if(parseBtn) {
        parseBtn.addEventListener('click', () => {
          if (currentMode !== 'full') return;
          const full = fullTextarea.value;
          const styleBlocks = [];
          const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
          let styleMatch;
          while ((styleMatch = styleRegex.exec(full)) !== null) styleBlocks.push(styleMatch[1]);
          const scriptBlocks = [];
          const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
          let scriptMatch;
          while ((scriptMatch = scriptRegex.exec(full)) !== null) scriptBlocks.push(scriptMatch[1]);
          let htmlExt = full
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<\/?html[^>]*>/gi, '')
            .replace(/<\/?head[^>]*>/gi, '')
            .replace(/<\/?body[^>]*>/gi, '')
            .replace(/<meta[^>]*>/gi, '')
            .trim();
          splitHtml.value = htmlExt;
          splitCss.value = styleBlocks.join('\n\n');
          splitJs.value = scriptBlocks.join('\n\n');
          setMode('split');
          autoSaveCode();
          updatePreview();
        });
      }

      if(mergeBtn) {
        mergeBtn.addEventListener('click', () => {
          if (currentMode !== 'split') return;
          const merged = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${splitCss.value}</style>
</head>
<body>
${splitHtml.value}
<script>${splitJs.value}<\/script>
</body>
</html>`;
          fullTextarea.value = merged;
          setMode('full');
          autoSaveCode();
          updatePreview();
        });
      }

      function updatePreview() {
        let htmlContent = '';
        if (currentMode === 'full') {
          htmlContent = fullTextarea.value || '<!-- 空内容 -->';
        } else {
          const h = splitHtml.value || '';
          const c = splitCss.value || '';
          const j = splitJs.value || '';
          htmlContent = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><style>${c}</style></head>\n<body>${h}<script>${j}<\/script>\n</body>\n</html>`;
        }
        if(previewIframe) previewIframe.srcdoc = htmlContent;
      }

      document.getElementById('clearBtn').addEventListener('click', () => {
        if (currentMode === 'full') fullTextarea.value = '';
        else { splitHtml.value = ''; splitCss.value = ''; splitJs.value = ''; }
        updatePreview();
        autoSaveCode();
      });

      document.getElementById('clearAllBtn').addEventListener('click', () => {
        fullTextarea.value = '';
        splitHtml.value = '';
        splitCss.value = '';
        splitJs.value = '';
        document.getElementById('appName').value = '';
        document.getElementById('iconFile').value = '';
        document.getElementById('autoUpload').checked = false;
        updatePreview();
        autoSaveCode();
        console.log('🧹 已清空所有输入框');
      });

      document.getElementById('copyBtn').addEventListener('click', async () => {
        let text = '';
        if (currentMode === 'full') text = fullTextarea.value;
        else {
          const activePaneId = [...splitPanes].find(p => p.classList.contains('active-pane'))?.id;
          if (activePaneId === 'splitPaneHtml') text = splitHtml.value;
          else if (activePaneId === 'splitPaneCss') text = splitCss.value;
          else text = splitJs.value;
        }
        try { await navigator.clipboard.writeText(text); alert('✅ 已复制到剪贴板'); }
        catch { alert('❌ 复制失败'); }
      });

      document.getElementById('pasteBtn').addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (currentMode === 'full') fullTextarea.value = text;
          else {
            const activePaneId = [...splitPanes].find(p => p.classList.contains('active-pane'))?.id;
            if (activePaneId === 'splitPaneHtml') splitHtml.value = text;
            else if (activePaneId === 'splitPaneCss') splitCss.value = text;
            else if (activePaneId === 'splitPaneJs') splitJs.value = text;
          }
          updatePreview();
          autoSaveCode();
          alert('✅ 粘贴成功');
        } catch { alert('❌ 粘贴失败，请检查剪贴板权限'); }
      });

      document.getElementById('deleteBtn').addEventListener('click', () => {
        if (currentMode === 'full') fullTextarea.value = '';
        else {
          const activePaneId = [...splitPanes].find(p => p.classList.contains('active-pane'))?.id;
          if (activePaneId === 'splitPaneHtml') splitHtml.value = '';
          else if (activePaneId === 'splitPaneCss') splitCss.value = '';
          else if (activePaneId === 'splitPaneJs') splitJs.value = '';
        }
        updatePreview();
        autoSaveCode();
      });

      document.getElementById('batchImportBtn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        if (currentMode === 'full') { input.accept = '.html,.htm'; input.multiple = false; }
        else { input.accept = '.html,.htm,.css,.js'; input.multiple = true; }

        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          if (currentMode === 'full') {
            if (files.length !== 1) { alert('❌ 完整模式只能导入一个HTML文件'); return; }
            const file = files[0];
            if (!file.name.match(/\.html?$/i)) { alert('❌ 完整模式只能导入HTML文件'); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
              fullTextarea.value = ev.target.result;
              setMode('full');
              autoSaveCode();
              updatePreview();
              alert('✅ HTML完整文件导入成功');
            };
            reader.readAsText(file);
          } else {
            const htmlFiles = files.filter(f => f.name.match(/\.html?$/i));
            const cssFiles = files.filter(f => f.name.match(/\.css$/i));
            const jsFiles = files.filter(f => f.name.match(/\.js$/i));
            const totalValidFiles = htmlFiles.length + cssFiles.length + jsFiles.length;
            if (totalValidFiles !== files.length) { alert('❌ 只能导入HTML、CSS或JS文件'); return; }
            if (htmlFiles.length > 1 || cssFiles.length > 1 || jsFiles.length > 1) { alert('❌ 每种类型只能选择一个文件'); return; }
            const readFileContent = (file) => new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e);
              reader.readAsText(file);
            });
            (async () => {
              let htmlContent = '', cssContent = '', jsContent = '';
              for (const file of files) {
                const content = await readFileContent(file);
                if (file.name.match(/\.html?$/i)) htmlContent = content;
                else if (file.name.match(/\.css$/i)) cssContent = content;
                else if (file.name.match(/\.js$/i)) jsContent = content;
              }
              if (htmlContent) splitHtml.value = htmlContent;
              if (cssContent) splitCss.value = cssContent;
              if (jsContent) splitJs.value = jsContent;
              setMode('split');
              autoSaveCode();
              updatePreview();
              const importedTypes = [];
              if (htmlContent) importedTypes.push('HTML');
              if (cssContent) importedTypes.push('CSS');
              if (jsContent) importedTypes.push('JS');
              alert(`✅ 导入成功：${importedTypes.join('、')}`);
            })();
          }
        };
        input.click();
      });

      // 导出
      const exportModal = document.getElementById('exportModal');
      const confirmExport = document.getElementById('confirmExport');
      const cancelExport = document.getElementById('cancelExport');
      const exportFull = document.getElementById('exportFull');
      const exportSplit = document.getElementById('exportSplit');
      const exportZip = document.getElementById('exportZip');
      const exportButton = document.getElementById('exportBtn');

      function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      if (exportButton) exportButton.addEventListener('click', () => exportModal.classList.add('active'));
      if (cancelExport) cancelExport.addEventListener('click', () => exportModal.classList.remove('active'));
      if (confirmExport) {
        confirmExport.addEventListener('click', () => {
          exportModal.classList.remove('active');
          const useZip = exportZip.checked;
          if (exportFull.checked) {
            const content = fullTextarea.value || '<!-- 空内容 -->';
            if (useZip) {
              if (typeof JSZip === 'undefined') { alert('JSZip 库未加载，请刷新页面'); return; }
              const zip = new JSZip();
              zip.file('index.html', content);
              zip.generateAsync({ type: 'blob' }).then(blob => downloadBlob(blob, 'export.zip')).catch(err => { console.error('ZIP生成失败', err); alert('ZIP生成失败，请重试'); });
            } else downloadFile('index.html', content);
          } else if (exportSplit.checked) {
            const htmlContent = splitHtml.value || '';
            const cssContent = splitCss.value || '';
            const jsContent = splitJs.value || '';
            const htmlTemplate = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  {{HTML_CONTENT}}\n  <script src="app.js"><' + '/script>\n</body>\n</html>';
            const finalHtml = htmlTemplate.replace('{{HTML_CONTENT}}', htmlContent);
            if (useZip) {
              if (typeof JSZip === 'undefined') { alert('JSZip 库未加载，请刷新页面'); return; }
              const zip = new JSZip();
              zip.file('index.html', finalHtml);
              zip.file('style.css', cssContent);
              zip.file('app.js', jsContent);
              zip.generateAsync({ type: 'blob' }).then(blob => downloadBlob(blob, 'export.zip')).catch(err => { console.error('ZIP生成失败', err); alert('ZIP生成失败，请重试'); });
            } else {
              downloadFile('index.html', finalHtml);
              downloadFile('style.css', cssContent);
              downloadFile('app.js', jsContent);
            }
          }
        });
      }

      // 主题切换
      const themeToggle = document.getElementById('themeToggleBtn');
      if(themeToggle) {
        themeToggle.addEventListener('click', () => {
          if (document.body.classList.contains('light-mode')) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('tech-mode');
            themeToggle.textContent = '🌙 柔光';
          } else if (document.body.classList.contains('tech-mode')) {
            document.body.classList.remove('tech-mode');
            document.body.classList.add('light-mode');
            themeToggle.textContent = '🌙 主题';
          } else {
            document.body.classList.add('tech-mode');
            themeToggle.textContent = '🌙 柔光';
          }
        });
      }

      // ========== 控制台功能 ==========
      const appNameInput = document.getElementById('appName');
      const appNameRow = document.getElementById('appNameRow');
      const pathSpan = document.getElementById('pathPreview');
      const iconFile = document.getElementById('iconFile');
      const iconFileRow = document.getElementById('iconFileRow');
      const autoUploadCheckbox = document.getElementById('autoUpload');
      const gitUserInput = document.getElementById('gitUser');
      const gitRepoInput = document.getElementById('gitRepo');
      const gitTokenInput = document.getElementById('gitToken');
      const saveConfigBtn = document.getElementById('saveConfigBtn');
      const selectGithubBtn = document.getElementById('selectGithubBtn');
      const selectGiteeBtn = document.getElementById('selectGiteeBtn');
      const showRepoListBtn = document.getElementById('showRepoListBtn');
      const addCurrentRepoBtn = document.getElementById('addCurrentRepoBtn');
      const repoListContainer = document.getElementById('repoListContainer');
      const repoListDiv = document.getElementById('repoList');
      const btnGenerate = document.getElementById('btnGenerate');
      const btnUpload = document.getElementById('btnUpload');
      const btnUpdateJson = document.getElementById('btnUpdateJson');
      const btnClearProfile = document.getElementById('btnClearProfile');
      const btnDeleteApp = document.getElementById('btnDeleteApp');
      const btnShowApps = document.getElementById('btnShowApps');
      const btnShowBackups = document.getElementById('btnShowBackups');
      const logEl = document.getElementById('logOutput');
      const toggleEditConfig = document.getElementById('toggleEditConfig');
      const editConfigCollapsible = document.getElementById('editConfigCollapsible');

      function log(msg) {
        if (!logEl) return;
        const now = new Date();
        const time = `[${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}]`;
        const safe = String(msg).replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '?');
        let text = logEl.textContent + '\n' + time + ' ' + safe;
        if (text.length > 5000) text = text.slice(-4500);
        logEl.textContent = text;
        const logBox = document.querySelector('.log-box');
        if (logBox) logBox.scrollTop = logBox.scrollHeight;
      }

      function updateAppNameHighlight() {
        const hasValue = appNameInput.value.trim().length > 0;
        if (hasValue) appNameRow.classList.add('highlight');
        else appNameRow.classList.remove('highlight');
        let val = appNameInput.value.trim();
        if (val === '') val = '应用名称';
        pathSpan.textContent = val;
      }
      if (appNameInput) {
        appNameInput.addEventListener('input', updateAppNameHighlight);
        appNameInput.addEventListener('blur', updateAppNameHighlight);
        updateAppNameHighlight();
      }

      if (iconFile) {
        iconFile.addEventListener('change', function() {
          if (this.files && this.files.length > 0) iconFileRow.classList.add('highlight');
          else iconFileRow.classList.remove('highlight');
        });
      }

      function getConfig() {
        const appName = document.getElementById('appName').value.trim();
        const autoUpload = document.getElementById('autoUpload').checked;
        const platform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
        const gitUser = localStorage.getItem(platform + '_user') || '';
        const gitRepo = localStorage.getItem(platform + '_repo') || '';
        const gitToken = localStorage.getItem(platform + '_token') || '';
        return { appName, gitUser, gitRepo, gitToken, autoUpload, platform };
      }

      function getApiBase(platform) {
        return platform === 'github' ? 'https://api.github.com' : 'https://gitee.com/api/v5';
      }

      function updateDisplay() {
        const platform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
        const user = localStorage.getItem(platform + '_user') || '未设置';
        const repo = localStorage.getItem(platform + '_repo') || '未设置';
        const token = localStorage.getItem(platform + '_token') ? '已设置' : '未设置';
        if (document.getElementById('currentUserDisplay')) document.getElementById('currentUserDisplay').textContent = user;
        if (document.getElementById('currentRepoDisplay')) document.getElementById('currentRepoDisplay').textContent = repo;
        if (document.getElementById('currentTokenDisplay')) document.getElementById('currentTokenDisplay').textContent = token;
        if (document.getElementById('currentPlatformBadge')) document.getElementById('currentPlatformBadge').innerHTML = platform === 'github' ? '🐙 GitHub' : '🦊 Gitee';
        if (document.getElementById('editingPlatformHint')) document.getElementById('editingPlatformHint').textContent = platform === 'github' ? '当前编辑: GitHub' : '当前编辑: Gitee';
        if (selectGithubBtn && selectGiteeBtn) {
          if (platform === 'github') {
            selectGithubBtn.style.background = 'var(--accent-primary)';
            selectGithubBtn.style.borderColor = 'var(--accent-primary-dark)';
            selectGithubBtn.style.color = '#ffffff';
            selectGiteeBtn.style.background = '';
            selectGiteeBtn.style.borderColor = '';
            selectGiteeBtn.style.color = '';
          } else {
            selectGiteeBtn.style.background = 'var(--accent-primary)';
            selectGiteeBtn.style.borderColor = 'var(--accent-primary-dark)';
            selectGiteeBtn.style.color = '#ffffff';
            selectGithubBtn.style.background = '';
            selectGithubBtn.style.borderColor = '';
            selectGithubBtn.style.color = '';
          }
        }
      }

      function loadCurrentPlatformToInputs() {
        const platform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
        const user = localStorage.getItem(platform + '_user') || '';
        const repo = localStorage.getItem(platform + '_repo') || '';
        const token = localStorage.getItem(platform + '_token') || '';
        if (gitUserInput) gitUserInput.value = user;
        if (gitRepoInput) gitRepoInput.value = repo;
        if (gitTokenInput) gitTokenInput.value = token;
        log(`📂 已加载 ${platform === 'github' ? 'GitHub' : 'Gitee'} 的配置到编辑框`);
      }

      function saveConfig() {
        const platform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
        const user = gitUserInput?.value.trim() || '';
        const repo = gitRepoInput?.value.trim() || '';
        const token = gitTokenInput?.value.trim() || '';
        if (!user || !repo) { log('❌ 请填写用户和仓库名'); return false; }
        localStorage.setItem(platform + '_user', user);
        localStorage.setItem(platform + '_repo', repo);
        if (token) localStorage.setItem(platform + '_token', token);
        updateDisplay();
        log(`✅ 已保存到 ${platform === 'github' ? 'GitHub' : 'Gitee'}`);
        return true;
      }

      if (selectGithubBtn) selectGithubBtn.addEventListener('click', function() {
        const radio = document.querySelector('input[name="platform"][value="github"]');
        if (radio) radio.checked = true;
        updateDisplay(); loadCurrentPlatformToInputs();
      });
      if (selectGiteeBtn) selectGiteeBtn.addEventListener('click', function() {
        const radio = document.querySelector('input[name="platform"][value="gitee"]');
        if (radio) radio.checked = true;
        updateDisplay(); loadCurrentPlatformToInputs();
      });
      if (saveConfigBtn) saveConfigBtn.addEventListener('click', function(e) { e.preventDefault(); saveConfig(); });

      if (autoUploadCheckbox) {
        const savedAutoUpload = localStorage.getItem('autoUpload') === 'true';
        autoUploadCheckbox.checked = savedAutoUpload;
        autoUploadCheckbox.addEventListener('change', function() {
          localStorage.setItem('autoUpload', this.checked);
          if (this.checked) {
            log('⚡ 自动上传开关已打开，立即执行：生成 → 上传 → 更新JSON → 备份');
            this.disabled = true;
            runAutoUploadChain();
          }
        });
      }

      function initPlatformConfig() {
        const savedPlatform = localStorage.getItem('last_used_platform') || 'github';
        const radio = document.querySelector(`input[name="platform"][value="${savedPlatform}"]`);
        if (radio) radio.checked = true;
        updateDisplay(); loadCurrentPlatformToInputs();
        document.querySelectorAll('input[name="platform"]').forEach(radio => {
          radio.addEventListener('change', function() {
            localStorage.setItem('last_used_platform', this.value);
          });
        });
      }

      let repositories = [];
      function loadReposFromStorage() {
        const saved = localStorage.getItem('repositories');
        if (saved) { try { repositories = JSON.parse(saved); } catch (e) { repositories = []; } }
      }
      function saveReposToStorage() { localStorage.setItem('repositories', JSON.stringify(repositories)); }

      function renderRepoList() {
        if (!repoListDiv) return;
        if (repositories.length === 0) {
          repoListDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 8px;">暂无仓库，点击【添加当前】保存</div>';
          return;
        }
        repoListDiv.innerHTML = '';
        repositories.forEach((repo, index) => {
          const platformIcon = repo.platform === 'github' ? '🐙' : '🦊';
          const item = document.createElement('div');
          item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 2px solid var(--border-color); font-size: 0.8rem; background: var(--card-bg);';
          item.innerHTML = `
            <span style="color: var(--text-primary);">${platformIcon} ${repo.user}/${repo.repo}</span>
            <div>
              <span style="background: var(--tag-bg); border: 2px solid var(--border-color); border-radius: 30px; padding: 2px 8px; margin-right: 4px; cursor: pointer; color: var(--text-primary);" class="use-repo" data-index="${index}">使用</span>
              <span style="background: var(--danger-bg); border: 2px solid var(--accent-danger); border-radius: 30px; padding: 2px 8px; cursor: pointer; color: var(--accent-danger);" class="delete-repo" data-index="${index}">删除</span>
            </div>`;
          repoListDiv.appendChild(item);
        });
        document.querySelectorAll('.use-repo').forEach(btn => {
          btn.addEventListener('click', () => {
            const repo = repositories[btn.dataset.index];
            const radio = document.querySelector(`input[name="platform"][value="${repo.platform}"]`);
            if (radio) radio.checked = true;
            if (gitUserInput) gitUserInput.value = repo.user;
            if (gitRepoInput) gitRepoInput.value = repo.repo;
            updateDisplay();
            log(`📋 已加载仓库: ${repo.user}/${repo.repo}`);
          });
        });
        document.querySelectorAll('.delete-repo').forEach(btn => {
          btn.addEventListener('click', () => {
            repositories.splice(btn.dataset.index, 1);
            saveReposToStorage(); renderRepoList();
            log(`🗑️ 已删除仓库`);
          });
        });
      }

      if (showRepoListBtn) showRepoListBtn.addEventListener('click', function() {
        if (repoListContainer.style.display === 'none') { repoListContainer.style.display = 'block'; renderRepoList(); }
        else repoListContainer.style.display = 'none';
      });

      if (addCurrentRepoBtn) addCurrentRepoBtn.addEventListener('click', function() {
        const platform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
        const user = gitUserInput?.value.trim();
        const repo = gitRepoInput?.value.trim();
        if (!user || !repo) { log('❌ 请填写用户和仓库名'); return; }
        if (repositories.some(r => r.user === user && r.repo === repo && r.platform === platform)) { log('⚠️ 仓库已存在'); return; }
        repositories.push({ user, repo, platform });
        saveReposToStorage(); renderRepoList();
        log(`✅ 已添加仓库: ${user}/${repo}`);
      });

      // ========== 工具函数 ==========
      function toBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      }
      function fromBase64(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      }

      // base64 -> Blob（二进制安全）
      function base64ToBlob(base64, mime) {
        const byteChars = atob(base64);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        return new Blob([byteNumbers], { type: mime });
      }

      // base64 -> File（用于回填 <input type="file">）
      function base64ToFile(base64, filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml'
        };
        const blob = base64ToBlob(base64, mimeMap[ext] || 'application/octet-stream');
        return new File([blob], filename, { type: blob.type });
      }

      // 把 File 塞进 <input type="file">
      function setFileInput(inputEl, file) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          inputEl.files = dt.files;
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        } catch (e) {
          console.warn('setFileInput 失败:', e);
          return false;
        }
      }

      // 在指定目录下探测 logo 文件
      async function findLogoInDir(gitUser, gitRepo, gitToken, basePath) {
        const exts = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg'];
        for (const ext of exts) {
          const path = `${basePath}/logo.${ext}`;
          try {
            const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path });
            if (file?.content) return { content: file.content, filename: `logo.${ext}`, path };
          } catch (e) { /* 404 忽略 */ }
        }
        // 兜底：无扩展名 logo
        try {
          const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${basePath}/logo` });
          if (file?.content) return { content: file.content, filename: 'logo', path: `${basePath}/logo` };
        } catch (e) {}
        return null;
      }

      // 回填图标到 input，带日志
      async function restoreIconFromRemote(gitUser, gitRepo, gitToken, basePath, label) {
        const iconInput = document.getElementById('iconFile');
        const iconRow = document.getElementById('iconFileRow');
        const logo = await findLogoInDir(gitUser, gitRepo, gitToken, basePath);
        if (logo && logo.content) {
          const fileObj = base64ToFile(logo.content, logo.filename);
          const ok = setFileInput(iconInput, fileObj);
          if (ok) {
            log(`🖼️ 已回填图标${label ? ' (' + label + ')' : ''}: ${logo.filename}`);
            return true;
          }
        }
        // 没找到或回填失败：清空，避免残留上一个应用的图标
        iconInput.value = '';
        iconRow.classList.remove('highlight');
        log(`⚠️ 未找到图标 logo.*${label ? ' (' + label + ')' : ''}，请手动选择`);
        return false;
      }

      function getAppFilesSafe() {
        return {
          html: fullTextarea.value || '<!DOCTYPE html><meta charset="UTF-8"><title>应用</title><h1>⚡</h1>',
          css: splitCss.value || '/* 样式 */',
          js: splitJs.value || '// 脚本'
        };
      }
      async function buildAppFiles(appName) {
        const { html, css, js } = getAppFilesSafe();
        const files = {};
        files[`apps/${appName}/index.html`] = { content: html, isBinary: false };
        files[`apps/${appName}/style.css`] = { content: css, isBinary: false };
        files[`apps/${appName}/app.js`] = { content: js, isBinary: false };
        const iconFileInput = document.getElementById('iconFile');
        if (iconFileInput.files && iconFileInput.files.length > 0) {
          const file = iconFileInput.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
              const base64 = e.target.result.split(',')[1];
              const filename = ext ? `logo.${ext}` : 'logo';
              files[`apps/${appName}/${filename}`] = { content: base64, isBinary: true };
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
        return files;
      }

      async function githubUpload({ user, repo, token, path, fileInfo, message }) {
        const { platform } = getConfig();
        const baseUrl = getApiBase(platform);
        const url = platform === 'github'
          ? `${baseUrl}/repos/${user}/${repo}/contents/${path}`
          : `${baseUrl}/repos/${user}/${repo}/contents/${path}?access_token=${token}`;
        let contentToUpload = fileInfo.isBinary ? fileInfo.content : toBase64(fileInfo.content);
        let sha = null;
        try {
          const existingFile = await githubGetFile({ user, repo, token, path });
          if (existingFile && existingFile.sha) sha = existingFile.sha;
        } catch (e) {}
        const body = { message, content: contentToUpload };
        if (sha) body.sha = sha;
        const headers = platform === 'github'
          ? { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };
        const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || `HTTP ${res.status}`);
        }
        return res.json();
      }

      async function githubGetFile({ user, repo, token, path }) {
        const { platform } = getConfig();
        const baseUrl = getApiBase(platform);
        const url = platform === 'github'
          ? `${baseUrl}/repos/${user}/${repo}/contents/${path}`
          : `${baseUrl}/repos/${user}/${repo}/contents/${path}?access_token=${token}`;
        const headers = platform === 'github' ? { 'Authorization': `token ${token}` } : {};
        const res = await fetch(url, { headers });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('获取失败');
        return res.json();
      }

      async function githubDelete({ user, repo, token, path, sha, message }) {
        const { platform } = getConfig();
        const baseUrl = getApiBase(platform);
        const url = platform === 'github'
          ? `${baseUrl}/repos/${user}/${repo}/contents/${path}`
          : `${baseUrl}/repos/${user}/${repo}/contents/${path}?access_token=${token}`;
        const headers = platform === 'github'
          ? { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };
        const body = { message, sha };
        const res = await fetch(url, { method: 'DELETE', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('删除失败');
        return res.json();
      }

      async function updateConfigurationJsonInternal(appName, gitUser, gitRepo, gitToken, platform) {
        let iconPath = `apps/${appName}/logo`;
        const iconFileInput = document.getElementById('iconFile');
        if (iconFileInput.files && iconFileInput.files.length > 0) {
          const ext = iconFileInput.files[0].name.split('.').pop().toLowerCase();
          if (['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
            iconPath = `apps/${appName}/logo.${ext}`;
          }
        }
        log(`📖 读取 configuration.json...`);
        const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: 'configuration.json' });
        let apps = [];
        let sha = null;
        if (file?.content) {
          try {
            apps = JSON.parse(fromBase64(file.content));
            sha = file.sha;
            log(`   已存在 ${apps.length} 个应用配置`);
          } catch (e) { log(`   ⚠️ 解析失败，将创建新文件`); apps = []; }
        } else { log(`   ⚠️ 文件不存在，将创建新文件`); }
        const oldCount = apps.length;
        apps = apps.filter(a => a.name !== appName);
        if (apps.length < oldCount) log(`   已移除旧配置: ${appName}`);
        apps.push({ name: appName, icon: iconPath, url: `apps/${appName}/` });
        log(`   添加新配置: ${appName}`);
        log(`   图标路径: ${iconPath}`);
        const configContent = JSON.stringify(apps, null, 2);
        const contentBase64 = toBase64(configContent);
        const baseUrl = getApiBase(platform);
        const url = platform === 'github'
          ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/configuration.json`
          : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/configuration.json?access_token=${gitToken}`;
        const body = { message: `更新 configuration.json - 添加 ${appName}`, content: contentBase64 };
        if (sha) body.sha = sha;
        const headers = platform === 'github'
          ? { 'Authorization': `token ${gitToken}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };
        const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!res.ok) { const error = await res.json(); throw new Error(error.message || `HTTP ${res.status}`); }
        log('✅ configuration.json 已更新');
        log(`   当前共有 ${apps.length} 个应用`);
      }

      async function autoBackupApp(appName, gitUser, gitRepo, gitToken, platform) {
        log(`📦 自动备份: ${appName}`);
        const paths = [
          `apps/${appName}/index.html`,
          `apps/${appName}/style.css`,
          `apps/${appName}/app.js`
        ];
        const iconExts = ['', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'];
        iconExts.forEach(ext => paths.push(`apps/${appName}/logo${ext}`));

        function getBackupName(name) {
          const date = new Date().toISOString().slice(0, 10);
          const key = `backup_index_${date}`;
          let index = parseInt(localStorage.getItem(key) || "0", 10) + 1;
          localStorage.setItem(key, index);
          return `${name}-${date}T${index}`;
        }
        const backupBase = "backup/" + getBackupName(appName);
        let backupCount = 0;

        for (const path of paths) {
          try {
            const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path });
            if (!file?.sha) continue;
            const filename = path.split('/').pop();
            let backupSha = null;
            try {
              const backupFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${backupBase}/${filename}` });
              if (backupFile && backupFile.sha) backupSha = backupFile.sha;
            } catch (e) {}
            const backupBody = { message: `备份 ${appName} - ${filename}`, content: file.content };
            if (backupSha) backupBody.sha = backupSha;
            const baseUrl = getApiBase(platform);
            const backupUrl = platform === 'github'
              ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${backupBase}/${filename}`
              : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${backupBase}/${filename}?access_token=${gitToken}`;
            const headers = platform === 'github'
              ? { 'Authorization': `token ${gitToken}`, 'Content-Type': 'application/json' }
              : { 'Content-Type': 'application/json' };
            const backupRes = await fetch(backupUrl, { method: 'PUT', headers, body: JSON.stringify(backupBody) });
            if (backupRes.ok) { log(`   📦 已备份: ${filename}`); backupCount++; }
          } catch (e) {}
        }
        log(`✅ 自动备份完成，共 ${backupCount} 个文件`);
        return backupCount;
      }

      let _autoChainRunning = false;
      async function runAutoUploadChain() {
        if (_autoChainRunning) return;
        _autoChainRunning = true;

        const { appName, gitUser, gitRepo, gitToken, platform } = getConfig();

        const restoreSwitch = () => {
          if (autoUploadCheckbox) {
            autoUploadCheckbox.checked = false;
            autoUploadCheckbox.disabled = false;
            localStorage.setItem('autoUpload', 'false');
          }
          _autoChainRunning = false;
        };

        try {
          if (!appName) { log('❌ 应用名不能为空，自动链中止'); restoreSwitch(); return; }
          if (!gitUser || !gitRepo || !gitToken) { log('❌ 缺少认证信息，自动链中止'); restoreSwitch(); return; }
          if (!fullTextarea.value.trim() && !splitHtml.value.trim() && !splitCss.value.trim() && !splitJs.value.trim()) {
            log('❌ 编辑器内容为空，自动链中止'); restoreSwitch(); return;
          }

          log(`🏭 [自动链1/4] 生成文件夹: apps/${appName}/`);
          const files = await buildAppFiles(appName);
          Object.keys(files).forEach(path => log(`   📄 ${path.split('/').pop()}`));

          log(`📤 [自动链2/4] 上传到 ${platform === 'github' ? 'GitHub' : 'Gitee'} ${gitUser}/${gitRepo}`);
          for (const [path, fileInfo] of Object.entries(files)) {
            try {
              await githubUpload({ user: gitUser, repo: gitRepo, token: gitToken, path, fileInfo, message: `上传 ${appName} - ${path.split('/').pop()}` });
              log(`   ✔ 上传: ${path}`);
            } catch (e) { log(`   ❌ 失败: ${path} - ${e.message}`); }
          }

          log(`🖥 [自动链3/4] 更新 configuration.json`);
          try {
            await updateConfigurationJsonInternal(appName, gitUser, gitRepo, gitToken, platform);
          } catch (e) { log(`   ❌ 更新JSON失败: ${e.message}`); }

          log(`📦 [自动链4/4] 自动备份`);
          try {
            await autoBackupApp(appName, gitUser, gitRepo, gitToken, platform);
          } catch (e) { log(`   ❌ 备份失败: ${e.message}`); }

          log('✅ 自动链全部完成，关闭自动上传开关');
        } catch (e) {
          log(`❌ 自动链异常: ${e.message}`);
        } finally {
          restoreSwitch();
        }
      }

      if (btnGenerate) btnGenerate.addEventListener('click', async () => {
        const { appName } = getConfig();
        if (!appName) return log('❌ 应用名不能为空');
        if (!fullTextarea.value.trim() && !splitHtml.value.trim() && !splitCss.value.trim() && !splitJs.value.trim()) {
          return log('❌ 编辑器内容为空，无法生成文件夹');
        }
        const files = await buildAppFiles(appName);
        const fileCount = Object.keys(files).length;
        log(`🏭 生成文件夹: apps/${appName}/ (${fileCount} 个文件)`);
        Object.keys(files).forEach(path => log(`   📄 ${path.split('/').pop()}`));
        log(`✅ 第1步完成，可进行上传`);
      });

      if (btnUpload) btnUpload.addEventListener('click', async () => {
        const { appName, gitUser, gitRepo, gitToken, platform } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) return log('❌ 缺少认证信息');
        log(`📤 上传到 ${platform === 'github' ? 'GitHub' : 'Gitee'} ${gitUser}/${gitRepo}`);
        const files = await buildAppFiles(appName);
        for (const [path, fileInfo] of Object.entries(files)) {
          try {
            await githubUpload({ user: gitUser, repo: gitRepo, token: gitToken, path, fileInfo, message: `上传 ${appName} - ${path.split('/').pop()}` });
            log(`✔ 上传: ${path}`);
          } catch (e) { log(`❌ 失败: ${path} - ${e.message}`); }
        }
        log(`✅ 第2步完成，可更新 configuration.json`);
      });

      if (btnUpdateJson) btnUpdateJson.addEventListener('click', async () => {
        const { appName, gitUser, gitRepo, gitToken, platform } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) return log('❌ 缺少认证信息');
        if (!appName) return log('❌ 应用名不能为空');
        try {
          await updateConfigurationJsonInternal(appName, gitUser, gitRepo, gitToken, platform);
        } catch (e) { log('❌ 更新失败: ' + e.message); }
      });

      if (btnClearProfile) btnClearProfile.addEventListener('click', () => {
        if (confirm('确定清除所有仓库配置、令牌和提示信息吗？')) {
          localStorage.removeItem('github_user');
          localStorage.removeItem('github_repo');
          localStorage.removeItem('github_token');
          localStorage.removeItem('gitee_user');
          localStorage.removeItem('gitee_repo');
          localStorage.removeItem('gitee_token');
          localStorage.removeItem('last_used_platform');
          localStorage.removeItem('repositories');
          localStorage.removeItem('autoUpload');
          document.getElementById('gitUser').value = '';
          document.getElementById('gitRepo').value = '';
          document.getElementById('gitToken').value = '';
          document.getElementById('appName').value = '';
          document.getElementById('autoUpload').checked = false;
          document.getElementById('iconFile').value = '';
          if (fullTextarea) fullTextarea.value = '';
          if (splitHtml) splitHtml.value = '';
          if (splitCss) splitCss.value = '';
          if (splitJs) splitJs.value = '';
          updatePreview();
          document.getElementById('currentUserDisplay').textContent = '未设置';
          document.getElementById('currentRepoDisplay').textContent = '未设置';
          document.getElementById('currentTokenDisplay').textContent = '未设置';
          const logEl2 = document.getElementById('logOutput');
          if (logEl2) logEl2.textContent = '';
        }
      });

      const deleteModal = document.getElementById('deleteModal');
      const confirmDelete = document.getElementById('confirmDelete');
      const cancelDelete = document.getElementById('cancelDelete');
      const optionDeleteOnly = document.getElementById('optionDeleteOnly');
      const optionBackupOnly = document.getElementById('optionBackupOnly');

      if (btnDeleteApp) btnDeleteApp.addEventListener('click', () => {
        const { appName, gitUser, gitRepo, gitToken } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) { log('❌ 需要认证'); return; }
        if (!appName) { log('❌ 请填写应用名称'); return; }
        deleteModal.classList.add('active');
      });
      if (confirmDelete) confirmDelete.addEventListener('click', async () => {
        deleteModal.classList.remove('active');
        const { appName, gitUser, gitRepo, gitToken } = getConfig();
        if (optionDeleteOnly.checked) await performDelete(appName, gitUser, gitRepo, gitToken, false, false);
        else if (optionBackupOnly.checked) await performDelete(appName, gitUser, gitRepo, gitToken, true, false);
      });
      if (cancelDelete) cancelDelete.addEventListener('click', () => deleteModal.classList.remove('active'));

      async function performDelete(appName, gitUser, gitRepo, gitToken, backup, deleteAfterBackup) {
        log(`📦 开始${backup ? '备份' : ''}${deleteAfterBackup ? '并删除' : ''}应用: ${appName}`);
        const paths = [
          `apps/${appName}/index.html`,
          `apps/${appName}/style.css`,
          `apps/${appName}/app.js`
        ];
        const iconExts = ['', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'];
        iconExts.forEach(ext => paths.push(`apps/${appName}/logo${ext}`));

        function getBackupName(name) {
          const date = new Date().toISOString().slice(0, 10);
          const key = `backup_index_${date}`;
          let index = parseInt(localStorage.getItem(key) || "0", 10) + 1;
          localStorage.setItem(key, index);
          return `${name}-${date}T${index}`;
        }
        const backupBase = "backup/" + getBackupName(appName);
        let processedCount = 0, backupCount = 0;

        for (const path of paths) {
          try {
            const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path });
            if (!file?.sha) continue;
            if (backup) {
              const filename = path.split('/').pop();
              let backupSha = null;
              try {
                const backupFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${backupBase}/${filename}` });
                if (backupFile && backupFile.sha) backupSha = backupFile.sha;
              } catch (e) {}
              const backupBody = { message: `备份 ${appName} - ${filename}`, content: file.content };
              if (backupSha) backupBody.sha = backupSha;
              const { platform } = getConfig();
              const baseUrl = getApiBase(platform);
              const backupUrl = platform === 'github'
                ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${backupBase}/${filename}`
                : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${backupBase}/${filename}?access_token=${gitToken}`;
              const headers = platform === 'github'
                ? { 'Authorization': `token ${gitToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
              const backupRes = await fetch(backupUrl, { method: 'PUT', headers, body: JSON.stringify(backupBody) });
              if (backupRes.ok) { log(`📦 已备份: ${filename}`); backupCount++; }
            }
            if (deleteAfterBackup || !backup) {
              await githubDelete({ user: gitUser, repo: gitRepo, token: gitToken, path, sha: file.sha, message: `删除 ${appName} - ${path.split('/').pop()}` });
              log(`🗑️ 已删除: ${path.split('/').pop()}`);
              processedCount++;
            }
          } catch (e) {}
        }
        if (processedCount === 0 && backupCount === 0) log(`⚠️ 未找到任何文件`);
        else {
          if (backup) log(`✅ 已备份 ${backupCount} 个文件`);
          if (deleteAfterBackup || (!backup && processedCount > 0)) log(`✅ 已删除 ${processedCount} 个文件`);
        }
        if (deleteAfterBackup || !backup) {
          try {
            log(`📖 更新 configuration.json...`);
            const appsFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: 'configuration.json' });
            if (appsFile?.content) {
              let apps = JSON.parse(fromBase64(appsFile.content));
              const oldCount = apps.length;
              apps = apps.filter(a => a.name !== appName);
              if (apps.length < oldCount) {
                const configContent = JSON.stringify(apps, null, 2);
                const contentBase64 = toBase64(configContent);
                const { platform } = getConfig();
                const baseUrl = getApiBase(platform);
                const url = platform === 'github'
                  ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/configuration.json`
                  : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/configuration.json?access_token=${gitToken}`;
                const body = { message: `移除 ${appName} 从 configuration.json`, content: contentBase64, sha: appsFile.sha };
                const headers = platform === 'github'
                  ? { 'Authorization': `token ${gitToken}`, 'Content-Type': 'application/json' }
                  : { 'Content-Type': 'application/json' };
                const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
                if (res.ok) log('✅ configuration.json 已清理');
              }
            }
          } catch (e) {}
        }
        log('>> 操作完成');
      }

      const uninstallModal = document.getElementById('uninstallModal');
      const confirmUninstall = document.getElementById('confirmUninstall');
      const cancelUninstall = document.getElementById('cancelUninstall');
      const uninstallAppName = document.getElementById('uninstallAppName');
      let currentUninstallApp = '';
      const appListContainer = document.getElementById('appListContainer');
      const appList = document.getElementById('appList');

      if (btnShowApps) btnShowApps.addEventListener('click', async () => {
        const { gitUser, gitRepo, gitToken } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) { log('❌ 需要认证'); return; }
        if (appListContainer.style.display === 'none') { appListContainer.style.display = 'block'; await loadAppList(gitUser, gitRepo, gitToken); }
        else appListContainer.style.display = 'none';
      });

      async function loadAppList(gitUser, gitRepo, gitToken) {
        appList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">加载中...</div>';
        try {
          const file = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: 'configuration.json' });
          if (!file?.content) { appList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">暂无应用</div>'; return; }
          const apps = JSON.parse(fromBase64(file.content));
          if (apps.length === 0) { appList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">暂无应用</div>'; return; }
          appList.innerHTML = '';
          apps.sort((a, b) => a.name.localeCompare(b.name));
          apps.forEach(app => {
            const item = document.createElement('div');
            item.className = 'app-item';
            const iconEmoji = app.icon.includes('png') ? '🖼️' : '📱';
            item.innerHTML = `
              <span class="app-name"><span class="app-icon">${iconEmoji}</span>${app.name}</span>
              <div>
                <span class="app-edit" data-name="${app.name}">编辑</span>
                <span class="app-uninstall" data-name="${app.name}">卸载</span>
              </div>`;
            appList.appendChild(item);
          });
          document.querySelectorAll('.app-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const name = btn.dataset.name;
              document.getElementById('appName').value = name;
              updateAppNameHighlight();
              log(`✏️ 加载应用: ${name}`);
              try {
                const htmlFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `apps/${name}/index.html` });
                if (htmlFile?.content) fullTextarea.value = fromBase64(htmlFile.content);
                const cssFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `apps/${name}/style.css` });
                if (cssFile?.content) splitCss.value = fromBase64(cssFile.content);
                const jsFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `apps/${name}/app.js` });
                if (jsFile?.content) splitJs.value = fromBase64(jsFile.content);
                if (fullTextarea.value) setMode('full');
                updatePreview();
                log(`✅ 已加载 ${name} 的代码文件`);

                // 自动回填图标
                await restoreIconFromRemote(gitUser, gitRepo, gitToken, `apps/${name}`, name);
              } catch (e) { log(`⚠️ 加载代码文件失败: ${e.message}`); }
            });
          });
          document.querySelectorAll('.app-uninstall').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const name = btn.dataset.name;
              showUninstallModal(name);
            });
          });
        } catch (e) {
          appList.innerHTML = `<div style="color: var(--accent-danger); text-align: center; padding: 10px;">加载失败: ${e.message}</div>`;
        }
      }

      function showUninstallModal(name) {
        currentUninstallApp = name;
        uninstallAppName.textContent = `确定卸载应用: ${name}?`;
        uninstallModal.classList.add('active');
      }
      if (confirmUninstall) confirmUninstall.addEventListener('click', async () => {
        uninstallModal.classList.remove('active');
        const { gitUser, gitRepo, gitToken } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) { log('❌ 需要认证'); return; }
        await performDelete(currentUninstallApp, gitUser, gitRepo, gitToken, false, true);
        await loadAppList(gitUser, gitRepo, gitToken);
      });
      if (cancelUninstall) cancelUninstall.addEventListener('click', () => uninstallModal.classList.remove('active'));

      const backupListContainer = document.getElementById('backupListContainer');
      const backupList = document.getElementById('backupList');
      const backupDeleteModal = document.getElementById('backupDeleteModal');
      const confirmBackupDelete = document.getElementById('confirmBackupDelete');
      const cancelBackupDelete = document.getElementById('cancelBackupDelete');
      const backupDeleteName = document.getElementById('backupDeleteName');

      let currentBackupPath = '';
      let currentBackupName = '';

      if (btnShowBackups) btnShowBackups.addEventListener('click', async () => {
        const { gitUser, gitRepo, gitToken } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) { log('❌ 需要认证'); return; }
        if (backupListContainer.style.display === 'none') { backupListContainer.style.display = 'block'; await loadBackupList(gitUser, gitRepo, gitToken); }
        else backupListContainer.style.display = 'none';
      });

      function parseAppNameFromBackup(folderName) {
        const m = folderName.match(/^(.*?)-\d{4}-\d{2}-\d{2}T\d+$/);
        return m ? m[1] : folderName;
      }

      async function loadBackupList(gitUser, gitRepo, gitToken) {
        backupList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">加载中...</div>';
        try {
          const { platform } = getConfig();
          const baseUrl = getApiBase(platform);
          const url = platform === 'github'
            ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/backup`
            : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/backup?access_token=${gitToken}`;
          const headers = platform === 'github' ? { 'Authorization': `token ${gitToken}` } : {};
          const res = await fetch(url, { headers });
          if (res.status === 404) { backupList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">暂无备份</div>'; return; }
          if (!res.ok) throw new Error('获取失败');
          const data = await res.json();
          const folders = data.filter(item => item.type === 'dir');
          if (folders.length === 0) { backupList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">暂无备份</div>'; return; }
          backupList.innerHTML = '';
          folders.sort((a, b) => b.name.localeCompare(a.name));
          folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'backup-item';
            item.innerHTML = `
              <span class="backup-name">${folder.name}</span>
              <div style="display:flex; gap:4px; flex-shrink:0;">
                <span class="backup-edit" data-path="${folder.path}" data-name="${folder.name}">编辑</span>
                <span class="backup-delete" data-path="${folder.path}">删除</span>
              </div>`;
            backupList.appendChild(item);
          });

          document.querySelectorAll('.backup-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const path = btn.dataset.path;
              const folderName = btn.dataset.name;
              const originalAppName = parseAppNameFromBackup(folderName);

              document.getElementById('appName').value = originalAppName;
              updateAppNameHighlight();
              log(`✏️ 加载备份: ${folderName} (应用名: ${originalAppName})`);

              try {
                const htmlFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${path}/index.html` });
                if (htmlFile?.content) fullTextarea.value = fromBase64(htmlFile.content);

                const cssFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${path}/style.css` });
                if (cssFile?.content) splitCss.value = fromBase64(cssFile.content);

                const jsFile = await githubGetFile({ user: gitUser, repo: gitRepo, token: gitToken, path: `${path}/app.js` });
                if (jsFile?.content) splitJs.value = fromBase64(jsFile.content);

                if (fullTextarea.value) setMode('full');
                updatePreview();
                log(`✅ 已加载备份 ${folderName} 的代码文件`);

                // 自动回填图标
                await restoreIconFromRemote(gitUser, gitRepo, gitToken, path, folderName);
              } catch (e) {
                log(`⚠️ 加载备份文件失败: ${e.message}`);
              }
            });
          });

          document.querySelectorAll('.backup-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const path = btn.dataset.path;
              const parentItem = btn.closest('.backup-item');
              const displayName = parentItem?.querySelector('.backup-name')?.textContent || '';
              showBackupDeleteModal(path, displayName);
            });
          });
        } catch (e) {
          backupList.innerHTML = `<div style="color: var(--accent-danger); text-align: center; padding: 10px;">加载失败: ${e.message}</div>`;
        }
      }

      function showBackupDeleteModal(path, name) {
        currentBackupPath = path;
        currentBackupName = name;
        backupDeleteName.textContent = `确定删除备份: ${name}?`;
        backupDeleteModal.classList.add('active');
      }
      if (confirmBackupDelete) confirmBackupDelete.addEventListener('click', async () => {
        backupDeleteModal.classList.remove('active');
        const { gitUser, gitRepo, gitToken } = getConfig();
        if (!gitUser || !gitRepo || !gitToken) { log('❌ 需要认证'); return; }
        await deleteBackupFolder(gitUser, gitRepo, gitToken, currentBackupPath, currentBackupName);
      });
      if (cancelBackupDelete) cancelBackupDelete.addEventListener('click', () => backupDeleteModal.classList.remove('active'));

      async function deleteBackupFolder(gitUser, gitRepo, gitToken, folderPath, folderName) {
        log(`🗑️ 开始删除备份: ${folderName}`);
        try {
          const { platform } = getConfig();
          const baseUrl = getApiBase(platform);
          const url = platform === 'github'
            ? `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${folderPath}`
            : `${baseUrl}/repos/${gitUser}/${gitRepo}/contents/${folderPath}?access_token=${gitToken}`;
          const headers = platform === 'github' ? { 'Authorization': `token ${gitToken}` } : {};
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error('获取备份文件列表失败');
          const files = await res.json();
          for (const file of files) {
            if (file.type === 'file') {
              await githubDelete({ user: gitUser, repo: gitRepo, token: gitToken, path: file.path, sha: file.sha, message: `删除备份文件: ${file.name}` });
              log(`   🗑️ 删除: ${file.name}`);
            }
          }
          log(`✅ 备份已删除: ${folderName}`);
          await loadBackupList(gitUser, gitRepo, gitToken);
        } catch (e) { log(`❌ 删除备份失败: ${e.message}`); }
      }

      if (toggleEditConfig && editConfigCollapsible) {
        toggleEditConfig.addEventListener('click', (e) => {
          e.preventDefault();
          editConfigCollapsible.classList.toggle('collapsed');
        });
      }

      const toggleOperation = document.getElementById('toggleOperation');
      const operationBlock = document.getElementById('operationBlock');
      if (toggleOperation && operationBlock) {
        toggleOperation.addEventListener('click', (e) => {
          e.preventDefault();
          operationBlock.classList.toggle('collapsed');
        });
      }

      const toggleBackup = document.getElementById('toggleBackup');
      const backupBlock = document.getElementById('backupBlock');
      if (toggleBackup && backupBlock) {
        toggleBackup.addEventListener('click', (e) => {
          e.preventDefault();
          backupBlock.classList.toggle('collapsed');
        });
      }

      loadReposFromStorage();
      initPlatformConfig();

      log('✅ 科技感控制台已就绪');

      function loadSavedCode() {
        try {
          const savedMode = localStorage.getItem('editor_mode');
          if (savedMode === 'split' || savedMode === 'full') currentMode = savedMode;
          const savedFullCode = localStorage.getItem('full_code');
          if (savedFullCode) fullTextarea.value = savedFullCode;
          const savedHtml = localStorage.getItem('split_html');
          const savedCss = localStorage.getItem('split_css');
          const savedJs = localStorage.getItem('split_js');
          if (savedHtml) splitHtml.value = savedHtml;
          if (savedCss) splitCss.value = savedCss;
          if (savedJs) splitJs.value = savedJs;
          if (savedMode) setMode(savedMode);
          log('📦 已从缓存加载保存的代码');
        } catch (e) { console.error('加载缓存失败:', e); }
      }
      function autoSaveCode() {
        try {
          localStorage.setItem('editor_mode', currentMode);
          localStorage.setItem('full_code', fullTextarea.value);
          localStorage.setItem('split_html', splitHtml.value);
          localStorage.setItem('split_css', splitCss.value);
          localStorage.setItem('split_js', splitJs.value);
          console.log('💾 代码已自动保存');
        } catch (e) { console.error('自动保存失败:', e); }
      }

      loadSavedCode();
      setMode(currentMode);
      updatePreview();
      showMainPage();

      fullTextarea.addEventListener('input', () => autoSaveCode());
      splitHtml.addEventListener('input', autoSaveCode);
      splitCss.addEventListener('input', autoSaveCode);
      splitJs.addEventListener('input', autoSaveCode);
    })();
  