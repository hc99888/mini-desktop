/* -----------------------------
   默认配置
----------------------------- */
const defaultUser = "hc99888";
const defaultRepo = "subscription-auto-push";
const defaultFilename = "subscribe.txt";

const SUB = "https://api.allorigins.win/raw?url=https://openproxylist.com/v2ray/rawlist/subscribe";
const VALID_PREFIXES = ["vmess://", "vless://", "trojan://", "ss://", "ssr://"];

let currentRawText = "";
let currentValidNodes = [];

/* -----------------------------
   页面加载
----------------------------- */
window.onload = () => {
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

        renderCountryButtons(parsed.valid);
        renderSegmentButtons(parsed.valid);
    }

    document.getElementById("lastUpdate").innerText =
        localStorage.getItem("lastUpdate") || "无";

    initMultiSourcePage();
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
   抓取订阅（首页）
----------------------------- */
document.getElementById("fetchBtn").onclick = async () => {
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
    } catch {
        alert("抓取失败");
    }

    btn.innerText = "🚀 一键抓取订阅";
    btn.disabled = false;
};

/* -----------------------------
   GitHub 推送
----------------------------- */
document.getElementById("pushToGithubBtn").onclick = async () => {
    const token = document.getElementById("githubToken").value;
    const filename = document.getElementById("githubFilename").value || defaultFilename;

    if (!token) return alert("请输入 Token");

    localStorage.setItem("githubToken", token);
    localStorage.setItem("githubFilename", filename);

    const url = `https://api.github.com/repos/${defaultUser}/${defaultRepo}/contents/${filename}`;

    let sha = null;
    try {
        const r = await fetch(url, {
            headers: { "Authorization": `token ${token}` }
        });
        if (r.ok) {
            const j = await r.json();
            sha = j.sha;
        }
    } catch {}

    const content = btoa(unescape(encodeURIComponent(currentRawText)));

    const body = {
        message: "更新订阅",
        content
    };
    if (sha) body.sha = sha;

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
        alert("推送失败");
    }
};

/* -----------------------------
   Token 控制
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

document.getElementById("toggleToken").onclick = () => {
    const input = document.getElementById("githubToken");
    if (input.readOnly) return;

    if (