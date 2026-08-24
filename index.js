// ==== HT_Automation — v4.0: Premiere Pro UXP Plugin ====
// Tab 1: Ảnh + Âm thanh
// Tab 2: Video + Âm thanh (dùng HTTP Bridge gọi FFmpeg đổi tốc độ video khớp audio)

const { storage } = require("uxp");
const fs = storage.localFileSystem;
let ppro = null;
try {
  ppro = require("premierepro");
} catch (e) {
  console.warn("Module premierepro chưa sẵn sàng:", e.message);
}

async function runFfmpegProcess(exePath, args) {
  // Local Bridge HTTP Server (chạy ngầm port 19888)
  try {
    const response = await fetch("http://127.0.0.1:19888/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exePath, args })
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (netErr) {
    throw new Error(
      `Lỗi kết nối Server (${netErr.message}).\n` +
      `👉 Hãy chạy lại bộ cài một click để bật FFmpeg Bridge.`
    );
  }
}

// ---- Safe DOM Helpers ----
function getEl(id) {
  return document.getElementById(id);
}

function listen(id, eventName, callback) {
  const el = typeof id === "string" ? getEl(id) : id;
  if (el) {
    el.addEventListener(eventName, callback);
  } else {
    console.warn(`[HT_Automation] Element #${id} not found when attaching listener.`);
  }
}

function log(msg) {
  console.log(msg);
  const logEl = getEl("log");
  if (logEl) {
    logEl.textContent += "\n" + msg;
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function setBtnDisabled(btnId, disabled) {
  const btn = getEl(btnId);
  if (!btn) return;
  btn.disabled = disabled;
  if (disabled) {
    btn.setAttribute("disabled", "true");
    btn.classList.add("disabled");
  } else {
    btn.removeAttribute("disabled");
    btn.classList.remove("disabled");
  }
}

// ---- State chung ----
let imageFolder = null;
let audioFolder = null;
let videoFolder = null;
let videoAudioFolder = null;
let syncedSubfolderEntry = null;
let bundledFfmpegPath = "ffmpeg";

// Xác định FFmpeg theo thư mục plugin thay vì gắn cứng đường dẫn máy phát triển.
(async () => {
  try {
    if (typeof fs.getPluginFolder !== "function") return;
    const pluginFolder = await fs.getPluginFolder();
    if (!pluginFolder || !pluginFolder.nativePath) return;
    bundledFfmpegPath = `${pluginFolder.nativePath}\\bin\\ffmpeg.exe`;
    const inputEl = getEl("inputFfmpegPath");
    if (inputEl && !(inputEl.value || "").trim()) inputEl.value = bundledFfmpegPath;
  } catch (e) {}
})();

// ---- Tab Switcher ----
function activateTab(tab) {
  const isImage = tab === "image";
  const btnImg = getEl("tabBtnImage");
  const btnVid = getEl("tabBtnVideo");
  const pnlImg = getEl("tabPanelImage");
  const pnlVid = getEl("tabPanelVideo");

  if (btnImg) btnImg.classList.toggle("active", isImage);
  if (btnVid) btnVid.classList.toggle("active", !isImage);
  if (pnlImg) {
    pnlImg.classList.toggle("active", isImage);
    pnlImg.style.display = isImage ? "block" : "none";
  }
  if (pnlVid) {
    pnlVid.classList.toggle("active", !isImage);
    pnlVid.style.display = isImage ? "none" : "block";
  }

  log(`👉 Đã chuyển sang Tab: ${isImage ? '🖼️ Ảnh + Âm thanh' : '🎞️ Video + Âm thanh'}`);
  if (!isImage && typeof autoCheckFfmpeg === "function") {
    autoCheckFfmpeg(true);
  }
}
window.activateTab = activateTab;

listen("tabBtnImage", "click", () => activateTab("image"));
listen("tabBtnVideo", "click", () => activateTab("video"));
listen("tabBtnImage", "pointerdown", () => activateTab("image"));
listen("tabBtnVideo", "pointerdown", () => activateTab("video"));

listen("btnReloadPanel", "click", () => {
  log("🔄 Đang tải lại giao diện Plugin...");
  window.location.reload();
});

listen("btnClearLog", "click", () => {
  const logEl = getEl("log");
  if (logEl) logEl.textContent = "Sẵn sàng thực thi quy trình.";
});

const logContainerEl = getEl("log");
if (logContainerEl) {
  logContainerEl.addEventListener("wheel", (e) => {
    e.stopPropagation();
    logContainerEl.scrollTop += e.deltaY;
  });
}

// ==========================================================================
// ---- Quan ly danh sach Sequence (dung chung cho ca 2 tab) ----
// ==========================================================================
let availableSequences = [];
let selectedSequenceIndex = "CREATE_NEW";

async function refreshSequenceDropdown(project) {
  const selectEl = getEl("selectSequence");
  if (!selectEl) return null;
  selectEl.innerHTML = "";

  try {
    let seqs = [];
    if (typeof project.getSequences === "function") {
      seqs = await project.getSequences();
    } else if (project.sequences) {
      seqs = project.sequences;
    }

    availableSequences = [];
    if (seqs) {
      for (let i = 0; i < seqs.length; i++) {
        availableSequences.push(seqs[i]);
      }
    }

    const optNew = document.createElement("option");
    optNew.value = "CREATE_NEW";
    optNew.textContent = "✨ ➕ Tự động tạo Timeline mới";
    selectEl.appendChild(optNew);

    const activeSeq = await project.getActiveSequence();
    let defaultIndex = "CREATE_NEW";

    if (availableSequences.length > 0) {
      availableSequences.forEach((seq, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `🎬 Timeline: ${seq.name}`;
        if (activeSeq && (activeSeq.id === seq.id || activeSeq.name === seq.name)) {
          opt.selected = true;
          defaultIndex = idx;
        }
        selectEl.appendChild(opt);
      });

      selectedSequenceIndex = defaultIndex;
      selectEl.value = defaultIndex;
      const currentName = typeof defaultIndex === "number" ? availableSequences[defaultIndex].name : "Tự động tạo mới";
      log(`Đã nạp ${availableSequences.length} Sequence. Đang chọn: "${currentName}".`);
      return typeof defaultIndex === "number" ? availableSequences[defaultIndex] : null;
    } else {
      selectedSequenceIndex = "CREATE_NEW";
      selectEl.value = "CREATE_NEW";
      log("Project chưa có Sequence nào. Đã chọn chế độ '✨ Tự động tạo Timeline mới'.");
      return null;
    }
  } catch (err) {
    log("Lỗi tải danh sách Sequence: " + err.message);
    return null;
  }
}

listen("selectSequence", "change", async (e) => {
  const val = e.target.value;
  if (val === "CREATE_NEW") {
    selectedSequenceIndex = "CREATE_NEW";
    log("👉 Bạn đã chọn: ✨ Tự động tạo Timeline mới khi dựng project.");
    return;
  }

  const idx = parseInt(val, 10);
  if (!isNaN(idx) && idx >= 0 && availableSequences[idx]) {
    selectedSequenceIndex = idx;
    const seq = availableSequences[idx];
    log(`👉 Bạn đã chọn Timeline: "${seq.name}"`);
    try {
      if (!ppro) ppro = require("premierepro");
      const project = await ppro.Project.getActiveProject();
      if (project && typeof project.openSequence === "function") {
        await project.openSequence(seq);
        log(`Đã mở Timeline: "${seq.name}"`);
      } else if (seq && typeof seq.openInTimeline === "function") {
        await seq.openInTimeline();
      }
    } catch (openErr) {}
  }
});

// ---- Test ket noi toi Premiere (dung chung) ----
listen("btnTestConnection", "click", async () => {
  try {
    log("⚡ Đang kiểm tra kết nối Premiere Pro...");
    if (!ppro) ppro = require("premierepro");
    const project = await ppro.Project.getActiveProject();
    const statusDotEl = getEl("statusDot");
    const statusTextEl = getEl("statusText");
    if (!project) {
      if (statusDotEl) statusDotEl.classList.remove("active");
      if (statusTextEl) statusTextEl.textContent = "Không tìm thấy Project";
      log("⚠️ Chưa tìm thấy Project nào đang mở trong Premiere Pro.");
      return;
    }

    if (statusDotEl) statusDotEl.classList.add("active");
    if (statusTextEl) statusTextEl.textContent = "Đã kết nối";
    log(`✅ Kết nối THÀNH CÔNG với Project: "${project.name}". Đang nạp danh sách Sequence...`);

    const currentSeq = await refreshSequenceDropdown(project);
    if (currentSeq) {
      log(`👉 Timeline đang chọn: "${currentSeq.name}"`);
    } else {
      log("👉 Project chưa có Sequence nào. Đã bật chế độ tự động tạo Timeline mới.");
    }
    setTimeout(() => autoCheckFfmpeg(true), 500);
  } catch (err) {
    const statusDotEl = getEl("statusDot");
    const statusTextEl = getEl("statusText");
    if (statusDotEl) statusDotEl.classList.remove("active");
    if (statusTextEl) statusTextEl.textContent = "Lỗi kết nối";
    log("❌ Lỗi kết nối tới Premiere Pro: " + err.message);
  }
});

// ==========================================================================
// ---- Core Helper Functions ----
// ==========================================================================
function extractNumberFromFilename(filename) {
  if (!filename) return null;
  const dotIdx = filename.lastIndexOf(".");
  const nameWithoutExt = dotIdx > 0 ? filename.substring(0, dotIdx) : filename;

  const matches = nameWithoutExt.match(/\d+/g);
  if (!matches || matches.length === 0) return null;

  // 1. Ưu tiên số ở đầu tên file (e.g. "1_video", "01-clip")
  const leadingMatch = nameWithoutExt.match(/^(\d+)/);
  if (leadingMatch) {
    return parseInt(leadingMatch[1], 10).toString();
  }

  // 2. Ưu tiên số ở cuối tên file (e.g. "video_1", "scene-01")
  const trailingMatch = nameWithoutExt.match(/(\d+)$/);
  if (trailingMatch) {
    return parseInt(trailingMatch[1], 10).toString();
  }

  // 3. Mặc định lấy nhóm chữ số đầu tiên trong tên
  return parseInt(matches[0], 10).toString();
}

async function scanFolderByNumber(folder, allowedExt) {
  const result = {};
  const entries = await folder.getEntries();
  for (const entry of entries) {
    if (!entry.isFile) continue;
    const lowerName = entry.name.toLowerCase();
    if (!allowedExt.some((ext) => lowerName.endsWith(ext))) continue;

    const numStr = extractNumberFromFilename(entry.name);
    if (numStr) {
      result[numStr] = entry;
    }
  }
  return result;
}

// Chạy 1 Action chuẩn qua executeTransaction
async function runAction(project, actionOrFactory, undoLabel) {
  let actionResult = null;
  let success = false;
  let thrownErr = null;

  try {
    if (typeof project.executeTransaction === "function") {
      success = project.executeTransaction((compoundAction) => {
        const action = typeof actionOrFactory === "function" ? actionOrFactory() : actionOrFactory;
        if (action) {
          actionResult = action;
          compoundAction.addAction(action);
        }
      }, undoLabel || "HT_Automation Action");
    } else {
      const action = typeof actionOrFactory === "function" ? actionOrFactory() : actionOrFactory;
      actionResult = action;
      success = true;
    }
  } catch (e) {
    thrownErr = e;
  }

  if (thrownErr) throw thrownErr;
  if (success === false) {
    throw new Error(`executeTransaction failed for: ${undoLabel}`);
  }
  return actionResult;
}

function getItemCount(children) {
  if (!children) return 0;
  if (typeof children.length === "number") return children.length;
  if (typeof children.numItems === "number") return children.numItems;
  if (Array.isArray(children)) return children.length;
  return 0;
}

function getItemAtIndex(children, idx) {
  if (!children) return null;
  if (typeof children.getItemAt === "function") return children.getItemAt(idx);
  if (children[idx] !== undefined) return children[idx];
  return null;
}

function castToFolder(item) {
  if (!item) return null;
  if (typeof item.getItems === "function") return item;
  if (ppro && ppro.FolderItem && typeof ppro.FolderItem.cast === "function") {
    return ppro.FolderItem.cast(item);
  }
  return item;
}

function castToClip(item) {
  if (!item) return null;
  if (typeof item.getMedia === "function") return item;
  if (ppro && ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function") {
    return ppro.ClipProjectItem.cast(item);
  }
  return item;
}

async function getBinChildren(binOrRoot) {
  if (!binOrRoot) return [];
  try {
    const folder = castToFolder(binOrRoot);
    if (folder && typeof folder.getItems === "function") {
      const items = await folder.getItems();
      if (items && Array.isArray(items)) return items;
    }
    let raw = binOrRoot.children;
    if (typeof raw === "function") raw = await raw();
    else if (raw && typeof raw.then === "function") raw = await raw;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw.length === "number") return Array.from(raw);
    return [];
  } catch (e) {
    return [];
  }
}

async function ensureBin(project, rootItem, binName) {
  try {
    let rootChildren = await getBinChildren(rootItem);
    let bin = rootChildren.find((it) => it && it.name === binName);
    if (bin) {
      log(`  ✅ Đã thấy Bin '${binName}' sẵn có trong Project.`);
      return bin;
    }

    log(`  📁 Đang tạo Bin '${binName}'...`);

    try {
      await runAction(project, () => rootItem.createBinAction(binName, false), `Create ${binName} Bin`);
    } catch (e1) {
      try {
        await runAction(project, () => project.createBinAction(rootItem, binName), `Create ${binName} Bin`);
      } catch (e2) {
        try {
          await rootItem.createBin(binName);
        } catch (e3) {}
      }
    }

    for (let retry = 0; retry < 12; retry++) {
      rootChildren = await getBinChildren(rootItem);
      bin = rootChildren.find((it) => it && it.name === binName);
      if (bin) {
        log(`  ✅ Đã tạo thành công Bin '${binName}'.`);
        return bin;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  } catch (err) {
    log(`  Notice ensureBin (${binName}): ${err.message}`);
  }

  log(`  👉 Không tạo được Bin riêng '${binName}'. Sử dụng Thư mục gốc Project.`);
  return rootItem;
}

async function waitForItemsInBin(binItem, minCount, attempts = 10, delayMs = 250) {
  let items = [];
  for (let i = 1; i <= attempts; i++) {
    items = await getBinChildren(binItem);
    if (items && items.length >= minCount) break;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return items || [];
}

function findItemForEntry(itemsList, fileEntry) {
  if (!itemsList || itemsList.length === 0) return null;
  const fullName = fileEntry.name.toLowerCase();
  const dotIdx = fullName.lastIndexOf(".");
  const nameWithoutExt = dotIdx > 0 ? fullName.substring(0, dotIdx) : fullName;

  return itemsList.find((it) => {
    if (!it || !it.name) return false;
    const itNameLower = it.name.toLowerCase().trim();
    if (itNameLower === fullName) return true;
    if (itNameLower === nameWithoutExt) return true;
    const itDotIdx = itNameLower.lastIndexOf(".");
    const itBaseName = itDotIdx > 0 ? itNameLower.substring(0, itDotIdx) : itNameLower;
    if (itBaseName === nameWithoutExt) return true;
    return false;
  });
}

async function getDurationFromClipItem(clipItem) {
  if (!clipItem) return null;
  try {
    if (typeof clipItem.getMedia === "function") {
      const media = await clipItem.getMedia();
      if (media && media.duration) return media.duration;
    }
    if (typeof clipItem.getDuration === "function") {
      const d = await clipItem.getDuration();
      if (d) return d;
    }
    if (clipItem.duration) return clipItem.duration;
  } catch (e) {}
  return null;
}

function getSecondsValue(durationObj) {
  if (!durationObj) return 0;
  if (typeof durationObj.seconds === "number") return durationObj.seconds;
  if (typeof durationObj.value === "number") return durationObj.value;
  if (typeof durationObj.toSeconds === "function") return durationObj.toSeconds();
  return 0;
}

function formatSeconds(tickOrSec) {
  const s = getSecondsValue(tickOrSec);
  return (s > 0 ? s : (typeof tickOrSec === "number" ? tickOrSec : 0)).toFixed(2);
}

async function getSequenceFrameSeconds(sequence) {
  let frameSeconds = 1 / 30;
  try {
    if (sequence && typeof sequence.getSettings === "function") {
      const settings = await sequence.getSettings();
      const rate = settings && settings.videoFrameRate;
      const detected = getSecondsValue(rate);
      // Premiere trả videoFrameRate dưới dạng TickTime của một frame.
      if (detected > 0 && detected < 1) frameSeconds = detected;
    }
  } catch (e) {}
  return frameSeconds;
}

async function getTenFrameDuration(sequence) {
  const frameSeconds = await getSequenceFrameSeconds(sequence);
  return await ppro.TickTime.createWithSeconds(frameSeconds * 10);
}

async function snapTickTimeToVideoFrame(sequence, tickTime) {
  const frameSeconds = await getSequenceFrameSeconds(sequence);
  const seconds = getSecondsValue(tickTime);
  // Làm tròn về biên frame gần nhất. Hàm này được dùng chung cho cả V1 và A1
  // để Premiere không snap hai loại track theo hai cách khác nhau.
  const snappedSeconds = Math.round(seconds / frameSeconds) * frameSeconds;
  return await ppro.TickTime.createWithSeconds(snappedSeconds);
}

async function resolveSequence(project) {
  let seq = null;
  if (selectedSequenceIndex !== "CREATE_NEW" && typeof selectedSequenceIndex === "number") {
    seq = availableSequences[selectedSequenceIndex] || null;
  }
  if (!seq) {
    try { seq = await project.getActiveSequence(); } catch (e) {}
  }
  if (!seq) {
    log("Đang tạo Timeline mới...");
    const seqName = `HT_Automation_Timeline_${Date.now().toString().slice(-4)}`;
    try {
      if (typeof project.createSequenceAction === "function") {
        await runAction(project, () => project.createSequenceAction(seqName), `Create Sequence ${seqName}`);
      } else if (typeof project.createSequence === "function") {
        await project.createSequence(seqName);
      }
    } catch (createErr) {
      log(`  Lưu ý tạo Sequence: ${createErr.message}`);
    }
    try { seq = await project.getActiveSequence(); } catch (e) {}
    if (!seq && typeof project.getSequences === "function") {
      try {
        const all = await project.getSequences();
        if (all && all.length > 0) seq = all[all.length - 1];
      } catch (e) {}
    }
  }
  return seq;
}

async function ensureTrackUnlocked(sequence, trackType, trackIndex) {
  try {
    const tracks = trackType === "video" ? await sequence.videoTracks : await sequence.audioTracks;
    if (tracks) {
      const count = getItemCount(tracks);
      if (trackIndex < count) {
        const trk = getItemAtIndex(tracks, trackIndex);
        if (trk) {
          let locked = false;
          if (typeof trk.isLocked === "boolean") locked = trk.isLocked;
          else if (typeof trk.getIsLocked === "function") locked = await trk.getIsLocked();

          if (locked) {
            log(`  🔓 Track ${trackType.toUpperCase()}${trackIndex + 1} đang bị KHÓA. Đang mở khóa...`);
            try {
              if (typeof trk.setLocked === "function") await trk.setLocked(false);
              else if (typeof trk.setIsLocked === "function") await trk.setIsLocked(false);
            } catch (unlockErr) {}
          }
        }
      }
    }
  } catch (e) {}
}

async function setTrackLockState(sequence, trackType, trackIndex, lockedState) {
  try {
    const tracks = trackType === "video" ? await sequence.videoTracks : await sequence.audioTracks;
    if (tracks) {
      const count = getItemCount(tracks);
      if (trackIndex < count) {
        const trk = getItemAtIndex(tracks, trackIndex);
        if (trk) {
          if (typeof trk.setLocked === "function") await trk.setLocked(lockedState);
          else if (typeof trk.setIsLocked === "function") await trk.setIsLocked(lockedState);
        }
      }
    }
  } catch (e) {}
}

// ==========================================================================
// ================= TAB 1: ẢNH + ÂM THANH ==================================
// ==========================================================================
function checkReadyToScan() {
  setBtnDisabled("btnScanFiles", !(imageFolder && audioFolder));
}

listen("btnPickImageFolder", "click", async () => {
  try {
    log("📂 Đang mở cửa sổ chọn Thư mục Ảnh...");
    const folder = await fs.getFolder();
    if (!folder) { log("Ban chua chon folder anh."); return; }
    imageFolder = folder;
    const pathEl = getEl("pathImageFolder");
    if (pathEl) {
      pathEl.textContent = folder.nativePath;
      pathEl.classList.add("selected");
    }
    log(`✅ Đã chọn Thư mục ẢNH: ${folder.nativePath}`);
    checkReadyToScan();
  } catch (err) { log("❌ Lỗi khi chọn folder anh: " + err.message); }
});

listen("btnPickAudioFolder", "click", async () => {
  try {
    log("📂 Đang mở cửa sổ chọn Thư mục Âm thanh...");
    const folder = await fs.getFolder();
    if (!folder) { log("Ban chua chon folder am thanh."); return; }
    audioFolder = folder;
    const pathEl = getEl("pathAudioFolder");
    if (pathEl) {
      pathEl.textContent = folder.nativePath;
      pathEl.classList.add("selected");
    }
    log(`✅ Đã chọn Thư mục ÂM THANH: ${folder.nativePath}`);
    checkReadyToScan();
  } catch (err) { log("❌ Lỗi khi chọn folder am thanh: " + err.message); }
});

let matchedPairs = []; // [{num, imageEntry|null, audioEntry|null}]
let imageScanHasMissing = false;

listen("btnScanFiles", "click", async () => {
  if (!imageFolder || !audioFolder) {
    log("⚠️ BẠN CHƯA CHỌN ĐỦ THƯ MỤC!");
    log("👉 Vui lòng chọn Thư mục Ảnh và Thư mục Âm thanh.");
    return;
  }
  try {
    const imageExt = [".jpg", ".jpeg", ".png"];
    const audioExt = [".mp3", ".wav", ".m4a"];
    const images = await scanFolderByNumber(imageFolder, imageExt);
    const audios = await scanFolderByNumber(audioFolder, audioExt);

    const allNums = Array.from(new Set([...Object.keys(images), ...Object.keys(audios)]))
      .sort((a, b) => Number(a) - Number(b));

    matchedPairs = [];
    imageScanHasMissing = false;
    const missingImages = [];
    const missingAudios = [];
    for (const num of allNums) {
      const img = images[num];
      const aud = audios[num];
      if (!img) missingImages.push(num);
      if (!aud) missingAudios.push(num);
      matchedPairs.push({ num, imageEntry: img || null, audioEntry: aud || null });
    }
    imageScanHasMissing = missingImages.length > 0 || missingAudios.length > 0;
    if (!imageScanHasMissing) {
      log(`✅ ĐỦ FILE: ${matchedPairs.length} cặp ảnh + âm thanh.`);
    } else {
      log("⚠️ THIẾU FILE:");
      if (missingImages.length) log(`  Thiếu ảnh số: ${missingImages.join(", ")}`);
      if (missingAudios.length) log(`  Thiếu âm thanh số: ${missingAudios.join(", ")}`);
      log("👉 Chọn 'Vẫn dựng timeline khi thiếu file' nếu muốn tiếp tục.");
    }
    const badgeEl = getEl("badgeMatchedPairs");
    if (badgeEl) {
      badgeEl.textContent = imageScanHasMissing ? "Thiếu file" : "Đủ file";
      badgeEl.classList.toggle("success", !imageScanHasMissing && matchedPairs.length > 0);
      badgeEl.classList.toggle("error", imageScanHasMissing);
    }
    const choiceEl = getEl("missingMediaChoice");
    if (choiceEl) choiceEl.style.display = imageScanHasMissing ? "flex" : "none";
    const allowEl = getEl("allowBuildWithMissing");
    if (allowEl) allowEl.checked = false;
    setBtnDisabled("btnBuildProject", matchedPairs.length === 0);
  } catch (err) { log("Lỗi khi quét folder: " + err.message); }
});

listen("btnBuildProject", "click", async () => {
  try {
    if (!imageFolder || !audioFolder) {
      log("⚠️ CHƯA CHỌN ĐỦ THƯ MỤC!");
      return;
    }
    if (matchedPairs.length === 0) {
      log("⚠️ CHƯA CÓ CẶP FILE NÀO ĐƯỢC QUÉT!");
      return;
    }
    if (imageScanHasMissing) {
      const allowEl = getEl("allowBuildWithMissing");
      if (!allowEl || !allowEl.checked) {
        log("⛔ Đã hủy dựng: danh sách đang thiếu file và chưa chọn cho phép dựng tiếp.");
        return;
      }
    }

    if (!ppro) ppro = require("premierepro");
    const project = await ppro.Project.getActiveProject();
    if (!project) { log("Khong co project dang mo."); return; }

    const sequence = await resolveSequence(project);
    if (!sequence) {
      log("LỖI: Không tìm thấy hoặc không thể tạo Sequence nào.");
      return;
    }
    log(`Bắt đầu dựng project vào Timeline: "${sequence.name}"`);

    const rootItem = await project.getRootItem();
    log("Đang kiểm tra / tạo Bin 'Images' và 'Audio'...");
    const imagesBin = await ensureBin(project, rootItem, "Images");
    const audioBin = await ensureBin(project, rootItem, "Audio");

    const editor = await ppro.SequenceEditor.getEditor(sequence);
    const VIDEO_TRACK_INDEX = 0;
    const AUDIO_TRACK_INDEX = 0;

    await ensureTrackUnlocked(sequence, "video", VIDEO_TRACK_INDEX);
    await ensureTrackUnlocked(sequence, "audio", AUDIO_TRACK_INDEX);

    // ========================================================================
    // GIAI ĐOẠN 1: BẢO VỆ & XẾP TOÀN BỘ ÂM THANH TRÊN TRACK A1 LIÊN TỤC 100%
    // ========================================================================
    log("\n🎵 --- BƯỚC 1: DỰNG TRACK ÂM THANH (A1) LIÊN TỤC LÀM MỐC CHUẨN ---");
    // Tạm khóa Video Track V1 để thao tác trên A1 hoàn toàn không bị ảnh hưởng bởi Video
    await setTrackLockState(sequence, "video", VIDEO_TRACK_INDEX, true);
    await setTrackLockState(sequence, "audio", AUDIO_TRACK_INDEX, false);

    const pairRanges = [];
    const preparedPairs = [];
    const tenFrameDuration = await getTenFrameDuration(sequence);
    let currentImageCount = 0;
    let currentAudioCount = 0;

    for (const pair of matchedPairs) {
      log(`\n--- Mốc #${pair.num}: ${pair.imageEntry ? pair.imageEntry.name : "THIẾU ẢNH"} <-> ${pair.audioEntry ? pair.audioEntry.name : "THIẾU AUDIO"} ---`);

      if (pair.imageEntry) {
        currentImageCount++;
        await project.importFiles([pair.imageEntry.nativePath], true, imagesBin, false);
      }
      if (pair.audioEntry) {
        currentAudioCount++;
        await project.importFiles([pair.audioEntry.nativePath], true, audioBin, false);
      }

      const imageItemsInBin = pair.imageEntry ? await waitForItemsInBin(imagesBin, currentImageCount) : [];
      const audioItemsInBin = pair.audioEntry ? await waitForItemsInBin(audioBin, currentAudioCount) : [];

      let rawImageItem = pair.imageEntry ? findItemForEntry(imageItemsInBin, pair.imageEntry) : null;
      if (pair.imageEntry && !rawImageItem && imagesBin !== rootItem) {
        const rootItems = await getBinChildren(rootItem);
        rawImageItem = findItemForEntry(rootItems, pair.imageEntry);
      }

      let rawAudioItem = pair.audioEntry ? findItemForEntry(audioItemsInBin, pair.audioEntry) : null;
      if (pair.audioEntry && !rawAudioItem && audioBin !== rootItem) {
        const rootItems = await getBinChildren(rootItem);
        rawAudioItem = findItemForEntry(rootItems, pair.audioEntry);
      }

      if ((pair.imageEntry && !rawImageItem) || (pair.audioEntry && !rawAudioItem)) {
        log(`  ❌ Không import được media của mốc #${pair.num}.`);
        continue;
      }

      let rawAudioDuration = null;
      let audioSecReal = 0;
      if (rawAudioItem) {
        const audioItem = castToClip(rawAudioItem) || rawAudioItem;
        rawAudioDuration = await getDurationFromClipItem(audioItem);
        audioSecReal = getSecondsValue(rawAudioDuration);
        if (audioSecReal <= 0) {
          try {
            audioSecReal = await probeDurationSeconds(pair.audioEntry.nativePath);
          } catch (probeErr) {}
        }
      }

      const audioDurationTickTime = rawAudioItem && rawAudioDuration && typeof rawAudioDuration.add === "function" && audioSecReal > 0
        ? rawAudioDuration
        : (rawAudioItem && audioSecReal > 0
          ? await ppro.TickTime.createWithSeconds(audioSecReal)
          : tenFrameDuration);

      preparedPairs.push({
        pair,
        rawImageItem,
        rawAudioItem,
        audioDurationTickTime,
        audioSecReal
      });
    }

    const timelineZero = await ppro.TickTime.createWithSeconds(0);
    // Lập trước toàn bộ mốc timeline. Nếu thiếu audio, mốc đó dài 10 frame.
    // Nếu có audio, duration thật của audio là mốc chuẩn cho cả hai track.
    let calculatedAudioCursor = timelineZero;
    for (let i = 0; i < preparedPairs.length; i++) {
      const prepared = preparedPairs[i];
      const pairStart = calculatedAudioCursor;
      const pairEnd = pairStart.add(prepared.audioDurationTickTime);
      calculatedAudioCursor = pairEnd;

      log(`  ✅ Audio #${prepared.pair.num}: ${formatSeconds(pairStart)}s -> ${formatSeconds(pairEnd)}s`);
      pairRanges.push({
        pair: prepared.pair,
        rawImageItem: prepared.rawImageItem,
        audioDurationTickTime: prepared.audioDurationTickTime,
        start: pairStart,
        end: pairEnd
      });
    }

    // Chèn ngược từng cụm audio liên tiếp. Cách này giữ các audio trong mỗi cụm
    // khít tuyệt đối; mốc thiếu audio sẽ tách hai cụm bằng khoảng trắng 10 frame.
    let runStartIndex = 0;
    while (runStartIndex < preparedPairs.length) {
      if (!preparedPairs[runStartIndex].rawAudioItem) {
        log(`  ⬜ [Audio #${preparedPairs[runStartIndex].pair.num}] Để trống 10 frame.`);
        runStartIndex++;
        continue;
      }
      let runEndIndex = runStartIndex;
      while (
        runEndIndex + 1 < preparedPairs.length &&
        preparedPairs[runEndIndex].rawAudioItem &&
        preparedPairs[runEndIndex].rawImageItem &&
        preparedPairs[runEndIndex + 1].rawAudioItem &&
        preparedPairs[runEndIndex + 1].rawImageItem
      ) {
        runEndIndex++;
      }
      const runStartTime = await snapTickTimeToVideoFrame(sequence, pairRanges[runStartIndex].start);
      for (let i = runEndIndex; i >= runStartIndex; i--) {
        const prepared = preparedPairs[i];
        log(`  🔊 [Audio #${prepared.pair.num}] Ghép nối vào chuỗi A1...`);
        await runAction(
          project,
          () => editor.createInsertProjectItemAction(
            prepared.rawAudioItem,
            runStartTime,
            VIDEO_TRACK_INDEX,
            AUDIO_TRACK_INDEX,
            false
          ),
          `Insert audio #${prepared.pair.num}`
        );
      }
      runStartIndex = runEndIndex + 1;
    }

    // ========================================================================
    // GIAI ĐOẠN 2: GẮN TOÀN BỘ CHUỖI ẢNH LÊN TRACK V1 KHỚP KHÍT 100% VỚI AUDIO
    // ========================================================================
    log("\n🖼️ --- BƯỚC 2: DỰNG TRACK HÌNH ẢNH (V1) KHỚP THEO KHUNG THỜI GIAN AUDIO ---");
    // Tạm khóa Audio Track A1 để bảo vệ A1 không bị ảnh hưởng bởi Video
    await setTrackLockState(sequence, "audio", AUDIO_TRACK_INDEX, true);
    await setTrackLockState(sequence, "video", VIDEO_TRACK_INDEX, false);

    // Chuẩn bị OutPoint cho từng ảnh trước khi chèn. Video track dùng biên frame
    // (end-exclusive), vì vậy không dùng end của ảnh trước làm start ảnh sau.
    for (const range of pairRanges) {
      if (!range.rawImageItem) continue;
      try {
        const imageClipProjItem = (ppro && ppro.ClipProjectItem && typeof ppro.ClipProjectItem.cast === "function")
          ? ppro.ClipProjectItem.cast(range.rawImageItem)
          : (castToClip(range.rawImageItem) || range.rawImageItem);

        if (imageClipProjItem) {
          const zeroTime = await ppro.TickTime.createWithSeconds(0);
          if (typeof imageClipProjItem.createSetInOutPointsAction === "function") {
            await runAction(project, () => imageClipProjItem.createSetInOutPointsAction(zeroTime, range.audioDurationTickTime), `Set In/Out image #${range.pair.num}`);
          } else if (typeof imageClipProjItem.createSetOutPointAction === "function") {
            await runAction(project, () => imageClipProjItem.createSetOutPointAction(range.audioDurationTickTime), `Set OutPoint image #${range.pair.num}`);
          }
        }
      } catch (projErr) {
        log(`  ⚠️ Không đặt được thời lượng nguồn cho ảnh #${range.pair.num}: ${projErr.message}`);
      }
    }

    // Chèn ngược từng cụm ảnh liên tiếp. Mục thiếu ảnh được bỏ trống đúng toàn
    // bộ duration của audio tương ứng; các ảnh ở hai bên vẫn giữ đúng thứ tự.
    let imageRunStartIndex = 0;
    while (imageRunStartIndex < pairRanges.length) {
      if (!pairRanges[imageRunStartIndex].rawImageItem) {
        log(`  ⬜ [Ảnh #${pairRanges[imageRunStartIndex].pair.num}] Để trống theo thời lượng audio.`);
        imageRunStartIndex++;
        continue;
      }
      let imageRunEndIndex = imageRunStartIndex;
      while (
        imageRunEndIndex + 1 < pairRanges.length &&
        pairRanges[imageRunEndIndex].rawImageItem &&
        preparedPairs[imageRunEndIndex].rawAudioItem &&
        pairRanges[imageRunEndIndex + 1].rawImageItem &&
        preparedPairs[imageRunEndIndex + 1].rawAudioItem
      ) {
        imageRunEndIndex++;
      }
      const imageRunStartTime = await snapTickTimeToVideoFrame(sequence, pairRanges[imageRunStartIndex].start);
      for (let i = imageRunEndIndex; i >= imageRunStartIndex; i--) {
        const range = pairRanges[i];
        log(`  🖼️ [Ảnh #${range.pair.num}] Ghép nối vào chuỗi V1 với thời lượng ${formatSeconds(range.audioDurationTickTime)}s...`);
        await runAction(
          project,
          () => editor.createInsertProjectItemAction(
            range.rawImageItem,
            imageRunStartTime,
            VIDEO_TRACK_INDEX,
            AUDIO_TRACK_INDEX,
            true
          ),
          `Insert image #${range.pair.num}`
        );
      }
      imageRunStartIndex = imageRunEndIndex + 1;
    }

    // Mở khóa lại cả 2 track
    await setTrackLockState(sequence, "video", VIDEO_TRACK_INDEX, false);
    await setTrackLockState(sequence, "audio", AUDIO_TRACK_INDEX, false);

    log("\n🎉 HOÀN TẤT DỰNG PROJECT (ẢNH + ÂM THANH)!");
  } catch (err) {
    log("❌ Lỗi khi dựng project (ảnh): " + err.message);
  }
});

// ==========================================================================
// ================= TAB 2: VIDEO + ÂM THANH ================================
// ==========================================================================
function checkReadyToScanVideo() {
  setBtnDisabled("btnScanFilesVideo", !(videoFolder && videoAudioFolder));
}

function getFfmpegPath() {
  const inputEl = getEl("inputFfmpegPath");
  let v = inputEl ? (inputEl.value || "").trim() : "";
  if (!v.toLowerCase().endsWith(".exe")) {
    v = bundledFfmpegPath;
  }
  return v;
}

listen("btnPickVideoFolder", "click", async () => {
  try {
    log("📂 Đang mở cửa sổ chọn Thư mục Video...");
    const folder = await fs.getFolder();
    if (!folder) { log("Ban chua chon folder video."); return; }
    videoFolder = folder;
    syncedSubfolderEntry = null;
    const pathEl = getEl("pathVideoFolder");
    if (pathEl) {
      pathEl.textContent = folder.nativePath;
      pathEl.classList.add("selected");
    }
    log(`✅ Đã chọn Thư mục VIDEO: ${folder.nativePath}`);
    checkReadyToScanVideo();
  } catch (err) { log("❌ Lỗi khi chọn folder video: " + err.message); }
});

listen("btnPickVideoAudioFolder", "click", async () => {
  try {
    log("📂 Đang mở cửa sổ chọn Thư mục Âm thanh (Video)...");
    const folder = await fs.getFolder();
    if (!folder) { log("Ban chua chon folder am thanh."); return; }
    videoAudioFolder = folder;
    const pathEl = getEl("pathVideoAudioFolder");
    if (pathEl) {
      pathEl.textContent = folder.nativePath;
      pathEl.classList.add("selected");
    }
    log(`✅ Đã chọn Thư mục ÂM THANH (Video): ${folder.nativePath}`);
    checkReadyToScanVideo();
  } catch (err) { log("❌ Lỗi khi chọn folder am thanh: " + err.message); }
});

async function autoCheckFfmpeg(silent = true) {
  try {
    const exePath = getFfmpegPath();
    const result = await runFfmpegProcess(exePath, ["-version"]);
    const text = (result.stdout || "") + (result.stderr || "");
    const versionMatch = text.match(/ffmpeg version (\S+)/i);
    const badgeFfmpegStatusEl = getEl("badgeFfmpegStatus");
    if (versionMatch) {
      if (badgeFfmpegStatusEl) {
        badgeFfmpegStatusEl.textContent = `OK: ${versionMatch[1]}`;
        badgeFfmpegStatusEl.classList.add("success");
        badgeFfmpegStatusEl.classList.remove("error");
      }
      if (!silent) log(`✅ Đã kết nối FFmpeg — Phiên bản: ${versionMatch[1]}`);
      return true;
    } else {
      if (badgeFfmpegStatusEl) {
        badgeFfmpegStatusEl.textContent = "Không xác định";
        badgeFfmpegStatusEl.classList.remove("success");
        badgeFfmpegStatusEl.classList.add("error");
      }
      return false;
    }
  } catch (err) {
    const badgeFfmpegStatusEl = getEl("badgeFfmpegStatus");
    if (badgeFfmpegStatusEl) {
      badgeFfmpegStatusEl.textContent = "Lỗi";
      badgeFfmpegStatusEl.classList.remove("success");
      badgeFfmpegStatusEl.classList.add("error");
    }
    if (!silent) log(`❌ LỖI kết nối FFmpeg: ${err.message}`);
    return false;
  }
}

listen("btnTestFfmpeg", "click", async () => {
  await autoCheckFfmpeg(false);
});

let matchedPairsVideo = [];
let videoScanHasMissing = false;

listen("btnScanFilesVideo", "click", async () => {
  if (!videoFolder || !videoAudioFolder) {
    log("⚠️ BẠN CHƯA CHỌN ĐỦ 2 THƯ MỤC!");
    return;
  }
  try {
    const videoExt = [".mp4", ".mov", ".mkv", ".avi", ".m4v"];
    const audioExt = [".mp3", ".wav", ".m4a"];
    const videos = await scanFolderByNumber(videoFolder, videoExt);
    const audios = await scanFolderByNumber(videoAudioFolder, audioExt);

    const allNums = Array.from(new Set([...Object.keys(videos), ...Object.keys(audios)]))
      .sort((a, b) => Number(a) - Number(b));

    matchedPairsVideo = [];
    videoScanHasMissing = false;
    const missingVideos = [];
    const missingAudios = [];
    for (const num of allNums) {
      const vid = videos[num];
      const aud = audios[num];
      if (!vid) missingVideos.push(num);
      if (!aud) missingAudios.push(num);
      matchedPairsVideo.push({ num, videoEntry: vid || null, audioEntry: aud || null });
    }
    videoScanHasMissing = missingVideos.length > 0 || missingAudios.length > 0;
    if (!videoScanHasMissing) {
      log(`✅ ĐỦ FILE: ${matchedPairsVideo.length} cặp video + âm thanh.`);
    } else {
      log("⚠️ THIẾU FILE:");
      if (missingVideos.length) log(`  Thiếu video số: ${missingVideos.join(", ")}`);
      if (missingAudios.length) log(`  Thiếu âm thanh số: ${missingAudios.join(", ")}`);
      log("👉 Chọn 'Vẫn dựng timeline khi thiếu file' nếu muốn tiếp tục.");
    }
    const badgeEl = getEl("badgeMatchedPairsVideo");
    if (badgeEl) {
      badgeEl.textContent = videoScanHasMissing ? "Thiếu file" : "Đủ file";
      badgeEl.classList.toggle("success", !videoScanHasMissing && matchedPairsVideo.length > 0);
      badgeEl.classList.toggle("error", videoScanHasMissing);
    }
    const choiceEl = getEl("missingVideoMediaChoice");
    if (choiceEl) choiceEl.style.display = videoScanHasMissing ? "flex" : "none";
    const allowEl = getEl("allowBuildVideoWithMissing");
    if (allowEl) allowEl.checked = false;
    setBtnDisabled("btnBuildProjectVideo", matchedPairsVideo.length === 0);
  } catch (err) { log("Lỗi khi quét folder: " + err.message); }
});

async function probeDurationSeconds(filePath) {
  const result = await runFfmpegProcess(getFfmpegPath(), ["-i", filePath]);
  const text = (result.stderr || "") + (result.stdout || "");
  const m = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) {
    throw new Error(`Khong doc duoc duration cua file: ${filePath}\n${text.slice(0, 400)}`);
  }
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const seconds = parseFloat(m[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

async function ensureSyncedSubfolder() {
  if (syncedSubfolderEntry) return syncedSubfolderEntry;
  try {
    syncedSubfolderEntry = await videoFolder.createFolder("_ffmpeg_synced");
  } catch (e) {
    const entries = await videoFolder.getEntries();
    syncedSubfolderEntry = entries.find((it) => !it.isFile && it.name === "_ffmpeg_synced") || null;
    if (!syncedSubfolderEntry) throw e;
  }
  return syncedSubfolderEntry;
}

async function runFfmpegSpeedMatch(videoPath, outputEntry, ptsFactor) {
  const args = [
    "-y",
    "-i", videoPath,
    "-filter:v", `setpts=${ptsFactor.toFixed(6)}*PTS,tpad=stop_mode=clone:stop_duration=0.5`,
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    outputEntry.nativePath
  ];
  const result = await runFfmpegProcess(getFfmpegPath(), args);
  if (result.exitCode !== 0) {
    throw new Error(`FFmpeg loi (exitCode=${result.exitCode}):\n${(result.stderr || "").slice(-600)}`);
  }
  return outputEntry;
}

async function runFfmpegTrim(videoPath, outputEntry, durationSec) {
  const paddedDurationSec = durationSec + 0.08;
  const args = [
    "-y",
    "-ss", "0",
    "-i", videoPath,
    "-t", paddedDurationSec.toFixed(6),
    "-filter:v", "tpad=stop_mode=clone:stop_duration=0.5",
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    outputEntry.nativePath
  ];
  const result = await runFfmpegProcess(getFfmpegPath(), args);
  if (result.exitCode !== 0) {
    throw new Error(`FFmpeg loi (exitCode=${result.exitCode}):\n${(result.stderr || "").slice(-600)}`);
  }
  return outputEntry;
}

listen("btnBuildProjectVideo", "click", async () => {
  try {
    if (!videoFolder || !videoAudioFolder) {
      log("⚠️ CHƯA CHỌN ĐỦ THƯ MỤC!");
      return;
    }
    if (matchedPairsVideo.length === 0) {
      log("⚠️ CHƯA CÓ CẶP FILE NÀO ĐƯỢC QUÉT!");
      return;
    }
    if (videoScanHasMissing) {
      const allowEl = getEl("allowBuildVideoWithMissing");
      if (!allowEl || !allowEl.checked) {
        log("⛔ Đã hủy dựng: danh sách video đang thiếu file và chưa chọn cho phép dựng tiếp.");
        return;
      }
    }

    if (!ppro) ppro = require("premierepro");
    const project = await ppro.Project.getActiveProject();
    if (!project) { log("Khong co project dang mo."); return; }

    const sequence = await resolveSequence(project);
    if (!sequence) {
      log("LỖI: Không tìm thấy hoặc không thể tạo Sequence nào.");
      return;
    }
    log(`Bắt đầu dựng project vào Timeline: "${sequence.name}"`);

    const rootItem = await project.getRootItem();
    log("Đang kiểm tra / tạo Bin 'Videos' và 'Audio'...");
    const videosBin = await ensureBin(project, rootItem, "Videos");
    const audioBin = await ensureBin(project, rootItem, "Audio");

    await ensureSyncedSubfolder();

    const editor = await ppro.SequenceEditor.getEditor(sequence);
    let cursor = await ppro.TickTime.createWithSeconds(0);
    const VIDEO_TRACK_INDEX = 0;
    const AUDIO_TRACK_INDEX = 0;

    let currentVideoCount = 0;
    let currentAudioCount = 0;
    const tenFrameDuration = await getTenFrameDuration(sequence);
    const tenFrameSec = getSecondsValue(tenFrameDuration);

    for (const pair of matchedPairsVideo) {
      log(`\n--- Mốc #${pair.num}: ${pair.videoEntry ? pair.videoEntry.name : "THIẾU VIDEO"} <-> ${pair.audioEntry ? pair.audioEntry.name : "THIẾU AUDIO"} ---`);

      let videoDurSec = 0;
      let audioDurSec = 0;
      try {
        if (pair.videoEntry) videoDurSec = await probeDurationSeconds(pair.videoEntry.nativePath);
        if (pair.audioEntry) audioDurSec = await probeDurationSeconds(pair.audioEntry.nativePath);
      } catch (probeErr) {
        log(`  Bỏ qua mốc #${pair.num}: ${probeErr.message}`);
        continue;
      }

      const slotDurationSec = pair.audioEntry ? audioDurSec : tenFrameSec;
      const slotDurationTickTime = pair.audioEntry
        ? await ppro.TickTime.createWithSeconds(audioDurSec)
        : tenFrameDuration;
      let outputEntry = null;

      if (pair.videoEntry) {
        const dotIdx = pair.videoEntry.name.lastIndexOf(".");
        const baseName = dotIdx > 0 ? pair.videoEntry.name.substring(0, dotIdx) : pair.videoEntry.name;
        const outputName = `${baseName}_synced.mp4`;
        try {
          outputEntry = await syncedSubfolderEntry.createFile(outputName, { overwrite: true });
          if (!pair.audioEntry) {
            log(`  ⬜ Thiếu audio: giữ video #${pair.num} trong 10 frame.`);
            await runFfmpegTrim(pair.videoEntry.nativePath, outputEntry, tenFrameSec);
          } else if (videoDurSec > audioDurSec) {
            await runFfmpegTrim(pair.videoEntry.nativePath, outputEntry, audioDurSec);
          } else if (videoDurSec < audioDurSec) {
            await runFfmpegSpeedMatch(pair.videoEntry.nativePath, outputEntry, audioDurSec / videoDurSec);
          } else {
            await runFfmpegTrim(pair.videoEntry.nativePath, outputEntry, audioDurSec);
          }
          log(`  ✅ Đã tạo video đầu ra: ${outputEntry.name}`);
        } catch (ffErr) {
          log(`  ❌ Bỏ qua mốc #${pair.num}: Lỗi FFmpeg — ${ffErr.message}`);
          cursor = cursor.add(slotDurationTickTime);
          continue;
        }
      }

      log(`  📦 Đang import file vào Project...`);
      if (outputEntry) {
        currentVideoCount++;
        await project.importFiles([outputEntry.nativePath], true, videosBin, false);
      }
      if (pair.audioEntry) {
        currentAudioCount++;
        await project.importFiles([pair.audioEntry.nativePath], true, audioBin, false);
      }

      const videoItemsInBin = outputEntry ? await waitForItemsInBin(videosBin, currentVideoCount) : [];
      const audioItemsInBin = pair.audioEntry ? await waitForItemsInBin(audioBin, currentAudioCount) : [];

      let rawVideoItem = outputEntry ? findItemForEntry(videoItemsInBin, outputEntry) : null;
      if (outputEntry && !rawVideoItem && videosBin !== rootItem) {
        const rootItems = await getBinChildren(rootItem);
        rawVideoItem = findItemForEntry(rootItems, outputEntry);
      }

      let rawAudioItem = pair.audioEntry ? findItemForEntry(audioItemsInBin, pair.audioEntry) : null;
      if (pair.audioEntry && !rawAudioItem && audioBin !== rootItem) {
        const rootItems = await getBinChildren(rootItem);
        rawAudioItem = findItemForEntry(rootItems, pair.audioEntry);
      }

      if ((outputEntry && !rawVideoItem) || (pair.audioEntry && !rawAudioItem)) {
        log(`  ❌ Không import được media của mốc #${pair.num}.`);
        cursor = cursor.add(slotDurationTickTime);
        continue;
      }

      // FFmpeg có thêm một ít frame đệm để tránh hụt hình. Riêng mốc thiếu
      // audio phải giới hạn ProjectItem đúng 10 frame trước khi đưa lên V1.
      if (rawVideoItem && !pair.audioEntry) {
        try {
          const videoClipItem = castToClip(rawVideoItem) || rawVideoItem;
          const zeroTime = await ppro.TickTime.createWithSeconds(0);
          if (typeof videoClipItem.createSetInOutPointsAction === "function") {
            await runAction(project, () => videoClipItem.createSetInOutPointsAction(zeroTime, tenFrameDuration), `Set 10-frame video #${pair.num}`);
          } else if (typeof videoClipItem.createSetOutPointAction === "function") {
            await runAction(project, () => videoClipItem.createSetOutPointAction(tenFrameDuration), `Set 10-frame video #${pair.num}`);
          }
        } catch (durationErr) {
          log(`  ⚠️ Không giới hạn được video #${pair.num} đúng 10 frame: ${durationErr.message}`);
        }
      }

      await ensureTrackUnlocked(sequence, "video", VIDEO_TRACK_INDEX);
      await ensureTrackUnlocked(sequence, "audio", AUDIO_TRACK_INDEX);
      const slotStart = await snapTickTimeToVideoFrame(sequence, cursor);

      if (rawVideoItem) {
        await runAction(
          project,
          () => editor.createInsertProjectItemAction(rawVideoItem, slotStart, VIDEO_TRACK_INDEX, AUDIO_TRACK_INDEX, true),
          `Insert video #${pair.num}`
        );
      } else {
        log(`  ⬜ V1 mốc #${pair.num}: để trống theo thời lượng audio.`);
      }

      if (rawAudioItem) {
        await runAction(
          project,
          () => editor.createInsertProjectItemAction(rawAudioItem, slotStart, VIDEO_TRACK_INDEX, AUDIO_TRACK_INDEX, false),
          `Insert audio #${pair.num}`
        );
      } else {
        log(`  ⬜ A1 mốc #${pair.num}: để trống 10 frame.`);
      }

      log(`  ✨ Đã xử lý mốc #${pair.num} tại ${formatSeconds(slotStart)}s`);
      cursor = slotStart.add(slotDurationTickTime);
    }

    log("\n🎉 HOÀN TẤT DỰNG PROJECT (VIDEO + ÂM THANH)!");
  } catch (err) {
    log("❌ Lỗi khi dựng project (video): " + err.message);
  }
});

// Tự động kiểm tra kết nối khi nạp xong script
setTimeout(() => {
  const btnTest = getEl("btnTestConnection");
  if (btnTest) btnTest.click();
}, 200);
