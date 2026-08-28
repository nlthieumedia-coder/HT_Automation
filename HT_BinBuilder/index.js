/** @type {import('@adobe/premierepro').premierepro} */
const ppro = require("premierepro");
const STORAGE_KEY = "htBinBuilder.customPresets.v1";
const SETTINGS_KEY = "htBinBuilder.settings.v1";

const DEFAULT_PRESETS = [
  { name:"YouTube Documentary", builtin:true, paths:["01_FOOTAGE","01_FOOTAGE/RAW","01_FOOTAGE/BROLL","01_FOOTAGE/STOCK","01_FOOTAGE/ARCHIVE","02_AUDIO","02_AUDIO/VOICE_OVER","02_AUDIO/MUSIC","02_AUDIO/SFX","03_GRAPHICS","03_GRAPHICS/PNG","03_GRAPHICS/MOGRT","03_GRAPHICS/OVERLAY","04_SEQUENCE","04_SEQUENCE/MAIN","04_SEQUENCE/NEST","04_SEQUENCE/EXPORT","05_EXPORT","06_ARCHIVE"] },
  { name:"YouTube Shorts", builtin:true, paths:["01_FOOTAGE","01_FOOTAGE/RAW","01_FOOTAGE/BROLL","02_AUDIO","02_AUDIO/VOICE_OVER","02_AUDIO/MUSIC","02_AUDIO/SFX","03_GRAPHICS","03_GRAPHICS/CAPTIONS","03_GRAPHICS/OVERLAY","04_SEQUENCE","04_SEQUENCE/MAIN_9x16","04_SEQUENCE/EXPORT","05_EXPORT"] },
  { name:"Client Project", builtin:true, paths:["00_ADMIN","01_FOOTAGE","01_FOOTAGE/CAM_A","01_FOOTAGE/CAM_B","01_FOOTAGE/BROLL","02_AUDIO","02_AUDIO/LOCATION","02_AUDIO/MUSIC","02_AUDIO/SFX","03_GRAPHICS","03_GRAPHICS/BRAND","03_GRAPHICS/MOGRT","04_SEQUENCE","04_SEQUENCE/EDIT","04_SEQUENCE/REVIEW","04_SEQUENCE/MASTER","05_EXPORT","06_DELIVERY"] }
];
const $ = id => document.getElementById(id);

function log(message, kind="neutral") {
  const stamp = new Date().toLocaleTimeString("vi-VN");
  const el = $("statusLog");
  el.textContent = `${el.textContent}\n[${stamp}] ${message}`.split("\n").slice(-200).join("\n");
  el.scrollTop = el.scrollHeight;
  if (kind !== "neutral") setResult(message, kind);
  console.log(`[HT_BinBuilder] ${message}`);
}
function setResult(text, kind="neutral") { const el=$("resultBadge"); el.textContent=text.length>28?`${text.slice(0,25)}…`:text; el.className=`result ${kind}`; }
function setBusy(busy) {
  ["createBtn","captureBtn","savePresetBtn","deletePresetBtn","loadPresetBtn"].forEach(id=>{const el=$(id);el.classList.toggle("disabled",busy);el.setAttribute("aria-disabled",String(busy));});
  $("createBtn").textContent=busy?"Đang tạo cấu trúc…":"Tạo cấu trúc Bin";
  $("progressWrap").hidden=!busy;
  if (busy) setResult("Đang xử lý", "busy");
}
function setProgress(done,total,label) { const percent=total?Math.round(done/total*100):0; $("progressBar").style.width=`${percent}%`; $("progressText").textContent=label||`${percent}%`; }
function readJson(key,fallback) { try { return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)); } catch (_) { return fallback; } }
function loadCustomPresets() { const value=readJson(STORAGE_KEY,[]); return Array.isArray(value)?value:[]; }
function saveCustomPresets(value) { localStorage.setItem(STORAGE_KEY,JSON.stringify(value)); updateOverview(); }
function getAllPresets() { return [...DEFAULT_PRESETS,...loadCustomPresets().map(p=>({...p,builtin:false}))]; }
function parsePaths(text) { return [...new Set(text.split(/\r?\n/).map(x=>x.trim().replace(/\\/g,"/")).map(x=>x.split("/").map(y=>y.trim()).filter(Boolean).join("/")).filter(Boolean))]; }
function updatePathCount() {
  const count=parsePaths($("structureInput").value).length;
  $("pathCount").textContent=`${count} Bin`;
  if($("savePresetSummary")) $("savePresetSummary").textContent=`${count} Bin trong cấu trúc`;
  const note=$("structureValidation");
  if(note){ note.className=`inline-note ${count?"success":"error"}`; note.innerHTML=count?"<span>✓</span><span>Cấu trúc hợp lệ và sẵn sàng.</span>":"<span>!</span><span>Hãy thêm ít nhất một đường dẫn Bin.</span>"; }
  renderBinTree();
}

