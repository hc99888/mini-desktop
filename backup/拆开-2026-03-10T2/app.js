// 当前模式
let currentMode = 'full';
let currentPart = 0;

// 解析HTML
function parseHtmlToParts(htmlContent) {
    const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const cssMatches = [];
    let cssMatch;
    while ((cssMatch = cssRegex.exec(htmlContent)) !== null) {
        if (cssMatch[1].trim()) cssMatches.push(cssMatch[1].trim());
    }
    const css = cssMatches.join('\n\n');
    
    const jsRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const jsMatches = [];
    let jsMatch;
    while ((jsMatch = jsRegex.exec(htmlContent)) !== null) {
        const fullTag = jsMatch[0];
        if (/src\s*=\s*["'][^"']*["']/i.test(fullTag)) continue;
        if (jsMatch[1].trim()) jsMatches.push(jsMatch[1].trim());
    }
    const js = jsMatches.join('\n\n');
    
    let html = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    return { html, css, js };
}

// 切换到完整HTML模式
window.switchToFullHtml = function() {
    currentMode = 'full';
    document.getElementById('fullHtmlBtn').classList.add('btn-primary');
    document.getElementById('threePartsBtn').classList.remove('btn-primary');
    document.getElementById('tabBar').classList.remove('visible');
    document.getElementById('fullHtmlMode').style.display = 'block';
    document.getElementById('threePartsMode').classList.remove('visible');
};

// 切换到三片段模式
window.switchToThreeParts = function() {
    currentMode = 'three';
    document.getElementById('threePartsBtn').classList.add('btn-primary');
    document.getElementById('fullHtmlBtn').classList.remove('btn-primary');
    document.getElementById('tabBar').classList.add('visible');
    
    const fullHtmlContent = document.getElementById('fullHtmlContent').innerText;
    
    if (fullHtmlContent.trim()) {
        const parts = parseHtmlToParts(fullHtmlContent);
        document.getElementById('partHtml').innerText = parts.html || '<!-- 无HTML内容 -->';
        document.getElementById('partCss').innerText = parts.css || '/* 无CSS内容 */';
        document.getElementById('partJs').innerText = parts.js || '// 无JS内容';
    } else {
        document.getElementById('partHtml').innerText = '';
        document.getElementById('partCss').innerText = '';
        document.getElementById('partJs').innerText = '';
    }
    
    document.getElementById('fullHtmlMode').style.display = 'none';
    document.getElementById('threePartsMode').classList.add('visible');
    switchPart(0);
};

// 切换三片段中的页面
window.switchPart = function(index) {
    currentPart = index;
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, i) => {
        if (i === index) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    
    const parts = ['partHtml', 'partCss', 'partJs'];
    parts.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
            if (i === index) el.classList.add('active');
            else el.classList.remove('active');
        }
    });
};

// 导入功能
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
            document.getElementById('fullHtmlContent').innerText = content;
            
            if (currentMode === 'three') {
                const parts = parseHtmlToParts(content);
                document.getElementById('partHtml').innerText = parts.html || '<!-- 无HTML内容 -->';
                document.getElementById('partCss').innerText = parts.css || '/* 无CSS内容 */';
                document.getElementById('partJs').innerText = parts.js || '// 无JS内容';
                switchPart(currentPart);
            }
            
            alert('✅ 导入成功: ' + file.name);
        };
        reader.readAsText(file);
    };
    
    fileInput.click();
};

window.handleExport = function() {
    if (currentMode === 'full') {
        // 完整HTML模式
        const content = document.getElementById('fullHtmlContent').innerText;
        if (!content.trim()) {
            alert('⚠️ 没有内容可导出');
            return;
        }
        
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.html';
        a.click();
        URL.revokeObjectURL(url);
        alert('✅ 导出成功');
    } else {
        // 三片段模式
        const userHtml = document.getElementById('partHtml').innerText;
        const userCss = document.getElementById('partCss').innerText;
        const userJs = document.getElementById('partJs').innerText;
        
        // 1. 先导出CSS文件
        if (userCss.trim() && userCss !== '/* 无CSS内容 */') {
            const cssBlob = new Blob([userCss], { type: 'text/css' });
            const cssUrl = URL.createObjectURL(cssBlob);
            const cssA = document.createElement('a');
            cssA.href = cssUrl;
            cssA.download = 'style.css';
            cssA.click();
            URL.revokeObjectURL(cssUrl);
        }
        
        // 2. 导出JS文件
        if (userJs.trim() && userJs !== '// 无JS内容') {
            const jsBlob = new Blob([userJs], { type: 'application/javascript' });
            const jsUrl = URL.createObjectURL(jsBlob);
            const jsA = document.createElement('a');
            jsA.href = jsUrl;
            jsA.download = 'app.js';
            jsA.click();
            URL.revokeObjectURL(jsUrl);
        }
        
        // 3. 提取用户的实际内容（去掉多余的html/body标签，但保留div等结构）
        let bodyContent = userHtml
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<html[^>]*>|<\/html>/gi, '')
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
            .replace(/<body[^>]*>|<\/body>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .trim();
        
        if (bodyContent === '<!-- 无HTML内容 -->') {
            bodyContent = '';
        }
        
        // 4. 构建完整的HTML文件，保留用户的所有内容，并强制添加引用
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出的页面</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    ${bodyContent}
    <script src="app.js"></script>
</body>
</html>`;
        
        // 5. 导出HTML文件
        const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const htmlA = document.createElement('a');
        htmlA.href = htmlUrl;
        htmlA.download = 'index.html';
        htmlA.click();
        URL.revokeObjectURL(htmlUrl);
        
        alert('✅ 导出成功！三个文件：index.html, style.css, app.js');
    }
};

// 清空功能
window.handleClear = function() {
    document.getElementById('fullHtmlContent').innerText = '';
    document.getElementById('partHtml').innerText = '';
    document.getElementById('partCss').innerText = '';
    document.getElementById('partJs').innerText = '';
    alert('✅ 已清空');
};

// 初始化
window.addEventListener('load', function() {
    switchToFullHtml();
    document.getElementById('fullHtmlContent').innerText = '';
    document.getElementById('partHtml').innerText = '';
    document.getElementById('partCss').innerText = '';
    document.getElementById('partJs').innerText = '';
});