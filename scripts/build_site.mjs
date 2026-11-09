import {mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateRelease} from './validate_release.mjs';
export const PUBLIC_FILES=['index.html','css/style.css','js/app.js','js/resources.js','js/config.js','data/resources.json','data/courses.json','data/offerings.json'];
export async function buildSite(destination,source='.'){
  await validateRelease(source);
  const target=resolve(destination);
  await mkdir(target,{recursive:true});
  if((await readdir(target)).length)throw new Error('输出目录必须为空，避免遗留私密文件');
  for(const file of PUBLIC_FILES){const out=resolve(target,file);await mkdir(dirname(out),{recursive:true});await copyFile(resolve(source,file),out);}
  return PUBLIC_FILES;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('用法：node scripts/build_site.mjs 空输出目录');
  console.log((await buildSite(process.argv[2])).join('\n'));
}