let selectedBinPath="";
function getStructurePaths(){ return parsePaths($("structureInput").value); }
function setStructurePaths(paths){ $("structureInput").value=[...new Set(paths)].sort((a,b)=>a.split("/").length-b.split("/").length||a.localeCompare(b)).join("\n"); updatePathCount(); }
function cleanBinName(value){ return String(value||"").trim().replace(/[\\/]+/g,"_"); }
function renderBinTree(){
  const tree=$("binTree"); if(!tree)return; const paths=getStructurePaths();
  if(selectedBinPath&&!paths.includes(selectedBinPath))selectedBinPath="";
  tree.innerHTML=""; $("treeEmptyState").hidden=paths.length>0; tree.hidden=paths.length===0;
  const directChildren=new Map(); paths.forEach(path=>{const parent=path.includes("/")?path.slice(0,path.lastIndexOf("/")):"";directChildren.set(parent,(directChildren.get(parent)||0)+1);});
  paths.forEach(path=>{
    const depth=path.split("/").length-1,name=path.split("/").pop(),row=document.createElement("div"); row.className=`tree-item${path===selectedBinPath?" selected":""}`; row.dataset.path=path; row.style.paddingLeft=`${8+depth*18}px`; row.setAttribute("role","treeitem"); row.setAttribute("aria-level",String(depth+1));
    const branch=document.createElement("span"); branch.className="tree-branch"; branch.textContent=depth?"└":"";
    const icon=document.createElement("span"); icon.className="folder-icon"; icon.textContent="▰";
    const label=document.createElement("span"); label.className="tree-name"; label.textContent=name;
    const count=directChildren.get(path)||0,meta=document.createElement("span"); meta.className="child-count"; meta.textContent=count?`${count} con`:"";
    row.append(branch,icon,label,meta); row.addEventListener("click",()=>selectBinPath(path)); tree.appendChild(row);
  });
  $("selectedBinLabel").textContent=selectedBinPath?`Đang chọn: ${selectedBinPath}`:"Chọn một Bin để thêm Bin con";
}
function selectBinPath(path){ selectedBinPath=path; $("binNameInput").value=path.split("/").pop(); renderBinTree(); }
function addBin(asChild){
  const name=cleanBinName($("binNameInput").value); if(!name)return log("Hãy nhập tên Bin trước khi thêm.","error");
  if(asChild&&!selectedBinPath)return log("Hãy chọn Bin cha trong cây trước.","error");
  const path=asChild?`${selectedBinPath}/${name}`:name,paths=getStructurePaths(); if(paths.includes(path))return log(`Bin ${path} đã có trong cấu trúc.`,"error");
  paths.push(path); setStructurePaths(paths); selectedBinPath=path; $("binNameInput").value=""; renderBinTree(); log(`Đã thêm ${asChild?"Bin con":"Bin gốc"}: ${path}.`);
}
function renameSelectedBin(){
  if(!selectedBinPath)return log("Hãy chọn Bin cần đổi tên.","error"); const name=cleanBinName($("binNameInput").value); if(!name)return log("Nhập tên mới vào ô phía trên.","error");
  const old=selectedBinPath,parent=old.includes("/")?old.slice(0,old.lastIndexOf("/")):"",next=parent?`${parent}/${name}`:name,paths=getStructurePaths();
  if(next!==old&&paths.includes(next))return log(`Tên ${next} đã tồn tại.`,"error");
  setStructurePaths(paths.map(path=>path===old?next:path.startsWith(`${old}/`)?`${next}${path.slice(old.length)}`:path)); selectedBinPath=next; renderBinTree(); log(`Đã đổi tên ${old} thành ${next}.`);
}
function deleteSelectedBin(){
  if(!selectedBinPath)return log("Hãy chọn Bin cần xóa.","error"); const old=selectedBinPath,paths=getStructurePaths(),removed=paths.filter(path=>path===old||path.startsWith(`${old}/`)).length;
  setStructurePaths(paths.filter(path=>path!==old&&!path.startsWith(`${old}/`))); selectedBinPath=""; $("binNameInput").value=""; renderBinTree(); log(`Đã xóa ${old} và ${removed-1} Bin con khỏi cấu trúc.`);
}

