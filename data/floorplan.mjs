export const floor = {width:1480,height:1040,metersPerUnit:0.08,grid:10};
export const rooms = [
 {id:'bronze',x:18,y:18,w:472,h:772,label:{x:252,y:56},fill:'#e9e1d2'},
 {id:'ceramic',x:504,y:18,w:482,h:382,label:{x:744,y:56},fill:'#e2e9df'},
 {id:'sculpture',x:1000,y:18,w:462,h:916,label:{x:1230,y:56},fill:'#e4e6e9'},
];
export const walls = [
 {x:0,y:0,w:1480,h:16},{x:0,y:0,w:16,h:1040},{x:1464,y:0,w:16,h:1040},
 {x:0,y:1024,w:650,h:16},{x:830,y:1024,w:490,h:16},{x:1410,y:1024,w:70,h:16},
 {x:490,y:16,w:14,h:174},{x:490,y:260,w:14,h:360},{x:490,y:710,w:14,h:94},
 {x:16,y:790,w:488,h:14},
 {x:16,y:300,w:114,h:12},{x:210,y:300,w:280,h:12},
 {x:16,y:540,w:324,h:12},{x:420,y:540,w:70,h:12},
 {x:504,y:400,w:311,h:14},{x:895,y:400,w:91,h:14},
 {x:736,y:16,w:12,h:224},{x:736,y:320,w:12,h:80},
 {x:986,y:16,w:14,h:174},{x:986,y:270,w:14,h:330},{x:986,y:700,w:14,h:234},
 {x:1000,y:360,w:210,h:12},{x:1290,y:360,w:174,h:12},
 {x:1000,y:650,w:50,h:12},{x:1130,y:650,w:334,h:12},
 {x:986,y:934,w:304,h:14},{x:1380,y:934,w:84,h:14},
];
export const courtyard={x:610,y:520,w:270,h:220};
export const furniture = [
 {id:'reception',kind:'desk',x:220,y:856,w:150,h:58},
 {id:'lobby-seat',kind:'bench',x:80,y:930,w:120,h:30},
 {id:'reading-seat',kind:'bench',x:1080,y:978,w:120,h:26},
 {id:'a-seat',kind:'bench',x:245,y:359,w:66,h:94},
 {id:'b-seat',kind:'bench',x:820,y:98,w:34,h:88},
 {id:'c-seat',kind:'bench',x:1220,y:444,w:72,h:88},
 {id:'west-planter',kind:'planter',x:44,y:835,w:46,h:46},
 {id:'east-planter',kind:'planter',x:1400,y:968,w:40,h:40},
];
export const obstacles=[...walls,courtyard,...furniture];
export const doors = [
 {x:130,y:306,width:80,axis:'x',name:'青铜厅北区通道'},
 {x:340,y:546,width:80,axis:'x',name:'青铜厅南区通道'},
 {x:497,y:190,width:70,axis:'y',name:'青铜—陶瓷连通门'},
 {x:497,y:620,width:90,axis:'y',name:'青铜厅入口'},
 {x:742,y:240,width:80,axis:'y',name:'陶瓷厅展区通道'},
 {x:815,y:407,width:80,axis:'x',name:'陶瓷厅入口'},
 {x:993,y:190,width:80,axis:'y',name:'陶瓷—雕塑连通门'},
 {x:993,y:600,width:100,axis:'y',name:'雕塑厅入口'},
 {x:1210,y:366,width:80,axis:'x',name:'雕塑厅北区通道'},
 {x:1050,y:656,width:80,axis:'x',name:'雕塑厅南区通道'},
 {x:1290,y:941,width:90,axis:'x',name:'雕塑厅南门'},
];
export const cameraLocations=[
 {id:'L0',name:'入口大厅',hall:'lobby',x:740,y:970,angle:-90,description:'入口大厅，向北可进入中庭回廊。'},
 {id:'L1',name:'中庭西回廊',hall:'lobby',x:550,y:820,angle:-90,description:'西回廊通往青铜礼器厅，或沿中庭继续向北。'},
 {id:'L2',name:'中庭东回廊',hall:'lobby',x:940,y:820,angle:-90,description:'东回廊连接世界雕塑厅与中庭北侧。'},
 {id:'L3',name:'中庭北回廊',hall:'lobby',x:740,y:460,angle:0,description:'北回廊通向陶瓷艺术厅。'},
 {id:'A1',name:'A1 · 商周酒器西侧',hall:'bronze',x:190,y:170,angle:-90,description:'青铜爵与提梁卣所在的商周酒器区。'},
 {id:'A2',name:'A2 · 商周酒器东侧',hall:'bronze',x:340,y:170,angle:-90,description:'对照觚与斝不同的器形。'},
 {id:'A3',name:'A3 · 礼器与纹饰',hall:'bronze',x:190,y:430,angle:180,description:'观察兽面纹觚与青铜簋。'},
 {id:'A4',name:'A4 · 鼎与礼乐',hall:'bronze',x:370,y:450,angle:0,description:'青铜鼎与甬钟的陈列区。'},
 {id:'A5',name:'A5 · 青铜日用',hall:'bronze',x:190,y:670,angle:180,description:'从铜镜到盉，比较日用与礼仪。'},
 {id:'A6',name:'A6 · 动物与酒器',hall:'bronze',x:340,y:670,angle:0,description:'觥与尊所在的南侧展区。'},
 {id:'B1',name:'B1 · 青瓷与茶',hall:'ceramic',x:630,y:175,angle:-90,description:'龙泉青瓷、建窑与磁州窑。'},
 {id:'B2',name:'B2 · 宋金窑艺',hall:'ceramic',x:630,y:290,angle:-90,description:'白瓷、钧釉与牡丹纹陶枕。'},
 {id:'B3',name:'B3 · 釉色与造型',hall:'ceramic',x:875,y:175,angle:-90,description:'青白瓷、蓝釉与葫芦瓶。'},
 {id:'B4',name:'B4 · 陶瓷与生活',hall:'ceramic',x:875,y:290,angle:-90,description:'三彩骑马俑、人物瓶与清代青釉。'},
 {id:'C1',name:'C1 · 古埃及',hall:'sculpture',x:1130,y:170,angle:-90,description:'从狮身人面像到奥古斯都头像。'},
 {id:'C2',name:'C2 · 古希腊',hall:'sculpture',x:1360,y:170,angle:-90,description:'青年立像与蓝色河马相望的古代文明区。'},
 {id:'C3',name:'C3 · 音乐与身体',hall:'sculpture',x:1130,y:500,angle:180,description:'竖琴演奏者与美惠三女神。'},
 {id:'C4',name:'C4 · 日常的面孔',hall:'sculpture',x:1360,y:500,angle:0,description:'沉睡的厄洛斯与市场老妇。'},
 {id:'C5',name:'C5 · 亚洲造像西侧',hall:'sculpture',x:1160,y:810,angle:180,description:'唐代佛首与舞王湿婆。'},
 {id:'C6',name:'C6 · 亚洲造像东侧',hall:'sculpture',x:1370,y:810,angle:0,description:'观音菩萨与唐代僧人像。'},
 {id:'EXIT',name:'东侧出口',hall:'lobby',x:1360,y:990,angle:90,description:'雕塑厅南侧出口与休憩区。'},
];
const ids={
 bronze:['jue','gu','you','jia','shang-gu','ding','gui','bell','mirror','gong','he','zun'],
 ceramic:['longquan','tea','peony','pillow','ding-bowl','jun-dish','qingbai','gourd','dragon','horse','celadon','robe-vase'],
 sculpture:['sphinx','william','augustus','kouros','harp','eros','three-graces','market-woman','buddha','avalokiteshvara','shiva','ananda'],
};
const layouts={
 bronze:[[100,110,'A1'],[410,110,'A2'],[100,230,'A1'],[410,230,'A2'],[100,375,'A3'],[410,375,'A4'],[100,485,'A3'],[410,485,'A4'],[100,615,'A5'],[410,615,'A6'],[100,735,'A5'],[410,735,'A6']],
 ceramic:[[575,110,'B1'],[690,110,'B1'],[575,220,'B1'],[690,220,'B2'],[575,330,'B2'],[690,330,'B2'],[790,110,'B3'],[930,110,'B3'],[790,220,'B3'],[930,220,'B4'],[790,330,'B4'],[930,330,'B4']],
 sculpture:[[1065,110,'C1'],[1395,110,'C2'],[1065,260,'C1'],[1395,260,'C2'],[1065,420,'C3'],[1395,420,'C4'],[1065,580,'C3'],[1395,580,'C4'],[1065,730,'C5'],[1395,730,'C6'],[1065,860,'C5'],[1395,860,'C6']],
};
export const placements=Object.fromEntries(Object.entries(ids).flatMap(([hall,list])=>list.map((id,i)=>{const[x,y,cameraId]=layouts[hall][i];return[id,{hall,x,y,cameraId,order:i+1,w:id==='sphinx'||id==='three-graces'?76:56,h:64}];})));
export const sections=[
 {hall:'bronze',name:'商周酒器',x:250,y:276},{hall:'bronze',name:'礼器与礼乐',x:250,y:510},{hall:'bronze',name:'纹饰与功能',x:250,y:765},
 {hall:'ceramic',name:'宋金窑艺',x:620,y:375},{hall:'ceramic',name:'釉色与造型',x:864,y:375},
 {hall:'sculpture',name:'古代文明',x:1230,y:326},{hall:'sculpture',name:'身体与日常',x:1230,y:615},{hall:'sculpture',name:'信仰与造像',x:1230,y:904},
];
export function areaAt(point){
 if(point.x>610&&point.x<880&&point.y>520&&point.y<740)return '中庭';
 const room=rooms.find(r=>point.x>=r.x&&point.x<=r.x+r.w&&point.y>=r.y&&point.y<=r.y+r.h);
 if(room)return room.id;
 if(point.y>810)return '入口大厅';
 return point.x<610?'中庭西回廊':point.x>880?'中庭东回廊':'中庭北回廊';
}
