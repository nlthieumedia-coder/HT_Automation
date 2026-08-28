import type { DownloadProgress } from '../../shared/types';
import { useAppStore } from '../stores/app-store';
import { formatBytes } from '../utils/format';

export function DownloadPanel({ item }: { item: DownloadProgress }): React.JSX.Element {
  const cancel = useAppStore(state => state.cancel); const terminal = ['complete', 'error', 'cancelled'].includes(item.status);
  return <div className="card p-5"><div className="mb-3 flex items-center justify-between"><strong className="capitalize">{item.status === 'merging' ? 'Merging audio and video…' : item.status === 'complete' ? 'Download complete' : item.status === 'error' ? (item.message ?? 'Download failed') : `${item.status}…`}</strong><span className="font-mono text-violet-300">{Math.round(item.percent)}%</span></div>
    <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all" style={{ width: `${item.percent}%` }} /></div>
    <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4"><span>Downloaded<br/><b className="text-slate-200">{formatBytes(item.downloadedBytes)}{item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ''}</b></span><span>Speed<br/><b className="text-slate-200">{item.speed ?? '—'}</b></span><span>ETA<br/><b className="text-slate-200">{item.eta ?? '—'}</b></span><span>Status<br/><b className="text-slate-200 capitalize">{item.status}</b></span></div>
    {!terminal && <button className="btn-secondary" onClick={() => void cancel(item.downloadId)}>Cancel</button>}
    {item.status === 'complete' && item.filePath && <div className="flex gap-2"><button className="btn-primary" onClick={() => void window.htDownloader.openFile(item.filePath!)}>Open File</button><button className="btn-secondary" onClick={() => void window.htDownloader.openFolder(item.filePath!)}>Open Folder</button></div>}
  </div>;
}
