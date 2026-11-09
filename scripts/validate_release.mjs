import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeCatalog,normalizeResources,MODE_LABELS,TRACK_LABELS} from '../js/resources.js';

const COURSE_FIELDS = 'courseId courseName department courseCodes identityStatus'.split(' ');
const OFFERING_FIELDS = 'offeringId courseId courseCode academicYear semester semesterKey academicPeriodSource teachers teacherRaw teachingArrangement teachingArrangementSource enrollmentCount teachingMode teachingModeStatus teachingModeSource classTime campus credits hours studentTrack studentGrades sourceRow sourceSheet sourceHash'.split(' ');
const RESOURCE_FIELDS = 'resourceId id title courseId offeringId course teacher teachers studentGrades grades studentTrack classType appliesToAllTracks type semester verification completeness recallSource description author url status sourcePermission sharingRestriction'.split(' ');
function checkFields(rows, allowed, label) {
  if (!Array.isArray(rows)) throw new Error(`${label}必须为数组`);
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key=>!allowed.includes(key))) {
      throw new Error(`${label}含非公开字段或无效对象；请在私有审核材料中保存额外信息`);
    }
    for (const [key,value] of Object.entries(row)) {
      const arrayField=['courseCodes','teachers','studentGrades','studentTrack','grades'].includes(key) || key==='classType' && Array.isArray(value);
      const valid=arrayField ? Array.isArray(value) && value.every(v=>typeof v==='string')
        : key==='appliesToAllTracks' ? typeof value==='boolean'
        : ['enrollmentCount','credits','hours'].includes(key) ? value===null || typeof value==='number' && Number.isFinite(value) && value>=0
        : key==='sourceRow' ? Number.isInteger(value) && value>0
        : typeof value==='string';
      if (!valid) throw new Error(`${label}字段类型无效；不允许嵌套私密对象`);
    }
  }
}
export function validatePublicData(courses, offerings, resources) {
  checkFields(courses,COURSE_FIELDS,'课程');
  checkFields(offerings,OFFERING_FIELDS,'开课记录');
  checkFields(resources,RESOURCE_FIELDS,'资料');
  const catalog = normalizeCatalog(courses,offerings);
  for (const c of courses) {
    if (!Array.isArray(c.courseCodes) || !c.courseCodes.length || c.courseCodes.some(v=>typeof v!=='string' || !v.trim()) || !['provisional','confirmed'].includes(c.identityStatus)) throw new Error('课程代码或核实状态无效');
  }
  for (const o of offerings) {
    const course = courses.find(c=>c.courseId===o.courseId);
    if (!course.courseCodes.includes(o.courseCode) || !Array.isArray(o.teachers) || o.teachers.some(v=>typeof v!=='string' || !v.trim()) || typeof o.teacherRaw!=='string') throw new Error('开课代码或教师字段无效');
    if (!Object.hasOwn(MODE_LABELS,o.teachingMode) || !['unknown','inferred','confirmed'].includes(o.teachingModeStatus) || (o.teachingMode==='unknown') !== (o.teachingModeStatus==='unknown')) throw new Error('授课模式与核实状态不一致');
    if (!Array.isArray(o.studentTrack) || !o.studentTrack.length || o.studentTrack.some(v=>!Object.hasOwn(TRACK_LABELS,v)) || !Array.isArray(o.studentGrades)) throw new Error('班型或学生年级字段无效');
  }
  // Reject the entire publication: filtering in the browser cannot protect the raw JSON.
  if (normalizeResources(resources,catalog).length !== resources.length) throw new Error('公开资料含未审核、未授权、禁止传播、重复标识或无效关联/链接；构建已停止');
  return {courses:courses.length,offerings:offerings.length,resources:resources.length};
}
export async function validateRelease(root='.') {
  const data = await Promise.all(['courses','offerings','resources'].map(async name=>JSON.parse(await readFile(resolve(root,`data/${name}.json`),'utf8'))));
  return validatePublicData(...data);
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) console.log(await validateRelease());
