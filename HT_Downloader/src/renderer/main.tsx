import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { App } from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
if (!window.htDownloader) {
  root.render(<main className="grid min-h-screen place-items-center p-8"><div className="card max-w-lg p-6"><h1 className="mb-2 text-xl font-bold text-red-300">Application bridge failed to load</h1><p className="text-slate-400">Please restart HT Downloader. If the problem continues, reinstall the latest build.</p></div></main>);
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
