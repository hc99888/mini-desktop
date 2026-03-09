
        // DOM元素
        const importBtn = document.getElementById('importBtn');
        const exportBtn = document.getElementById('exportBtn');
        const clearBtn = document.getElementById('clearBtn');
        const fullHtmlBtn = document.getElementById('fullHtmlBtn');
        const tripleBtn = document.getElementById('tripleBtn');
        const fileInfo = document.getElementById('fileInfo');

        const tabBar = document.getElementById('tabBar');
        const htmlTab = document.getElementById('htmlTab');
        const cssTab = document.getElementById('cssTab');
        const jsTab = document.getElementById('jsTab');
        
        const fullHtmlWrapper = document.getElementById('fullHtmlWrapper');
        const tripleWrapper = document.getElementById('tripleWrapper');
        const fullHtmlDisplay = document.getElementById('fullHtmlDisplay');
        const htmlDisplay = document.getElementById('htmlDisplay');
        const cssDisplay = document.getElementById('cssDisplay');
        const jsDisplay = document.getElementById('jsDisplay');

        // 确认对话框元素
        const confirmDialog = document.getElementById('confirmDialog');
        const cancelExport = document.getElementById('cancelExport');
        const confirmExport = document.getElementById('confirmExport');
        const fileList = document.getElementById('fileList');

        // 数据存储
        let htmlContent = '';
        let cssContent = '';
        let jsContent = '';
        let fileName = '';

        // 移除所有按钮高亮
        function removeBtnHighlight() {
            [importBtn, exportBtn, clearBtn, fullHtmlBtn, tripleBtn].forEach(btn => {
                btn.classList.remove('highlight');
            });
        }

        // 显示确认对话框
        function showConfirmDialog() {
            // 生成文件列表HTML
            let fileListHtml = '';
            if (htmlContent) {
                fileListHtml += '<div class="file-list-item html">📄 index.html</div>';
            }
            if (cssContent) {
                fileListHtml += '<div class="file-list-item css">📄 style.css</div>';
            }
            if (jsContent) {
                fileListHtml += '<div class="file-list-item js">📄 app.js</div>';
            }
            fileList.innerHTML = fileListHtml;
            
            // 显示对话框
            confirmDialog.classList.remove('hidden');
        }

        // 隐藏确认对话框
        function hideConfirmDialog() {
            confirmDialog.classList.add('hidden');
        }

        // 三色渲染完整HTML
        function renderFullHTML(html) {
            if (!html) return '✨ 暂无内容';
            
            // 转义HTML特殊字符
            let escaped = html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            
            // 先处理style标签内的CSS (绿色)
            escaped = escaped.replace(/&lt;style&gt;([\s\S]*?)&lt;\/style&gt;/gi, function(match, cssContent) {
                return '&lt;style&gt;<span class="full-html-css">' + cssContent + '</span>&lt;/style&gt;';
            });
            
            // 处理script标签内的JS (橙色)
            escaped = escaped.replace(/&lt;script&gt;([\s\S]*?)&lt;\/script&gt;/gi, function(match, jsContent) {
                return '&lt;script&gt;<span class="full-html-js">' + jsContent + '</span>&lt;/script&gt;';
            });
            
            // 处理HTML标签 (蓝色)
            escaped = escaped.replace(/&lt;(\/?)([a-zA-Z0-9_-]+)((?:\s+[a-zA-Z0-9_-]+(?:=(?:&quot;.*?&quot;|&#039;.*?&#039;|[^\s&gt;]*))?)*)\s*(\/?)&gt;/g, function(match, slash, tagName, attrs, selfClose) {
                let attrStr = attrs || '';
                return '<span class="full-html-tag">&lt;' + slash + tagName + attrStr + (selfClose ? '/' : '') + '&gt;</span>';
            });
            
            // 处理DOCTYPE
            escaped = escaped.replace(/&lt;!DOCTYPE.*?&gt;/gi, function(match) {
                return '<span class="full-html-tag">' + match + '</span>';
            });
            
            // 处理注释
            escaped = escaped.replace(/&lt;!--[\s\S]*?--&gt;/gi, function(match) {
                return '<span style="color: #999999; font-weight: 700;">' + match + '</span>';
            });
            
            return escaped;
        }

        // 切换到完整HTML视图
        function showFullHtml() {
            fullHtmlWrapper.style.display = 'block';
            tripleWrapper.style.display = 'none';
            tabBar.style.display = 'none';
            
            removeBtnHighlight();
            fullHtmlBtn.classList.add('highlight');
            
            fullHtmlDisplay.innerHTML = renderFullHTML(buildFullHTML());
        }

        // 切换到三片段视图
        function showTriple() {
            fullHtmlWrapper.style.display = 'none';
            tripleWrapper.style.display = 'block';
            tabBar.style.display = 'flex';
            
            removeBtnHighlight();
            tripleBtn.classList.add('highlight');
            
            showHtmlTab();
        }

        // 显示HTML标签
        function showHtmlTab() {
            htmlTab.classList.add('active');
            cssTab.classList.remove('active');
            jsTab.classList.remove('active');
            
            htmlDisplay.classList.remove('hidden');
            cssDisplay.classList.add('hidden');
            jsDisplay.classList.add('hidden');
        }

        // 显示CSS标签
        function showCssTab() {
            cssTab.classList.add('active');
            htmlTab.classList.remove('active');
            jsTab.classList.remove('active');
            
            cssDisplay.classList.remove('hidden');
            htmlDisplay.classList.add('hidden');
            jsDisplay.classList.add('hidden');
        }

        // 显示JS标签
        function showJsTab() {
            jsTab.classList.add('active');
            htmlTab.classList.remove('active');
            cssTab.classList.remove('active');
            
            jsDisplay.classList.remove('hidden');
            htmlDisplay.classList.add('hidden');
            cssDisplay.classList.add('hidden');
        }

        // 更新三片段显示
        function updateTripleDisplay() {
            htmlDisplay.textContent = htmlContent || '✨ 暂无HTML代码';
            cssDisplay.textContent = cssContent || '✨ 暂无CSS代码';
            jsDisplay.textContent = jsContent || '✨ 暂无JS代码';
        }

        // 构建完整HTML（仅用于显示）
        function buildFullHTML() {
            if (!htmlContent && !cssContent && !jsContent) return '';
            
            let full = '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n    <title>' + (fileName.replace('.html', '') || 'export') + '</title>\n';
            if (cssContent) {
                full += '    <style>\n' + cssContent + '\n    </style>\n';
            }
            full += '</head>\n<body>\n';
            full += htmlContent + '\n';
            if (jsContent) {
                full += '    <script>\n' + jsContent + '\n    <\/script>\n';
            }
            full += '</body>\n</html>';
            return full;
        }

        // 执行导出三片段文件
        function doExport() {
            // 使用固定的文件名：index.html, style.css, app.js
            const htmlFilename = 'index.html';
            const cssFilename = 'style.css';
            const jsFilename = 'app.js';

            // 辅助函数：下载文件
            function downloadFile(content, filename) {
                if (!content) return;
                
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            // 依次导出三个文件
            if (htmlContent) {
                setTimeout(() => downloadFile(htmlContent, htmlFilename), 100);
            }
            if (cssContent) {
                setTimeout(() => downloadFile(cssContent, cssFilename), 300);
            }
            if (jsContent) {
                setTimeout(() => downloadFile(jsContent, jsFilename), 500);
            }
        }

        // 解析HTML
        function parseHTML(content) {
            let html = content;
            let css = '';
            let js = '';

            // 提取style
            const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
            let match;
            while ((match = styleRegex.exec(content)) !== null) {
                css += match[1] + '\n\n';
                html = html.replace(match[0], '');
            }

            // 提取script
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            while ((match = scriptRegex.exec(content)) !== null) {
                js += match[1] + '\n\n';
                html = html.replace(match[0], '');
            }

            htmlContent = html.trim();
            cssContent = css.trim();
            jsContent = js.trim();
            
            // 更新显示
            fullHtmlDisplay.innerHTML = renderFullHTML(buildFullHTML());
            updateTripleDisplay();
        }

        // 标签切换事件
        htmlTab.addEventListener('click', showHtmlTab);
        cssTab.addEventListener('click', showCssTab);
        jsTab.addEventListener('click', showJsTab);

        // 导入
        importBtn.addEventListener('click', () => {
            removeBtnHighlight();
            importBtn.classList.add('highlight');
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.html,.htm';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                fileName = file.name;
                fileInfo.textContent = '📄 ' + file.name;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    parseHTML(e.target.result);
                    showFullHtml();
                };
                reader.readAsText(file);
            };
            
            input.click();
        });

        // 导出 - 显示确认对话框
        exportBtn.addEventListener('click', () => {
            if (!htmlContent && !cssContent && !jsContent) {
                alert('没有可导出的内容');
                return;
            }
            
            removeBtnHighlight();
            exportBtn.classList.add('highlight');
            
            showConfirmDialog();
        });

        // 取消导出
        cancelExport.addEventListener('click', () => {
            hideConfirmDialog();
            // 移除导出按钮的高亮
            exportBtn.classList.remove('highlight');
        });

        // 确认导出
        confirmExport.addEventListener('click', () => {
            hideConfirmDialog();
            doExport();
            // 1秒后移除导出按钮的高亮
            setTimeout(() => {
                exportBtn.classList.remove('highlight');
            }, 1000);
        });

        // 点击对话框外部关闭（可选）
        confirmDialog.addEventListener('click', (e) => {
            if (e.target === confirmDialog) {
                hideConfirmDialog();
                exportBtn.classList.remove('highlight');
            }
        });

        // 清空
        clearBtn.addEventListener('click', () => {
            removeBtnHighlight();
            clearBtn.classList.add('highlight');
            
            htmlContent = '';
            cssContent = '';
            jsContent = '';
            fileName = '';
            fileInfo.textContent = '';
            
            fullHtmlDisplay.innerHTML = '✨ 已清空';
            htmlDisplay.textContent = '✨ 已清空';
            cssDisplay.textContent = '✨ 已清空';
            jsDisplay.textContent = '✨ 已清空';
            
            showFullHtml();
        });

        // 完整HTML按钮
        fullHtmlBtn.addEventListener('click', showFullHtml);

        // 三片段按钮
        tripleBtn.addEventListener('click', showTriple);

        // 初始状态
        removeBtnHighlight();
        fullHtmlWrapper.style.display = 'block';
        tripleWrapper.style.display = 'none';
        tabBar.style.display = 'none';
    