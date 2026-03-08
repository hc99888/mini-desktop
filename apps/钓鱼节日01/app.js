

/* -----------------------------
   默认配置
----------------------------- */
const defaultUser = "hc99888";
const defaultRepo = "subscription-auto-push";
const defaultFilename = "subscribe.txt";

/* 修复抓取失败：使用稳定代理 */
const SUB = "https://cors.isteed.cc/https://openproxylist.com/v2ray/rawlist/subscribe";

const VALID_PREFIXES = ["vmess://", "vless://", "trojan://", "ss://", "ssr://"];

let currentRawText = "";
let currentValidNodes = [];

/* -----------------------------
   页面加载 - 所有事件绑定在此初始化
----------------------------- */
window.onload = () => {
    // 初始化输入框
    document.getElementById("githubFilename").value =
        localStorage.getItem("githubFilename") || defaultFilename;

    document.getElementById("githubToken").value =
        localStorage.getItem("githubToken") || "";

    const locked = localStorage.getItem("tokenLocked") === "1";
    if (locked) lockTokenField(true);

    const saved = localStorage.getItem("merged");
    if (saved) {
        currentRawText = saved;
        const parsed = parseNodes(saved);
        currentValidNodes = parsed.valid;
        updateDisplay(parsed);
        renderSegmentButtons(parsed.valid);
        renderCountryButtons(parsed.valid);
    }

    document.getElementById("lastUpdate").innerText =
        localStorage.getItem("lastUpdate") || "无";

    // 页面切换
    initPageSwitch();

    // 多源页面初始化
    initMultiSourcePage();

    // 首页抓取按钮
    document.getElementById("fetchBtn").addEventListener("click", async () => {
        const btn = document.getElementById("fetchBtn");
        btn.innerText = "⏳ 抓取中...";
        btn.disabled = true;
        try {
            const res = await fetch(SUB);
            currentRawText = await res.text();
            localStorage.setItem("merged", currentRawText);
            localStorage.setItem("lastUpdate", new Date().toLocaleString());
            const parsed = parseNodes(currentRawText);
            currentValidNodes = parsed.valid;
            updateDisplay(parsed);
            renderCountryButtons(parsed.valid);
            renderSegmentButtons(parsed.valid);
            document.getElementById("lastUpdate").innerText =
                localStorage.getItem("lastUpdate");
            alert("抓取成功！");
        } catch (err) {
            console.error("抓取失败:", err);
            alert("抓取失败，请检查网络或链接");
        }
        btn.innerText = "🚀 一键抓取订阅";
        btn.disabled = false;
    });

    // GitHub 推送按钮
    document.getElementById("pushToGithubBtn").addEventListener("click", async () => {
        const token = document.getElementById("githubToken").value;
        const filename = document.getElementById("githubFilename").value || defaultFilename;
        if (!token) return alert("请输入 Token");

        localStorage.setItem("githubToken", token);
        localStorage.setItem("githubFilename", filename);

        const url = `https://api.github.com/repos/${defaultUser}/${defaultRepo}/contents/${filename}`;
        let sha = null;
        try {
            const r = await fetch(url, { headers: { "Authorization": `token ${token}` } });
            if (r.ok) {
                const j = await r.json();
                sha = j.sha;
            }
        } catch (err) {
            console.error("获取文件信息失败:", err);
        }

        const content = btoa(unescape(encodeURIComponent(currentRawText)));
        const body = { message: "更新订阅", content };
        if (sha) body.sha = sha;

        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const raw = `https://raw.githubusercontent.com/${defaultUser}/${defaultRepo}/main/${filename}`;
                document.getElementById("pushResultBox").value = raw;
                alert("推送成功！");
            } else {
                alert("推送失败：" + res.status);
            }
        } catch (err) {
            console.error("推送失败:", err);
            alert("推送失败，请检查 Token 或网络");
        }
    });

    // Token 显示/隐藏按钮
    document.getElementById("toggleToken").addEventListener("click", () => {
        const input = document.getElementById("githubToken");
        if (input.readOnly) return; // 已锁定时禁止操作
        if (input.type === "password") {
            input.type = "text";
            document.getElementById("toggleToken").textContent = "隐藏";
        } else {
            input.type = "password";
            document.getElementById("toggleToken").textContent = "显示";
        }
    });

    // Token 锁定按钮
    document.getElementById("lockToken").addEventListener("click", () => {
        const isLocked = localStorage.getItem("tokenLocked") === "1";
        lockTokenField(!isLocked);
    });

    // 自动更新 checkbox 状态保存
    const autoUpdateCheckbox = document.getElementById("autoUpdate");
    autoUpdateCheckbox.checked = localStorage.getItem("autoUpdate") === "1";
    autoUpdateCheckbox.addEventListener("change", () => {
        localStorage.setItem("autoUpdate", autoUpdateCheckbox.checked ? "1" : "0");
    });
};

