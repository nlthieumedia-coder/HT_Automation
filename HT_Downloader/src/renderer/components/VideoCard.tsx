import type { VideoItem } from '../../shared/types';
import { useAppStore } from '../stores/app-store';
import { formatBytes, formatDuration } from '../utils/format';

export function VideoCard({ video }: { video: VideoItem }): React.JSX.Element {
  const selectedId = useAppStore(state => state.selectedFormats[video.id]); const select = useAppStore(state => state.selectFormat); const download = useAppStore(state => state.startDownload);
  const format = video.formats.find(item => item.id === selectedId) ?? video.formats[0];
  return <article className="card overflow-hidden">
    <div className="grid gap-0 md:grid-cols-[240px_1fr]">
      <div className="flex min-h-40 items-center justify-center bg-slate-950">
        {video.thumbnail ? <img src={video.thumbnail} className="h-full max-h-52 w-full object-cover" alt="" /> : <span className="text-4xl text-slate-700">▶</span>}
      </div>
      <div className="p-5"><div className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">{video.sourceType}</div>
        <h2 className="mb-2 line-clamp-2 text-lg font-semibold">{video.title}</h2><p className="mb-5 text-sm text-slate-400">{formatDuration(video.duration)}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">Quality</span>
          <select value={selectedId} onChange={event => select(video.id, event.target.value)} className="w-full rounded-xl border border-line bg-slate-950 px-4 py-3 outline-none focus:border-violet-500">{video.formats.map(item => <option key={item.id} value={item.id}>{item.qualityLabel}</option>)}</select></label>
          <button className="btn-primary self-end" onClick={() => void download(video)}>Download</button></div>
        <p className="mt-3 text-xs text-slate-500">{format?.width && format.height ? `${format.width}×${format.height}` : 'Original resolution'}{format?.fps ? ` • ${Math.round(format.fps)} FPS` : ''}{format?.extension ? ` • ${format.extension.toUpperCase()}` : ''} • {formatBytes(format?.fileSize)}</p>
      </div>
    </div>
  </article>;
}
