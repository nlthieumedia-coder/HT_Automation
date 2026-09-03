import type { VideoItem } from '../../shared/types';
import { useAppStore } from '../stores/app-store';
import { formatBytes, formatDuration } from '../utils/format';
import { Icon } from './Icon';

export function VideoCard({ video }: { video: VideoItem }): React.JSX.Element {
  const selectedId = useAppStore(state => state.selectedFormats[video.id]);
  const select = useAppStore(state => state.selectFormat);
  const download = useAppStore(state => state.startDownload);
  const format = video.formats.find(item => item.id === selectedId) ?? video.formats[0];
  return <article className="video-card">
    <div className="thumbnail">{video.thumbnail ? <img src={video.thumbnail} alt=""/> : <div className="thumbnail-placeholder"><Icon name="file"/></div>}<span className="source-badge">{sourceName(video.sourceType)}</span>{video.duration && <span className="duration-badge">{formatDuration(video.duration)}</span>}</div>
    <div className="video-content"><div className="video-title-row"><div><p className="video-kicker">VIDEO ĐÃ PHÁT HIỆN</p><h3>{video.title}</h3></div></div>
      <div className="video-actions"><label><span>Chất lượng đầu ra</span><select value={selectedId} onChange={event => select(video.id, event.target.value)}>{video.formats.map(item => <option key={item.id} value={item.id}>{item.qualityLabel}</option>)}</select></label><button className="btn-primary download-button" onClick={() => void download(video)}><Icon name="download"/><span>Tải xuống</span></button></div>
      <div className="format-meta"><span>{format?.width && format.height ? `${format.width} × ${format.height}` : 'Độ phân giải gốc'}</span>{format?.fps && <span>{Math.round(format.fps)} FPS</span>}{format?.extension && <span>{format.extension.toUpperCase()}</span>}<span>{formatBytes(format?.fileSize)}</span>{!format?.hasAudio && <span className="merge-note">Tự động ghép âm thanh</span>}</div>
    </div>
  </article>;
}

function sourceName(source: VideoItem['sourceType']): string { return source === 'dash' ? 'REDDIT · DASH' : source.toUpperCase(); }