/* -----------------------------
   Base64 解码
----------------------------- */
function tryDecodeBase64(str) {
    try {
        const cleaned = str.replace(/\s+/g, "");
        const decoded = atob(cleaned);
        if (VALID_PREFIXES.some(p => decoded.includes(p))) return decoded;
    } catch {}
    return str;
}

/* -----------------------------
   解析节点
----------------------------- */
function parseNodes(rawText) {
    const decoded = tryDecodeBase64(rawText);
    const lines = decoded.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");

    const valid = [];
    const invalid = [];
    const protoCount = { vmess:0, vless:0, trojan:0, ss:0, ssr:0 };

    for (const line of lines) {
        const ok = VALID_PREFIXES.some(p => line.startsWith(p));
        if (ok) {
            valid.push(line);
            if (line.startsWith("vmess://")) protoCount.vmess++;
            else if (line.startsWith("vless://")) protoCount.vless++;
            else if (line.startsWith("trojan://")) protoCount.trojan++;
            else if (line.startsWith("ss://")) protoCount.ss++;
            else if (line.startsWith("ssr://")) protoCount.ssr++;
        } else invalid.push(line);
    }

    return {
        rawLines: lines.length,
        valid,
        invalid,
        validCount: valid.length,
        invalidCount: invalid.length,
        protoCount
    };
}

/* -----------------------------
   更新 UI
----------------------------- */
function updateDisplay(p) {
    document.getElementById("rawLines").innerText = p.rawLines;
    document.getElementById("validCount").innerText = p.validCount;
    document.getElementById("invalidCount").innerText = p.invalidCount;
    document.getElementById("vmessCount").innerText = p.protoCount.vmess;
    document.getElementById("vlessCount").innerText = p.protoCount.vless;
    document.getElementById("trojanCount").innerText = p.protoCount.trojan;
    document.getElementById("ssCount").innerText = p.protoCount.ss;
    document.getElementById("ssrCount").innerText = p.protoCount.ssr;
}

/* -----------------------------
   国家识别
----------------------------- */
function detectCountry(node) {
    const name = node.toLowerCase();
    const map = {
        "hk": "香港", "hongkong": "香港", "香港": "香港",
        "tw": "台湾", "taiwan": "台湾", "台湾": "台湾",
        "jp": "日本", "japan": "日本", "日本": "日本",
        "sg": "新加坡", "singapore": "新加坡", "新加坡": "新加坡",
        "us": "美国", "usa": "美国", "america": "美国", "美国": "美国",
        "kr": "韩国", "korea": "韩国", "韩国": "韩国",
        "uk": "英国", "unitedkingdom": "英国", "britain": "英国", "英国": "英国",
        "de": "德国", "germany": "德国", "德国": "德国"
    };
    for (const key in map) {
        if (name.includes(key)) return map[key];
    }
    return "其他";
}

/* -----------------------------
   国家分组
----------------------------- */
function groupNodesByCountry(nodes) {
    const groups = {};
    nodes.forEach(n => {
        const country = detectCountry(n);
        if (!groups[country]) groups[country] = [];
        groups[country].push(n);
    });
    return groups;
}

/* -----------------------------
   渲染国家按钮
----------------------------- */
function renderCountryButtons(nodes) {
    const box = document.getElementById("countryButtons");
    box.innerHTML = "";
    if (!nodes.length) return;

    const groups = groupNodesByCountry(nodes);

    Object.keys(groups).forEach(country => {
        const list = groups[country];
        const btn = document.createElement("button");
        btn.textContent = `${country}（${list.length}）`;
        btn.onclick = () => {
            navigator.clipboard.writeText(list.join("\n"));
            btn.textContent = `${country} ✔`;
            setTimeout(() => {
                btn.textContent = `${country}（${list.length}）`;
            }, 1000);
        };
        box.appendChild(btn);
    });
}

