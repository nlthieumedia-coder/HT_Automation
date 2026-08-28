import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc/register-handlers';
import { BinaryManager } from './media/binary-manager';
import { ScanService } from './scanner/scan-service';
import { YtDlpAnalyzer } from './scanner/ytdlp-analyzer';
import { DownloadManager } from './downloader/download-manager';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100, height: 760,
    webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  void window.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  const binaries = new BinaryManager();
  registerIpcHandlers(new ScanService(new YtDlpAnalyzer(binaries)), new DownloadManager(binaries));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
