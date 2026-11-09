export const TYPE_LABELS = { ppt: '课程PPT', 'exam-recall': '期末试题回忆版', other: '其他' };
export const TRACK_LABELS = { ordinary: '普通班', foreign: '涉外班', lvzhenyu: '吕振羽班', unknown: '未注明' };
export const MODE_LABELS = { large: '大班授课', small: '小班授课', unknown: '待核实' };
export const VERIFICATION_LABELS = { 'single-recall': '单人回忆', 'multiple-recall': '多人交叉核对', unknown: '未知' };
export const COMPLETENESS_LABELS = { 'complete-claimed': '投稿者称完整，尚未独立验证', partial: '部分回忆', unknown: '未知' };
const text = value => typeof value === 'string' ? value.trim() : '';
const strings = value => Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
export function normalizeTracks(value) {
  const aliases = { '普通班':'ordinary','常规班':'ordinary','涉外班':'foreign','涉外法治人才试验班':'foreign','吕振羽班':'lvzhenyu','吕振羽班（法学）':'lvzhenyu' };
  const result = strings(Array.isArray(value) ? value : [value]).map(v => Object.hasOwn(TRACK_LABELS,v) ? v : aliases[v] || 'unknown');
  return result.length ? [...new Set(result)] : ['unknown'];
}
export function safeUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return '';
  try { const u = new URL(value.trim()); return ['http:', 'https:'].includes(u.protocol) && u.hostname && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export function normalizeCatalog(courseData, offeringData) {
  if (!Array.isArray(courseData) || !Array.isArray(offeringData)) throw new Error('课程目录格式错误');
  const courseIds = new Set(), offeringIds = new Set();
  const courses = courseData.map(c => {
    if (!c || !text(c.courseId) || !text(c.courseName) || courseIds.has(c.courseId)) throw new Error('课程标识缺失或重复');
    courseIds.add(c.courseId);
    return {...c, courseCodes:strings(c.courseCodes)};
  });
  const offerings = offeringData.map(o => {
    if (!o || !text(o.offeringId) || offeringIds.has(o.offeringId) || !courseIds.has(o.courseId)) throw new Error('开课记录标识或关联错误');
    offeringIds.add(o.offeringId);
    const course = courses.find(c => c.courseId === o.courseId);
    return {...o, courseName:course.courseName, courseCodes:course.courseCodes, teachers:Array.isArray(o.teachers) ? o.teachers.map(text).filter(Boolean) : [],
      semesterKey:text(o.semesterKey), teachingMode:Object.hasOwn(MODE_LABELS,o.teachingMode) ? o.teachingMode : 'unknown'};
  });
  return { courses, offerings };
}
// Original resource objects are never mutated. Legacy fields remain readable during reviewed migration.
export function normalizeResources(data, catalog = {courses:[],offerings:[]}) {
  if (!Array.isArray(data)) throw new Error('资料目录格式错误');
  const ids = new Set();
  return data.flatMap(r => {
    if (!r || r.status !== 'published' || r.sourcePermission !== 'confirmed' || r.sharingRestriction === 'prohibited' || r.demo === true) return [];
    const resourceId = text(r.resourceId || r.id), title = text(r.title), url = safeUrl(r.url);
    if (!resourceId || !title || !url || ids.has(resourceId) || /\bDEMO\b/i.test(title)) return [];
    const course = catalog.courses.find(c => c.courseId === r.courseId);
    const offering = catalog.offerings.find(o => o.offeringId === r.offeringId);
    if (r.courseId && !course || r.offeringId && (!offering || offering.courseId !== r.courseId)) return [];
    if (!course && !text(r.course)) return [];
    ids.add(resourceId);
    return [{...r, resourceId, title, url, courseId:course?.courseId || `legacy:${r.course}`,
      courseName:course?.courseName || r.course, courseCodes:offering ? [offering.courseCode] : course?.courseCodes || [],
      teachers:offering?.teachers || strings(r.teachers || (r.teacher ? [r.teacher] : [])),
      studentGrades:strings(r.studentGrades || r.grades), studentTrack:normalizeTracks(r.studentTrack || r.classType),
      appliesToAllTracks:r.appliesToAllTracks === true,
      type:Object.hasOwn(TYPE_LABELS,r.type) ? r.type : 'other', semester:text(r.semester) || offering?.semesterKey || '',
      verification:Object.hasOwn(VERIFICATION_LABELS,r.verification) ? r.verification : 'unknown',
      completeness:Object.hasOwn(COMPLETENESS_LABELS,r.completeness) ? r.completeness : 'unknown',
      recallSource:text(r.recallSource), description:text(r.description), author:text(r.author) || '匿名'}];
  });
}
const matchQuery = (values, query) => !query || values.some(v => text(v).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
export function filterResources(resources, f = {}) {
  return resources.filter(r => (!f.grade || r.studentGrades.includes(f.grade)) && (!f.course || r.courseId === f.course) &&
    (!f.teacher || r.teachers.includes(f.teacher)) && (!f.type || r.type === f.type) &&
    (!f.studentTrack || (r.appliesToAllTracks && f.studentTrack !== 'unknown') || r.studentTrack.includes(f.studentTrack)) &&
    (!f.semester || r.semester === f.semester) && matchQuery([r.title,r.courseName,...r.courseCodes,...r.teachers,r.description],f.query));
}
export function filterOfferings(offerings, f = {}) {
  return offerings.filter(o => (!f.semester || o.semesterKey === f.semester) && (!f.course || o.courseId === f.course) &&
    (!f.teacher || o.teachers.includes(f.teacher)) && (!f.teachingMode || o.teachingMode === f.teachingMode) &&
    matchQuery([o.courseName,o.courseCode,...o.teachers],f.query));
}
