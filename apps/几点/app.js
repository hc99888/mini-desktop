
window.onerror = function(msg, url, line){
  var e = document.getElementById('err');
  e.style.display = 'block';
  e.textContent = '脚本错误：' + msg + ' （行 ' + line + '）';
  return false;
};

(function(){
'use strict';

var MEM = {};
var STORE = {
  get: function(k){ try { return localStorage.getItem(k); } catch(e){ return MEM[k] || null; } },
  set: function(k, v){ try { localStorage.setItem(k, v); } catch(e){ MEM[k] = v; } }
};

/* ==================== 数据 ====================
   rda   = 推荐摄入量（中国 DRIs）
   ideal = 理想摄取量（优化健康范围，参考 NIH ODS 与临床研究）
   upperLimit = 可耐受最高摄入量
================================================ */
var DATA = [
  {
    id:'vit-a', name:'维生素 A', alias:'视黄醇 / Retinol', type:'fat', hist:false,
    rda:'800 微克 RAE/日',
    ideal:'900 - 1500 微克 RAE/日',
    upperLimit:'3000 微克/日',
    roles:['合成视紫红质，维持暗光视力','维护上皮组织（皮肤、黏膜）完整性','参与糖蛋白合成与生长发育'],
    deficiency:[
      {part:'眼睛', items:['夜盲症','干眼病','角膜软化，严重可致失明']},
      {part:'皮肤', items:['毛囊周围角化过度（鸡皮疙瘩样）','皮肤干燥粗糙']},
      {part:'免疫/生长', items:['免疫力下降','儿童生长发育迟缓']}
    ],
    sources:['动物肝脏','鱼肝油','蛋黄','黄油','胡萝卜','南瓜','菠菜'],
    excess:['长期超量可致头痛、肝损伤、骨痛','孕期过量有致畸风险'],
    keywords:[
      '夜盲','夜盲症','晚上看不清','暗光看不清','看不清','视力下降','夜视力差',
      '干眼','干眼症','眼干','眼涩','眼睛干','角膜软化','角膜干燥','毕脱斑','畏光','流泪',
      '鸡皮疙瘩','毛囊角化','毛囊角化过度','皮肤干燥','皮肤粗糙','皮肤脱屑','皮屑多',
      '免疫力低','容易感冒','反复感染','呼吸道感染','容易生病',
      '生长发育慢','不长个','个子矮','发育迟缓',
      '味觉减退','嗅觉减退','食欲不振','脱发','头皮屑'
    ],
    note:'孕期需遵医嘱，避免过量补充。',
    labRef:[{label:'维生素 A', range:'325-780', unit:'ng/mL'}]
  },
  {
    id:'vit-c', name:'维生素 C', alias:'抗坏血酸 / Ascorbic Acid', type:'water', hist:false,
    rda:'100 毫克/日',
    ideal:'200 - 500 毫克/日',
    upperLimit:'2000 毫克/日',
    roles:['胶原合成（维持皮肤、血管、骨骼、牙齿健康）','抗氧化','促进铁吸收','支持免疫功能','参与肉碱、激素和氨基酸合成'],
    deficiency:[
      {part:'皮肤', items:['早期：倦怠、乏力、易激惹','体重丢失','不明确的肌痛与关节痛']},
      {part:'口腔', items:['进展期：毛囊过度角化、头发卷曲','毛囊周围出血','牙龈肿胀、发紫、水肿、易出血','牙齿松动脱落']},
      {part:'血液', items:['严重期：皮下出血（瘀斑）','关节内出血','伤口愈合不良、自发性出血','儿童骨骼生长受损']}
    ],
    sources:['柑橘类水果','番茄','土豆','西兰花','草莓','甜椒'],
    excess:['腹泻、胃肠不适','大剂量增加肾结石风险','可能干扰某些化验结果'],
    keywords:[
      '坏血病','牙龈出血','牙龈肿','牙龈肿胀','牙龈红肿','牙龈痛','牙龈炎','牙周炎','牙齿松动','牙齿脱落',
      '淤青','瘀斑','容易淤青','皮下出血','皮下瘀血','容易出血','流鼻血','鼻出血',
      '伤口难愈','伤口愈合慢','伤口愈合慢','伤口不愈合','术后恢复慢',
      '关节痛','关节疼','关节肿','肌肉酸痛','肌肉痛',
      '毛囊出血','毛囊角化','皮肤干燥','皮肤暗沉','皮肤松弛','皱纹','色斑','雀斑','黄褐斑',
      '容易感冒','免疫力低','反复感染','抵抗力差','经常生病',
      '贫血','铁吸收差','缺铁','疲劳','乏力','容易累','倦怠','精神不振',
      '骨质疏松','牙齿出血','牙龈萎缩','口腔溃疡','口臭','毛细血管脆','容易磕青'
    ],
    note:'加热会破坏食物中部分维生素 C。',
    labRef:[{label:'维生素 C', range:'2-20', unit:'ug/mL'}]
  },
  {
    id:'vit-d', name:'维生素 D', alias:'胆钙化醇 / Calciferol', type:'fat', hist:false,
    rda:'10 - 20 微克（400 - 800 IU）/日',
    ideal:'30 - 50 微克（1200 - 2000 IU）/日',
    upperLimit:'100 微克（4000 IU）/日',
    roles:['促进肠道对钙、磷的吸收','维持血钙磷平衡，保障骨骼正常矿化','调节免疫功能'],
    deficiency:[
      {part:'儿童', items:['佝偻病：X形腿或O形腿、鸡胸、肋外翻','出牙和囟门闭合推迟','早期易激惹、夜间烦躁、多汗、枕秃']},
      {part:'成人', items:['骨软化症、骨质疏松','腰背疼痛、肌无力、抽筋']},
      {part:'神经', items:['抑郁、无精打采、易激怒']}
    ],
    sources:['日光照射（皮肤合成）','鱼肝油','鲑鱼','鲭鱼','强化奶制品'],
    excess:['高钙血症：恶心、呕吐、多尿','肾结石风险增加','软组织钙化'],
    keywords:[
      '腰背痛','腰酸','腰疼','背痛','骨头疼','骨头痛','关节痛','关节响','膝盖疼','腿疼',
      '抽筋','腿抽筋','夜间抽筋','肌肉痉挛','小腿抽筋','脚抽筋','手脚抽筋',
      '佝偻病','O形腿','X形腿','鸡胸','肋外翻','方颅','肋骨串珠','漏斗胸',
      '骨软化','骨质疏松','容易骨折','骨头脆','骨质流失','骨密度低',
      '多汗','夜间盗汗','枕秃','出牙晚','囟门迟闭','长牙慢','换牙慢',
      '肌无力','肌肉无力','腿软','走路没劲','爬楼费劲','蹲下起不来',
      '抑郁','情绪低落','无精打采','易怒','易激惹','烦躁','情绪不稳','心情差',
      '免疫力低','容易感冒','反复感染','自身免疫',
      '脱发','掉发','头发稀疏','睡眠差','失眠','疲劳','容易累','慢性疲劳',
      '生长迟缓','个子矮','不长个','发育慢'
    ],
    note:'成人约 80% 的腰背疼与缺乏维生素 D 相关。',
    labRef:[
      {label:'维生素 D2', range:'-', unit:'ng/mL'},
      {label:'维生素 D3', range:'-', unit:'ng/mL'},
      {label:'维生素 D（总）', range:'30.01-100', unit:'ng/mL'}
    ]
  },
  {
    id:'vit-e', name:'维生素 E', alias:'生育酚 / Tocopherol', type:'fat', hist:false,
    rda:'14 毫克 α-TE/日',
    ideal:'15 - 30 毫克 α-TE/日',
    upperLimit:'700 毫克/日',
    roles:['抗氧化，保护细胞膜免受自由基损伤','维持红细胞稳定性','保护神经系统'],
    deficiency:[
      {part:'血液', items:['轻度溶血性贫血（红细胞脆性增加）']},
      {part:'神经', items:['反射减弱或消失','共济失调、行走困难、肌肉无力','位置觉丧失（不用眼睛看就不知道肢体在哪）']},
      {part:'眼睛', items:['眼肌麻痹、视野障碍（严重时）']}
    ],
    sources:['植物油','坚果','种子','绿叶蔬菜'],
    excess:['大剂量可能增加出血风险','干扰维生素 K 代谢'],
    keywords:[
      '溶血性贫血','贫血','红细胞脆','脸色苍白','面色萎黄',
      '共济失调','走路不稳','走路摇晃','平衡差','位置觉','动作不协调',
      '肌肉无力','肌肉萎缩','肌无力','四肢无力','腿没劲',
      '眼肌麻痹','视野障碍','视力模糊',
      '反射减弱','神经麻木','手脚麻木','神经炎',
      '不孕','不育','习惯性流产','备孕困难',
      '皮肤老化','皮肤松弛','皱纹','色斑','老年斑','皮肤暗沉','抗氧化',
      '脱发','掉发','头发干枯','头发分叉','头发黄','白头发','头发早白',
      '免疫力低','容易感冒','体力下降','易疲劳'
    ],
    note:'单纯饮食缺乏罕见，多见于脂肪吸收障碍患者。',
    labRef:[{label:'维生素 E', range:'5-18', unit:'ug/mL'}]
  },
  {
    id:'vit-b1', name:'维生素 B1', alias:'硫胺素 / Thiamine', type:'water', hist:false,
    rda:'1.1 - 1.2 毫克/日',
    ideal:'1.5 - 5 毫克/日',
    upperLimit:'未设定',
    roles:['参与碳水化合物、脂肪和酒精的代谢','维持中枢和外周神经系统功能','保障心肌功能'],
    deficiency:[
      {part:'神经', items:['干性脚气病：周围神经病变，下肢为主','脚趾感觉异常、足部烧灼感（夜间加重）','腓肠肌痉挛、腿痛、足底感觉障碍']},
      {part:'血液', items:['湿性脚气病：心血管系统受累','可致心力衰竭、全身浮肿']},
      {part:'神经', items:['韦尼克-科尔萨科夫综合征：精神错乱、共济失调、眼肌麻痹、假记忆']}
    ],
    sources:['全麦','猪肉','动物肝脏','坚果','豆类','土豆'],
    excess:['水溶性，过量经尿排出','注射极罕见可致过敏性休克'],
    keywords:[
      '脚气病','脚气','脚气重','脚臭','脚痒','脚脱皮','脚趾麻木','脚麻','脚肿','脚痛','脚烧灼',
      '足部烧灼','足底麻木','腓肠肌痉挛','小腿抽筋','腿痛','腿麻','腿沉',
      '共济失调','走路不稳','平衡差','动作不协调',
      '精神错乱','意识模糊','记忆力下降','健忘','反应迟钝','注意力不集中','脑雾',
      '食欲不振','食欲差','消化不良','胃胀','腹胀','便秘','恶心','呕吐',
      '心慌','心悸','心跳快','气短','胸闷','心脏不适','心衰','水肿','浮肿',
      '情绪低落','抑郁','烦躁','易怒','焦虑','失眠','多梦','睡不好',
      '疲劳','乏力','容易累','提不起精神','倦怠','没力气',
      '韦尼克综合征','科尔萨科夫综合征','眼肌麻痹','眼球震颤',
      '手麻','手指麻','口周麻木','末梢神经炎'
    ],
    note:'多见于酒精使用障碍者。',
    labRef:[{label:'维生素 B1', range:'2.4-9.02', unit:'ng/mL'}]
  },
  {
    id:'vit-b2', name:'维生素 B2', alias:'核黄素 / Riboflavin', type:'water', hist:false,
    rda:'1.1 - 1.3 毫克/日',
    ideal:'1.5 - 5 毫克/日',
    upperLimit:'未设定',
    roles:['参与糖和蛋白质代谢的氧化还原反应','维持黏膜完整性'],
    deficiency:[
      {part:'口腔', items:['口角炎：嘴角黏膜苍白、浸渍、开裂','唇炎：唇红缘浸渍，形成表浅线性裂隙','舌炎：舌头疼痛，可能变成紫红色']},
      {part:'眼睛', items:['角膜血管化','眼睛瘙痒烧灼感']},
      {part:'皮肤', items:['脂溢性皮炎','阴囊皮炎（口腔生殖系统综合征）']}
    ],
    sources:['牛奶','奶酪','动物肝脏','肉类','鸡蛋','强化谷类'],
    excess:['水溶性，过量经尿排出','尿液呈亮黄色属正常现象'],
    keywords:[
      '口角炎','嘴角裂','嘴角开裂','烂嘴角','口角裂','口角痛','口角湿白',
      '唇炎','嘴唇干裂','嘴唇脱皮','嘴唇裂','唇红缘裂','唇干',
      '舌炎','舌头疼','舌头红','舌头紫红','舌乳头萎缩','舌面光滑','地图舌','口腔溃疡','口疮','口臭','嘴里发苦',
      '角膜血管化','眼睛痒','眼痒','眼睛烧灼','眼睛干','畏光','流泪','眼睛红','结膜充血','眼睑炎',
      '脂溢性皮炎','头皮屑','头皮痒','头皮油','脱发','头发油','发际线后移',
      '阴囊皮炎','阴囊痒','会阴痒','生殖器皮炎',
      '皮肤油腻','鼻翼油','酒糟鼻','面部皮炎','皮肤脱屑',
      '贫血','缺铁性贫血','疲劳','乏力','口唇苍白'
    ],
    note:'典型口腔生殖系统综合征。',
    labRef:[{label:'维生素 B2', range:'2.33-14.69', unit:'ng/mL'}]
  },
  {
    id:'vit-b6', name:'维生素 B6', alias:'吡哆醇 / Pyridoxine', type:'water', hist:false,
    rda:'1.3 - 1.7 毫克/日',
    ideal:'2 - 10 毫克/日',
    upperLimit:'100 毫克/日',
    roles:['参与氮代谢（转氨基、卟啉和亚铁血红素合成）','参与神经递质合成','参与脂肪酸和脂质代谢'],
    deficiency:[
      {part:'皮肤', items:['脂溢性皮炎','油腻性红色鳞屑状皮疹']},
      {part:'口腔', items:['舌红有溃疡','口角皲裂']},
      {part:'神经', items:['手脚麻木、刺痛和针刺感','意识障碍、烦躁','可能发生癫痫发作']},
      {part:'血液', items:['小细胞性贫血（罕见，多与其他 B 族缺乏并存）']}
    ],
    sources:['动物内脏（肝）','全麦谷类','鱼','豆类'],
    excess:['长期大剂量可致周围神经病变','手脚麻木、行走不稳'],
    keywords:[
      '脂溢性皮炎','皮肤油','头皮屑','头皮痒','脱发','掉发','头发油',
      '舌红','舌头疼','口腔溃疡','口疮','口角皲裂','嘴角裂','口臭','嘴唇干',
      '手脚麻木','手麻','脚麻','手指麻','脚趾麻','刺痛','针刺感','蚁走感','烧灼感','末梢神经炎',
      '意识障碍','烦躁','易怒','情绪不稳','焦虑','抑郁','情绪低落','神经质',
      '癫痫','抽搐','惊厥','痉挛',
      '贫血','小细胞性贫血','疲劳','乏力',
      '经前综合征','PMS','经前烦躁','痛经','月经不调','孕吐','妊娠呕吐','晨吐',
      '晕车','晕船','晕机','恶心','呕吐',
      '失眠','多梦','睡不好','睡眠差','早醒','易醒',
      '抑郁','情绪低落','注意力不集中','记忆力下降',
      '口唇干裂','唇炎','嘴角痛','舌裂'
    ],
    note:'长期大剂量补充反而可能引起神经病变。',
    labRef:[{label:'维生素 B6', range:'4.9-30.9', unit:'ng/mL'}]
  },
  {
    id:'vit-b12', name:'维生素 B12', alias:'钴胺素 / Cobalamin', type:'water', hist:false,
    rda:'2.4 微克/日',
    ideal:'10 - 50 微克/日',
    upperLimit:'未设定',
    roles:['红细胞成熟','神经功能维护','DNA 合成','髓鞘合成与修复'],
    deficiency:[
      {part:'血液', items:['巨幼细胞性贫血：面色苍白、乏力、气促、头晕']},
      {part:'神经', items:['手脚刺痛或感觉丧失','肌肉无力、反射消失、行走困难（踩棉花感）','严重者意识错乱、痴呆']},
      {part:'神经', items:['亚急性联合变性：脊髓后索和侧索受累','深感觉缺失、感觉性共济失调']}
    ],
    sources:['肉类（牛肉、猪肉、动物肝脏）','家禽','鸡蛋','奶制品','蛤','牡蛎','鲑鱼'],
    excess:['水溶性，过量经尿排出','一般无明显毒性'],
    keywords:[
      '巨幼细胞性贫血','贫血','面色苍白','脸色蜡黄','嘴唇苍白','指甲苍白','睑结膜苍白',
      '手脚麻木','手麻','脚麻','手指麻','脚趾麻','刺痛','针刺感','烧灼感','感觉丧失','感觉减退',
      '行走困难','走路不稳','踩棉花','踩棉花感','平衡差','共济失调','容易摔倒',
      '肌肉无力','肌无力','腿软','腿没劲','爬楼困难',
      '痴呆','记忆减退','记忆力下降','健忘','反应迟钝','脑雾','认知下降','老年痴呆',
      '意识错乱','精神异常','幻觉','妄想','抑郁','情绪低落','易怒','烦躁',
      '舌头发红','舌面光滑','舌乳头萎缩','舌头疼','味觉减退','食欲不振','消化不良',
      '白头发','头发早白','头发变白','少白头','脱发','掉发',
      '疲劳','乏力','容易累','倦怠','嗜睡','精神不振','头晕','头昏','心悸','气短',
      '体重下降','消瘦','口疮','舌炎'
    ],
    note:'严格素食者缺乏风险极高。',
    labRef:[{label:'维生素 B12', range:'0.232-1.245', unit:'ng/mL'}]
  },
  {
    id:'vit-b9', name:'维生素 B9', alias:'叶酸 / Folate', type:'water', hist:false,
    rda:'400 微克 DFE/日（孕期 600 微克）',
    ideal:'400 - 800 微克 DFE/日',
    upperLimit:'1000 微克/日',
    roles:['红细胞成熟','嘌呤、嘧啶和蛋氨酸合成','胎儿神经系统发育（孕早期极为关键）'],
    deficiency:[
      {part:'血液', items:['巨幼细胞性贫血：疲劳、虚弱、苍白、气短']},
      {part:'口腔', items:['食欲减退、腹胀腹泻','舌炎舌痛、舌乳头萎缩']},
      {part:'其他', items:['孕期风险：神经管出生缺陷（脊柱裂等）']},
      {part:'神经', items:['易怒、情感障碍']}
    ],
    sources:['生的绿叶蔬菜','水果','动物内脏（肝）','强化谷物和面包'],
    excess:['掩盖维生素 B12 缺乏的贫血表现','可能影响锌吸收'],
    keywords:[
      '巨幼细胞性贫血','贫血','面色苍白','脸色苍白','睑结膜苍白','疲乏',
      '疲劳','乏力','容易累','倦怠','气短','心悸','头晕',
      '舌炎','舌痛','舌头疼','舌乳头萎缩','舌面光滑','口腔溃疡','口疮','口臭',
      '食欲减退','食欲差','腹胀','腹泻','消化不良','恶心',
      '脊柱裂','神经管缺陷','孕期','备孕','怀孕','胎儿畸形',
      '易怒','烦躁','情绪不稳','抑郁','情绪低落','情感障碍','焦虑','失眠',
      '白头发','头发早白','少白头','头发枯黄','脱发','掉发',
      '记忆力下降','健忘','注意力不集中','脑雾',
      '生长迟缓','发育慢','体重不增','消瘦',
      '唇炎','口角炎','舌头发红'
    ],
    note:'备孕及孕早期女性需特别注意补充。',
    labRef:[{label:'叶酸 B9', range:'>4.00', unit:'ng/mL'}]
  },
  {
    id:'vit-b3', name:'维生素 B3', alias:'烟酸 / Niacin', type:'water', hist:false,
    rda:'14 - 16 毫克 NE/日',
    ideal:'15 - 30 毫克 NE/日',
    upperLimit:'35 毫克/日',
    roles:['作为辅因子参与碳水化合物、蛋白质和脂肪酸的合成代谢'],
    deficiency:[
      {part:'皮肤', items:['皮炎：暴露于日光的皮肤出现皮疹']},
      {part:'血液', items:['腹泻：胃肠道功能障碍']},
      {part:'神经', items:['痴呆：中枢神经系统功能障碍','严重者可出现意识模糊']}
    ],
    sources:['动物肝脏','红肉','鱼类','禽类','豆类','全谷物','强化谷物'],
    excess:['面部潮红、瘙痒（烟酸潮红）','大剂量可致肝损伤','可能升高血糖和尿酸'],
    keywords:[
      '糙皮病','癞皮病','三D症',
      '日光皮疹','日光过敏','晒后皮疹','暴露部位皮疹','皮肤粗糙','皮肤增厚','皮肤色素沉着','皮肤黑',
      '腹泻','拉肚子','水样便','消化不良','食欲不振','胃胀','便秘','恶心','呕吐',
      '痴呆','意识模糊','记忆力下降','健忘','反应迟钝','认知下降','脑雾','幻觉','精神异常',
      '口臭','口疮','口腔溃疡','舌头疼','舌头发红','舌头肿胀','地图舌',
      '皮肤油腻','面部油','头皮屑','酒糟鼻',
      '抑郁','情绪低落','焦虑','失眠','烦躁','易怒','头痛','偏头痛',
      '疲劳','乏力','容易累','体重下降','消瘦','食欲差',
      '皮炎','皮肤炎','皮肤发红','皮肤发痒'
    ],
    note:'典型三 D 症状：皮炎、腹泻、痴呆。色氨酸可转化为烟酸。',
    labRef:[{label:'烟酸 B3', range:'5.2-72.1', unit:'ng/mL'}]
  },
  {
    id:'vit-b5', name:'维生素 B5', alias:'泛酸 / Pantothenic Acid', type:'water', hist:false,
    rda:'5 毫克/日',
    ideal:'5 - 10 毫克/日',
    upperLimit:'未设定',
    roles:['辅酶 A 的组成成分','参与脂肪酸合成与氧化','参与碳水化合物和蛋白质代谢'],
    deficiency:[
      {part:'神经', items:['手脚麻木、刺痛','烧灼感（脚趾为主）']},
      {part:'其他', items:['食欲不振、恶心、腹胀']},
      {part:'神经', items:['疲劳、失眠','易感染']}
    ],
    sources:['动物内脏','牛肉','鸡肉','蘑菇','鳄梨','全谷物','豆类'],
    excess:['水溶性，过量经尿排出','大剂量可致腹泻'],
    keywords:[
      '手脚麻木','手麻','脚麻','手指麻','脚趾麻','刺痛','针刺感','烧灼感','脚底烧灼','足部烧灼',
      '食欲不振','食欲差','恶心','腹胀','胃胀','消化不良','腹泻',
      '疲劳','乏力','容易累','倦怠','没力气','精神不振',
      '失眠','多梦','睡眠差','易醒','睡不好',
      '容易感染','免疫力低','反复感冒','容易感冒',
      '脱发','掉发','头发干枯','白头发','头发早白','头发稀疏',
      '伤口愈合慢','伤口难愈','术后恢复慢',
      '脚痛','脚肿','脚底痛','脚气','脚气重',
      '皮肤干燥','皮肤脱屑','皮肤炎','湿疹',
      '肌肉痉挛','肌肉痛','肌肉酸','关节痛'
    ],
    note:'缺乏极为罕见，几乎所有食物都含泛酸。',
    labRef:[{label:'泛酸 B5', range:'12.9-253.1', unit:'ng/mL'}]
  },
  {
    id:'vit-b7', name:'维生素 B7', alias:'生物素 / Biotin', type:'water', hist:false,
    rda:'30 微克/日',
    ideal:'30 - 100 微克/日',
    upperLimit:'未设定',
    roles:['参与脂肪酸合成','参与葡萄糖代谢','参与氨基酸代谢'],
    deficiency:[
      {part:'皮肤', items:['脱发','红色鳞屑性皮疹（眼、鼻、口周围）']},
      {part:'神经', items:['抑郁、嗜睡','幻觉、肢体感觉异常']},
      {part:'眼睛', items:['结膜炎']}
    ],
    sources:['蛋黄','动物肝脏','坚果','豆类','全谷物','花椰菜'],
    excess:['水溶性，毒性极低','可能干扰某些甲状腺和心脏化验'],
    keywords:[
      '脱发','掉发','掉头发','头发稀疏','秃头','斑秃','发际线后移','头发油','头皮屑','头皮痒',
      '白头发','头发早白','少白头','头发干枯','头发黄','头发分叉',
      '指甲脆','指甲易断','指甲裂','指甲薄','月牙少','指甲有竖纹','指甲白点',
      '皮疹','眼周皮疹','红色鳞屑','眼周红','鼻周红','口周红','脂溢性皮炎','湿疹',
      '抑郁','情绪低落','嗜睡','困倦','犯困','没精神','疲劳','乏力',
      '幻觉','肢体感觉异常','手脚麻','刺痛','肌肉痛','肌肉酸','关节痛',
      '结膜炎','眼睛红','眼痒','流泪','眼睑肿',
      '食欲不振','食欲差','消化不良','恶心',
      '血糖不稳','低血糖','糖尿病','糖代谢异常',
      '皮肤干燥','皮肤脱屑','皮肤粗糙'
    ],
    note:'长期生吃鸡蛋清会阻碍生物素吸收。',
    labRef:[{label:'生物素 B7', range:'0.05-0.83', unit:'ng/mL'}]
  },
  {
    id:'vit-k', name:'维生素 K', alias:'叶绿醌 / 甲基萘醌', type:'fat', hist:false,
    rda:'90 - 120 微克/日',
    ideal:'100 - 200 微克/日',
    upperLimit:'未设定',
    roles:['合成凝血因子（2、7、9、10）','维持正常凝血功能','保持骨骼健康'],
    deficiency:[
      {part:'血液', items:['容易淤青、鼻出血、牙龈出血','伤口出血不止','消化道出血可致呕血或黑便','月经量过多、血尿']},
      {part:'其他', items:['新生儿出血性疾病','脐带残端渗血、皮下出血、胃肠道出血','最严重为颅内出血，可危及生命']}
    ],
    sources:['绿叶蔬菜（羽衣甘蓝、菠菜、甘蓝）','大豆油','菜籽油','肠道细菌合成'],
    excess:['天然形式毒性低','合成形式大剂量可致溶血'],
    keywords:[
      '淤青','容易淤青','容易磕青','皮下出血','皮下瘀斑','瘀斑','紫斑',
      '鼻出血','流鼻血','鼻子出血','牙龈出血','刷牙出血','牙龈易出血',
      '伤口出血不止','流血不止','止血慢','凝血差','出血时间长',
      '呕血','吐血','黑便','便血','消化道出血','胃出血',
      '血尿','尿血','月经量多','月经量大','经期长','月经过多',
      '骨质疏松','骨密度低','骨头脆','容易骨折','骨质流失',
      '新生儿出血','脐带渗血','颅内出血',
      '贫血','面色苍白','失血'
    ],
    note:'服用华法林等抗凝药者需保持维生素 K 摄入稳定。',
    labRef:[{label:'维生素 K1', range:'0.13-1.88', unit:'ng/mL'}]
  },
  {
    id:'vit-choline', name:'胆碱', alias:'维生素 B4 / Choline', type:'water', hist:false,
    rda:'425 - 550 毫克/日',
    ideal:'425 - 550 毫克/日',
    upperLimit:'3500 毫克/日',
    roles:['合成乙酰胆碱（神经递质）','构成细胞膜磷脂','参与肝脏脂质运输','参与同型半胱氨酸代谢'],
    deficiency:[
      {part:'肝脏', items:['脂肪肝','肝损伤']},
      {part:'神经', items:['记忆力下降','注意力不集中']},
      {part:'其他', items:['肌肉损伤（肌酸激酶升高）']}
    ],
    sources:['蛋黄','动物肝脏','牛肉','鸡肉','大豆','花生'],
    excess:['鱼腥味体味','出汗增多','低血压','大剂量可致肝损伤'],
    keywords:[
      '脂肪肝','肝脏问题','肝功能异常','转氨酶高','肝损伤',
      '记忆力下降','健忘','脑雾','注意力不集中','反应迟钝','学习困难','认知下降',
      '老年痴呆','阿尔茨海默','帕金森',
      '肌肉损伤','肌酸激酶高','肌肉痛','肌肉无力','肌肉萎缩',
      '疲劳','乏力','容易累','精神不振',
      '情绪低落','抑郁','焦虑','烦躁','易怒','情绪不稳',
      '心悸','心慌','高血压','高血脂','高胆固醇','动脉硬化','心血管疾病',
      '孕期','备孕','怀孕','胎儿发育','神经管',
      '睡眠差','失眠','多梦'
    ],
    note:'严格来说不属于经典维生素，但常被列为 B 族成员。孕期需求增加。',
    labRef:[{label:'胆碱', range:'未提供', unit:'-'}]
  },
  {
    id:'vit-inositol', name:'肌醇', alias:'维生素 B8 / Inositol', type:'water', hist:false,
    rda:'未正式设定',
    ideal:'500 - 2000 毫克/日',
    upperLimit:'未设定',
    roles:['参与细胞信号传导','构成细胞膜磷脂','参与脂肪代谢','影响胰岛素敏感性'],
    deficiency:[
      {part:'皮肤', items:['脱发','湿疹']},
      {part:'神经', items:['焦虑、情绪波动']},
      {part:'其他', items:['脂肪肝','高胆固醇']}
    ],
    sources:['动物内脏','全谷物','坚果','豆类','甜瓜','柑橘类'],
    excess:['一般耐受良好','大剂量可致腹泻、恶心'],
    keywords:[
      '脱发','掉发','头发稀疏','头发油','头皮屑',
      '湿疹','皮肤干燥','皮肤痒','皮炎',
      '焦虑','情绪波动','情绪不稳','易怒','烦躁','抑郁','情绪低落',
      '失眠','多梦','睡不好','睡眠差','早醒','易醒','入睡困难',
      '脂肪肝','高胆固醇','高血脂','血脂高',
      '多囊卵巢','PCOS','月经不调','痛经','不孕','备孕困难',
      '胰岛素抵抗','血糖高','糖尿病','糖代谢异常','代谢综合征',
      '强迫症','恐慌','暴食','进食障碍',
      '记忆力下降','健忘','注意力不集中','脑雾'
    ],
    note:'严格来说不属于必需维生素，人体可自行合成。证据较弱的补充用途包括多囊卵巢综合征辅助。',
    labRef:[{label:'肌醇', range:'未提供', unit:'-'}]
  },
  {
    id:'vit-f', name:'维生素 F', alias:'必需脂肪酸 / 亚油酸与亚麻酸', type:'fat', hist:true,
    rda:'未正式设定',
    ideal:'未正式设定',
    upperLimit:'未设定',
    roles:['构成细胞膜','合成前列腺素','维持皮肤屏障','参与胆固醇代谢'],
    deficiency:[
      {part:'皮肤', items:['皮肤干燥、脱屑','伤口愈合差']},
      {part:'其他', items:['脱发','生长迟缓','血小板聚集异常']}
    ],
    sources:['植物油（亚麻籽油、葵花籽油）','坚果','种子','深海鱼'],
    excess:['过量摄入可能增加氧化应激','需与抗氧化剂平衡'],
    keywords:[
      '皮肤干燥','皮肤脱屑','皮肤粗糙','皮肤开裂','皮肤痒',
      '伤口难愈','伤口愈合慢','伤口不愈合',
      '脱发','掉发','头发干枯','头发黄','头皮屑',
      '生长迟缓','发育慢','不长个',
      '血小板聚集','血栓','心血管疾病',
      '湿疹','皮炎','银屑病','牛皮癣'
    ],
    note:'历史上曾被称为维生素 F，现已被归为必需脂肪酸，不是严格意义上的维生素。',
    labRef:[{label:'维生素 F', range:'未提供', unit:'-'}]
  },
  {
    id:'vit-p', name:'维生素 P', alias:'生物类黄酮 / Bioflavonoids', type:'water', hist:true,
    rda:'未正式设定',
    ideal:'未正式设定',
    upperLimit:'未设定',
    roles:['增强毛细血管强度','抗氧化','辅助维生素 C 吸收'],
    deficiency:[
      {part:'血液', items:['毛细血管脆性增加','容易淤青']},
      {part:'其他', items:['牙龈出血（与维生素 C 缺乏相似）']}
    ],
    sources:['柑橘类水果（果皮和果肉之间的白色部分）','荞麦','黑莓','樱桃'],
    excess:['一般耐受良好','大剂量可致胃肠不适'],
    keywords:[
      '毛细血管脆','容易淤青','容易磕青','皮下出血','瘀斑',
      '牙龈出血','刷牙出血','牙龈肿','牙龈炎',
      '静脉曲张','痔疮','眼底出血','视网膜出血',
      '皮肤暗沉','色斑','老年斑'
    ],
    note:'历史名称，现归为植物化学物。缺乏症不明确，一般不单独作为维生素补充。',
    labRef:[{label:'维生素 P', range:'未提供', unit:'-'}]
  },
  {
    id:'vit-u', name:'维生素 U', alias:'氯化甲基蛋氨酸锍 / S-Methylmethionine', type:'water', hist:true,
    rda:'未正式设定',
    ideal:'未正式设定',
    upperLimit:'未设定',
    roles:['保护胃黏膜','促进胃黏膜修复'],
    deficiency:[
      {part:'其他', items:['胃溃疡相关（证据较弱）','胃黏膜损伤']}
    ],
    sources:['卷心菜','西兰花','甘蓝','菠菜','番茄'],
    excess:['一般耐受良好','缺乏长期安全性数据'],
    keywords:[
      '胃溃疡','胃疼','胃痛','胃酸','反酸','烧心','胃黏膜损伤','胃炎','胃胀',
      '消化不良','胃不适','上腹痛','餐后腹胀','嗳气'
    ],
    note:'历史名称，从卷心菜汁中分离。现代医学不认为其是必需维生素，胃溃疡治疗证据不足。',
    labRef:[{label:'维生素 U', range:'未提供', unit:'-'}]
  }
];

var SIDX = {};
(function(){
  for(var i=0;i<DATA.length;i++){
    var v = DATA[i];
    for(var j=0;j<v.keywords.length;j++){
      var k = v.keywords[j];
      if(!SIDX[k]) SIDX[k] = [];
      SIDX[k].push({id:v.id, w: k.length>=4 ? 10 : 7, hist:v.hist});
    }
  }
})();

var favsRaw = '[]';
var themeRaw = 'light';
try {
  favsRaw = STORE.get('vt_favs') || '[]';
  themeRaw = STORE.get('vt_theme') || 'light';
} catch(e) { favsRaw = '[]'; themeRaw = 'light'; }

var st = {
  tab:'list', query:'', filter:'all', favOnly:false,
  favs: [], theme: themeRaw,
  detailId:null, symQ:'', symPart:null, symSel:[], cmpIds:[]
};

try {
  st.favs = JSON.parse(favsRaw);
  if(!(st.favs instanceof Array)) st.favs = [];
} catch(e) { st.favs = []; }

function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function each(list, fn){ for(var i=0;i<list.length;i++) fn(list[i], i); }
function closest(el, sel){
  while(el && el !== document){
    if(el.matches && el.matches(sel)) return el;
    if(el.msMatchesSelector && el.msMatchesSelector(sel)) return el;
    if(el.webkitMatchesSelector && el.webkitMatchesSelector(sel)) return el;
    el = el.parentNode;
  }
  return null;
}
function byId(id){
  for(var i=0;i<DATA.length;i++){ if(DATA[i].id===id) return DATA[i]; }
  return null;
}
function tLabel(t){ return t==='fat' ? '脂溶性' : '水溶性'; }
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function toast(msg){
  var d = document.createElement('div');
  d.textContent = msg;
  d.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:9px 18px;border-radius:20px;font-size:13px;z-index:99;opacity:0;transition:opacity .25s;pointer-events:none;max-width:80%;text-align:center';
  document.body.appendChild(d);
  setTimeout(function(){ d.style.opacity='1'; }, 20);
  setTimeout(function(){ d.style.opacity='0'; setTimeout(function(){ d.remove(); }, 300); }, 1500);
}

function renderList(){
  var q = st.query.trim().toLowerCase();
  var out = [];
  for(var i=0;i<DATA.length;i++){
    var v = DATA[i];
    if(st.filter==='hist'){ if(!v.hist) continue; }
    else if(st.filter!=='all'){ if(v.type!==st.filter || v.hist) continue; }
    if(st.favOnly && st.favs.indexOf(v.id)<0) continue;
    if(q){
      var hay = (v.name + ' ' + v.alias + ' ' + v.keywords.join(' ') + ' ' + v.roles.join(' ')).toLowerCase();
      if(hay.indexOf(q)<0) continue;
    }
    out.push(v);
  }

  var box = $('#listBox');
  if(!out.length){
    box.innerHTML = '<div class="empty"><div class="big">◌</div><p>没有找到匹配的维生素<br>试试其他关键词或清除筛选</p></div>';
    return;
  }

  var html = '';
  for(var k=0;k<out.length;k++){
    var v = out[k];
    var tags = '';
    var n = 0;
    for(var a=0;a<v.deficiency.length && n<3;a++){
      for(var b=0;b<v.deficiency[a].items.length && n<3;b++){
        var t = v.deficiency[a].items[b].split('：')[0].split('（')[0];
        tags += '<span>' + esc(t) + '</span>';
        n++;
      }
    }
    var tagCls = v.hist ? 'hist' : '';
    var dotCls = v.hist ? 'hist' : v.type;
    var tagText = v.hist ? '历史' : tLabel(v.type);
    html += '<button class="vcard' + (v.hist ? ' hist' : '') + '" data-id="' + v.id + '">' +
      '<div class="hd">' +
        '<span class="dot ' + dotCls + '"></span>' +
        '<strong>' + esc(v.name) + '</strong>' +
        '<span class="tag ' + tagCls + '">' + tagText + '</span>' +
        (st.favs.indexOf(v.id)>=0 ? '<span class="fav">★</span>' : '') +
      '</div>' +
      '<div class="tags">' + tags + '</div>' +
      '<div class="role">' + esc(v.roles[0]) + '</div>' +
    '</button>';
  }
  box.innerHTML = html;
}

function openDetail(id){
  var v = byId(id);
  if(!v) return;
  st.detailId = id;
  var on = st.favs.indexOf(id)>=0;
  $('#ovFav').textContent = on ? '★' : '☆';
  $('#ovFav').className = 'ibtn' + (on ? ' on' : '');

  var h = '';
  h += '<div class="hero' + (v.hist ? ' hist' : '') + '">';
  h += '<h2>' + esc(v.name) + '</h2>';
  h += '<div class="alias">别名：' + esc(v.alias) + '</div>';

  // 三档摄取量
  if(v.hist){
    h += '<div class="meta"><span class="hist">历史维生素</span></div>';
  }else{
    h += '<div class="intake">';
    h += '<div class="box rec"><div class="lb">推荐量</div><div class="vl">' + esc(v.rda) + '</div></div>';
    h += '<div class="box ideal"><div class="lb">理想量</div><div class="vl">' + esc(v.ideal) + '</div></div>';
    h += '<div class="box ul"><div class="lb">上限量</div><div class="vl">' + esc(v.upperLimit) + '</div></div>';
    h += '</div>';
  }
  h += '</div>';

  if(v.hist){
    h += '<div class="hist-warn"><span class="t">历史名称</span>';
    h += '此条目在历史上曾被称为维生素，但现代营养学已不将其列为必需维生素。以下内容仅供参考。';
    h += '</div>';
  }

  h += '<div class="blk"><div class="blk-hd">核心作用</div><ul class="rlist">';
  for(var i=0;i<v.roles.length;i++) h += '<li>' + esc(v.roles[i]) + '</li>';
  h += '</ul></div>';

  h += '<div class="blk"><div class="blk-hd">缺乏表现 <span class="fold">按部位分组</span></div>';
  for(var j=0;j<v.deficiency.length;j++){
    var d = v.deficiency[j];
    h += '<div class="drow"><div class="k">' + esc(d.part) + '</div><div class="v">' + esc(d.items.join(' · ')) + '</div></div>';
  }
  h += '</div>';

  h += '<div class="blk"><div class="blk-hd">食物来源</div><div class="pills">';
  for(var m=0;m<v.sources.length;m++) h += '<span>' + esc(v.sources[m]) + '</span>';
  h += '</div></div>';

  h += '<div class="blk"><div class="blk-hd">人体含量参考值 <span class="fold">血清 / 血浆</span></div>';
  if(v.labRef && v.labRef.length){
    h += '<div class="labref">';
    h += '<div class="title">正常参考范围（按体检单）</div>';
    for(var r=0;r<v.labRef.length;r++){
      h += '<div class="item"><span class="lbl">' + esc(v.labRef[r].label) + '</span><span class="val">' + esc(v.labRef[r].range) + ' ' + esc(v.labRef[r].unit) + '</span></div>';
    }
    h += '<div class="hint">参考值因实验室、检测方法和人群而异，请以化验单标注的区间为准。</div>';
    h += '</div>';
  }else{
    h += '<div class="labref"><div class="title">暂无常规参考值</div><div class="hint">该指标无统一血清参考范围。</div></div>';
  }
  h += '</div>';

  h += '<div class="blk"><div class="blk-hd">过量风险</div><div class="warn"><span class="t">注意</span>' + esc(v.excess.join('；')) + '</div></div>';

  if(v.note) h += '<div class="note">' + esc(v.note) + '</div>';

  $('#ovBody').innerHTML = h;
  $('#ov').classList.add('on');
  $('#ovBody').scrollTop = 0;
}
function closeDetail(){
  $('#ov').classList.remove('on');
  st.detailId = null;
}

var POOL = {};
(function(){
  for(var i=0;i<DATA.length;i++){
    var v = DATA[i];
    for(var j=0;j<v.deficiency.length;j++){
      var d = v.deficiency[j];
      if(!POOL[d.part]) POOL[d.part] = [];
      for(var k=0;k<d.items.length;k++){
        var segs = d.items[k].split(/[：，,、·]/);
        for(var m=0;m<segs.length;m++){
          var s = segs[m].trim();
          if(s.length>=2 && s.length<=14 && POOL[d.part].indexOf(s)<0){
            POOL[d.part].push(s);
          }
        }
      }
    }
  }
})();

// 常见症状推荐词（按部位）
var PART_KEYWORDS = {
  '全身': ['容易疲劳','乏力','没精神','提不起劲','经常生病','容易感冒','免疫力低','容易累','精神不振','倦怠','慢性疲劳','体力差','亚健康','消瘦','体重下降','生长迟缓','不长个','发育慢'],
  '眼睛': ['夜盲','晚上看不清','暗光看不清','眼睛干','眼睛涩','眼睛痒','眼睛红','畏光','流泪','视力下降','视力模糊','眼疲劳','眼周皮疹','黑眼圈','眼睑肿','结膜炎','干眼症','角膜软化','眼肌麻痹','眼睑炎'],
  '皮肤': ['皮肤干燥','皮肤粗糙','皮肤脱屑','鸡皮疙瘩','毛囊角化','湿疹','皮炎','脂溢性皮炎','皮肤油','皮肤暗沉','皮肤松弛','皱纹','色斑','雀斑','黄褐斑','老年斑','淤青','瘀斑','皮下出血','伤口难愈','伤口愈合慢','皮肤发痒','皮肤发红','日光皮疹','阴囊皮炎'],
  '头发指甲': ['脱发','掉发','头发稀疏','斑秃','发际线后移','白头发','头发早白','少白头','头发干枯','头发分叉','头发黄','头发油','头皮屑','头皮痒','指甲脆','指甲易断','指甲裂','指甲薄','月牙少'],
  '口腔': ['口臭','口疮','口腔溃疡','口角炎','嘴角裂','烂嘴角','唇炎','嘴唇干裂','嘴唇脱皮','舌炎','舌头疼','舌红','舌头发红','舌面光滑','地图舌','牙龈出血','牙龈肿','牙龈炎','牙周炎','牙齿松动','刷牙出血','味觉减退','食欲不振','食欲差'],
  '神经': ['手脚麻木','手麻','脚麻','手指麻','脚趾麻','刺痛','针刺感','烧灼感','蚁走感','神经炎','末梢神经炎','共济失调','走路不稳','平衡差','反应迟钝','记忆力下降','健忘','脑雾','注意力不集中','头晕','头痛','偏头痛','失眠','多梦','睡不好','睡眠差','早醒','易醒','入睡困难','情绪低落','抑郁','焦虑','烦躁','易怒','情绪不稳'],
  '血液': ['贫血','面色苍白','脸色苍白','脸色蜡黄','嘴唇苍白','指甲苍白','睑结膜苍白','淤青','容易淤青','皮下出血','皮下瘀斑','鼻出血','流鼻血','牙龈出血','伤口出血不止','流血不止','止血慢','呕血','黑便','血尿','月经量多','月经量大','经期长','心慌','心悸','气短','头晕'],
  '骨骼': ['腰背痛','腰酸','腰疼','背痛','骨头疼','关节痛','关节响','膝盖疼','抽筋','腿抽筋','夜间抽筋','小腿抽筋','脚抽筋','手脚抽筋','骨质疏松','骨密度低','容易骨折','骨头脆','骨质流失','佝偻病','O形腿','X形腿','鸡胸','骨软化','出牙晚','囟门迟闭','长牙慢','肌无力','腿软'],
  '消化': ['腹泻','拉肚子','便秘','胃胀','腹胀','消化不良','反酸','烧心','胃疼','胃痛','胃溃疡','胃炎','恶心','呕吐','食欲不振','食欲差','嗳气','口臭','脂肪肝','肝功能异常','转氨酶高','肝损伤'],
  '其他': ['水肿','浮肿','脚肿','腿肿','心慌','心悸','心跳快','胸闷','高血压','高血脂','高胆固醇','动脉硬化','胰岛素抵抗','血糖高','糖尿病','多囊卵巢','PCOS','月经不调','痛经','经前综合征','PMS','孕吐','晕车','晕船','不孕','习惯性流产','伤口难愈','术后恢复慢']
};

function renderSymChips(){
  var box = $('#schips');
  var items = [];
  if(st.symPart && PART_KEYWORDS[st.symPart]){
    items = PART_KEYWORDS[st.symPart].slice();
  }else{
    // 没有选部位时，展示 SIDX 里的关键词（去重后按长度排序）
    items = Object.keys(SIDX).slice(0,40);
  }
  if(!items.length){
    box.innerHTML = '<span style="font-size:12.5px;color:var(--ink3);padding:2px 0">该部位暂无细分症状，可直接在搜索框输入</span>';
    return;
  }
  var h = '';
  for(var i=0;i<items.length;i++){
    var s = items[i];
    var on = st.symSel.indexOf(s)>=0;
    h += '<button class="chip' + (on ? ' red on' : '') + '" data-sym="' + esc(s) + '">' + esc(s) + (on ? '<span class="x">✕</span>' : '') + '</button>';
  }
  box.innerHTML = h;
}

function renderMatches(){
  var box = $('#mBox');
  var sel = st.symSel.slice();
  var q = st.symQ.trim();
  if(q && sel.indexOf(q)<0) sel.push(q);

  if(!sel.length){
    box.innerHTML = '<div class="empty" style="padding:36px 20px"><div class="big">◐</div><p>选择症状或输入描述<br>系统会列出可能缺乏的维生素</p></div>';
    $('#symFold').textContent = '';
    return;
  }

  var scores = {};
  for(var i=0;i<sel.length;i++){
    var sym = sel[i];
    if(SIDX[sym]){
      for(var j=0;j<SIDX[sym].length;j++){
        var it = SIDX[sym][j];
        var w = it.w;
        if(it.hist) w = w * 0.3;
        scores[it.id] = (scores[it.id]||0) + w;
      }
    }
    var keys = Object.keys(SIDX);
    for(var k=0;k<keys.length;k++){
      var key = keys[k];
      if(key===sym) continue;
      if(key.indexOf(sym)>=0 || sym.indexOf(key)>=0){
        for(var m=0;m<SIDX[key].length;m++){
          var it2 = SIDX[key][m];
          var w2 = it2.w * 0.55;
          if(it2.hist) w2 = w2 * 0.3;
          scores[it2.id] = (scores[it2.id]||0) + w2;
        }
      }
    }
  }

  var arr = [];
  for(var id in scores){
    if(!scores.hasOwnProperty(id)) continue;
    var v = byId(id);
    if(v) arr.push({v:v, sc:scores[id]});
  }
  arr.sort(function(a,b){ return b.sc - a.sc; });
  arr = arr.slice(0,6);

  if(!arr.length){
    box.innerHTML = '<div class="empty" style="padding:36px 20px"><div class="big">◌</div><p>未匹配到相关维生素<br>试试更常见的症状词</p></div>';
    $('#symFold').textContent = '';
    return;
  }

  var max = arr[0].sc;
  var h = '';
  for(var n=0;n<arr.length;n++){
    var x = arr[n];
    var pct = Math.round(x.sc/max*100);
    var hits = [];
    for(var p=0;p<sel.length;p++){
      var s = sel[p];
      for(var q2=0;q2<x.v.keywords.length;q2++){
        var kk = x.v.keywords[q2];
        if(kk===s || kk.indexOf(s)>=0 || s.indexOf(kk)>=0){ hits.push(s); break; }
      }
    }
    h += '<button class="result" data-id="' + x.v.id + '">' +
      '<div class="top">' +
        '<span class="rank">' + (n+1) + '</span>' +
        '<span class="nm">' + esc(x.v.name) + (x.v.hist ? ' <span style="font-size:10px;color:var(--gray);font-weight:400">历史</span>' : '') + '</span>' +
        '<span class="pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
      '<div class="why">命中：' + esc(hits.length ? hits.join('、') : '相关症状') + '</div>' +
    '</button>';
  }
  box.innerHTML = h;
  $('#symFold').textContent = '已选 ' + sel.length;
}

function renderCmp(){
  var slots = $('#slots');
  var h = '';
  for(var i=0;i<st.cmpIds.length;i++){
    var v = byId(st.cmpIds[i]);
    if(!v) continue;
    h += '<button class="chip ' + (v.hist ? 'gray' : v.type) + ' on" data-rm="' + v.id + '">' + esc(v.name) + '<span class="x">✕</span></button>';
  }
  if(st.cmpIds.length<3){ h += '<button class="chip" id="addCmp">＋ 添加</button>'; }
  else{ h += '<span style="font-size:12px;color:var(--ink3);padding:5px 4px">最多 3 个</span>'; }
  slots.innerHTML = h;

  var box = $('#cmpBox');
  if(st.cmpIds.length<2){
    box.innerHTML = '<div class="empty"><div class="big">⇄</div><p>至少选择 2 个维生素<br>才能生成对比表</p></div>';
    return;
  }

  var vs = [];
  for(var j=0;j<st.cmpIds.length;j++){
    var vv = byId(st.cmpIds[j]);
    if(vv) vs.push(vv);
  }

  var rows = [
    {label:'推荐', get:function(v){ return esc(v.rda); }},
    {label:'理想', get:function(v){ return esc(v.ideal); }},
    {label:'上限', get:function(v){ return esc(v.upperLimit); }},
    {label:'作用', get:function(v){
      var r = [];
      for(var i=0;i<Math.min(2,v.roles.length);i++) r.push(esc(v.roles[i].split('，')[0]));
      return r.join('<br>');
    }},
    {label:'缺乏', get:function(v){
      var r = [];
      for(var i=0;i<Math.min(3,v.deficiency.length);i++){
        r.push(esc(v.deficiency[i].items[0].split('：')[0]));
      }
      return r.join(' · ');
    }},
    {label:'来源', get:function(v){
      var r = [];
      for(var i=0;i<Math.min(4,v.sources.length);i++) r.push(esc(v.sources[i]));
      return r.join(' · ');
    }},
    {label:'参考值', get:function(v){
      if(v.labRef && v.labRef.length){
        var res = [];
        for(var i=0;i<v.labRef.length;i++){
          res.push(esc(v.labRef[i].range + ' ' + v.labRef[i].unit));
        }
        return res.join('<br>');
      }
      return '—';
    }}
  ];

  var h2 = '<div class="cmpwrap"><div class="cmptable">';
  h2 += '<div style="display:flex;flex-direction:column;flex:0 0 52px">';
  h2 += '<div class="cmplbl sp" style="background:var(--paper2)"></div>';
  for(var r=0;r<rows.length;r++) h2 += '<div class="cmplbl" style="min-height:64px">' + rows[r].label + '</div>';
  h2 += '</div>';

  for(var c=0;c<vs.length;c++){
    var v = vs[c];
    var dCls = v.hist ? 'hist' : v.type;
    h2 += '<div class="cmpcol">';
    h2 += '<div class="cmph"><span class="dot ' + dCls + '"></span>' + esc(v.name) + '</div>';
    for(var r2=0;r2<rows.length;r2++){
      h2 += '<div class="cmpcell">' + rows[r2].get(v) + '</div>';
    }
    h2 += '</div>';
  }
  h2 += '</div></div>';

  h2 += '<div class="diff"><span class="t">差异速览</span>' + genDiff(vs) + '</div>';
  h2 += '<div style="height:20px"></div>';
  box.innerHTML = h2;
}

function genDiff(vs){
  var parts = [];
  var hasHist = false;
  for(var i=0;i<vs.length;i++){ if(vs[i].hist) hasHist = true; }
  if(hasHist) parts.push('包含历史维生素条目，现代营养学已不将其列为必需维生素。');
  var types = [];
  for(var j=0;j<vs.length;j++){
    if(vs[j].hist) continue;
    if(types.indexOf(vs[j].type)<0) types.push(vs[j].type);
  }
  if(types.length===1) parts.push('临床必需条目均为' + tLabel(types[0]) + '维生素。');
  else if(types.length>1){
    var tl = [];
    for(var k=0;k<types.length;k++) tl.push(tLabel(types[k]));
    parts.push('临床必需条目包含' + tl.join('与') + '维生素，吸收与储存方式不同。');
  }
  var common = [];
  for(var m=0;m<vs[0].sources.length;m++){
    var s = vs[0].sources[m];
    var ok = true;
    for(var n=1;n<vs.length;n++){
      if(vs[n].sources.indexOf(s)<0){ ok = false; break; }
    }
    if(ok) common.push(s);
  }
  if(common.length) parts.push('共同来源：' + common.join('、') + '。');
  return esc(parts.join(''));
}

function openPicker(){
  var box = $('#pkList');
  var h = '';
  for(var i=0;i<DATA.length;i++){
    var v = DATA[i];
    var sel = st.cmpIds.indexOf(v.id)>=0;
    var dCls = v.hist ? 'hist' : v.type;
    var ty = v.hist ? '历史' : tLabel(v.type);
    h += '<button class="pitem' + (sel ? ' sel' : '') + '" data-pick="' + v.id + '">' +
      '<span class="dot ' + dCls + '"></span>' +
      '<span class="nm">' + esc(v.name) + '</span>' +
      '<span class="ty">' + ty + '</span>' +
      '<span class="ck">✓</span>' +
    '</button>';
  }
  box.innerHTML = h;
  $('#pk').classList.add('on');
}
function closePicker(){ $('#pk').classList.remove('on'); }

each($$('.tabbar button'), function(btn){
  btn.addEventListener('click', function(){
    var t = btn.getAttribute('data-t');
    st.tab = t;
    each($$('.tabbar button'), function(b){ b.classList.toggle('on', b===btn); });
    each($$('.view'), function(v){ v.classList.remove('on'); });
    var map = { list:'vList', sym:'vSym', cmp:'vCmp' };
    $('#' + map[t]).classList.add('on');
    $('#ttl').textContent = { list:'缺不缺', sym:'症状反查', cmp:'对比' }[t];
    if(t==='sym'){ renderSymChips(); renderMatches(); }
    if(t==='cmp'){ renderCmp(); }
  });
});

function bindSearch(inputId, boxId, cb){
  var input = $('#' + inputId);
  var box = $('#' + boxId);
  input.addEventListener('input', function(){
    box.classList.toggle('has', !!input.value);
    cb(input.value);
  });
  box.querySelector('.clr').addEventListener('click', function(){
    input.value = '';
    box.classList.remove('has');
    cb('');
  });
}
bindSearch('s1','sb1', function(v){ st.query=v; renderList(); });
bindSearch('s2','sb2', function(v){ st.symQ=v; renderMatches(); });

$('#fchips').addEventListener('click', function(e){
  var btn = closest(e.target, '[data-f]');
  if(!btn) return;
  st.filter = btn.getAttribute('data-f');
  each($$('#fchips .chip'), function(c){ c.classList.toggle('on', c===btn); });
  renderList();
});

$('#favBtn').addEventListener('click', function(){
  st.favOnly = !st.favOnly;
  this.classList.toggle('on', st.favOnly);
  this.textContent = st.favOnly ? '★' : '☆';
  renderList();
});

$('#themeBtn').addEventListener('click', function(){
  st.theme = st.theme==='dark' ? 'light' : 'dark';
  STORE.set('vt_theme', st.theme);
  document.documentElement.setAttribute('data-theme', st.theme);
  this.textContent = st.theme==='dark' ? '☀' : '☾';
});

$('#listBox').addEventListener('click', function(e){
  var card = closest(e.target, '.vcard');
  if(card) openDetail(card.getAttribute('data-id'));
});

$('#ovBack').addEventListener('click', closeDetail);

$('#ovFav').addEventListener('click', function(){
  var id = st.detailId;
  if(!id) return;
  var i = st.favs.indexOf(id);
  if(i>=0){ st.favs.splice(i,1); toast('已取消收藏'); }
  else { st.favs.push(id); toast('已收藏'); }
  STORE.set('vt_favs', JSON.stringify(st.favs));
  var on = st.favs.indexOf(id)>=0;
  this.textContent = on ? '★' : '☆';
  this.className = 'ibtn' + (on ? ' on' : '');
  renderList();
});

$('#pchips').addEventListener('click', function(e){
  var btn = closest(e.target, '[data-p]');
  if(!btn) return;
  var p = btn.getAttribute('data-p');
  st.symPart = (st.symPart===p) ? null : p;
  each($$('#pchips .chip'), function(c){
    c.classList.toggle('on', c.getAttribute('data-p')===st.symPart);
  });
  renderSymChips();
});

$('#schips').addEventListener('click', function(e){
  var btn = closest(e.target, '[data-sym]');
  if(!btn) return;
  var s = btn.getAttribute('data-sym');
  var i = st.symSel.indexOf(s);
  if(i>=0) st.symSel.splice(i,1);
  else st.symSel.push(s);
  renderSymChips();
  renderMatches();
});

$('#mBox').addEventListener('click', function(e){
  var card = closest(e.target, '.result');
  if(card) openDetail(card.getAttribute('data-id'));
});

$('#slots').addEventListener('click', function(e){
  var rm = closest(e.target, '[data-rm]');
  if(rm){
    var id = rm.getAttribute('data-rm');
    st.cmpIds = st.cmpIds.filter(function(x){ return x!==id; });
    renderCmp();
    return;
  }
  if(closest(e.target, '#addCmp')) openPicker();
});

$('#pkClose').addEventListener('click', closePicker);
$('#pk').addEventListener('click', function(e){
  if(e.target.id==='pk') closePicker();
});
$('#pkList').addEventListener('click', function(e){
  var item = closest(e.target, '[data-pick]');
  if(!item) return;
  var id = item.getAttribute('data-pick');
  var i = st.cmpIds.indexOf(id);
  if(i>=0){ st.cmpIds.splice(i,1); }
  else{
    if(st.cmpIds.length>=3){ toast('最多对比 3 个'); return; }
    st.cmpIds.push(id);
  }
  item.classList.toggle('sel', st.cmpIds.indexOf(id)>=0);
  renderCmp();
});

document.documentElement.setAttribute('data-theme', st.theme);
$('#themeBtn').textContent = st.theme==='dark' ? '☀' : '☾';
renderList();

})();
