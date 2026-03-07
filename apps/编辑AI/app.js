
    class ChatAssistantApp {
        constructor() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }

        init() {
            this._cacheElements();
            this._initEventListeners();
            this._loadLastApiKey();
            this._addRippleEffects();
            this._state = { dragging: false };
            this._compactMode = false;
        }

        _cacheElements() {
            this.el = {
                statusBar: document.getElementById('statusBar'),
                statusText: document.getElementById('statusText'),
                thinkingIndicator: document.getElementById('thinkingIndicator'),
                chatHistory: document.getElementById('chatHistory'),
                chatInput: document.getElementById('chatInput'),
                sendChat: document.getElementById('sendChat'),
                divider: document.getElementById('divider'),
                leftPane: document.getElementById('leftPane'),
                toggleTheme: document.getElementById('toggleTheme'),
                previewBtn: document.getElementById('previewBtn'),
                sendAI: document.getElementById('sendAI'),
                applyCode: document.getElementById('applyCode'),
                clearCode: document.getElementById('clearCode'),
                toggleApi: document.getElementById('toggleApi'),
                importTextBtn: document.getElementById('importTextBtn'),
                toggleThinking: document.getElementById('toggleThinking'),
                toggleDiff: document.getElementById('toggleDiff'),
                apiKey: document.getElementById('apiKey'),
                myCode: document.getElementById('myCode'),
                aiCode: document.getElementById('aiCode'),
                applyAICode: document.getElementById('applyAICode'),
                thoughtBadge: document.getElementById('thoughtBadge'),
                diffBadge: document.getElementById('diffBadge'),
                thoughtProcess: document.getElementById('thoughtProcess'),
                thoughtContent: document.getElementById('thoughtContent'),
                compactModeBtn: document.getElementById('compactModeBtn')
            };
        }

        _initEventListeners() {
            this.el.toggleTheme.addEventListener('click', () => this._toggleTheme());
            this.el.previewBtn.addEventListener('click', () => this._previewCode());
            this.el.sendAI.addEventListener('click', () => this._sendAI());
            this.el.applyCode.addEventListener('click', () => this._applyCode());
            if (this.el.applyAICode) {
                this.el.applyAICode.addEventListener('click', () => this._applyCode());
            }
            this.el.clearCode.addEventListener('click', () => this._clearCode());
            this.el.toggleApi.addEventListener('click', () => this._toggleApiVisibility());
            this.el.importTextBtn.addEventListener('click', () => this._importTextFile());
            this.el.compactModeBtn.addEventListener('click', () => this._toggleCompactMode());

            if (this.el.toggleThinking) {
                this.el.toggleThinking.addEventListener('click', () => this._toggleThinking());
            }
            if (this.el.toggleDiff) {
                this.el.toggleDiff.addEventListener('click', () => this._toggleDiff());
            }

            this.el.apiKey.addEventListener('change', (e) => this._saveAPIKey(e.target.value.trim()));

            this.el.chatInput.addEventListener('input', () => this._adjustChatInputHeight());
            this.el.chatInput.addEventListener('keydown', (e) => this._handleChatKeydown(e));
            this.el.sendChat.addEventListener('click', () => this._sendChat());

            this.el.divider.addEventListener('mousedown', () => this._startDrag());
            document.addEventListener('mouseup', () => this._stopDrag());
            document.addEventListener('mousemove', (e) => this._onDrag(e));
        }

        _toggleCompactMode() {
            this._compactMode = !this._compactMode;
            const btn = this.el.compactModeBtn;
            btn.textContent = `📄 紧凑模式:${this._compactMode ? '开' : '关'}`;
            // 切换颜色类
            if (this._compactMode) {
                btn.classList.remove('compact-off');
                btn.classList.add('compact-on');
            } else {
                btn.classList.remove('compact-on');
                btn.classList.add('compact-off');
            }
        }

        _importTextFile() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.txt,.text,.md,text/plain';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) {
                    document.body.removeChild(fileInput);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const content = loadEvent.target.result;
                    const currentText = this.el.chatInput.value;
                    if (currentText.trim() !== '') {
                        this.el.chatInput.value = currentText + '\n' + content;
                    } else {
                        this.el.chatInput.value = content;
                    }
                    this._adjustChatInputHeight();
                    this.el.chatInput.focus();
                    document.body.removeChild(fileInput);
                };
                reader.onerror = () => {
                    alert('读取文件失败');
                    document.body.removeChild(fileInput);
                };
                reader.readAsText(file);
            });
            fileInput.click();
        }

        _loadLastApiKey() {
            const last = localStorage.getItem('api_last_used');
            if (last) this.el.apiKey.value = last;
        }

        _saveAPIKey(key) {
            if (!key) return;
            if (key.startsWith('sk-') || key.startsWith('ds-')) {
                localStorage.setItem('api_deepseek', key);
            }
            if (key.startsWith('kimi-') || key.startsWith('ms-')) {
                localStorage.setItem('api_moonshot', key);
            }
            if (key.startsWith('qwen-') || key.startsWith('ak-')) {
                localStorage.setItem('api_qwen', key);
            }
            if (key.startsWith('g-') || key.startsWith('groq-')) {
                localStorage.setItem('api_groq', key);
            }
            localStorage.setItem('api_last_used', key);
        }

        _getAIEndpoint() {
            const raw = this.el.apiKey.value.trim();
            if (!raw) return null;
            this._saveAPIKey(raw);
            if (raw.startsWith('sk-') || raw.startsWith('ds-'))
                return { url: 'https://api.deepseek.com/chat/completions', key: raw, model: 'deepseek-chat' };
            if (raw.startsWith('kimi-') || raw.startsWith('ms-'))
                return { url: 'https://api.moonshot.cn/v1/chat/completions', key: raw, model: 'moonshot-v1-8k' };
            if (raw.startsWith('qwen-') || raw.startsWith('ak-'))
                return { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', key: raw, model: 'qwen-plus' };
            if (raw.startsWith('g-') || raw.startsWith('groq-'))
                return { url: 'https://api.groq.com/openai/v1/chat/completions', key: raw, model: 'llama-3.1-70b-versatile' };
            return null;
        }

        async _callAI(messages) {
            const info = this._getAIEndpoint();
            if (!info) return 'API Key 格式无法识别';
            const payload = { model: info.model, messages };
            const delays = [500, 1000, 2000, 3000];
            for (let i = 0; i < delays.length; i++) {
                try {
                    const res = await fetch(info.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${info.key}`
                        },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    return data.choices?.[0]?.message?.content || 'AI 无回复';
                } catch (err) {
                    if (i === delays.length - 1) return 'AI 调用失败，请检查网络或 API Key';
                    await new Promise(r => setTimeout(r, delays[i]));
                }
            }
        }

        _sendChat() {
            const text = this.el.chatInput.value.trim();
            if (!text) return;
            this._addBubble(text, 'me');
            this.el.chatInput.value = '';
            this.el.chatInput.style.height = '40px';
            this._chatAI(text);
        }

        async _chatAI(text) {
            // 强制AI返回完整代码
            const systemPrompt = `你是一个智能助手，需要根据用户输入判断意图并恰当回应。

意图分类指南：
1. **写代码请求**：如果用户要求编写新代码，请返回完整代码，格式为：
   说明：
   （用中文简要说明代码功能和修改点）
   代码：
   （返回完整的代码，不要Markdown包裹，不要\`\`\`）

2. **修改代码请求**：如果用户要求修改当前已有的代码，请返回修改后的完整代码（包含所有未改动部分），格式同样为：
   说明：
   （描述修改了什么）
   代码：
   （返回修改后的完整代码，不要Markdown包裹）

3. **普通聊天**：如果用户只是闲聊，请友好回复，不要返回代码格式，直接输出纯文本。

4. **解释/咨询**：如果用户询问代码相关问题，请用文字解释，可以附带简短示例但不强制。如果附带示例，请用\`\`\`包裹。

当前对话上下文：
- 用户当前代码：
${this.el.myCode.value || '无'}

请严格按照以上格式回应。当需要返回代码时，务必返回完整代码，不要只返回修改片段。`;

            const reply = await this._callAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ]);

            let { desc, code } = this._splitAIResponse(reply);

            if (!code && reply.includes('```')) {
                const codeBlockMatch = reply.match(/```(?:\w+)?\n([\s\S]*?)```/);
                if (codeBlockMatch) {
                    code = codeBlockMatch[1].trim();
                    desc = reply.replace(/```[\s\S]*?```/, '').trim() || '参考代码';
                }
            }

            if (code) {
                this._updateAICodeWithCharDiff(code);
                this._addBubble(desc || '无说明', 'ai', code);
            } else {
                this._addBubble(reply, 'ai');
            }
        }

        _addBubble(text, type, code = null) {
            const formatted = code ? this._formatCode(code, this._detectLanguage(code)) : this._formatCode(text, this._detectLanguage(text));

            const div = document.createElement('div');
            div.className = `chat-msg ${type === 'me' ? 'chat-me' : 'chat-ai'}`;

            const header = document.createElement('div');
            header.className = 'chat-header';

            const langTag = document.createElement('span');
            langTag.className = 'lang-tag';
            langTag.textContent = code ? this._detectLanguage(code).toUpperCase() : 'TEXT';

            const foldBtn = this._createSmallButton('折叠');
            const sendBtn = this._createSmallButton('转接');
            const copyBtn = this._createSmallButton('复制');

            sendBtn.addEventListener('click', () => {
                this.el.myCode.value = code || text;
                const originalBg = sendBtn.style.background;
                const originalColor = sendBtn.style.color;
                sendBtn.style.background = '#4caf50';
                sendBtn.style.color = 'white';
                setTimeout(() => {
                    sendBtn.style.background = originalBg;
                    sendBtn.style.color = originalColor;
                }, 300);
            });

            copyBtn.addEventListener('click', async (e) => {
                const originalText = copyBtn.textContent;
                const contentToCopy = code || text;
                try {
                    await navigator.clipboard.writeText(contentToCopy);
                    copyBtn.textContent = '✓已复制';
                    copyBtn.style.background = '#4caf50';
                    copyBtn.style.color = 'white';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = '';
                        copyBtn.style.color = '';
                    }, 1000);
                } catch (err) {
                    try {
                        const textarea = document.createElement('textarea');
                        textarea.value = contentToCopy;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        copyBtn.textContent = '✓已复制';
                        copyBtn.style.background = '#4caf50';
                        copyBtn.style.color = 'white';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.background = '';
                            copyBtn.style.color = '';
                        }, 1000);
                    } catch (fallbackErr) {
                        alert('复制失败，请手动选中文本并复制 (Ctrl+C)');
                    }
                }
            });

            header.append(langTag, foldBtn, sendBtn, copyBtn);

            if (this._compactMode && type === 'ai' && code) {
                const summary = document.createElement('div');
                summary.textContent = text + ' (代码已更新，请查看下方AI代码框)';
                div.appendChild(header);
                div.appendChild(summary);
                foldBtn.style.display = 'none';
            } else {
                const content = document.createElement('pre');
                content.className = 'chat-content';
                content.textContent = formatted;

                let folded = false;
                const toggleFold = () => {
                    folded = !folded;
                    if (folded) {
                        content.style.maxHeight = '120px';
                        content.style.overflow = 'hidden';
                        foldBtn.textContent = '展开';
                    } else {
                        content.style.maxHeight = '';
                        content.style.overflow = '';
                        foldBtn.textContent = '折叠';
                    }
                };
                foldBtn.addEventListener('click', toggleFold);

                if (formatted.split('\n').length > 20) {
                    folded = true;
                    content.style.maxHeight = '120px';
                    content.style.overflow = 'hidden';
                    foldBtn.textContent = '展开';
                }

                div.appendChild(header);
                div.appendChild(content);
            }

            this.el.chatHistory.appendChild(div);
            this.el.chatHistory.scrollTop = this.el.chatHistory.scrollHeight;
        }

        _createSmallButton(text) {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = 'padding: 4px 12px; font-size: 12px; color: #000; border: 1px solid #999; border-radius: 6px; background: #fdfdfd; margin-right: 20px; touch-action: manipulation;';
            return btn;
        }

        _handleChatKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendChat();
            }
        }

        _adjustChatInputHeight() {
            this.el.chatInput.style.height = 'auto';
            this.el.chatInput.style.height = this.el.chatInput.scrollHeight + 'px';
        }

        _detectLanguage(text) {
            const lower = text.toLowerCase();
            if (/<\/?(html|head|body|div|span|button|script|style|link|meta)/.test(lower)) return 'html';
            if (/^\s*<\w+[\s>]/m.test(lower)) return 'html';
            if (/(function\s+|=>|const\s+|let\s+|var\s+|document\.|window\.|addEventListener)/.test(lower) ||
                /{[\s\S]*}/.test(text)) return 'js';
            if (/{[\s\S]*}/.test(text) && /;/.test(text) && /:/.test(text)) return 'css';
            return 'text';
        }

        _formatCode(text, lang) {
            if (lang === 'html') return this._formatHTML(text);
            if (lang === 'css' || lang === 'js') return this._formatBlockByBraces(text);
            return text.trim();
        }

        _formatHTML(html) {
            const lines = html
                .replace(/>\s+</g, '><')
                .replace(/></g, '>\n<')
                .split('\n');

            let indent = 0;
            const res = [];

            lines.forEach(line => {
                let l = line.trim();
                if (!l) return;
                if (/^<\/.+>/.test(l)) indent = Math.max(indent - 1, 0);
                res.push('  '.repeat(indent) + l);
                if (/^<[^!/?][^>]*[^/]>$/.test(l) && !/<(input|img|br|hr|meta|link)/i.test(l)) {
                    if (!/^<script/i.test(l) && !/^<style/i.test(l)) indent++;
                }
            });

            return res.join('\n');
        }

        _formatBlockByBraces(code) {
            const lines = code.split('\n');
            let indent = 0;
            const res = [];

            for (let raw of lines) {
                let line = raw.trim();
                if (!line) continue;
                const closeCount = (line.match(/}/g) || []).length;
                const openCount = (line.match(/{/g) || []).length;
                if (closeCount > openCount) indent = Math.max(indent - (closeCount - openCount), 0);
                res.push('  '.repeat(indent) + line);
                if (openCount > closeCount) indent += (openCount - closeCount);
            }

            return res.join('\n');
        }

        _cleanMarkdownCode(text) {
            let cleaned = text.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1');
            cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
            return cleaned.trim();
        }

        async _sendAI() {
            const code = this.el.myCode.value;
            const result = await this._callAI([
                { role: 'system', content: '你是前端助手，只输出纯代码。' },
                { role: 'user', content: code }
            ]);
            const cleaned = this._cleanMarkdownCode(result);
            this._updateAICodeWithCharDiff(cleaned);
            const btn = this.el.sendAI;
            const originalBg = btn.style.background;
            const originalColor = btn.style.color;
            btn.style.background = '#4caf50';
            btn.style.color = 'white';
            setTimeout(() => {
                btn.style.background = originalBg;
                btn.style.color = originalColor;
            }, 300);
        }

        _applyCode() {
            if (!this.el.aiCode) return alert('AI 代码框不存在');
            const code = this.el.aiCode.textContent || '';
            if (!code.trim()) return alert('AI 代码为空');
            this.el.myCode.value = code;
            const btn = this.el.applyCode;
            const originalBg = btn.style.background;
            const originalColor = btn.style.color;
            btn.style.background = '#4caf50';
            btn.style.color = 'white';
            setTimeout(() => {
                btn.style.background = originalBg;
                btn.style.color = originalColor;
            }, 300);
        }

        _clearCode() {
            this.el.myCode.value = '';
            if (this.el.aiCode) this.el.aiCode.innerHTML = '';
        }

        _previewCode() {
            const code = this.el.myCode.value;
            const win = window.open('', '_blank');
            win.document.open();
            win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>预览</title></head><body>${code}</body></html>`);
            win.document.close();
        }

        _updateAICodeWithCharDiff(newCode) {
            if (!this.el.aiCode) return;
            const oldCode = this.el.myCode.value || '';

            if (oldCode.trim() === '') {
                this.el.aiCode.textContent = newCode;
                return;
            }

            const oldLines = oldCode.split('\n');
            const newLines = newCode.split('\n');

            const matchedOldToNew = new Array(oldLines.length).fill(-1);
            const usedNew = new Array(newLines.length).fill(false);

            for (let i = 0; i < oldLines.length; i++) {
                for (let j = 0; j < newLines.length; j++) {
                    if (!usedNew[j] && oldLines[i] === newLines[j]) {
                        matchedOldToNew[i] = j;
                        usedNew[j] = true;
                        break;
                    }
                }
            }

            const oldUnmatched = [];
            for (let i = 0; i < oldLines.length; i++) {
                if (matchedOldToNew[i] === -1) oldUnmatched.push(i);
            }
            const newUnmatched = [];
            for (let j = 0; j < newLines.length; j++) {
                if (!usedNew[j]) newUnmatched.push(j);
            }

            const pairCount = Math.min(oldUnmatched.length, newUnmatched.length);
            const pairMap = new Map();
            for (let k = 0; k < pairCount; k++) {
                const oldIdx = oldUnmatched[k];
                const newIdx = newUnmatched[k];
                pairMap.set(newIdx, oldIdx);
            }

            const htmlLines = [];

            for (let j = 0; j < newLines.length; j++) {
                let oldIdx = -1;
                for (let i = 0; i < matchedOldToNew.length; i++) {
                    if (matchedOldToNew[i] === j) {
                        oldIdx = i;
                        break;
                    }
                }
                if (oldIdx === -1 && pairMap.has(j)) {
                    oldIdx = pairMap.get(j);
                }

                if (oldIdx !== -1) {
                    const oldLine = oldLines[oldIdx];
                    const newLine = newLines[j];
                    if (oldLine === newLine) {
                        htmlLines.push(this._escapeHtml(newLine));
                    } else {
                        htmlLines.push(this._charDiff(oldLine, newLine));
                    }
                } else {
                    htmlLines.push(`<span class="diff-highlight">${this._escapeHtml(newLines[j])}</span>`);
                }
            }

            this.el.aiCode.innerHTML = htmlLines.join('\n');
        }

        _charDiff(oldStr, newStr) {
            const m = oldStr.length;
            const n = newStr.length;
            const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
            for (let i = 0; i <= m; i++) dp[i][0] = i;
            for (let j = 0; j <= n; j++) dp[0][j] = j;
            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    if (oldStr[i - 1] === newStr[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1];
                    } else {
                        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
                    }
                }
            }

            const ops = [];
            let i = m, j = n;
            while (i > 0 || j > 0) {
                if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
                    ops.unshift({ type: 'equal', char: newStr[j - 1] });
                    i--; j--;
                } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
                    ops.unshift({ type: 'insert', char: newStr[j - 1] });
                    j--;
                } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1])) {
                    i--;
                } else {
                    if (j > 0) {
                        ops.unshift({ type: 'insert', char: newStr[j - 1] });
                        j--;
                    } else {
                        i--;
                    }
                }
            }

            let html = '';
            let currentType = ops[0]?.type;
            let currentText = '';
            for (const op of ops) {
                if (op.type === currentType) {
                    currentText += op.char;
                } else {
                    if (currentText) {
                        html += this._wrapByType(currentType, currentText);
                    }
                    currentType = op.type;
                    currentText = op.char;
                }
            }
            if (currentText) {
                html += this._wrapByType(currentType, currentText);
            }
            return html;
        }

        _wrapByType(type, text) {
            if (type === 'insert') {
                return `<span class="diff-highlight">${this._escapeHtml(text)}</span>`;
            } else {
                return this._escapeHtml(text);
            }
        }

        _escapeHtml(text) {
            return text.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;')
                       .replace(/'/g, '&#039;');
        }

        _splitAIResponse(text) {
            const descMatch = text.match(/说明：\s*([\s\S]*?)(?=代码：|$)/i);
            const codeMatch = text.match(/代码：\s*([\s\S]*)/i);
            const desc = descMatch ? descMatch[1].trim() : '';
            const code = codeMatch ? codeMatch[1].trim() : '';
            return { desc, code };
        }

        _toggleTheme() {
            document.body.classList.toggle('light');
        }

        _toggleApiVisibility() {
            const api = this.el.apiKey;
            api.style.display = api.style.display === 'none' ? 'block' : 'none';
        }

        _toggleThinking() {
            if (this.el.thoughtProcess) {
                const isHidden = this.el.thoughtProcess.style.display === 'none';
                this.el.thoughtProcess.style.display = isHidden ? 'block' : 'none';
                if (this.el.thoughtBadge) {
                    this.el.thoughtBadge.textContent = isHidden ? '🤔 隐藏思维' : '🤔 思考中';
                }
            }
        }

        _toggleDiff() {
            if (this.el.diffBadge) {
                const isOn = this.el.diffBadge.textContent.includes('开');
                this.el.diffBadge.textContent = isOn ? '差异显示: 关' : '差异显示: 开';
            }
        }

        _startDrag() {
            this._state.dragging = true;
        }

        _stopDrag() {
            this._state.dragging = false;
        }

        _onDrag(e) {
            if (!this._state.dragging) return;
            const w = e.clientX;
            if (w > 200 && w < window.innerWidth - 200) {
                this.el.leftPane.style.width = w + 'px';
            }
        }

        _addRippleEffects() {
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const ripple = document.createElement('span');
                    ripple.className = 'ripple';
                    btn.appendChild(ripple);
                    const rect = btn.getBoundingClientRect();
                    ripple.style.left = (e.clientX - rect.left) + 'px';
                    ripple.style.top = (e.clientY - rect.top) + 'px';
                    setTimeout(() => ripple.remove(), 500);
                });
            });
        }
    }

    new ChatAssistantApp();
  