import type { DownloadProgress } from '../../shared/types';
import { useAppStore } from '../stores/app-store';
import { formatBytes } from '../utils/format';
import { Icon } from './Icon';

export function DownloadPanel({ item }: { item: DownloadProgress }): React.JSX.Element {
  const cancel = useAppStore(state => state.cancel); const terminal = ['complete', 'error', 'cancelled'].includes(item.status);
  return <article className="download-panel"><div className={`download-status-icon ${item.status}`}><Icon name={item.status === 'complete' ? 'check' : item.status === 'error' ? 'close' : 'download'}/></div><div className="download-body"><div className="download-title"><strong>{statusText(item)}</strong><span>{Math.round(item.percent)}%</span></div><div className="progress-track"><div className="progress-value" style={{ width: `${item.percent}%` }}/></div><div className="download-meta"><span>{formatBytes(item.downloadedBytes)}{item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ''}</span><span>{item.speed ?? '—'}</span><span>ETA {item.eta ?? '—'}</span></div><div className="download-controls">{!terminal && <button className="btn-secondary" onClick={() => void cancel(item.downloadId)}>Hủy</button>}{item.status === 'complete' && item.filePath && <><button className="btn-primary compact" onClick={() => void window.htDownloader.openFile(item.filePath!)}><Icon name="file"/>Mở tệp</button><button className="btn-secondary" onClick={() => void window.htDownloader.openFolder(item.filePath!)}><Icon name="external"/>Mở thư mục</button></>}</div></div></article>;
}

function statusText(item: DownloadProgress): string {
  if (item.status === 'merging') return 'Đang ghép hình ảnh và âm thanh'; if (item.status === 'complete') return 'Tải xuống hoàn tất'; if (item.status === 'error') return item.message ?? 'Tải xuống thất bại'; if (item.status === 'cancelled') return 'Đã hủy'; if (item.status === 'starting') return 'Đang chuẩn bị'; return 'Đang tải xuống';
}
