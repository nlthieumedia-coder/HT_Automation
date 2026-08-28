/** Lớp tích hợp Premiere Pro UXP, dùng cùng mô hình với HT_BinBuilder. */
class PremiereManager {
  constructor() {
    try { this.ppro = require("premierepro"); }
    catch (error) { this.ppro = null; window.Logger.error("Không nạp được Premiere UXP API", error); }
  }

  async getProject() {
    if (!this.ppro) throw new Error("Premiere UXP API chưa sẵn sàng.");
    const project = await this.ppro.Project.getActiveProject();
    if (!project) throw new Error("Chưa có Premiere project đang mở.");
    return project;
  }

  async pingHost() { const project = await this.getProject(); return project.name || "Premiere đã kết nối"; }
  async verifyActiveProject() { try { await this.getProject(); return true; } catch (_) { return false; } }
  async getProjectFolder() { return null; }

  async collectBins(folder, prefix = "") {
    const result = [];
    for (const item of await folder.getItems()) {
      const child = this.ppro.FolderItem.cast(item);
      if (!child) continue;
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      result.push(path, ...await this.collectBins(child, path));
    }
    return result;
  }

  async getProjectBins() {
    const project = await this.getProject();
    return this.collectBins(await project.getRootItem());
  }

  async findChildBin(parent, name) {
    for (const item of await parent.getItems()) {
      if (item.name === name) {
        const folder = this.ppro.FolderItem.cast(item);
        if (folder) return folder;
      }
    }
    return null;
  }

  async ensureBin(project, parent, name) {
    let folder = await this.findChildBin(parent, name);
    if (folder) return folder;
    let success = false;
    project.lockedAccess(() => {
      success = project.executeTransaction(
        action => action.addAction(parent.createBinAction(name, true)),
        `Tạo Bin: ${name}`
      );
    });
    if (!success) throw new Error(`Premiere từ chối tạo Bin: ${name}`);
    folder = await this.findChildBin(parent, name);
    if (!folder) throw new Error(`Không tìm thấy Bin vừa tạo: ${name}`);
    return folder;
  }

  async resolveBin(project, path) {
    let parent = await project.getRootItem();
    if (!path || String(path).toLowerCase() === "root") return parent;
    for (const part of String(path).replace(/\\/g, "/").split("/").filter(Boolean)) {
      parent = await this.ensureBin(project, parent, part);
    }
    return parent;
  }

  async importAsset(localPath, binPath = "02_B-ROLL") {
    const project = await this.getProject();
    const targetBin = await this.resolveBin(project, binPath);
    const imported = await project.importFiles([localPath], true, targetBin, false);
    if (imported === false) throw new Error("Premiere không thể nhập file B-roll.");
    window.Logger.info(`Đã thêm B-roll vào Bin ${binPath}: ${localPath}`);
    return true;
  }
}

window.PremiereManager = new PremiereManager();
