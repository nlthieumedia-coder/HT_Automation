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
  ["createBtn","captureBtn","savePresetBtn","deletePresetBtn","loadPresetBtn"].forEach(id=>$(id).disabled=busy);
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
function updatePathCount() { $("pathCount").textContent=`${parsePaths($("structureInput").value).length} đường dẫn`; }

function refreshPresetSelect(name) {
  const select=$("presetSelect"), presets=getAllPresets(); select.innerHTML="";
  presets.forEach((preset,index)=>{ const option=document.createElement("option"); option.value=String(index); option.textContent=`${preset.builtin?"★ ":""}${preset.name}`; select.appendChild(option); });
  const found=name?presets.findIndex(p=>p.name===name):0; select.value=String(found>=0?found:0); loadSelectedPreset(false);
}
function loadSelectedPreset(writeLog=true) { const preset=getAllPresets()[Number($("presetSelect").value||0)]; if(!preset)return; $("structureInput").value=preset.paths.join("\n"); $("presetName").value=preset.builtin?"":preset.name; updatePathCount(); if(writeLog)log(`Đã nạp preset: ${preset.name}`); }
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
async function captureCurrentStructure() { setBusy(true); try{ const project=await getActiveProject(),paths=await collectBinPaths(await project.getRootItem()); paths.sort((a,b)=>a.localeCompare(b)); $("structureInput").value=paths.join("\n"); updatePathCount(); log(`Đã lấy ${paths.length} đường dẫn từ ${project.name}.`,"success"); }catch(error){log(`Lỗi: ${error.message||error}`,"error");}finally{setBusy(false);} }
function savePreset(){ const name=$("presetName").value.trim(),paths=parsePaths($("structureInput").value); if(!name)return log("Hãy nhập tên preset.","error"); if(!paths.length)return log("Preset cần ít nhất một đường dẫn.","error"); if(DEFAULT_PRESETS.some(p=>p.name.toLowerCase()===name.toLowerCase()))return log("Tên này thuộc preset mặc định.","error"); const custom=loadCustomPresets(),index=custom.findIndex(p=>p.name.toLowerCase()===name.toLowerCase()); const value={name,paths}; if(index>=0)custom[index]=value;else custom.push(value); saveCustomPresets(custom); refreshPresetSelect(name); log(`Đã lưu preset: ${name}.`,"success"); }
function deletePreset(){ const selected=getAllPresets()[Number($("presetSelect").value||0)]; if(!selected)return; if(selected.builtin)return log("Không thể xóa preset mặc định.","error"); saveCustomPresets(loadCustomPresets().filter(p=>p.name!==selected.name)); refreshPresetSelect(); log(`Đã xóa preset: ${selected.name}.`,"success"); }
async function updateOverview(){ $("presetCountState").textContent=String(getAllPresets().length); try{ const project=await getActiveProject(),paths=await collectBinPaths(await project.getRootItem()); $("premiereState").textContent="Đã kết nối"; $("projectState").textContent=project.name||"Đang mở"; $("binCountState").textContent=String(paths.length); }catch(_){ $("premiereState").textContent="Chưa có project"; $("projectState").textContent="Mở project để bắt đầu"; $("binCountState").textContent="—"; } }
function activatePage(name){ document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===`page-${name}`)); document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===name)); if(name==="overview")updateOverview(); }
function saveSettings(){ localStorage.setItem(SETTINGS_KEY,JSON.stringify({sortPaths:$("sortPathsSetting").checked})); log("Đã lưu cài đặt."); }

window.addEventListener("load",()=>{
  refreshPresetSelect(); const settings=readJson(SETTINGS_KEY,{sortPaths:true}); $("sortPathsSetting").checked=settings.sortPaths!==false; updateOverview();
  document.querySelectorAll(".tab").forEach(x=>x.addEventListener("click",()=>activatePage(x.dataset.page))); document.querySelectorAll("[data-open-builder]").forEach(x=>x.addEventListener("click",()=>activatePage("builder")));
  $("loadPresetBtn").addEventListener("click",()=>loadSelectedPreset()); $("presetSelect").addEventListener("change",()=>loadSelectedPreset()); $("structureInput").addEventListener("input",updatePathCount); $("createBtn").addEventListener("click",createBinsFromEditor); $("captureBtn").addEventListener("click",captureCurrentStructure); $("savePresetBtn").addEventListener("click",savePreset); $("deletePresetBtn").addEventListener("click",deletePreset); $("refreshOverviewBtn").addEventListener("click",updateOverview); $("sortPathsSetting").addEventListener("change",saveSettings); $("toggleLogBtn").addEventListener("click",()=>$("logBody").hidden=!$("logBody").hidden); $("clearLogBtn").addEventListener("click",()=>{$("statusLog").textContent="Sẵn sàng.";setResult("Sẵn sàng");});
});
