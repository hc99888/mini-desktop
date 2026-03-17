// app.js - 简化修复版
document.addEventListener("DOMContentLoaded", function() {
  console.log("音乐工厂 - 简化版已启动");

  // ========== 数据结构 ==========
  let pipelineData = {
    task: { id: null, title: "", mood: "", bpm: "", scene: "", tags: "", notes: "", time: null, output: "" },
    prompt: { id: null, text: "", source: "", time: null, output: "" },
    music: { id: null, melody: "", style: "", styleName: "", url: "", engine: "", time: null, output: "" },
    filter: { id: null, taskId: "", condition: "", conditionName: "", score: 0, passed: false, time: null, output: "" },
    post: { id: null, fileName: "", process: "", processName: "", outputFile: "", time: null, output: "" },
    publish: { id: null, title: "", platform: "", platformName: "", url: "", time: null, output: "" },
    archive: { id: null, archiveId: "", path: "", time: null, output: "" }
  };

  // ========== 预置音乐库 ==========
  const MusicLibrary = {
    tracks: [
      { id: 'lib1', name: '夏日微风', mood: '欢快', style: 'pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { id: 'lib2', name: '雨夜沉思', mood: '平静', style: 'classical', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { id: 'lib3', name: '激情摇滚', mood: '激昂', style: 'rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
    ],
    findMatch(style) {
      return this.tracks.find(t => t.style === style) || this.tracks[0];
    }
  };

  // ========== Web Audio引擎 ==========
  const WebAudioEngine = {
    context: null,
    generate(params) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const bpm = parseInt(params.bpm) || 120;
        const notes = [261.63, 293.66, 329.63, 349.23];
        const duration = 60 / bpm;
        
        let time = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.2, time + index * duration);
            gain.gain.exponentialRampToValueAtTime(0.01, time + (index + 1) * duration);
            osc.start(time + index * duration);
            osc.stop(time + (index + 1) * duration);
          });
          time += notes.length * duration;
        }
        return { success: true, message: 'Web Audio播放中' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  };

  // ========== 获取元素 ==========
  const statusBar = document.getElementById("statusBar");
  const tabButtons = document.querySelectorAll(".tabBtn");
  const modules = document.querySelectorAll(".module");
  
  const titleInput = document.getElementById("titleInput");
  const moodInput = document.getElementById("moodInput");
  const bpmInput = document.getElementById("bpmInput");
  const outputBox = document.getElementById("outputBox");
  
  const promptInput = document.getElementById("promptInput");
  const promptOutput = document.getElementById("promptOutput");
  
  const melodyInput = document.getElementById("melodyInput");
  const styleSelect = document.getElementById("styleSelect");
  const musicOutput = document.getElementById("musicOutput");
  const apiSelect = document.getElementById("apiSelect");
  
  const generateBtn = document.getElementById("generateBtn");
  const promptBtn = document.getElementById("promptBtn");
  const musicBtn = document.getElementById("musicBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");

  console.log('API Select found:', !!apiSelect);
  console.log('Music Btn found:', !!musicBtn);

  // ========== 导航栏切换 ==========
  tabButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      const target = this.dataset.target;
      modules.forEach(m => m.style.display = m.id === target ? "block" : "none");
      tabButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      if (statusBar) statusBar.innerHTML = `<p>📌 当前模块：${this.textContent}</p>`;
    });
  });

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
        time: new Date().toLocaleString()
      };
      
      outputBox.innerHTML = `
        <div style="padding: 10px;">
          <h3>任务单 ${pipelineData.task.id}</h3>
          <p>主题: ${pipelineData.task.title}</p>
          <p>情绪: ${pipelineData.task.mood}</p>
          <p>BPM: ${pipelineData.task.bpm}</p>
        </div>
      `;
      
      if (statusBar) statusBar.innerHTML = "<p>✅ 任务单已生成</p>";
    });
  }

  // ========== 模块2：Prompt ==========
  if (promptBtn) {
    promptBtn.addEventListener("click", function() {
      pipelineData.prompt = {
        id: `PROMPT-${Date.now().toString().slice(-6)}`,
        text: promptInput?.value || "默认提示词",
        time: new Date().toLocaleString()
      };
      
      promptOutput.innerHTML = `
        <div style="padding: 10px; background: #f0f7ff;">
          <p>${pipelineData.prompt.text}</p>
        </div>
      `;
      
      if (statusBar) statusBar.innerHTML = "<p>✅ Prompt已生成</p>";
    });
  }

  // ========== 模块3：音乐生成（修复版）==========
  if (musicBtn) {
    musicBtn.addEventListener("click", async function() {
      // 获取选中的引擎
      const engine = apiSelect ? apiSelect.value : 'library';
      const style = styleSelect?.value || 'pop';
      const styleNames = { pop: '流行', rock: '摇滚', jazz: '爵士', classical: '古典' };
      
      console.log('使用引擎:', engine);
      
      if (statusBar) statusBar.innerHTML = `<p>⏳ 使用${engine}引擎生成音乐...</p>`;
      
      musicOutput.innerHTML = '<div style="text-align: center; padding: 20px;">⏳ 生成中...</div>';
      
      let result;
      
      switch(engine) {
        case 'webaudio':
          result = WebAudioEngine.generate({ bpm: pipelineData.task?.bpm });
          break;
        case 'library':
          await new Promise(r => setTimeout(r, 1000));
          const track = MusicLibrary.findMatch(style);
          result = { success: true, audioUrl: track.url, title: track.name };
          break;
        default:
          await new Promise(r => setTimeout(r, 1500));
          result = { 
            success: true, 
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            title: `${engine}音乐`
          };
      }
      
      if (result.success) {
        pipelineData.music = {
          id: `MUSIC-${Date.now().toString().slice(-6)}`,
          melody: melodyInput?.value || '默认旋律',
          style: style,
          styleName: styleNames[style],
          url: result.audioUrl,
          engine: engine,
          time: Date.now()
        };
        
        if (result.audioUrl) {
          musicOutput.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 12px; color: white;">
              <h3>🎵 ${result.title || '生成的音乐'}</h3>
              <p>引擎: ${engine} | 风格: ${styleNames[style]}</p>
              <audio controls style="width: 100%; margin-top: 15px;">
                <source src="${result.audioUrl}" type="audio/mpeg">
              </audio>
            </div>
          `;
        } else {
          musicOutput.innerHTML = `
            <div style="background: #1a1a2e; padding: 20px; border-radius: 12px; color: white;">
              <h3>🎵 Web Audio 合成音乐</h3>
              <p>正在播放中...</p>
              <button onclick="location.reload()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 20px;">停止</button>
            </div>
          `;
        }
        
        if (statusBar) statusBar.innerHTML = "<p>✅ 音乐生成完成！</p>";
      }
    });
  }

  // ========== 一键运行流水线 ==========
  if (runPipelineBtn) {
    runPipelineBtn.addEventListener("click", function() {
      // 自动填充任务单
      if (titleInput) titleInput.value = "夏日协奏曲";
      if (moodInput) moodInput.value = "欢快";
      if (bpmInput) bpmInput.value = "120";
      
      // 点击任务单
      setTimeout(() => generateBtn?.click(), 500);
      
      // 切换到Prompt模块
      setTimeout(() => {
        modules.forEach(m => m.style.display = m.id === 'module2' ? 'block' : 'none');
        tabButtons.forEach(b => {
          if (b.dataset.target === 'module2') b.classList.add('active');
          else b.classList.remove('active');
        });
        if (promptInput) promptInput.value = "轻快的钢琴旋律";
        setTimeout(() => promptBtn?.click(), 500);
      }, 1000);
      
      // 切换到音乐模块
      setTimeout(() => {
        modules.forEach(m => m.style.display = m.id === 'module3' ? 'block' : 'none');
        tabButtons.forEach(b => {
          if (b.dataset.target === 'module3') b.classList.add('active');
          else b.classList.remove('active');
        });
        // 设置引擎为预置库
        if (apiSelect) apiSelect.value = 'library';
        setTimeout(() => musicBtn?.click(), 500);
      }, 2000);
      
      if (statusBar) statusBar.innerHTML = "<p>🚀 流水线执行中...</p>";
    });
  }

  if (statusBar) statusBar.innerHTML = "<p>✨ 音乐工厂就绪 - API选择器在音乐生成模块</p>";
});