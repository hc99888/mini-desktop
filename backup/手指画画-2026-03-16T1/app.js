
    const canvas = document.getElementById('drawCanvas');
    const wrapper = document.getElementById('canvasWrapper');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');

    const ctx = canvas.getContext('2d');

    // 适配容器大小
    function resizeCanvas() {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawAll();
    }

    window.addEventListener('resize', resizeCanvas);
    
    // 存储所有图形（每个图形是一条折线）
    let shapes = [];
    // 当前正在绘制的点集合
    let currentPoints = [];
    let drawing = false;

    // 画布样式
    const strokeColor = '#38bdf8';
    const strokeWidth = 3;

    function startDrawing(x, y) {
      drawing = true;
      currentPoints = [{ x, y }];
      // 立即画一个点，让用户看到开始
      redrawAll();
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(x, y, strokeWidth/2, 0, Math.PI * 2);
      ctx.fill();
    }

    function continueDrawing(x, y) {
      if (!drawing) return;
      
      // 边界检查
      if (x < 0 || y < 0 || x > canvas.width / (window.devicePixelRatio || 1) || 
          y > canvas.height / (window.devicePixelRatio || 1)) {
        return;
      }
      
      const last = currentPoints[currentPoints.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist2 = dx * dx + dy * dy;
      
      // 简单降采样，避免点太密
      if (dist2 > 1) {
        currentPoints.push({ x, y });
        // 实时绘制当前路径
        redrawAll();
        if (currentPoints.length >= 2) {
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
          }
          ctx.stroke();
        }
      }
    }

    function endDrawing() {
      if (!drawing) return;
      drawing = false;
      
      if (currentPoints.length < 2) {
        currentPoints = [];
        redrawAll();
        return;
      }
      
      // 使用 Ramer–Douglas–Peucker 算法简化路径，得到折线
      const simplified = simplifyRDP(currentPoints, 3.0);
      
      // 至少保留两个点
      if (simplified.length >= 2) {
        shapes.push(simplified);
      }
      
      currentPoints = [];
      redrawAll();
      updateButtons();
    }

    function redrawAll() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 重画所有已完成的图形
      for (const shape of shapes) {
        if (shape.length < 2) continue;
        
        // 如果首尾距离很近，可以自动闭合（适合画三角形、矩形）
        const closed = shape.length >= 3 && isClose(shape[0], shape[shape.length - 1], 15);
        
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(shape[0].x, shape[0].y);
        
        for (let i = 1; i < shape.length; i++) {
          ctx.lineTo(shape[i].x, shape[i].y);
        }
        
        if (closed) {
          ctx.closePath();
        }
        ctx.stroke();
      }
    }

    function isClose(p1, p2, threshold) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy) <= threshold;
    }

    // Ramer–Douglas–Peucker 简化算法
    function simplifyRDP(points, epsilon) {
      if (points.length < 3) return points.slice();

      const first = points[0];
      const last = points[points.length - 1];

      let index = -1;
      let maxDist = 0;

      for (let i = 1; i < points.length - 1; i++) {
        const d = perpendicularDistance(points[i], first, last);
        if (d > maxDist) {
          index = i;
          maxDist = d;
        }
      }

      if (maxDist > epsilon) {
        const left = simplifyRDP(points.slice(0, index + 1), epsilon);
        const right = simplifyRDP(points.slice(index), epsilon);
        return left.slice(0, left.length - 1).concat(right);
      } else {
        return [first, last];
      }
    }

    function perpendicularDistance(p, p1, p2) {
      const x = p.x, y = p.y;
      const x1 = p1.x, y1 = p1.y;
      const x2 = p2.x, y2 = p2.y;

      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx === 0 && dy === 0) {
        return Math.hypot(x - x1, y - y1);
      }
      const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
      const tClamped = Math.max(0, Math.min(1, t));
      const projX = x1 + tClamped * dx;
      const projY = y1 + tClamped * dy;
      return Math.hypot(x - projX, y - projY);
    }

    // 事件坐标转换
    function getPosFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      let clientX, clientY;
      
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // 计算相对于 canvas 的坐标
      let x = (clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
      let y = (clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
      
      // 边界裁剪
      x = Math.max(0, Math.min(x, canvas.width / (window.devicePixelRatio || 1)));
      y = Math.max(0, Math.min(y, canvas.height / (window.devicePixelRatio || 1)));
      
      return { x, y };
    }

    // 鼠标事件
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const pos = getPosFromEvent(e);
      startDrawing(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      const pos = getPosFromEvent(e);
      continueDrawing(pos.x, pos.y);
    });

    canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      endDrawing();
    });

    canvas.addEventListener('mouseleave', () => {
      // 当鼠标离开画布时，结束当前绘制
      if (drawing) {
        endDrawing();
      }
    });

    // 触摸事件
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const pos = getPosFromEvent(e);
      startDrawing(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const pos = getPosFromEvent(e);
      continueDrawing(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      endDrawing();
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      endDrawing();
    }, { passive: false });

    // 撤销
    undoBtn.addEventListener('click', () => {
      if (shapes.length > 0) {
        shapes.pop();
        redrawAll();
        updateButtons();
      }
    });

    // 清空
    clearBtn.addEventListener('click', () => {
      shapes = [];
      currentPoints = [];
      drawing = false;
      redrawAll();
      updateButtons();
    });

    // 保存本地
    saveBtn.addEventListener('click', () => {
      // 为了得到视觉尺寸的图像，临时创建一个同尺寸画布
      const rect = wrapper.getBoundingClientRect();
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = rect.width;
      exportCanvas.height = rect.height;
      const ectx = exportCanvas.getContext('2d');

      ectx.fillStyle = '#020617';
      ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      ectx.lineJoin = 'round';
      ectx.lineCap = 'round';
      ectx.strokeStyle = strokeColor;
      ectx.lineWidth = strokeWidth;
      
      for (const shape of shapes) {
        if (shape.length < 2) continue;
        
        const closed = shape.length >= 3 && isClose(shape[0], shape[shape.length - 1], 15);
        ectx.beginPath();
        ectx.moveTo(shape[0].x, shape[0].y);
        for (let i = 1; i < shape.length; i++) {
          ectx.lineTo(shape[i].x, shape[i].y);
        }
        if (closed) ectx.closePath();
        ectx.stroke();
      }

      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });

    function updateButtons() {
      undoBtn.disabled = shapes.length === 0;
    }

    // 初始调整画布大小
    setTimeout(resizeCanvas, 10);
    updateButtons();
  