let currentBuilderStep=1;
async function updateReview(){
  const paths=parsePaths($("structureInput").value),preset=getAllPresets()[Number($("presetSelect").value||0)];
  $("reviewPathCount").textContent=String(paths.length); $("reviewPreset").textContent=preset?preset.name:"Tùy chỉnh";
  $("reviewPreview").textContent=paths.slice(0,12).join("\n")+(paths.length>12?`\n… và ${paths.length-12} đường dẫn khác`:"");
  try{$("reviewProject").textContent=(await getActiveProject()).name||"Project đang mở";}catch(_){$("reviewProject").textContent="Chưa mở project";}
}
async function goBuilderStep(step){
  let target=Math.max(1,Math.min(3,Number(step)||1));
  if(target>1&&!parsePaths($("structureInput").value).length){ log("Hãy chọn hoặc nhập ít nhất một đường dẫn Bin.","error"); target=2; }
  currentBuilderStep=target;
  document.querySelectorAll("[data-wizard-panel]").forEach(panel=>panel.classList.toggle("active",Number(panel.dataset.wizardPanel)===target));
  document.querySelectorAll("[data-builder-step]").forEach(button=>{const number=Number(button.dataset.builderStep);button.classList.toggle("active",number===target);button.classList.toggle("done",number<target);});
  const lines=document.querySelectorAll(".stepper > i"); lines.forEach((line,index)=>line.classList.toggle("done",index<target-1));
  if(target===3)await updateReview();
}

