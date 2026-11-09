import { PROJECT_EMAIL } from './config.js';
import { TYPE_LABELS, TRACK_LABELS, MODE_LABELS, VERIFICATION_LABELS, COMPLETENESS_LABELS, normalizeCatalog, normalizeResources, filterResources, filterOfferings } from './resources.js';
const $ = id => document.getElementById(id);
const controls = {grade:$('grade'),course:$('course'),teacher:$('teacher'),type:$('type'),studentTrack:$('studentTrack'),semester:$('resource-semester')};
const courseControls = {semester:$('offering-semester'),course:$('offering-course'),teacher:$('offering-teacher'),teachingMode:$('teachingMode')};
let resources = [], catalog = {courses:[],offerings:[]}, resourceState = 'loading', courseState = 'loading';
const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(PROJECT_EMAIL);
const mailto = (subject,body='') => `mailto:${PROJECT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
function node(tag,className,content) { const n=document.createElement(tag);if(className)n.className=className;if(content!==undefined)n.textContent=content;return n; }
function options(select,values,label,format=v=>v) {
  const previous=select.value;
  select.replaceChildren(new Option(label,''),...[...new Set(values)].filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true})).map(v=>new Option(format(v),v)));
  if([...select.options].some(o=>o.value===previous))select.value=previous;
}
const courseLabel = id => { const c=catalog.courses.find(c=>c.courseId===id);return c ? `${c.courseName} · ${c.courseCodes.join(' / ')}` : id.replace('legacy:',''); };
function syncCascade() {
  options(controls.grade,resources.flatMap(r=>r.studentGrades),'全部年级',v=>`${v}级`);
  const byGrade=filterResources(resources,{grade:controls.grade.value});
  options(controls.course,byGrade.map(r=>r.courseId),'全部课程',courseLabel);
  options(controls.teacher,filterResources(byGrade,{course:controls.course.value}).flatMap(r=>r.teachers),'全部教师');
  options(controls.semester,resources.map(r=>r.semester),'全部学期');
}
function syncCourses() {
  options(courseControls.semester,catalog.offerings.map(o=>o.semesterKey),'全部学期');
  const bySemester=filterOfferings(catalog.offerings,{semester:courseControls.semester.value});
  options(courseControls.course,bySemester.map(o=>o.courseId),'全部课程',courseLabel);
  options(courseControls.teacher,filterOfferings(bySemester,{course:courseControls.course.value}).flatMap(o=>o.teachers),'全部教师');
}
function state(target,title,description,actionText,action) {
  const box=node('div','state');box.append(node('h3','',title),node('p','',description));
  if(actionText){const b=node('button','button',actionText);b.type='button';b.addEventListener('click',action);box.append(b);}
  $(target).replaceChildren(box);
}
function metadata(pairs) { const dl=node('dl','card-meta');for(const [label,value] of pairs){const row=node('div');row.append(node('dt','',label),node('dd','',value));dl.append(row);}return dl; }
function card(r) {
  const a=node('article','resource-card');a.append(node('p','card-type',TYPE_LABELS[r.type]),node('h3','',r.title));
  a.append(metadata([['课程',r.courseName],['年级',r.studentGrades.length?r.studentGrades.map(v=>v+'级').join('、'):'未注明'],['教师',r.teachers.join('、')||'未注明'],['学生班型',r.appliesToAllTracks?'通用':r.studentTrack.map(v=>TRACK_LABELS[v]).join('、')],['学期',r.semester||'未注明']]));
  a.append(node('p','card-description',r.description||'暂无补充说明'));
  if(r.type==='exam-recall')a.append(node('p','recall-note',`核实状态：${VERIFICATION_LABELS[r.verification]}。完整程度：${COMPLETENESS_LABELS[r.completeness]}。回忆来源：${r.recallSource||'未注明'}。非官方试题，内容可能存在遗漏或表述偏差；多人回忆一致不等于完全还原原题。`));
  const footer=node('div','card-footer'),link=node('a','button','免费获取 ↗');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`免费获取：${r.title}（在新标签页打开）`);
  footer.append(node('small','',`贡献者：${r.author}`),link);a.append(footer);return a;
}
function offeringCard(o) {
  const a=node('article','resource-card');a.append(node('p','card-type',`${o.academicYear}学年${o.semester}`),node('h3','',o.courseName));
  a.append(metadata([['课程代码',o.courseCode],['教师',o.teachers.join('、')||'教师待补充'],['授课安排',o.teachingArrangement==='sequential'?'轮流授课':o.teachingArrangement==='single'?'单教师':'未知'],['授课模式',MODE_LABELS[o.teachingMode]+(o.teachingModeStatus==='inferred'?'（推断，待核实）':'')],['学生班型',(o.studentTrack?.length?o.studentTrack:['unknown']).map(v=>v==='unknown'?'未知':TRACK_LABELS[v]||'未知').join('、')],['学生年级',o.studentGrades?.length?o.studentGrades.map(v=>v+'级').join('、'):'未注明'],['选课人数',o.enrollmentCount===null||o.enrollmentCount===undefined?'未知':String(o.enrollmentCount)],['学分 / 学时',`${o.credits??'未知'} / ${o.hours??'未知'}`]]));
  a.append(node('p','card-description',[o.campus,o.classTime].filter(Boolean).join('；')||'时间地点未注明'));
  const n=resources.filter(r=>r.offeringId===o.offeringId).length;
  a.append(node('p','small muted',`关联此开课记录的公开资料：${n} 份`));return a;
}
const values = controls => Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]));
function render() {
  if(resourceState!=='ready')return;
  const rows=filterResources(resources,{...values(controls),query:$('search').value});$('result-count').textContent=`共 ${rows.length} 份资料`;
  if(!resources.length)return state('results','资料库正在建设中，欢迎投稿第一批资料。','课程目录中的开课记录不代表已收录学习资料。','投稿资料 ↗',()=>{location.hash='contribute';});
  if(!rows.length)return state('results','暂时没有找到匹配的资料','试试其他关键词，或重置筛选条件。','重置筛选',reset);
  const grid=node('div','card-grid');grid.append(...rows.map(card));$('results').replaceChildren(grid);
}
function renderCourses() {
  if(courseState!=='ready')return;
  const rows=filterOfferings(catalog.offerings,{...values(courseControls),query:$('course-search').value});
  $('course-count').textContent=`共 ${rows.length} 条开课记录`;
  $('course-summary').textContent=`目录包含 ${catalog.courses.length} 个课程实体（其中 ${catalog.courses.filter(c=>c.identityStatus==='provisional').length} 个暂定），对应 ${catalog.offerings.length} 条开课记录。暂定实体尚未完成人工归并核实。`;
  if(!rows.length)return state('course-results','暂无匹配的开课记录','可尝试其他关键词或重置课程筛选。','重置课程筛选',resetCourses);
  const grid=node('div','card-grid');grid.append(...rows.map(offeringCard));$('course-results').replaceChildren(grid);
}
function reset(){Object.values(controls).forEach(c=>c.value='');$('search').value='';syncCascade();render();}
function resetCourses(){Object.values(courseControls).forEach(c=>c.value='');$('course-search').value='';syncCourses();renderCourses();}
async function json(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw new Error('加载失败');return r.json();}
async function loadResources(){
  resourceState='loading';$('results').setAttribute('aria-busy','true');$('result-count').textContent='正在加载资料…';
  try{resources=normalizeResources(await json('./data/resources.json'),catalog);resourceState='ready';syncCascade();render();renderCourses();}
  catch{resourceState='error';$('result-count').textContent='资料暂时无法加载';state('results','资料加载失败','请检查网络后重试；也可通过项目邮箱反馈。','重新加载资料',loadResources);}
  finally{$('results').setAttribute('aria-busy','false');}
}
async function load(){
  courseState='loading';$('course-results').setAttribute('aria-busy','true');
  try{const [c,o]=await Promise.all([json('./data/courses.json'),json('./data/offerings.json')]);catalog=normalizeCatalog(c,o);courseState='ready';syncCourses();renderCourses();await loadResources();}
  catch{courseState='error';resourceState='error';$('course-count').textContent='课程暂时无法加载';$('result-count').textContent='关联数据暂时无法加载';
    state('course-results','课程加载失败','请检查网络或数据关联后重试。','重新加载目录',load);
    state('results','资料关联数据加载失败','暂不展示无法核实课程关联的资料。','重新加载目录',load);$('results').setAttribute('aria-busy','false');}
  finally{$('course-results').setAttribute('aria-busy','false');}
}
$('filters').addEventListener('submit',e=>e.preventDefault());$('course-filters').addEventListener('submit',e=>e.preventDefault());
Object.values(controls).forEach(c=>c.addEventListener('change',()=>{syncCascade();render();}));
Object.values(courseControls).forEach(c=>c.addEventListener('change',()=>{syncCourses();renderCourses();}));
$('search').addEventListener('input',render);$('course-search').addEventListener('input',renderCourses);
$('search-form').addEventListener('submit',e=>{e.preventDefault();render();$('library').scrollIntoView();});
$('reset').addEventListener('click',reset);$('course-reset').addEventListener('click',resetCourses);
document.querySelector('a[href="#course-directory"]').addEventListener('click',()=>{$('course-details').open=true;});
$('project-email').textContent=emailReady?PROJECT_EMAIL:'PROJECT_EMAIL（上线前待配置）';
if(emailReady){
  $('copy-email').disabled=false;
  $('submit-email').href=mailto('【资料投稿】学生年级-课程-教师-资料类型','课程名称：\n课程代码（如有）：\n学生年级（入学年，可多个）：\n学年学期：\n授课教师：\n学生班型（可多选：普通班/涉外班/吕振羽班/通用/未知）：\n资料类型：\n考试学期（回忆版填写）：\n资料完整程度（投稿者称完整但未独立验证/部分/未知）：\n核实状态（单人回忆/多人交叉核对/未知）：\n回忆来源说明：\n资料说明：\n署名方式：匿名（默认）/自定义昵称\n是否允许平台免费公开分享：\n资料来源及分享权限说明：\n是否存在保密或禁止传播要求：\n\n请在邮件客户端自行添加附件。');
  $('feedback-email').href=mailto('【版权或资料纠错反馈】资料名称','涉及资料名称或链接：\n问题说明：\n申请更正或下架的理由：\n');
  ['submit-email','feedback-email'].forEach(id=>$(id).removeAttribute('aria-disabled'));
}
$('copy-email').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(PROJECT_EMAIL);$('copy-status').textContent='邮箱已复制';}catch{$('copy-status').textContent=`无法自动复制，请选中邮箱地址手动复制：${PROJECT_EMAIL}`;}});
load();
