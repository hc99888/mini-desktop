document.addEventListener("DOMContentLoaded", function () {
  console.log("应用已启动（整合版）");

  // ============================
  // 1. 全局流水线数据（含自动恢复）
  // ============================
  let pipelineData = {
    task: null,
    prompt: null,
    music: null,
    filter: null,
    post: null,
    publish: null,
    archive: null
  };

  // 从 localStorage 恢复
  try {
    const saved = localStorage.getItem("pipelineData");
    if (saved) {
      pipelineData = JSON.parse(saved);
      console.log("已恢复 pipelineData：", pipelineData);
    }
  } catch (e) {
    console.warn("恢复失败：", e);
  }

  // ============================
  // 2. 获取所有 DOM 元素
  // ============================
  const statusBar = document.getElementById("statusBar");
  const tabButtons = document.querySelectorAll(".tabBtn");
  const modules = document.querySelectorAll(".module");

  // 任务单
  const titleInput = document.getElementById("titleInput");
  const moodInput = document.getElementById("moodInput");
  const bpmInput = document.getElementById("bpmInput");
  const sceneInput = document.getElementById("sceneInput");
  const tagsInput = document.getElementById("tagsInput");
  const notesInput = document.getElementById("notesInput");
  const outputBox = document.getElementById("outputBox");

  // Prompt
  const promptInput = document.getElementById("promptInput");
  const promptOutput = document.getElementById("promptOutput");

  // 音乐
  const melodyInput = document.getElementById("melodyInput");
  const styleSelect = document.getElementById("styleSelect");
  const musicOutput = document.getElementById("musicOutput");

  // 筛选
  const filterInput = document.getElementById("filterInput");
  const filterSelect = document.getElementById("filterSelect");
  const filterOutput = document.getElementById("filterOutput");

  // 后期
  const postFile = document.getElementById("postFile");
  const postSelect = document.getElementById("postSelect");
  const postOutput = document.getElementById("postOutput");

  // 发布
  const publishTitle = document.getElementById("publishTitle");
  const publishSelect = document.getElementById("publishSelect");
  const publishOutput = document.getElementById("publishOutput");

  // 归档
  const archiveInput = document.getElementById("archiveInput");
  const archiveOutput = document.getElementById("archiveOutput");

  // 按钮
  const generateBtn = document.getElementById("generateBtn");
  const promptBtn = document.getElementById("promptBtn");
  const musicBtn = document.getElementById("musicBtn");
  const filterBtn = document.getElementById("filterBtn");
  const postBtn = document.getElementById("postBtn");
  const publishBtn = document.getElementById("publishBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");

  // ============================
  // 3. 导航栏切换 + 自动滚动
  // ============================
  tabButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      const target = this.dataset.target;

      // 切换模块显示
      modules.forEach(m => {
        m.style.display = (m.id === target) ? "block" : "none";
      });

      // 更新按钮激活状态
      tabButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      // 自动滚动到当前按钮
      this.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });

      // 状态栏提示
      if (statusBar) {
        statusBar.textContent = "当前模块：" + this.textContent;
      }
    });
  });

  // ============================
  // 4. 复制功能（通用）
  // ============================
  document.querySelectorAll(".copyBtn").forEach(btn => {
    btn.addEventListener("click", function () {
      const id = this.dataset.target;
      const element = document.getElementById(id);
      if (element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
          alert("复制成功");
        }).catch(() => {
          alert("复制失败，请手动复制");
        });
      }
    });
  });

  // ============================
  // 5. 模块 1：生成任务单
  // ============================
  if (generateBtn) {
    generateBtn.addEventListener("click", function () {
      pipelineData.task = {
        title: titleInput?.value || "未填写",
        mood: moodInput?.value || "未填写",
        bpm: bpmInput?.value || "未填写",
        scene: sceneInput?.value || "未填写",
        tags: tagsInput?.value || "未填写",
        notes: notesInput?.value || "未填写",
        time: new Date().toLocaleString()
      };

      outputBox.textContent = JSON.stringify(pipelineData.task, null, 2);
      savePipeline();
    });
  }

  // ============================
  // 6. 模块 2：生成 Prompt
  // ============================
  if (promptBtn) {
    promptBtn.addEventListener("click", function () {
      if (!pipelineData.task) {
        alert("请先生成任务单！");
        return;
      }

      const t = pipelineData.task;
      const base = promptInput?.value || "";

      pipelineData.prompt = base || `${t.title} / ${t.mood} / ${t.scene}`;

       // 修改这里：使用任务单数据，可选添加用户输入
    pipelineData.prompt = `${t.title} / ${t.mood} / ${t.scene}`;
    if (base) {
      pipelineData.prompt += ` / ${base}`;
    }

      const result =
        `【生成的 Prompt】\n${pipelineData.prompt}\n\n质量：高\n长度：中等\n风格：通用`;

      if (promptOutput) {
        promptOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
  // 7. 模块 3：生成音乐
  // ============================
  if (musicBtn) {
    musicBtn.addEventListener("click", function () {
      if (!pipelineData.prompt) {
        alert("请先生成 Prompt！");
        return;
      }

      const melody = melodyInput?.value || pipelineData.prompt || "默认旋律";
      const style = styleSelect?.value || "pop";

      pipelineData.music = {
        melody,
        style,
        time: Date.now()
      };

      const result =
        `🎵 音乐生成完成\n\n` +
        `旋律：${melody}\n风格：${style}\n状态：已生成\n` +
        `链接：https://music.example/track/${pipelineData.music.time}`;

      if (musicOutput) {
        musicOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
  // 8. 模块 4：筛选
  // ============================
  if (filterBtn) {
    filterBtn.addEventListener("click", function () {
      if (!pipelineData.music) {
        alert("请先生成音乐！");
        return;
      }

      const id = filterInput?.value || pipelineData.music.time || "未指定ID";
      const condition = filterSelect?.value || "quality";

      pipelineData.filter = {
        id,
        condition,
        score: Math.floor(Math.random() * 30 + 70) // 70~100
      };

      const result =
        `🔍 筛选结果\n\n` +
        `任务单：${id}\n条件：${condition}\n状态：通过 ✓\n` +
        `评分：${pipelineData.filter.score}分`;

      if (filterOutput) {
        filterOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
  // 9. 模块 5：后期处理
  // ============================
  if (postBtn) {
    postBtn.addEventListener("click", function () {
      if (!pipelineData.music) {
        alert("请先生成音乐！");
        return;
      }

      const fileName = postFile?.files?.[0]?.name || "demo.wav";
      const process = postSelect?.value || "mix";

      pipelineData.post = {
        file: fileName,
        process,
        output: `processed_${fileName}`
      };

      const result =
        `🎛 后期处理完成\n\n` +
        `文件：${fileName}\n处理方式：${process}\n输出：${pipelineData.post.output}`;

      if (postOutput) {
        postOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
  // 10. 模块 6：发布
  // ============================
  if (publishBtn) {
    publishBtn.addEventListener("click", function () {
      if (!pipelineData.post) {
        alert("请先完成后期处理！");
        return;
      }

      const title = publishTitle?.value || pipelineData.task?.title || "未命名作品";
      const platform = publishSelect?.value || "netease";

      const platforms = {
        netease: "网易云音乐",
        qqmusic: "QQ音乐",
        spotify: "Spotify"
      };

      pipelineData.publish = {
        title,
        platform,
        time: new Date().toLocaleString()
      };

      const result =
        `📢 发布成功！\n\n` +
        `作品：${title}\n平台：${platforms[platform]}\n时间：${pipelineData.publish.time}\n` +
        `链接：https://music.example/${platform}/${Date.now()}`;

      if (publishOutput) {
        publishOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
  // 11. 模块 7：归档
  // ============================
  if (archiveBtn) {
    archiveBtn.addEventListener("click", function () {
      if (!pipelineData.publish) {
        alert("请先完成发布！");
        return;
      }

      const id = archiveInput?.value || pipelineData.publish.title || "未指定ID";

      pipelineData.archive = {
        id,
        path: `/archive/${new Date().getFullYear()}/${id}`,
        time: new Date().toLocaleString()
      };

      const result =
        `📦 归档完成\n\n` +
        `作品ID：${pipelineData.archive.id}\n` +
        `位置：${pipelineData.archive.path}\n` +
        `时间：${pipelineData.archive.time}`;

      if (archiveOutput) {
        archiveOutput.textContent = result;
      }

      savePipeline();
    });
  }

  // ============================
// 12. 一键运行流水线（修复版）
// ============================
if (runPipelineBtn) {
  runPipelineBtn.addEventListener("click", async function () {
    console.log("开始运行流水线…");
    
    try {
      // 1. 任务单
      if (!pipelineData.task) {
        console.log("生成任务单...");
        generateBtn?.click();
        // 等待一小段时间让数据保存
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 2. Prompt（依赖任务单）
      if (!pipelineData.prompt) {
        if (!pipelineData.task) {
          alert("任务单生成失败，无法继续");
          return;
        }
        console.log("生成Prompt...");
        promptBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 3. 音乐（依赖Prompt）
      if (!pipelineData.music) {
        if (!pipelineData.prompt) {
          alert("Prompt生成失败，无法继续");
          return;
        }
        console.log("生成音乐...");
        musicBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 4. 筛选（依赖音乐）
      if (!pipelineData.filter) {
        if (!pipelineData.music) {
          alert("音乐生成失败，无法继续");
          return;
        }
        console.log("筛选...");
        filterBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 5. 后期（依赖音乐）
      if (!pipelineData.post) {
        if (!pipelineData.music) {
          alert("音乐生成失败，无法继续");
          return;
        }
        console.log("后期处理...");
        postBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 6. 发布（依赖后期）
      if (!pipelineData.publish) {
        if (!pipelineData.post) {
          alert("后期处理失败，无法继续");
          return;
        }
        console.log("发布...");
        publishBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 7. 归档（依赖发布）
      if (!pipelineData.archive) {
        if (!pipelineData.publish) {
          alert("发布失败，无法继续");
          return;
        }
        console.log("归档...");
        archiveBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 状态栏提示
      if (statusBar) {
        statusBar.textContent = "流水线已完成 ✓";
      }

      savePipeline();
      console.log("流水线执行完成");
      
    } catch (error) {
      console.error("流水线执行出错：", error);
      alert("流水线执行出错，请查看控制台");
    }
  });
}

  // ============================
  // 13. 状态栏更新函数
  // ============================
  function updateStatus(message, type = "info") {
    if (!statusBar) return;

    statusBar.textContent = message;
    statusBar.className = "status " + type;

    // 自动清除提示
    setTimeout(() => {
      statusBar.textContent = "状态栏：任务数 | 自动化进度 | 最近生成";
      statusBar.className = "status";
    }, 4000);
  }

  // ============================
  // 14. 全局提示工具
  // ============================
  function showAlert(message, type = "success") {
    const box = document.createElement("div");
    box.className = "alert " + type;
    box.textContent = message;
    box.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      border-radius: 4px;
      z-index: 1000;
    `;

    document.body.appendChild(box);

    setTimeout(() => {
      box.remove();
    }, 3000);
  }

  // ============================
  // 15. 本地存储与恢复
  // ============================
  function savePipeline() {
    try {
      localStorage.setItem("pipelineData", JSON.stringify(pipelineData));
      console.log("流水线数据已保存");
    } catch (e) {
      console.error("保存失败：", e);
    }
  }

  function loadPipeline() {
    try {
      const data = localStorage.getItem("pipelineData");
      if (data) {
        pipelineData = JSON.parse(data);
        console.log("流水线数据已恢复", pipelineData);

        // 恢复输出框内容
        if (pipelineData.task && outputBox) {
          outputBox.textContent = JSON.stringify(pipelineData.task, null, 2);
        }
        if (pipelineData.prompt && promptOutput) {
          const result = `【生成的 Prompt】\n${pipelineData.prompt}\n\n质量：高\n长度：中等\n风格：通用`;
          promptOutput.textContent = result;
        }
        if (pipelineData.music && musicOutput) {
          const result = `🎵 音乐生成完成\n\n旋律：${pipelineData.music.melody}\n风格：${pipelineData.music.style}\n状态：已生成\n链接：https://music.example/track/${pipelineData.music.time}`;
          musicOutput.textContent = result;
        }
        if (pipelineData.filter && filterOutput) {
          const result = `🔍 筛选结果\n\n任务单：${pipelineData.filter.id}\n条件：${pipelineData.filter.condition}\n状态：通过 ✓\n评分：${pipelineData.filter.score}分`;
          filterOutput.textContent = result;
        }
        if (pipelineData.post && postOutput) {
          const result = `🎛 后期处理完成\n\n文件：${pipelineData.post.file}\n处理方式：${pipelineData.post.process}\n输出：${pipelineData.post.output}`;
          postOutput.textContent = result;
        }
        if (pipelineData.publish && publishOutput) {
          const platforms = {
            netease: "网易云音乐",
            qqmusic: "QQ音乐",
            spotify: "Spotify"
          };
          const result = `📢 发布成功！\n\n作品：${pipelineData.publish.title}\n平台：${platforms[pipelineData.publish.platform]}\n时间：${pipelineData.publish.time}\n链接：https://music.example/${pipelineData.publish.platform}/${Date.now()}`;
          publishOutput.textContent = result;
        }
        if (pipelineData.archive && archiveOutput) {
          const result = `📦 归档完成\n\n作品ID：${pipelineData.archive.id}\n位置：${pipelineData.archive.path}\n时间：${pipelineData.archive.time}`;
          archiveOutput.textContent = result;
        }
      }
    } catch (e) {
      console.error("恢复失败：", e);
    }
  }

  // ============================
  // 16. 快捷键支持
  // ============================
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "1") {
      e.preventDefault();
      generateBtn?.click(); // Ctrl+1 生成任务单
    }
    if (e.ctrlKey && e.key === "2") {
      e.preventDefault();
      promptBtn?.click(); // Ctrl+2 生成 Prompt
    }
    if (e.ctrlKey && e.key === "3") {
      e.preventDefault();
      musicBtn?.click(); // Ctrl+3 生成音乐
    }
    if (e.ctrlKey && e.key === "4") {
      e.preventDefault();
      filterBtn?.click(); // Ctrl+4 筛选
    }
    if (e.ctrlKey && e.key === "5") {
      e.preventDefault();
      postBtn?.click(); // Ctrl+5 后期处理
    }
    if (e.ctrlKey && e.key === "6") {
      e.preventDefault();
      publishBtn?.click(); // Ctrl+6 发布
    }
    if (e.ctrlKey && e.key === "7") {
      e.preventDefault();
      archiveBtn?.click(); // Ctrl+7 归档
    }
    if (e.ctrlKey && e.key === "0") {
      e.preventDefault();
      runPipelineBtn?.click(); // Ctrl+0 一键运行流水线
    }
  });

  // ============================
  // 17. 模块依赖检查函数
  // ============================
  function checkDependency(moduleName) {
    switch (moduleName) {
      case "prompt":
        if (!pipelineData.task) {
          showAlert("依赖缺失：请先生成任务单", "error");
          return false;
        }
        break;
      case "music":
        if (!pipelineData.prompt) {
          showAlert("依赖缺失：请先生成 Prompt", "error");
          return false;
        }
        break;
      case "filter":
        if (!pipelineData.music) {
          showAlert("依赖缺失：请先生成音乐", "error");
          return false;
        }
        break;
      case "post":
        if (!pipelineData.music) {
          showAlert("依赖缺失：请先生成音乐", "error");
          return false;
        }
        break;
      case "publish":
        if (!pipelineData.post) {
          showAlert("依赖缺失：请先完成后期处理", "error");
          return false;
        }
        break;
      case "archive":
        if (!pipelineData.publish) {
          showAlert("依赖缺失：请先完成发布", "error");
          return false;
        }
        break;
    }
    return true;
  }

  // ============================
  // 18. UI 辅助函数
  // ============================
  function activateButton(btn) {
    if (!btn) return;
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    scrollToCenter(btn);
  }

  function scrollToCenter(element) {
    if (!element) return;
    element.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }

  // ============================
  // 19. 初始化入口
  // ============================
  function initApp() {
    console.log("🎬 初始化音乐工厂系统…");

    // 恢复数据
    loadPipeline();

    // 默认激活第一个按钮
    if (tabButtons.length > 0) {
      activateButton(tabButtons[0]);
      modules.forEach((m, i) => {
        m.style.display = (i === 0) ? "block" : "none";
      });
    }

    // 状态栏提示
    updateStatus("系统已启动，准备就绪 ✓", "success");
  }

  // 页面加载时执行初始化
  initApp();

});