function refreshPresetSelect(name) {
  const select=$("presetSelect"), presets=getAllPresets(); select.innerHTML="";
  presets.forEach((preset,index)=>{ const option=document.createElement("option"); option.value=String(index); option.textContent=`${preset.builtin?"★ ":""}${preset.name}`; select.appendChild(option); });
  const found=name?presets.findIndex(p=>p.name===name):0; select.value=String(found>=0?found:0); loadSelectedPreset(false);
}
function loadSelectedPreset(writeLog=true) { const preset=getAllPresets()[Number($("presetSelect").value||0)]; if(!preset)return; selectedBinPath=""; $("structureInput").value=preset.paths.join("\n"); $("presetName").value=preset.builtin?"":preset.name; updatePathCount(); if(writeLog)log(`Đã nạp preset: ${preset.name}`); }
async function getActiveProject() { const project=await ppro.Project.getActiveProject(); if(!project)throw new Error("Không có Premiere project đang mở."); return project; }
async function findChildBin(parent,name) { for(const item of await parent.getItems()){ if(item.name===name){ const folder=ppro.FolderItem.cast(item); if(folder)return folder; } } return null; }
async function ensureBin(project,parent,name) {
  let folder=await findChildBin(parent,name); if(folder)return{folder,created:false}; let success=false;
  project.lockedAccess(()=>{ success=project.executeTransaction(action=>action.addAction(parent.createBinAction(name,true)),`Tạo Bin: ${name}`); });
  if(!success)throw new Error(`Premiere từ chối tạo Bin: ${name}`); folder=await findChildBin(parent,name); if(!folder)throw new Error(`Không tìm thấy Bin vừa tạo: ${name}`); return{folder,created:true};
}
async function ensurePath(project,root,path) { let parent=root,created=0; for(const part of path.split("/").filter(Boolean)){ const result=await ensureBin(project,parent,part); parent=result.folder; if(result.created)created++; } return created; }
async function collectBinPaths(folder,prefix="") { const result=[]; for(const item of await folder.getItems()){ const child=ppro.FolderItem.cast(item); if(!child)continue; const path=prefix?`${prefix}/${item.name}`:item.name; result.push(path,...await collectBinPaths(child,path)); } return result; }

async function createBinsFromEditor() {
  let paths=parsePaths($("structureInput").value); if(!paths.length){log("Chưa có đường dẫn Bin để tạo.","error");return;}
  const settings=readJson(SETTINGS_KEY,{sortPaths:true}); if(settings.sortPaths)paths.sort((a,b)=>a.split("/").length-b.split("/").length||a.localeCompare(b));
  setBusy(true); try { const project=await getActiveProject(),root=await project.getRootItem(); let created=0; log(`Bắt đầu xử lý ${paths.length} đường dẫn trong ${project.name}.`);
    for(let i=0;i<paths.length;i++){ setProgress(i,paths.length,`${i+1}/${paths.length}: ${paths[i]}`); created+=await ensurePath(project,root,paths[i]); }
    setProgress(paths.length,paths.length,"Hoàn tất"); log(`Hoàn tất: tạo ${created} Bin mới, giữ nguyên các Bin đã tồn tại.`,"success"); await updateOverview();
  } catch(error){ log(`Lỗi: ${error.message||error}`,"error"); $("logBody").hidden=false; } finally { setBusy(false); }
}
async function captureCurrentStructure() { setBusy(true); try{ const project=await getActiveProject(),paths=await collectBinPaths(await project.getRootItem()); paths.sort((a,b)=>a.localeCompare(b)); selectedBinPath=""; $("structureInput").value=paths.join("\n"); updatePathCount(); log(`Đã lấy ${paths.length} đường dẫn từ ${project.name}.`,"success"); await goBuilderStep(2); }catch(error){log(`Lỗi: ${error.message||error}`,"error");}finally{setBusy(false);} }
function savePreset(){ const name=$("presetName").value.trim(),paths=parsePaths($("structureInput").value); if(!name)return log("Hãy nhập tên preset.","error"); if(!paths.length)return log("Preset cần ít nhất một đường dẫn.","error"); if(DEFAULT_PRESETS.some(p=>p.name.toLowerCase()===name.toLowerCase()))return log("Tên này thuộc preset mặc định.","error"); const custom=loadCustomPresets(),index=custom.findIndex(p=>p.name.toLowerCase()===name.toLowerCase()); const value={name,paths}; if(index>=0)custom[index]=value;else custom.push(value); saveCustomPresets(custom); refreshPresetSelect(name); log(`Đã lưu preset: ${name}.`,"success"); }
function deletePreset(){ const selected=getAllPresets()[Number($("presetSelect").value||0)]; if(!selected)return; if(selected.builtin)return log("Không thể xóa preset mặc định.","error"); saveCustomPresets(loadCustomPresets().filter(p=>p.name!==selected.name)); refreshPresetSelect(); log(`Đã xóa preset: ${selected.name}.`,"success"); }
async function updateOverview(){ $("presetCountState").textContent=String(getAllPresets().length); try{ const project=await getActiveProject(),paths=await collectBinPaths(await project.getRootItem()); $("premiereState").textContent="Đã kết nối"; $("projectState").textContent=project.name||"Đang mở"; $("binCountState").textContent=String(paths.length); $("headerStatusDot").className="status-dot active"; }catch(_){ $("premiereState").textContent="Chưa có project"; $("projectState").textContent="Mở project để bắt đầu"; $("binCountState").textContent="—"; $("headerStatusDot").className="status-dot error"; } }
function activatePage(name){ document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===`page-${name}`)); document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===name)); if(name==="overview")updateOverview(); if(name==="builder")goBuilderStep(currentBuilderStep); }
function saveSettings(){ localStorage.setItem(SETTINGS_KEY,JSON.stringify({sortPaths:$("sortPathsSetting").checked})); log("Đã lưu cài đặt."); }

