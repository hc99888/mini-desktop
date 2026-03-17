// app.js - 多引擎AI音乐生成
document.addEventListener("DOMContentLoaded", function() {
  console.log("音乐工厂 - 多引擎版本已启动");

  // ========== 统一数据结构 ==========
  let pipelineData = {
    task: { id: null, title: "", mood: "", bpm: "", scene: "", tags: "", notes: "", time: null, output: "" },
    prompt: { id: null, text: "", source: "", time: null, output: "" },
    music: { id: null, melody: "", style: "", styleName: "", url: "", engine: "", time: null, output: "" },
    filter: { id: null, taskId: "", condition: "", conditionName: "", score: 0, passed: false, time: null, output: "" },
    post: { id: null, fileName: "", process: "", processName: "", outputFile: "", time: null, output: "" },
    publish: { id: null, title: "", platform: "", platformName: "", url: "", time: null, output: "" },
    archive: { id: null, archiveId: "", path: "", time: null, output: "" }
  };

  // ========== API配置 ==========
  let apiKeys = {
    mureka: localStorage.getItem('murekaApiKey') || '',
    suno: localStorage.getItem('sunoApiKey') || ''
  };

  // ========== 预置音乐库 ==========
  const MusicLibrary = {
    tracks: [
      { id: 'lib1', name: '夏日微风', mood: '欢快', style: 'pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 60 },
      { id: 'lib2', name: '雨夜沉思', mood: '平静', style: 'classical', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 60 },
      { id: 'lib3', name: '激情摇滚', mood: '激昂', style: 'rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 60 },
      { id: 'lib4', name: '爵士之夜', mood: '浪漫', style: 'jazz', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 60 },
      { id: 'lib5', name: '电子脉冲', mood: '动感', style: 'electronic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 60 }
    ],
    
    findMatch(params) {
      const style = params.style;
      const mood = params.mood;
      
      let match = this.tracks.find(t => t.style === style && t.mood === mood);
      if (!match) match = this.tracks.find(t => t.style === style);
      if (!match) match = this.tracks[Math.floor(Math.random() * this.tracks.length)];
      
      return match;
    }
  };

  // ========== Web Audio API 引擎 ==========
  const WebAudioEngine = {
    context: null,
    
    init() {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
      }
      return this.context;
    },
    
    generate(params) {
      const ctx = this.init();
      if (ctx.state === 'suspended') ctx.resume();
      
      const bpm = parseInt(params.bpm) || 120;
      const style = params.style || 'pop';
      const mood = params.mood || '欢快';
      
      // 根据风格选择音阶
      const scales = {
        pop: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00],
        rock: [196.00, 246.94, 293.66, 369.99, 440.00],
        jazz: [261.63, 293.66, 329.63, 369.99, 415.30, 466.16],
        classical: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88],
        electronic: [261.63, 329.63, 392.00, 523.25],
        hiphop: [61.74, 92.50, 123.47]
      };
      
      const notes = scales[style] || scales.pop;
      const duration = 60 / bpm;
      
      let time = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      
      // 播放4个小节
      for (let bar = 0; bar < 4; bar++) {
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          
          osc.type = mood === '平静' ? 'sine' : mood === '激昂' ? 'sawtooth' : 'triangle';
          osc.frequency.value = freq;
          
          osc.connect(noteGain);
          noteGain.connect(gainNode);
          
          const startTime = time + (index * duration / 2);
          const endTime = startTime + duration * 0.8;
          
          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
          noteGain.gain.linearRampToValueAtTime(0, endTime);
          
          osc.start(startTime);
          osc.stop(endTime);
        });
        time += duration * 2;
      }
      
      return {
        success: true,
        message: `Web Audio合成: ${bpm}BPM ${style}风格`,
        audioUrl: null,
        isPlaying: true
      };
    },
    
    stop() {
      if (this.context) {
        return this.context.close().then(() => {
          this.context = null;
        });
      }
      return Promise.resolve();
    }
  };

  // ========== Mureka AI API ==========
  const MurekaAI = {
    async generate(params) {
      if (!apiKeys.mureka) {
        showApiConfigModal('mureka');
        return { success: false, error: '请先配置Mureka API Key' };
      }
      
      try {
        const response = await fetch('https://api.mureka.ai/v1/music/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.mureka}`
          },
          body: JSON.stringify({
            prompt: params.prompt,
            style: params.style,
            title: params.title,
            duration: 30,
            bpm: parseInt(params.bpm) || 120,
            mood: params.mood
          })
        });
        
        const data = await response.json();
        if (data.task_id) {
          return await this.pollTask(data.task_id);
        }
        throw new Error(data.error || '生成失败');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    async pollTask(taskId) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const response = await fetch(`https://api.mureka.ai/v1/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKeys.mureka}` }
        });
        const data = await response.json();
        
        if (data.status === 'completed') {
          return {
            success: true,
            audioUrl: data.audio_url,
            coverUrl: data.cover_url,
            duration: data.duration,
            title: data.title
          };
        } else if (data.status === 'failed') {
          return { success: false, error: data.error };
        }
      }
      return { success: false, error: '生成超时' };
    }
  };

  // ========== Suno AI API ==========
  const SunoAI = {
    async generate(params) {
      if (!apiKeys.suno) {
        showApiConfigModal('suno');
        return { success: false, error: '请先配置Suno API Key' };
      }
      
      try {
        const response = await fetch('https://api.suno.ai/v1/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.suno}`
          },
          body: JSON.stringify({
            prompt: params.prompt,
            style: params.style,
            title: params.title,
            duration: 30
          })
        });
        
        const data = await response.json();
        if (data.audio_url) {
          return {
            success: true,
            audioUrl: data.audio_url,
            duration: data.duration,
            title: data.title
          };
        }
        throw new Error(data.error || '生成失败');
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  // ========== 工具函数 ==========
  function loadFromStorage() {
    const saved = localStorage.getItem("musicFactoryPipeline");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        pipelineData = mergeDeep(pipelineData, parsed);
        restoreAllOutputs();
      } catch (e) {
        console.error("恢复数据失败", e);
      }
    }
  }

  function mergeDeep(target, source) {
    const output = { ...target };
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = mergeDeep(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  function restoreAllOutputs() {
    if (pipelineData.task?.output && outputBox) outputBox.innerHTML = pipelineData.task.output;
    if (pipelineData.prompt?.output && promptOutput) promptOutput.innerHTML = pipelineData.prompt.output;
    if (pipelineData.music?.output && musicOutput) musicOutput.innerHTML = pipelineData.music.output;
    if (pipelineData.filter?.output && filterOutput) filterOutput.innerHTML = pipelineData.filter.output;
    if (pipelineData.post?.output && postOutput) postOutput.innerHTML = pipelineData.post.output;
    if (pipelineData.publish?.output && publishOutput) publishOutput.innerHTML = pipelineData.publish.output;
    if (pipelineData.archive?.output && archiveOutput) archiveOutput.innerHTML = pipelineData.archive.output;
  }

  function saveToStorage() {
    localStorage.setItem("musicFactoryPipeline", JSON.stringify(pipelineData));
  }

  function showDependencyHint(moduleId, message, type = "info") {
    const module = document.getElementById(moduleId);
    if (!module) return;
    
    const oldHint = module.querySelector(".dependency-hint");
    if (oldHint) oldHint.remove();
    
    const colors = {
      info: { bg: "#e3f2fd", color: "#1976d2", border: "#1976d2" },
      success: { bg: "#e8f5e8", color: "#28a745", border: "#28a745" },
      warning: { bg: "#fff3e0", color: "#ff9800", border: "#ff9800" },
      error: { bg: "#ffebee", color: "#dc3545", border: "#dc3545" }
    };
    
    const style = colors[type] || colors.info;
    
    const hint = document.createElement("div");
    hint.className = "dependency-hint";
    hint.style.cssText = `
      background: ${style.bg};
      color: ${style.color};
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
      border-left: 4px solid ${style.border};
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    `;
    hint.innerHTML = `<div style="display: flex; align-items: center;"><span style="font-size: 18px; margin-right: 8px;">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : '📎'}</span><span>${message}</span></div>`;
    
    module.insertBefore(hint, module.firstChild);
  }

  function showApiConfigModal(api) {
    const modal = document.getElementById('apiConfigModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('murekaApiKey').value = apiKeys.mureka;
      document.getElementById('sunoApiKey').value = apiKeys.suno;
    }
  }

  function renderMusicPlayer(audioUrl, title, engine, metadata = {}) {
    return `
      <div class="music-player-card">
        <h3>🎵 ${title}</h3>
        <div class="music-info">
          <span>引擎: ${engine}</span>
          ${metadata.style ? `<span>风格: ${metadata.style}</span>` : ''}
          ${metadata.duration ? `<span>时长: ${metadata.duration}秒</span>` : ''}
        </div>
        ${audioUrl ? `
          <audio controls autoplay>
            <source src="${audioUrl}" type="audio/mpeg">
            您的浏览器不支持音频播放
          </audio>
        ` : `
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
            <p>🎧 浏览器合成音乐 (无音频文件)</p>
            <button onclick="WebAudioEngine.stop()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer;">停止播放</button>
          </div>
        `}
      </div>
    `;
  }

  // ========== 获取DOM元素 ==========
  const statusBar = document.getElementById("statusBar");
  const tabButtons = document.querySelectorAll(".tabBtn");
  const modules = document.querySelectorAll(".module");
  
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
  const apiSelect = document.getElementById("apiSelect");
  
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
  
  const generateBtn = document.getElementById("generateBtn");
  const promptBtn = document.getElementById("promptBtn");
  const musicBtn = document.getElementById("musicBtn");
  const filterBtn = document.getElementById("filterBtn");
  const postBtn = document.getElementById("postBtn");
  const publishBtn = document.getElementById("publishBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");

  // ========== 加载数据 ==========
  loadFromStorage();

  // ========== 导航栏切换 ==========
  tabButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      const target = this.dataset.target;
      modules.forEach(m => m.style.display = (m.id === target) ? "block" : "none");
      tabButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      autoFillAndExecute(target);
      this.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      statusBar.innerHTML = `<p>📌 当前模块：${this.textContent}</p>`;
    });
  });

  // ========== 自动填充 ==========
  function autoFillAndExecute(moduleId) {
    switch(moduleId) {
      case "module2":
        if (pipelineData.task?.title) {
          promptInput.value = `${pipelineData.task.title} / ${pipelineData.task.mood} / ${pipelineData.task.scene} / BPM:${pipelineData.task.bpm}`;
          showDependencyHint("module2", `📋 已读取任务单: "${pipelineData.task.title}"`, "success");
        }
        break;
      case "module3":
        if (pipelineData.prompt?.text) {
          melodyInput.value = pipelineData.prompt.text;
          showDependencyHint("module3", `💬 已读取Prompt: "${pipelineData.prompt.text.substring(0, 30)}..."`, "success");
        }
        break;
      case "module4":
        if (pipelineData.music?.id) {
          filterInput.value = pipelineData.music.id;
          showDependencyHint("module4", `🎵 已读取音乐ID: ${pipelineData.music.id}`, "success");
        }
        break;
      case "module6":
        if (pipelineData.task?.title) {
          publishTitle.value = pipelineData.task.title;
          showDependencyHint("module6", `📋 已读取标题: "${pipelineData.task.title}"`, "success");
        }
        break;
    }
  }

  // ========== 复制功能 ==========
  document.querySelectorAll(".copyBtn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.dataset.target;
      const element = document.getElementById(id);
      if (element) {
        navigator.clipboard.writeText(element.textContent).then(() => alert("✅ 复制成功！"));
      }
    });
  });

  // ========== 模块1：任务单 ==========
  if (generateBtn) {
    generateBtn.addEventListener("click", function() {
      pipelineData.task = {
        id: `TASK-${Date.now().toString().slice(-6)}`,
        title: titleInput?.value || "未填写",
        mood: moodInput?.value || "未填写",
        bpm: bpmInput?.value || "120",
        scene: sceneInput?.value || "未填写",
        tags: tagsInput?.value || "未填写",
        notes: notesInput?.value || "未填写",
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">📋</span>
            <h3 style="margin: 0;">任务单 ${pipelineData.task.id}</h3>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>主题:</strong> ${pipelineData.task.title}</div>
            <div><strong>情绪:</strong> ${pipelineData.task.mood}</div>
            <div><strong>BPM:</strong> ${pipelineData.task.bpm}</div>
            <div><strong>场景:</strong> ${pipelineData.task.scene}</div>
            <div style="grid-column: span 2;"><strong>标签:</strong> ${pipelineData.task.tags}</div>
          </div>
        </div>
      `;
      
      outputBox.innerHTML = cardHTML;
      pipelineData.task.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = `<p>✅ 任务单已生成 (${pipelineData.task.id})</p>`;
    });
  }

  // ========== 模块2：Prompt ==========
  if (promptBtn) {
    promptBtn.addEventListener("click", function() {
      if (!pipelineData.task?.title) {
        showDependencyHint("module2", "❌ 请先生成任务单", "error");
        return;
      }
      
      pipelineData.prompt = {
        id: `PROMPT-${Date.now().toString().slice(-6)}`,
        text: promptInput?.value || `${pipelineData.task.title} / ${pipelineData.task.mood}`,
        source: "手动输入",
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">💬</span>
            <h3 style="margin: 0;">Prompt</h3>
          </div>
          <div style="background: #f0f7ff; padding: 16px; border-radius: 8px;">
            ${pipelineData.prompt.text}
          </div>
        </div>
      `;
      
      promptOutput.innerHTML = cardHTML;
      pipelineData.prompt.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = "<p>✅ Prompt已生成</p>";
    });
  }

  // ========== 模块3：音乐生成（多引擎）==========
  if (musicBtn) {
    musicBtn.addEventListener("click", async function() {
      const engine = apiSelect?.value || 'webaudio';
      const melody = melodyInput?.value || pipelineData.prompt?.text || "轻快的旋律";
      const style = styleSelect?.value || 'pop';
      const styleNames = { pop: '流行', rock: '摇滚', jazz: '爵士', classical: '古典', electronic: '电子', hiphop: '嘻哈' };
      
      statusBar.innerHTML = `<p>⏳ 正在使用${engine}生成音乐...</p>`;
      musicOutput.innerHTML = `<div class="loading-animation"><div class="spinner"></div><p>音乐生成中...</p></div>`;
      
      let result;
      switch(engine) {
        case 'webaudio':
          result = WebAudioEngine.generate({
            bpm: pipelineData.task?.bpm,
            style: style,
            mood: pipelineData.task?.mood
          });
          break;
        case 'mureka':
          result = await MurekaAI.generate({
            prompt: melody,
            style: style,
            title: pipelineData.task?.title || '未命名',
            bpm: pipelineData.task?.bpm,
            mood: pipelineData.task?.mood
          });
          break;
        case 'suno':
          result = await SunoAI.generate({
            prompt: melody,
            style: style,
            title: pipelineData.task?.title || '未命名'
          });
          break;
        case 'library':
          const track = MusicLibrary.findMatch({ style, mood: pipelineData.task?.mood });
          result = {
            success: true,
            audioUrl: track.url,
            title: track.name,
            duration: track.duration
          };
          break;
      }
      
      if (result.success) {
        const musicId = `MUSIC-${Date.now().toString().slice(-6)}`;
        
        pipelineData.music = {
          id: musicId,
          melody: melody,
          style: style,
          styleName: styleNames[style],
          url: result.audioUrl,
          engine: engine,
          time: Date.now()
        };
        
        const playerHTML = renderMusicPlayer(
          result.audioUrl, 
          result.title || pipelineData.task?.title || '生成的音乐',
          engine,
          { style: styleNames[style], duration: result.duration }
        );
        
        musicOutput.innerHTML = playerHTML;
        pipelineData.music.output = playerHTML;
        saveToStorage();
        statusBar.innerHTML = `<p>✅ 音乐生成完成！</p>`;
      } else {
        musicOutput.innerHTML = `<div style="color: #dc3545; padding: 20px;">❌ 生成失败: ${result.error}</div>`;
        statusBar.innerHTML = `<p>❌ 生成失败</p>`;
      }
    });
  }

  // ========== 模块4：筛选 ==========
  if (filterBtn) {
    filterBtn.addEventListener("click", function() {
      const score = Math.floor(Math.random() * 30 + 70);
      const passed = score >= 75;
      
      pipelineData.filter = {
        id: `FILTER-${Date.now().toString().slice(-6)}`,
        taskId: filterInput?.value || pipelineData.music?.id || "未指定",
        condition: filterSelect?.value,
        conditionName: { quality: '质量', length: '长度', style: '风格' }[filterSelect?.value],
        score: score,
        passed: passed,
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">🔍</span>
            <h3 style="margin: 0;">筛选结果</h3>
          </div>
          <div><strong>任务ID:</strong> ${pipelineData.filter.taskId}</div>
          <div><strong>评分:</strong> <span style="color: ${passed ? '#28a745' : '#dc3545'}; font-size: 24px;">${score}</span></div>
          <div><strong>状态:</strong> ${passed ? '✅ 通过' : '❌ 未通过'}</div>
        </div>
      `;
      
      filterOutput.innerHTML = cardHTML;
      pipelineData.filter.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = `<p>✅ 筛选完成，${passed ? '通过' : '未通过'}</p>`;
    });
  }

  // ========== 模块5：后期处理 ==========
  if (postBtn) {
    postBtn.addEventListener("click", function() {
      const fileName = postFile?.files?.[0]?.name || pipelineData.music?.melody || "demo.wav";
      
      pipelineData.post = {
        id: `POST-${Date.now().toString().slice(-6)}`,
        fileName: fileName,
        process: postSelect?.value,
        processName: { mix: '混音', master: '母带', effect: '加效果' }[postSelect?.value],
        outputFile: `processed_${fileName}`,
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">🎛</span>
            <h3 style="margin: 0;">后期处理完成</h3>
          </div>
          <div><strong>文件:</strong> ${pipelineData.post.fileName}</div>
          <div><strong>处理:</strong> ${pipelineData.post.processName}</div>
          <div><strong>输出:</strong> ${pipelineData.post.outputFile}</div>
        </div>
      `;
      
      postOutput.innerHTML = cardHTML;
      pipelineData.post.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = "<p>✅ 后期处理完成</p>";
    });
  }

  // ========== 模块6：发布 ==========
  if (publishBtn) {
    publishBtn.addEventListener("click", function() {
      const publishId = `PUB-${Date.now().toString().slice(-6)}`;
      const platforms = { netease: '网易云音乐', qqmusic: 'QQ音乐', spotify: 'Spotify' };
      
      pipelineData.publish = {
        id: publishId,
        title: publishTitle?.value || pipelineData.task?.title || "未命名",
        platform: publishSelect?.value,
        platformName: platforms[publishSelect?.value],
        url: `https://music.example/${publishSelect?.value}/${publishId}`,
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">📢</span>
            <h3 style="margin: 0;">发布成功</h3>
          </div>
          <div><strong>作品:</strong> ${pipelineData.publish.title}</div>
          <div><strong>平台:</strong> ${pipelineData.publish.platformName}</div>
          <div><strong>链接:</strong> <a href="${pipelineData.publish.url}" target="_blank">查看</a></div>
        </div>
      `;
      
      publishOutput.innerHTML = cardHTML;
      pipelineData.publish.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = "<p>✅ 发布成功</p>";
    });
  }

  // ========== 模块7：归档 ==========
  if (archiveBtn) {
    archiveBtn.addEventListener("click", function() {
      pipelineData.archive = {
        id: `ARC-${Date.now().toString().slice(-6)}`,
        archiveId: archiveInput?.value || pipelineData.publish?.id || "未指定",
        path: `/archive/2025/${archiveInput?.value || Date.now()}`,
        time: new Date().toLocaleString()
      };
      
      const cardHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 28px; margin-right: 12px;">📦</span>
            <h3 style="margin: 0;">归档完成</h3>
          </div>
          <div><strong>归档ID:</strong> ${pipelineData.archive.archiveId}</div>
          <div><strong>位置:</strong> ${pipelineData.archive.path}</div>
        </div>
      `;
      
      archiveOutput.innerHTML = cardHTML;
      pipelineData.archive.output = cardHTML;
      saveToStorage();
      statusBar.innerHTML = "<p>✅ 归档完成</p>";
    });
  }

  // ========== 一键运行流水线 ==========
  if (runPipelineBtn) {
    runPipelineBtn.addEventListener("click", function() {
      const steps = [
        { id: "module1", action: () => {
          titleInput.value = "夏日协奏曲";
          moodInput.value = "欢快";
          bpmInput.value = "120";
          sceneInput.value = "海边";
          tagsInput.value = "钢琴,电子";
          generateBtn.click();
        }, name: "任务单" },
        { id: "module2", action: () => { autoFillAndExecute("module2"); setTimeout(() => promptBtn.click(), 500); }, name: "Prompt" },
        { id: "module3", action: () => { autoFillAndExecute("module3"); setTimeout(() => musicBtn.click(), 500); }, name: "音乐" },
        { id: "module4", action: () => { autoFillAndExecute("module4"); setTimeout(() => filterBtn.click(), 500); }, name: "筛选" },
        { id: "module5", action: () => setTimeout(() => postBtn.click(), 500), name: "后期" },
        { id: "module6", action: () => { autoFillAndExecute("module6"); setTimeout(() => publishBtn.click(), 500); }, name: "发布" },
        { id: "module7", action: () => setTimeout(() => archiveBtn.click(), 500), name: "归档" }
      ];
      
      let i = 0;
      function next() {
        if (i >= steps.length) {
          statusBar.innerHTML = "<p>✅ 流水线执行完成</p>";
          return;
        }
        const step = steps[i];
        modules.forEach(m => m.style.display = m.id === step.id ? "block" : "none");
        tabButtons.forEach(b => b.classList.toggle("active", b.dataset.target === step.id));
        statusBar.innerHTML = `<p>▶ 执行: ${step.name}</p>`;
        step.action();
        i++;
        setTimeout(next, 2000);
      }
      next();
    });
  }

  // ========== API配置模态框 ==========
  const modal = document.getElementById('apiConfigModal');
  const closeBtn = document.querySelector('.close');
  const saveBtn = document.getElementById('saveApiKeys');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      apiKeys.mureka = document.getElementById('murekaApiKey').value;
      apiKeys.suno = document.getElementById('sunoApiKey').value;
      localStorage.setItem('murekaApiKey', apiKeys.mureka);
      localStorage.setItem('sunoApiKey', apiKeys.suno);
      modal.style.display = 'none';
      alert('✅ API密钥已保存');
    });
  }
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // ========== 初始化状态 ==========
  if (statusBar) {
    statusBar.innerHTML = "<p>✨ 音乐工厂就绪 - 支持Web Audio/Mureka/Suno/预置库</p>";
  }

  // ========== 页面关闭前保存 ==========
  window.addEventListener('beforeunload', saveToStorage);
});