import { useEffect } from 'react';
import { DownloadPanel } from './components/DownloadPanel';
import { VideoCard } from './components/VideoCard';
import { useAppStore } from './stores/app-store';

export function App(): React.JSX.Element {
  const store = useAppStore();
  useEffect(() => window.htDownloader.onDownloadProgress(progress => useAppStore.getState().updateDownload(progress)), []);
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-10"><header className="mb-10"><div className="mb-3 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-xl">↓</div><div><h1 className="text-2xl font-bold">HT Downloader</h1><p className="text-sm text-slate-500">Scan and save media you have permission to access</p></div></div></header>
    <section className="card mb-8 p-5"><form onSubmit={event => { event.preventDefault(); void store.scan(); }} className="flex flex-col gap-3 sm:flex-row"><input autoFocus value={store.url} onChange={event => store.setUrl(event.target.value)} placeholder="Paste URL here…" className="min-w-0 flex-1 rounded-xl border border-line bg-slate-950 px-5 py-3 outline-none placeholder:text-slate-600 focus:border-violet-500"/><button disabled={store.scanStatus === 'scanning'} className="btn-primary min-w-28">{store.scanStatus === 'scanning' ? 'Scanning…' : 'Scan'}</button></form>
      <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row"><span>{store.scanStatus === 'scanning' ? 'Scanning webpage without downloading media…' : 'HTTP and HTTPS URLs only • DRM is not supported'}</span><button type="button" onClick={() => void store.chooseDirectory()} className="truncate text-left text-violet-400 hover:text-violet-300">Save to: {store.outputDirectory ?? 'Choose folder'}</button></div></section>
    {store.error && <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{store.error}</div>}
    {store.result && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold text-violet-400">SCAN COMPLETE</p><h2 className="text-2xl font-bold">Found {store.result.videos.length} {store.result.videos.length === 1 ? 'video' : 'videos'}</h2></div></div><div className="grid gap-5">{store.result.videos.map(video => <VideoCard key={video.id} video={video}/>)}</div></section>}
    {Object.values(store.downloads).length > 0 && <section className="mt-10"><h2 className="mb-4 text-xl font-bold">Downloads</h2><div className="grid gap-4">{Object.values(store.downloads).map(item => <DownloadPanel key={item.downloadId} item={item}/>)}</div></section>}
  </main>;
}
