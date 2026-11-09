# JLU Law Share

吉林大学法学院学生自发建设的免费学习资料共享网站，非学校或法学院官方平台。学习资料采用邮箱投稿、人工审核，默认匿名署名。

## 使用与维护

使用任意静态 HTTP 服务预览本目录，例如 `python -m http.server 8000 --bind 127.0.0.1`，再访问本地服务。直接打开 HTML 文件无法加载 JSON 数据。

网站由 HTML、CSS、原生 JavaScript 和 JSON 构成，无运行时依赖。投稿联系方式统一配置在 `js/config.js` 的 `PROJECT_EMAIL`；不填写私人联系方式。未设置源码入口，页面不链接维护者个人账号。

课程与资料是独立目录：

| 文件 | 内容 |
| --- | --- |
| data/courses.json | 课程实体，courseId 唯一，courseCodes 保存课程代码 |
| data/offerings.json | 具体开课记录，通过 courseId 关联课程 |
| data/resources.json | 经审核并授权公开的学习资料，可关联某条 offeringId |

当前课程目录包含 108 条开课记录、95 个暂定课程实体；暂定实体尚未完成人工归并核实。同名、同代码的开课记录分别保留，不覆盖、不拆分多教师记录。13 条教师信息缺失，38 条为多教师轮流授课。资料库当前为空，课程记录不代表已有学习资料。

教师按原顺序显示，缺失时显示“教师待补充”。授课模式 large/small/unknown 分别代表大班、小班、待核实；当前 11 条大班和 41 条小班均为推断，56 条模式未知。推断规则为选课人数至少 200 暂推大班、同名多条且人数在 1—199 暂推小班，其余未知。这些推断均待核实，不能作为学生班型依据。

学生班型 ordinary/foreign/lvzhenyu/unknown 与授课模式独立，当前全部未知。学生年级 studentGrades 仅来自投稿者填写或人工核实，不能由开课学期推算。当前开课学期来自资料提供者说明，原课表没有学期字段。

资料可同时关联多个学生年级和班型；通用资料设 appliesToAllTracks=true，仅保留一份。没有具体开课关联时不自动继承其他开课记录的教师。旧 id/grades/course/teacher/classType 字段保持读取兼容，仍须核实分享权限。

## 公开资料规则

审核草稿、投稿附件、私人联系方式和内部备注只保存在私有工作材料中，不放入本仓库。JSON 可被直接下载，前端隐藏不能保护敏感内容。

公开资料必须有唯一 resourceId（旧数据可用 id）、title、有效 HTTP/HTTPS url、合法课程关联，以及 status=published 和 sourcePermission=confirmed；不得为禁止传播的内容。offeringId 若填写，必须属于 courseId。没有 courseId 的已审核旧资料须提供 course 名称。sourcePermission 标记须基于实际审核，脚本不能代替授权核实。

可选公开字段：studentGrades、studentTrack、appliesToAllTracks、teachers、type、semester、verification、completeness、recallSource、description、author、sharingRestriction。字段定义见 `scripts/validate_release.mjs`。新增字段先审阅公开必要性再调整白名单。含 pending、未确认授权、无效关联、危险链接、重复 ID 或额外字段的数据会使构建失败，不能静默过滤后发布。

回忆版试题不是官方试题。verification 取 single-recall/multiple-recall/unknown；completeness 取 complete-claimed/partial/unknown。多人回忆一致不等于完全还原原题，投稿者称完整也不等于已独立核实。

## 检查与构建

使用 Node.js 22 或更新版本，不需要 npm install：

```sh
npm run check
node scripts/build_site.mjs _site
```

输出目录必须为空。构建只复制明确列出的 8 个公开文件；原始课表、缓存、人工核对表、报告及测试材料均不进入站点。页面使用相对路径，可部署在项目子路径。

仓库需先完成发布审核并配置 Pages。批准部署后，在 Settings → Pages 选择 GitHub Actions，再手动运行 Deploy GitHub Pages 工作流。工作流仅接受手动触发，提交代码不会自动部署。[GitHub Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

部署后核验实际 Pages 地址、目录筛选、投稿邮件、移动布局和公开文件范围。未确认组织及 Pages 配置前，不宣称新站已上线。公开操作记录可能显示实际维护账号；网站的项目身份不表示平台内或操作记录的匿名。
