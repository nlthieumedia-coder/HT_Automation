import { useEffect } from 'react';
import { DownloadPanel } from './components/DownloadPanel';
import { Icon } from './components/Icon';
import { VideoCard } from './components/VideoCard';
import { useAppStore } from './stores/app-store';

export function App(): React.JSX.Element {
  const store = useAppStore();
  const downloads = Object.values(store.downloads);
  useEffect(() => window.htDownloader.onDownloadProgress(progress => useAppStore.getState().updateDownload(progress)), []);

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><img className="brand-mark" src="./logo_icon.png" alt="HT Studio"/><div><div className="brand-suite">HT_STUDIO</div><h1>Downloader</h1></div></div>
      <div className="header-status"><span className="status-dot"/><span>Sẵn sàng</span><div className="version-badge">v2.0.2</div></div>
    </header>

    <main className="dashboard">
      <aside className="control-column">
        <div className="dashboard-intro"><p className="eyebrow">BẢNG ĐIỀU KHIỂN</p><h2>Tải video</h2><p>Dán liên kết, chọn nơi lưu rồi quét video.</p></div>

        <section className="panel control-panel">
          <div className="step-label"><span>1</span><div><strong>Liên kết nguồn</strong><small>Reddit và các trang hỗ trợ yt-dlp</small></div></div>
          <form onSubmit={event => { event.preventDefault(); void store.scan(); }}>
            <label className="field-label" htmlFor="source-url">URL video</label>
            <textarea id="source-url" autoFocus value={store.url} onChange={event => store.setUrl(event.target.value)} placeholder={'Mỗi dòng một liên kết\nhttps://www.reddit.com/r/...\nhttps://www.youtube.com/watch?v=...'} rows={5}/>
            <button disabled={store.scanStatus === 'scanning' || !store.url.trim()} className="btn-primary scan-button"><Icon name="link"/><span>{store.scanStatus === 'scanning' ? `Đang quét ${store.scanProgress?.completed ?? 0}/${store.scanProgress?.total ?? 0}` : 'Quét các liên kết'}</span></button>
          </form>
        </section>

        <section className="panel control-panel storage-panel">
          <div className="step-label"><span>2</span><div><strong>Nơi lưu tệp</strong><small>Thư mục chứa video sau khi tải</small></div></div>
          <button type="button" onClick={() => void store.chooseDirectory()} className="storage-picker"><div className="storage-icon"><Icon name="folder"/></div><div><small>THƯ MỤC ĐÍCH</small><strong>{store.outputDirectory ?? 'Chưa chọn thư mục'}</strong></div><Icon name="external"/></button>
        </section>

        <div className="control-note"><Icon name="check"/><span>FFmpeg tự động ghép video và âm thanh. Nội dung DRM không được hỗ trợ.</span></div>
      </aside>

      <section className="content-column">
        <div className="content-header"><div><p className="eyebrow">THƯ VIỆN KẾT QUẢ</p><h2>Video đã quét</h2></div>{store.result && <span className="result-count">{store.result.videos.length}</span>}</div>
        {store.error && <div className="alert-error"><Icon name="close"/><span>{store.error}</span></div>}
        {store.scanStatus === 'scanning' && <div className="empty-state scanning-state"><div className="scan-loader"/><h3>Đang phân tích các liên kết</h3><p>Đã quét {store.scanProgress?.completed ?? 0} trên {store.scanProgress?.total ?? 0} liên kết.</p></div>}
        {store.scanStatus !== 'scanning' && !store.result && <div className="empty-state"><div className="empty-icon"><Icon name="file"/></div><h3>Chưa có video</h3><p>Nhập liên kết ở bảng điều khiển bên trái và bấm “Quét liên kết”.</p></div>}
        {store.result && <div className="result-list dashboard-results">{store.result.videos.map(video => {
          const videoDownloads = downloads.filter(item => item.videoId === video.id);
          return <div className="video-result-group" key={video.id}>
            <VideoCard video={video}/>
            {videoDownloads.length > 0 && <div className="inline-downloads">{videoDownloads.map(item => <DownloadPanel key={item.downloadId} item={item}/>)}</div>}
          </div>;
        })}</div>}
      </section>
    </main>
    <footer><span>HT Studio · Media workflow tools</span><span>Chỉ tải nội dung mà bạn có quyền sử dụng</span></footer>
  </div>;
}
