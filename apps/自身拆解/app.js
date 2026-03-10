
        // 当前模式: 'full' 或 'three'
        let currentMode = 'full';
        let currentPart = 0; // 0:HTML, 1:CSS, 2:JS

        // B解析器：解析HTML文件，拆分成三部分
        function parseHtmlToParts(htmlContent) {
            console.log('B解析器开始工作...');
            
            // 提取CSS (所有style标签内容)
            const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
            const cssMatches = [];
            let cssMatch;
            while ((cssMatch = cssRegex.exec(htmlContent)) !== null) {
                if (cssMatch[1].trim()) cssMatches.push(cssMatch[1].trim());
            }
            const css = cssMatches.join('\n\n');
            
            // 提取JS (所有script标签内容，排除外部脚本)
            const jsRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            const jsMatches = [];
            let jsMatch;
            while ((jsMatch = jsRegex.exec(htmlContent)) !== null) {
                const fullTag = jsMatch[0];
                // 跳过包含src的外部脚本
                if (/src\s*=\s*["'][^"']*["']/i.test(fullTag)) continue;
                if (jsMatch[1].trim()) jsMatches.push(jsMatch[1].trim());
            }
            const js = jsMatches.join('\n\n');
            
            // 提取HTML (移除所有style和script标签)
            let html = htmlContent
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            
            console.log('B解析器完成');
            return { html, css, js };
        }

        // 切换到完整HTML模式
        window.switchToFullHtml = function() {
            currentMode = 'full';
            
            // 更新按钮样式
            document.getElementById('fullHtmlBtn').classList.add('btn-primary');
            document.getElementById('threePartsBtn').classList.remove('btn-primary');
            
            // 隐藏标签栏
            document.getElementById('tabBar').classList.remove('visible');
            
            // 显示完整HTML模式，隐藏三片段模式
            document.getElementById('fullHtmlMode').style.display = 'block';
            document.getElementById('threePartsMode').classList.remove('visible');
        };

        // 切换到三片段模式 - B解析器从完整HTML框获取数据
        window.switchToThreeParts = function() {
            currentMode = 'three';
            
            // 更新按钮样式
            document.getElementById('threePartsBtn').classList.add('btn-primary');
            document.getElementById('fullHtmlBtn').classList.remove('btn-primary');
            
            // 显示标签栏
            document.getElementById('tabBar').classList.add('visible');
            
            // 获取完整HTML框的内容
            const fullHtmlContent = document.getElementById('fullHtmlContent').innerText;
            
            if (fullHtmlContent.trim()) {
                // B解析器工作：从完整HTML框获取数据并解析
                const parts = parseHtmlToParts(fullHtmlContent);
                
                // 填充到三个面板
                document.getElementById('partHtml').innerText = parts.html || '<!-- 无HTML内容 -->';
                document.getElementById('partCss').innerText = parts.css || '/* 无CSS内容 */';
                document.getElementById('partJs').innerText = parts.js || '// 无JS内容';
            } else {
                // 如果完整HTML框是空的，清空三个面板
                document.getElementById('partHtml').innerText = '';
                document.getElementById('partCss').innerText = '';
                document.getElementById('partJs').innerText = '';
            }
            
            // 显示三片段模式，隐藏完整HTML模式
            document.getElementById('fullHtmlMode').style.display = 'none';
            document.getElementById('threePartsMode').classList.add('visible');
            
            // 重置到HTML页面
            switchPart(0);
        };

        // 切换三片段中的页面
        window.switchPart = function(index) {
            currentPart = index;
            
            // 更新标签样式
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach((tab, i) => {
                if (i === index) tab.classList.add('active');
                else tab.classList.remove('active');
            });
            
            // 更新显示区域
            const parts = ['partHtml', 'partCss', 'partJs'];
            parts.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) {
                    if (i === index) el.classList.add('active');
                    else el.classList.remove('active');
                }
            });
        };

        // 导入功能 - 只导入到完整HTML框
        window.handleImport = function() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.html,.htm,text/html';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    
                    // 无论当前是什么模式，都先导入到完整HTML框
                    document.getElementById('fullHtmlContent').innerText = content;
                    
                    // 如果当前是三片段模式，需要更新解析
                    if (currentMode === 'three') {
                        const parts = parseHtmlToParts(content);
                        document.getElementById('partHtml').innerText = parts.html || '<!-- 无HTML内容 -->';
                        document.getElementById('partCss').innerText = parts.css || '/* 无CSS内容 */';
                        document.getElementById('partJs').innerText = parts.js || '// 无JS内容';
                        
                        // 保持当前选中的标签不变
                        switchPart(currentPart);
                    }
                    
                    alert('✅ 导入成功: ' + file.name);
                };
                reader.readAsText(file);
            };
            
            fileInput.click();
        };

        // 导出功能
        window.handleExport = function() {
            let content = '';
            let filename = '';
            
            if (currentMode === 'full') {
                content = document.getElementById('fullHtmlContent').innerText;
                filename = '完整HTML.html';
            } else {
                // 三片段模式：导出当前选中的页面
                if (currentPart === 0) {
                    content = document.getElementById('partHtml').innerText;
                    filename = 'export.html';
                } else if (currentPart === 1) {
                    content = document.getElementById('partCss').innerText;
                    filename = 'export.css';
                } else {
                    content = document.getElementById('partJs').innerText;
                    filename = 'export.js';
                }
            }
            
            if (!content.trim()) {
                alert('没有内容可导出');
                return;
            }
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            alert('✅ 导出成功: ' + filename);
        };

        // 一键清空
        window.handleClear = function() {
            // 清空完整HTML框
            document.getElementById('fullHtmlContent').innerText = '';
            
            // 清空三片段面板
            document.getElementById('partHtml').innerText = '';
            document.getElementById('partCss').innerText = '';
            document.getElementById('partJs').innerText = '';
            
            alert('✅ 已清空');
        };

        // 初始化：默认完整HTML模式，所有代码框空白
        window.addEventListener('load', function() {
            switchToFullHtml();
            
            // 确保所有代码框都是空白
            document.getElementById('fullHtmlContent').innerText = '';
            document.getElementById('partHtml').innerText = '';
            document.getElementById('partCss').innerText = '';
            document.getElementById('partJs').innerText = '';
        });
    