/* -----------------------------
   渲染 80 行分段按钮
----------------------------- */
function renderSegmentButtons(nodes) {
    const box = document.getElementById("segmentButtons");
    box.innerHTML = "";
    if (!nodes.length) return;

    const per = 80;
    const total = nodes.length;
    const seg = Math.ceil(total / per);

    for (let i = 0; i < seg; i++) {
        const start = i * per;
        const end = Math.min(start + per, total);
        const btn = document.createElement("button");
        btn.textContent = `第 ${i+1} 段（${start+1}–${end}）`;
        btn.onclick = () => {
            const part = nodes.slice(start, end).join("\n");
            navigator.clipboard.writeText(part);
            btn.textContent = "已复制 ✔";
            setTimeout(() => {
                btn.textContent = `第 ${i+1} 段（${start+1}–${end}）`;
            }, 1000);
        };
        box.appendChild(btn);
    }
}

/* -----------------------------
   Page1 ↔ Page2 页面切换
----------------------------- */
function initPageSwitch() {
    const page1 = document.getElementById("page1");
    const page2 = document.getElementById("page2");

    const goMulti = document.getElementById("goMultiPage");
    const backMain = document.getElementById("backToMain");

    if (goMulti) {
        goMulti.onclick = () => {
            page1.style.display = "none";
            page2.style.display = "block";
        };
    }

    if (backMain) {
        backMain.onclick = () => {
            page2.style.display = "none";
            page1.style.display = "block";
        };
    }
}

/* =====================================================
   Page2：多源节点页面逻辑（修复：代理 + 默认输入行）
===================================================== */
function initMultiSourcePage() {
    // 默认添加一行
    addSourceRow("");

    // 添加一行
    const addBtn = document.getElementById("addSourceBtn");
    if (addBtn) {
        addBtn.onclick = () => addSourceRow("");
    }

    // 抓取所有链接
    const fetchAllBtn = document.getElementById("fetchAllSources");
    if (fetchAllBtn) {
        fetchAllBtn.onclick = async () => {
            const rows = [...document.querySelectorAll(".source-row input")];
            const urls = rows.map(r => r.value.trim()).filter(v => v);

            if (!urls.length) return alert("请输入至少一个链接");

            const allNodes = [];
            const resultBox = document.getElementById("multiResults");
            resultBox.innerHTML = "";

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                let text = "";
                try {
                    const res = await fetch(`https://cors.isteed.cc/${url}`);
                    text = await res.text();
                } catch {
                    text = "";
                }

                const parsed = parseNodes(text);
                allNodes.push(...parsed.valid);
                renderSingleSourceResult(i + 1, url, parsed.valid);
            }

            renderMultiCountryButtons(allNodes);
        };
    }
}

/* 添加输入行 */
function addSourceRow(value) {
    const row = document.createElement("div");
    row.className = "source-row";

    row.innerHTML = `
        <input type="text" placeholder="输入订阅链接" value="${value || ""}">
        <div class="del-btn">X</div>
    `;

    row.querySelector(".del-btn").onclick = () => row.remove();

    document.getElementById("sourceList").appendChild(row);
}

/* 单个网站结果 */
function renderSingleSourceResult(index, url, nodes) {
    const box = document.getElementById("multiResults");

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
        <h4>来源：网站 ${index}</h4>
        <div>${nodes.join("<br>") || "无有效节点"}</div>
        <div class="copy-small">复制全部节点</div>
    `;

    card.querySelector(".copy-small").onclick = () => {
        navigator.clipboard.writeText(nodes.join("\n"));
    };

    box.appendChild(card);
}

/* 多源国家复制 */
function renderMultiCountryButtons(nodes) {
    const box = document.getElementById("multiCountryButtons");
    box.innerHTML = "";
    if (!nodes.length) return;

    const groups = groupNodesByCountry(nodes);

    Object.keys(groups).forEach(country => {
        const list = groups[country];
        const btn = document.createElement("button");
        btn.textContent = `${country}（${list.length}）`;
        btn.className = "country-btn";
        btn.onclick = () => {
            navigator.clipboard.writeText(list.join("\n"));
            btn.textContent = `${country} ✔`;
            setTimeout(() => {
                btn.textContent = `${country}（${list.length}）`;
            }, 1000);
        };
        box.appendChild(btn);
    });
}

/* -----------------------------
   Token 控制函数
----------------------------- */
function lockTokenField(lock) {
    const input = document.getElementById("githubToken");
    const toggle = document.getElementById("toggleToken");
    const lockBtn = document.getElementById("lockToken");
    if (lock) {
        input.type = "password";
        input.readOnly = true;
        lockBtn.textContent = "已锁定";
        toggle.textContent = "显示";
        localStorage.setItem("tokenLocked", "1");
    } else {
        input.readOnly = false;
        lockBtn.textContent = "锁定";
        localStorage.setItem("tokenLocked", "0");
    }
}
