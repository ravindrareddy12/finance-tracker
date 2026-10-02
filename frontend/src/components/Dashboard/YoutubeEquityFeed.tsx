import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Youtube, ExternalLink, Play } from 'lucide-react';

interface YTVideo {
  videoId:     string;
  title:       string;
  description: string | null;
  thumbnail:   string;
  publishedAt: string | null;
  channelName: string;
  url:         string;
}

interface YTChannel {
  handle:    string;
  channelId: string | null;
  videos:    YTVideo[];
  error?:    string;
}

const CHANNELS = [
  { handle: '@AkshatShrivastava', displayName: 'Akshat Shrivastava', color: 'bg-red-100 text-red-700', dot: '#ef4444' },
  { handle: '@SahilBhadviya',     displayName: 'Sahil Bhadviya',     color: 'bg-orange-100 text-orange-700', dot: '#f97316' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function YoutubeEquityFeed() {
  const [channels,  setChannels]  = useState<YTChannel[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const handles = CHANNELS.map(c => c.handle).join(',');
      const { data } = await axios.get(`/api/youtube?handles=${encodeURIComponent(handles)}`);
      setChannels(data.channels ?? []);
      setLastFetch(new Date());
    } catch {
      setError('Failed to load YouTube feeds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  // Merge all videos for "All" tab, sorted by date
  const allVideos: (YTVideo & { handle: string })[] = channels.flatMap(ch =>
    ch.videos.map(v => ({ ...v, handle: ch.handle }))
  ).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  const activeChannel = channels.find(c => c.handle === activeTab);
  const displayVideos = activeTab === 'ALL'
    ? allVideos
    : (activeChannel?.videos ?? []).map(v => ({ ...v, handle: activeTab }));

  const totalVideos = channels.reduce((s, c) => s + c.videos.length, 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">YouTube Equity Feeds</h2>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Latest videos from finance creators
            {lastFetch && (
              <span className="ml-2 text-gray-300">
                · Updated {lastFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetch} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Channel tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-0">
        <button onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === 'ALL' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          All
          {totalVideos > 0 && (
            <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">{totalVideos}</span>
          )}
        </button>
        {CHANNELS.map(ch => {
          const data = channels.find(c => c.handle === ch.handle);
          const count = data?.videos.length ?? 0;
          return (
            <button key={ch.handle} onClick={() => setActiveTab(ch.handle)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === ch.handle ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.dot }} />
              {ch.displayName}
              {count > 0 && (
                <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Channel-level errors */}
      {!loading && channels.filter(c => c.error).map(c => (
        <div key={c.handle} className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 text-sm text-amber-700">
          {c.handle}: {c.error}
        </div>
      ))}

      {/* Skeleton */}
      {loading && channels.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
              <div className="w-full h-44 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video grid */}
      {!loading && displayVideos.length === 0 && channels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-gray-400">
          <Youtube className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No videos found</p>
          <p className="text-sm mt-1">Could not load videos for this channel.</p>
        </div>
      )}

      {displayVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayVideos.map(video => {
            const meta = CHANNELS.find(c => c.handle === video.handle);
            return (
              <a key={`${video.handle}-${video.videoId}`}
                href={video.url} target="_blank" rel="noopener noreferrer"
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-red-200 transition-all flex flex-col">

                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Youtube className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-red-600 rounded-full p-3 shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                  {/* Channel badge */}
                  {activeTab === 'ALL' && meta && (
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.displayName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-red-700 transition-colors">
                    {video.title}
                  </h3>

                  {video.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{video.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 font-medium">{video.channelName || meta?.displayName}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      {timeAgo(video.publishedAt)}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
