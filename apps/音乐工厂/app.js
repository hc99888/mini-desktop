document.addEventListener("DOMContentLoaded", function() {
  console.log("应用已启动"); // 调试用
  
  // 获取所有需要的元素
  const statusBar = document.getElementById("statusBar");
  const tabButtons = document.querySelectorAll(".tabBtn");
  const modules = document.querySelectorAll(".module");
  
  // 获取各个输入和输出元素
  const titleInput = document.getElementById("titleInput");
  const moodInput = document.getElementById("moodInput");
  const bpmInput = document.getElementById("bpmInput");
  const sceneInput = document.getElementById("sceneInput");
  const tagsInput = document.getElementById("tagsInput");
  const notesInput = document.getElementById("notesInput");
  const outputBox = document.getElementById("outputBox");
  
  const promptInput = document.getElementById("promptInput");
  const promptOutput = document.getElementById("promptOutput");
  
  const melodyInput = document.getElementById("melodyInput");
  const styleSelect = document.getElementById("styleSelect");
  const musicOutput = document.getElementById("musicOutput");
  
  const filterInput = document.getElementById("filterInput");
  const filterSelect = document.getElementById("filterSelect");
  const filterOutput = document.getElementById("filterOutput");
  
  const postFile = document.getElementById("postFile");
  const postSelect = document.getElementById("postSelect");
  const postOutput = document.getElementById("postOutput");
  
  const publishTitle = document.getElementById("publishTitle");
  const publishSelect = document.getElementById("publishSelect");
  const publishOutput = document.getElementById("publishOutput");
  
  const archiveInput = document.getElementById("archiveInput");
  const archiveOutput = document.getElementById("archiveOutput");
  
  // 获取所有按钮
  const generateBtn = document.getElementById("generateBtn");
  const promptBtn = document.getElementById("promptBtn");
  const musicBtn = document.getElementById("musicBtn");
  const filterBtn = document.getElementById("filterBtn");
  const postBtn = document.getElementById("postBtn");
  const publishBtn = document.getElementById("publishBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");

  // 调试：检查元素是否存在
  console.log("titleInput:", titleInput);
  console.log("moodInput:", moodInput);
  console.log("bpmInput:", bpmInput);
  console.log("sceneInput:", sceneInput);
  console.log("tagsInput:", tagsInput);
  console.log("notesInput:", notesInput);

  // 标签切换功能
  tabButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      const target = this.dataset.target;
      modules.forEach(m => {
        m.style.display = (m.id === target) ? "block" : "none";
      });
      tabButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      if (statusBar) {
        statusBar.innerHTML = `<p>当前模块：${this.textContent}</p>`;
      }
    });
  });

  // 复制功能
  document.querySelectorAll(".copyBtn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.dataset.target;
      const element = document.getElementById(id);
      if (element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
          alert("✅ 复制成功！");
        }).catch(() => {
          alert("❌ 复制失败，请手动选择复制");
        });
      }
    });
  });

  // 生成任务单
  if (generateBtn) {
    generateBtn.addEventListener("click", function() {
      console.log("生成任务单按钮被点击");
      
      const task = {
        主题: titleInput?.value || "未填写",
        情绪: moodInput?.value || "未填写",
        BPM: bpmInput?.value || "未填写",
        场景: sceneInput?.value || "未填写",
        标签: tagsInput?.value || "未填写",
        备注: notesInput?.value || "未填写",
        生成时间: new Date().toLocaleString()
      };
      
      if (outputBox) {
        outputBox.textContent = JSON.stringify(task, null, 2);
        console.log("输出内容已更新");
      }
    });
  }

  // 生成 Prompt
  if (promptBtn) {
    promptBtn.addEventListener("click", function() {
      const text = promptInput?.value || "未输入提示词";
      const result = `【生成的 Prompt】\n${text}\n\n质量：高\n长度：中等\n风格：通用`;
      if (promptOutput) {
        promptOutput.textContent = result;
      }
    });
  }

  // 生成音乐
  if (musicBtn) {
    musicBtn.addEventListener("click", function() {
      const melody = melodyInput?.value || "默认旋律";
      const style = styleSelect?.value || "pop";
      const result = `🎵 音乐生成完成\n\n旋律：${melody}\n风格：${style}\n状态：已生成\n链接：https://music.example/track/${Date.now()}`;
      if (musicOutput) {
        musicOutput.textContent = result;
      }
    });
  }

  // 筛选
  if (filterBtn) {
    filterBtn.addEventListener("click", function() {
      const id = filterInput?.value || "未指定ID";
      const condition = filterSelect?.value || "quality";
      const result = `🔍 筛选结果\n\n任务单：${id}\n条件：${condition}\n状态：通过 ✓\n评分：${Math.floor(Math.random() * 30 + 70)}分`;
      if (filterOutput) {
        filterOutput.textContent = result;
      }
    });
  }

  // 后期处理
  if (postBtn) {
    postBtn.addEventListener("click", function() {
      const fileName = postFile?.files?.[0]?.name || "未选择文件 (使用demo.wav)";
      const process = postSelect?.value || "mix";
      const result = `🎛 后期处理完成\n\n文件：${fileName}\n处理方式：${process}\n输出：processed_${fileName}`;
      if (postOutput) {
        postOutput.textContent = result;
      }
    });
  }

  // 发布
  if (publishBtn) {
    publishBtn.addEventListener("click", function() {
      const title = publishTitle?.value || "未命名作品";
      const platform = publishSelect?.value || "netease";
      const platforms = {
        netease: "网易云音乐",
        qqmusic: "QQ音乐",
        spotify: "Spotify"
      };
      const result = `📢 发布成功！\n\n作品：${title}\n平台：${platforms[platform]}\n时间：${new Date().toLocaleString()}\n链接：https://music.example/${platform}/${Date.now()}`;
      if (publishOutput) {
        publishOutput.textContent = result;
      }
    });
  }

  // 归档
  if (archiveBtn) {
    archiveBtn.addEventListener("click", function() {
      const id = archiveInput?.value || "未指定ID";
      const result = `📦 归档完成\n\n作品ID：${id}\n位置：/archive/2025/${id}\n时间：${new Date().toLocaleString()}`;
      if (archiveOutput) {
        archiveOutput.textContent = result;
      }
    });
  }

  // 一键运行流水线
  if (runPipelineBtn) {
    runPipelineBtn.addEventListener("click", function() {
      const steps = [
        { id: "module1", action: () => generateBtn?.click(), name: "任务单" },
        { id: "module2", action: () => promptBtn?.click(), name: "Prompt" },
        { id: "module3", action: () => musicBtn?.click(), name: "音乐生成" },
        { id: "module4", action: () => filterBtn?.click(), name: "筛选" },
        { id: "module5", action: () => postBtn?.click(), name: "后期处理" },
        { id: "module6", action: () => publishBtn?.click(), name: "发布" },
        { id: "module7", action: () => archiveBtn?.click(), name: "归档" }
      ];

      let i = 0;
      
      function next() {
        if (i >= steps.length) {
          statusBar.innerHTML = "<p>✅ 流水线全部执行完成</p>";
          return;
        }
        
        const step = steps[i];
        
        // 切换模块
        modules.forEach(m => {
          m.style.display = (m.id === step.id) ? "block" : "none";
        });
        
        // 更新标签激活状态
        tabButtons.forEach(b => {
          const target = b.dataset.target;
          if (target === step.id) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });
        
        // 更新状态栏
        statusBar.innerHTML = `<p>▶ 正在执行：${step.name} (${i+1}/${steps.length})</p>`;
        
        // 执行动作
        step.action();
        
        i++;
        setTimeout(next, 800);
      }
      
      next();
    });
  }

  // 初始化状态
  if (statusBar) {
    statusBar.innerHTML = "<p>就绪 - 请选择模块开始</p>";
  }
});