window.addEventListener("load",()=>{
  refreshPresetSelect(); const settings=readJson(SETTINGS_KEY,{sortPaths:true}); $("sortPathsSetting").checked=settings.sortPaths!==false; updateOverview();
  document.querySelectorAll(".tab").forEach(x=>x.addEventListener("click",()=>activatePage(x.dataset.page))); document.querySelectorAll("[data-open-builder]").forEach(x=>x.addEventListener("click",()=>activatePage("builder")));
  $("loadPresetBtn").addEventListener("click",()=>loadSelectedPreset()); $("presetSelect").addEventListener("change",()=>loadSelectedPreset()); $("structureInput").addEventListener("input",updatePathCount); $("createBtn").addEventListener("click",createBinsFromEditor); $("captureBtn").addEventListener("click",captureCurrentStructure); $("savePresetBtn").addEventListener("click",savePreset); $("deletePresetBtn").addEventListener("click",deletePreset); $("refreshOverviewBtn").addEventListener("click",updateOverview); $("sortPathsSetting").addEventListener("change",saveSettings); $("toggleLogBtn").addEventListener("click",()=>$("logBody").hidden=!$("logBody").hidden); $("clearLogBtn").addEventListener("click",()=>{$("statusLog").textContent="Sẵn sàng.";setResult("Sẵn sàng");});
  $("step1NextBtn").addEventListener("click",()=>goBuilderStep(2)); $("step2BackBtn").addEventListener("click",()=>goBuilderStep(1)); $("step2NextBtn").addEventListener("click",()=>goBuilderStep(3)); $("step3BackBtn").addEventListener("click",()=>goBuilderStep(2));
  document.querySelectorAll("[data-builder-step]").forEach(button=>button.addEventListener("click",()=>{const step=Number(button.dataset.builderStep);if(step<=currentBuilderStep)goBuilderStep(step);}));
  $("addRootBinBtn").addEventListener("click",()=>addBin(false)); $("addChildBinBtn").addEventListener("click",()=>addBin(true)); $("renameBinBtn").addEventListener("click",renameSelectedBin); $("deleteBinBtn").addEventListener("click",deleteSelectedBin);
  $("binNameInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addBin(Boolean(selectedBinPath));}});
  $("toggleAdvancedEditorBtn").addEventListener("click",()=>{const editor=$("advancedEditor"),opening=editor.hidden;editor.hidden=!opening;$("advancedArrow").textContent=opening?"▴":"▾";});
  $("openSavePresetBtn").addEventListener("click",()=>activatePage("presets"));
  document.querySelectorAll("[data-preset-name]").forEach(button=>button.addEventListener("click",()=>{$("presetName").value=button.dataset.presetName;}));
  document.querySelectorAll('[role="button"]').forEach(control=>control.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&control.getAttribute("aria-disabled")!=="true"){event.preventDefault();control.click();}}));
  goBuilderStep(1);
});
