import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tv,
  Search,
  Play,
  Clock,
  Star,
  Film,
  ListFilter,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  User,
  Clapperboard,
  RotateCcw,
  RotateCw,
  Gauge,
  Video,
  ListVideo,
  AlertCircle,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import {
  SeriesCategory,
  SeriesItem,
  SeriesInfo,
  EpisodeItem,
  SeasonInfo,
  WatchedHistory
} from "./types";

export default function App() {
  // Navigation & Browsing States
  const [categories, setCategories] = useState<SeriesCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  
  // Loading & Error States
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingSeries, setIsLoadingSeries] = useState<boolean>(true);
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Server/Account Info State
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Selected Series Details States
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(1);

  // Player States
  const [activeEpisode, setActiveEpisode] = useState<EpisodeItem | null>(null);
  const [playerEpisodes, setPlayerEpisodes] = useState<EpisodeItem[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);

  // Watching History
  const [watchedHistory, setWatchedHistory] = useState<WatchedHistory[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Load Categories & Account Info on Mount
  useEffect(() => {
    async function initData() {
      try {
        setIsLoadingCategories(true);
        setError(null);

        // Fetch categories
        const catRes = await fetch("/api/series/categories");
        if (!catRes.ok) throw new Error("تعذر جلب تصنيفات المسلسلات من السيرفر");
        const catData = await catRes.json();
        setCategories(catData);

        // Fetch account info
        const infoRes = await fetch("/api/info");
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          setAccountInfo(infoData);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "فشل الاتصال بخادم البث. يرجى التحقق من اتصالك بالإنترنت.");
      } finally {
        setIsLoadingCategories(false);
      }
    }

    initData();

    // Load watch history from LocalStorage
    const savedHistory = localStorage.getItem("xtream_watch_history");
    if (savedHistory) {
      try {
        setWatchedHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Fetch Series when Category changes
  useEffect(() => {
    async function fetchSeries() {
      try {
        setIsLoadingSeries(true);
        let url = "/api/series/all";
        if (selectedCategory !== "all") {
          url += `?category_id=${selectedCategory}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("تعذر جلب قائمة المسلسلات");
        const data = await res.json();
        setSeriesList(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "حدث خطأ أثناء جلب المسلسلات.");
      } finally {
        setIsLoadingSeries(false);
      }
    }

    fetchSeries();
  }, [selectedCategory]);

  // Load Specific Series Detailed Info (Seasons & Episodes)
  const handleSelectSeries = async (series: SeriesItem) => {
    setSelectedSeries(series);
    setIsLoadingInfo(true);
    setSeriesInfo(null);
    try {
      const res = await fetch(`/api/series/info/${series.series_id}`);
      if (!res.ok) throw new Error("تعذر جلب تفاصيل المسلسل وحلقاته");
      const data: SeriesInfo = await res.json();
      setSeriesInfo(data);

      // Default to the first season available or season_number 1
      if (data.seasons && data.seasons.length > 0) {
        setActiveSeasonNum(data.seasons[0].season_number || 1);
      } else if (data.episodes && Object.keys(data.episodes).length > 0) {
        const sortedSeasons = Object.keys(data.episodes).map(Number).sort((a, b) => a - b);
        setActiveSeasonNum(sortedSeasons[0]);
      } else {
        setActiveSeasonNum(1);
      }
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء تحميل الحلقات: " + err.message);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Launch Video Player for an Episode
  const handlePlayEpisode = (episode: EpisodeItem, episodesList: EpisodeItem[]) => {
    if (!selectedSeries) return;

    setActiveEpisode(episode);
    setPlayerEpisodes(episodesList);
    setIsPlaying(true);
    setCurrentTime(0);

    // Save/Update in Watched History
    const historyItem: WatchedHistory = {
      seriesId: selectedSeries.series_id,
      seriesName: selectedSeries.name,
      seriesCover: selectedSeries.cover,
      seasonNum: episode.season || activeSeasonNum,
      episodeNum: episode.episode_num,
      episodeTitle: episode.title || `الحلقة ${episode.episode_num}`,
      episodeId: episode.id,
      extension: episode.container_extension || "mp4",
      timestamp: Date.now()
    };

    const filtered = watchedHistory.filter(
      (h) => h.seriesId !== historyItem.seriesId
    );
    const updatedHistory = [historyItem, ...filtered].slice(0, 12); // Keep last 12
    setWatchedHistory(updatedHistory);
    localStorage.setItem("xtream_watch_history", JSON.stringify(updatedHistory));

    // Scroll smoothly to player container
    setTimeout(() => {
      playerContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Filter Categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return categories;
    return categories.filter((cat) =>
      cat.category_name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  // Filter Series by search query
  const filteredSeries = useMemo(() => {
    if (!searchQuery) return seriesList;
    return seriesList.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.plot && s.plot.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [seriesList, searchQuery]);

  // Featured Series (Choose the highest rated, or first available)
  const featuredSeries = useMemo(() => {
    if (seriesList.length === 0) return null;
    const rated = [...seriesList].filter(s => s.rating && parseFloat(s.rating) > 4.5);
    if (rated.length > 0) {
      return rated[Math.floor(Math.random() * Math.min(rated.length, 5))];
    }
    return seriesList[0];
  }, [seriesList]);

  // Handle Player control events
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const skipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
  };

  const skipBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Monitor fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Handle Video Ended (Auto-play Next)
  const handleVideoEnded = () => {
    if (!autoPlayNext || playerEpisodes.length === 0 || !activeEpisode) {
      setIsPlaying(false);
      return;
    }

    const currentIndex = playerEpisodes.findIndex((ep) => ep.id === activeEpisode.id);
    if (currentIndex !== -1 && currentIndex + 1 < playerEpisodes.length) {
      const nextEp = playerEpisodes[currentIndex + 1];
      handlePlayEpisode(nextEp, playerEpisodes);
    } else {
      setIsPlaying(false);
    }
  };

  // Auto-play video tag when activeEpisode changes
  useEffect(() => {
    if (videoRef.current && activeEpisode) {
      videoRef.current.load();
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [activeEpisode]);

  // Clean Watch History
  const clearHistory = () => {
    setWatchedHistory([]);
    localStorage.removeItem("xtream_watch_history");
  };

  // Fast format time helper
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = Math.floor(secs % 60);

    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(remainingSecs)}`;
    }
    return `${pad(mins)}:${pad(remainingSecs)}`;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300">
      
      {/* Target element for quick scrolling */}
      <div ref={topRef} />

      {/* HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Server Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
                <Tv className="w-7 h-7 text-slate-950 stroke-[2.5]" id="logo-icon" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-l from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                  إكستريم مسلسلات
                </h1>
                <p className="text-xs text-slate-400">بث فوري مباشر لأحدث الأعمال الدرامية</p>
              </div>
            </div>

            {/* Server Connection Indicator */}
            <div className="flex items-center gap-2 md:mr-6">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">سيرفر نشط</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md md:mx-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مسلسل، نوع، قصة..."
                className="w-full bg-slate-900 border border-slate-800 rounded-full py-2.5 pl-4 pr-11 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200"
                id="series-search-input"
              />
              <Search className="w-5 h-5 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* User Account / Server Expiration details */}
          {accountInfo && accountInfo.user_info && (
            <div className="hidden lg:flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-200">{accountInfo.user_info.username}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>الصلاحية:</span>
                <span className="font-mono text-slate-200">
                  {accountInfo.user_info.exp_date 
                    ? new Date(parseInt(accountInfo.user_info.exp_date) * 1000).toLocaleDateString("ar-EG")
                    : "غير محدد"}
                </span>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">

        {/* ERROR CONTAINER */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3 text-red-200" id="error-banner">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold">خطأ في الاتصال بالسيرفر</p>
              <p className="text-xs text-red-300/90 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-red-900/60 hover:bg-red-800 text-xs font-semibold rounded-lg transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* VIDEO PLAYER INTERFACE CONTAINER */}
        <AnimatePresence>
          {activeEpisode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              ref={playerContainerRef}
              className="mb-8"
              id="cinematic-player-section"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
                
                {/* Player Header */}
                <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 rounded-md text-xs font-bold border border-amber-500/20">
                      جاري التشغيل
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                        {selectedSeries?.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        الموسم {activeEpisode.season || activeSeasonNum} • الحلقة {activeEpisode.episode_num} {activeEpisode.title ? `(${activeEpisode.title})` : ""}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setActiveEpisode(null);
                      setIsPlaying(false);
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-all border border-slate-800"
                    title="إغلاق المشغل"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4">
                  
                  {/* Actual Video Canvas */}
                  <div className="lg:col-span-3 relative bg-black aspect-video flex items-center justify-center group/player">
                    
                    {/* The HTML5 video element */}
                    <video
                      ref={videoRef}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleVideoEnded}
                      className="w-full h-full object-contain"
                      src={`/api/stream/${activeEpisode.id}/${activeEpisode.container_extension || "mp4"}`}
                      playsInline
                    />

                    {/* CUSTOM PLAYER OVERLAYS (Shown on hover) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                      
                      {/* Top Overlay Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono bg-black/60 px-2 py-1 rounded border border-slate-800 text-slate-300">
                            صيغة الملف: {activeEpisode.container_extension?.toUpperCase() || "MP4"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Speed Multiplier dropdown */}
                          <div className="relative group/speed">
                            <button className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-semibold">
                              <Gauge className="w-3.5 h-3.5 text-amber-500" />
                              <span>السرعة ({playbackSpeed}x)</span>
                            </button>
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/speed:block bg-slate-950 border border-slate-800 rounded-lg overflow-hidden py-1 w-24 shadow-xl">
                              {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                                <button
                                  key={sp}
                                  onClick={() => changeSpeed(sp)}
                                  className={`w-full text-center py-1.5 text-xs block hover:bg-amber-500 hover:text-slate-950 ${playbackSpeed === sp ? "text-amber-400 font-bold" : "text-slate-300"}`}
                                >
                                  {sp}x
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Big Play Indicator */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <button
                          onClick={togglePlay}
                          className="p-5 bg-amber-500/90 text-slate-950 rounded-full hover:scale-115 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                        >
                          {isPlaying ? (
                            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                          ) : (
                            <Play className="w-8 h-8 fill-current translate-x-[-1px]" />
                          )}
                        </button>
                      </div>

                      {/* Bottom Custom Control Bar */}
                      <div className="space-y-3">
                        
                        {/* Timeline / Progress bar */}
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-300 bg-black/40 px-1.5 py-0.5 rounded">
                            {formatTime(currentTime)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={(e) => seekTo(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                          />
                          <span className="text-[11px] font-mono text-slate-300 bg-black/40 px-1.5 py-0.5 rounded">
                            {formatTime(duration)}
                          </span>
                        </div>

                        {/* Control buttons row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Play/Pause */}
                            <button onClick={togglePlay} className="text-slate-100 hover:text-amber-500 transition-colors">
                              {isPlaying ? (
                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                              ) : (
                                <Play className="w-6 h-6 fill-current" />
                              )}
                            </button>

                            {/* Backward 10s */}
                            <button onClick={skipBackward} className="text-slate-300 hover:text-amber-500 transition-colors" title="رجوع 10 ثواني">
                              <RotateCcw className="w-5 h-5" />
                            </button>

                            {/* Forward 10s */}
                            <button onClick={skipForward} className="text-slate-300 hover:text-amber-500 transition-colors" title="تقدم 10 ثواني">
                              <RotateCw className="w-5 h-5" />
                            </button>

                            {/* Volume section */}
                            <div className="flex items-center gap-2 group/volume ml-4">
                              <button onClick={toggleMute} className="text-slate-300 hover:text-amber-500 transition-colors">
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-16 sm:w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Auto Play Next Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-300">
                              <input
                                type="checkbox"
                                checked={autoPlayNext}
                                onChange={(e) => setAutoPlayNext(e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                              />
                              <span>التشغيل التلقائي للتالي</span>
                            </label>

                            {/* Fullscreen */}
                            <button onClick={toggleFullscreen} className="text-slate-300 hover:text-amber-500 transition-colors">
                              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Episodes Sidebar list for quick-swap */}
                  <div className="bg-slate-950 border-r border-slate-800 lg:col-span-1 flex flex-col h-[280px] lg:h-auto max-h-[450px]">
                    <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-amber-500" />
                        حلقات الموسم الحالي
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {playerEpisodes.length} حلقة
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 custom-scrollbar">
                      {playerEpisodes.map((ep) => {
                        const isCurrent = ep.id === activeEpisode.id;
                        return (
                          <button
                            key={ep.id}
                            onClick={() => handlePlayEpisode(ep, playerEpisodes)}
                            className={`w-full px-4 py-3 text-right flex items-start gap-2.5 transition-all text-xs ${isCurrent ? "bg-amber-500/10 border-r-2 border-amber-500 text-amber-400" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isCurrent ? (
                                <div className="flex gap-0.5 items-end h-3 w-3 mt-1 justify-center">
                                  <div className="bg-amber-500 w-0.5 animate-[pulse_1s_infinite_0.1s] h-full"></div>
                                  <div className="bg-amber-500 w-0.5 animate-[pulse_1s_infinite_0.3s] h-1/2"></div>
                                  <div className="bg-amber-500 w-0.5 animate-[pulse_1s_infinite_0.5s] h-3/4"></div>
                                </div>
                              ) : (
                                <Play className="w-3.5 h-3.5 opacity-60" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">الحلقة {ep.episode_num}</p>
                              {ep.title && <p className="text-[10px] text-slate-500 truncate mt-0.5">{ep.title}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO FEATURE SECTION */}
        {!selectedSeries && !activeEpisode && featuredSeries && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-l from-slate-950 via-slate-900 to-transparent min-h-[320px] sm:min-h-[400px] flex items-center border border-slate-900"
            id="hero-banner-section"
          >
            {/* Ambient Background backdrop */}
            <div 
              className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${featuredSeries.cover || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?w=1200'})` }}
            />
            {/* Dynamic decorative backdrop overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-950/40 to-slate-950 pointer-events-none" />

            {/* Hero Content */}
            <div className="relative z-10 p-6 sm:p-10 max-w-2xl text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-xs font-black mb-4">
                <TrendingUp className="w-3.5 h-3.5" />
                عمل مميز مقترح
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-50 mb-3 leading-tight">
                {featuredSeries.name}
              </h2>
              {featuredSeries.plot && (
                <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed line-clamp-3">
                  {featuredSeries.plot}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-6">
                {featuredSeries.rating && (
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{featuredSeries.rating} / 10</span>
                  </div>
                )}
                {featuredSeries.genre && (
                  <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded">
                    <Film className="w-3.5 h-3.5 text-slate-300" />
                    <span>{featuredSeries.genre}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSelectSeries(featuredSeries)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/10"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>شاهد الحلقات الآن</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* RECENTLY WATCHED / CONTINUE WATCHING */}
        {watchedHistory.length > 0 && !searchQuery && (
          <div className="mb-8" id="continue-watching-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                مستمر في المشاهدة
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-slate-500 hover:text-red-400 font-semibold transition-all"
              >
                مسح السجل
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchedHistory.map((history) => (
                <div
                  key={history.timestamp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group/history flex flex-col justify-between"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                    <img
                      src={history.seriesCover || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500"}
                      alt={history.seriesName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover/history:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/history:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={async () => {
                          // Find corresponding series and launch info then start
                          const fakeSeries: SeriesItem = {
                            num: 0,
                            series_id: history.seriesId,
                            name: history.seriesName,
                            cover: history.seriesCover,
                            plot: "", cast: "", director: "", genre: "", releaseDate: "", last_modified: "", rating: "", rating_5count: 0, backdrop_path: [], youtube_trailer: "", episode_run_time: "", category_id: ""
                          };
                          handleSelectSeries(fakeSeries);
                          // Trigger play directly if we fetch info later
                          const epToPlay: EpisodeItem = {
                            id: history.episodeId,
                            episode_num: history.episodeNum,
                            title: history.episodeTitle,
                            container_extension: history.extension
                          };
                          handlePlayEpisode(epToPlay, [epToPlay]);
                        }}
                        className="p-3 bg-amber-500 rounded-full text-slate-950 scale-90 group-hover/history:scale-100 transition-all shadow-lg"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-xs text-slate-200 truncate">{history.seriesName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-1">
                      م{history.seasonNum} • حلقة {history.episodeNum}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRONWSE CATEGORIES LIST */}
        <div className="mb-6" id="categories-section">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-extrabold text-slate-200 flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-amber-500" />
              تصفح الأقسام والتصنيفات
            </h3>
            
            {/* Categories filter search input */}
            <div className="relative max-w-[240px]">
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="ابحث عن قسم..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {isLoadingCategories ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 w-28 bg-slate-900 rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border shrink-0 ${selectedCategory === "all" ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}
              >
                الكل ({seriesList.length})
              </button>
              {filteredCategories.map((cat) => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategory(cat.category_id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border shrink-0 ${selectedCategory === cat.category_id ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SERIES LIST GRID CONTAINER */}
        <div className="mb-12" id="series-grid-section">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-200">
              {selectedCategory === "all" 
                ? "جميع الأعمال المتاحة" 
                : categories.find(c => c.category_id === selectedCategory)?.category_name || "قائمة الأعمال"}
            </h3>
            <span className="text-xs text-slate-500 font-mono font-medium">
              عُثر على {filteredSeries.length} عمل
            </span>
          </div>

          {isLoadingSeries ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-[3/4] bg-slate-900 rounded-2xl animate-pulse" />
                  <div className="h-4 bg-slate-900 rounded-lg animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-900 rounded-lg animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-900 rounded-3xl">
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-bold">لم نجد أي مسلسلات تطابق بحثك</p>
              <p className="text-xs text-slate-600 mt-1">تأكد من كتابة الاسم بشكل صحيح أو جرب تصفح أقسام أخرى</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {filteredSeries.map((series) => (
                <motion.div
                  key={series.series_id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSelectSeries(series)}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between shadow-md hover:shadow-xl hover:border-amber-500/30 transition-all"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                    <img
                      src={series.cover || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500"}
                      alt={series.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                    {/* Star Rating Badge */}
                    {series.rating && parseFloat(series.rating) > 0 && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400 stroke-none" />
                        <span>{parseFloat(series.rating).toFixed(1)}</span>
                      </div>
                    )}

                    {/* Play Icon Trigger */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <div className="p-3.5 bg-amber-500 text-slate-950 rounded-full scale-75 group-hover:scale-100 transition-all shadow-xl shadow-amber-500/20">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Title and metadata */}
                  <div className="p-3">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-amber-400 transition-colors line-clamp-1 mb-1.5" title={series.name}>
                      {series.name}
                    </h4>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      {series.releaseDate ? (
                        <span className="font-mono">{series.releaseDate.substring(0, 4)}</span>
                      ) : (
                        <span>دراما</span>
                      )}
                      
                      {series.episode_run_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{series.episode_run_time} د</span>
                        </span>
                      )}
                    </div>
                  </div>

                </motion.div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p>© {new Date().getFullYear()} مُشغّل مسلسلات إكستريم - البث الشخصي المباشر. جميع الحقوق محفوظة.</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-slate-600">IPTV Proxy Core 1.0</span>
            <span className="text-slate-700">•</span>
            <button 
              onClick={() => {
                topRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-amber-500 hover:underline"
            >
              العودة للأعلى ↑
            </button>
          </div>
        </div>
      </footer>

      {/* SERIES DETAILED OVERLAY / MODAL DIALOG */}
      <AnimatePresence>
        {selectedSeries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            id="series-details-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Banner Backdrop */}
              <div className="relative h-44 sm:h-60 shrink-0 bg-slate-950">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{ backgroundImage: `url(${selectedSeries.cover || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?w=1200'})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedSeries(null)}
                  className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black text-slate-300 hover:text-slate-100 rounded-full transition-all border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Cover and Fast Title */}
                <div className="absolute bottom-4 right-6 flex items-end gap-4 sm:gap-6 left-6">
                  <img
                    src={selectedSeries.cover || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500"}
                    alt={selectedSeries.name}
                    referrerPolicy="no-referrer"
                    className="w-20 sm:w-28 aspect-[3/4] object-cover rounded-xl border-2 border-slate-800 shadow-2xl hidden xs:block shrink-0"
                  />
                  <div className="flex-1 min-w-0 pb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block mb-1 sm:mb-2">
                      {selectedSeries.genre || "مسلسل درامي"}
                    </span>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-100 truncate">
                      {selectedSeries.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Modal Body Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                
                {isLoadingInfo ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
                    <p className="text-xs text-slate-400">جاري تفكيك السيرفر والتحقق من الحلقات والمواسم...</p>
                  </div>
                ) : seriesInfo ? (
                  <div className="space-y-6">
                    
                    {/* Information Meta Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Left Column: Description */}
                      <div className="sm:col-span-2 space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">القصة والملخص</h4>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {seriesInfo.info?.plot || selectedSeries.plot || "لا يوجد ملخص متاح لهذه القصة حالياً."}
                        </p>
                      </div>

                      {/* Right Column: Directors and cast info */}
                      <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-3.5 text-xs">
                        {seriesInfo.info?.director && (
                          <div className="flex items-start gap-2">
                            <Clapperboard className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-slate-500 font-semibold">المخرج</p>
                              <p className="text-slate-200 mt-0.5">{seriesInfo.info.director}</p>
                            </div>
                          </div>
                        )}
                        {seriesInfo.info?.cast && (
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-slate-500 font-semibold">طاقم التمثيل</p>
                              <p className="text-slate-200 mt-0.5 line-clamp-2">{seriesInfo.info.cast}</p>
                            </div>
                          </div>
                        )}
                        {seriesInfo.info?.releaseDate && (
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-slate-500 font-semibold">تاريخ الصدور الأول</p>
                              <p className="text-slate-200 mt-0.5 font-mono">{seriesInfo.info.releaseDate}</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Seasons selection tabs */}
                    {seriesInfo.seasons && seriesInfo.seasons.length > 0 && (
                      <div className="border-t border-slate-800/60 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">المواسم المتوفرة</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {seriesInfo.seasons.map((season) => (
                            <button
                              key={season.season_number}
                              onClick={() => setActiveSeasonNum(season.season_number)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeSeasonNum === season.season_number ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                            >
                              {season.name || `الموسم ${season.season_number}`} 
                              <span className="text-[10px] opacity-70 mr-1.5 font-mono">({season.episode_count} حلقة)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Episodes list Grid for currently active season */}
                    <div className="border-t border-slate-800/60 pt-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          حلقات الموسم ({activeSeasonNum})
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          {seriesInfo.episodes && seriesInfo.episodes[activeSeasonNum.toString()] 
                            ? `${seriesInfo.episodes[activeSeasonNum.toString()].length} حلقة`
                            : "لا يوجد حلقات"}
                        </span>
                      </div>

                      {seriesInfo.episodes && seriesInfo.episodes[activeSeasonNum.toString()] ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seriesInfo.episodes[activeSeasonNum.toString()].map((episode) => {
                            const isCurrentlyPlayingThis = activeEpisode?.id === episode.id;
                            return (
                              <div
                                key={episode.id}
                                onClick={() => handlePlayEpisode(episode, seriesInfo.episodes[activeSeasonNum.toString()])}
                                className={`p-3 bg-slate-950/40 border rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-950 group/episode ${isCurrentlyPlayingThis ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800 hover:border-slate-700"}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Small Play Box Indicator */}
                                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 border border-slate-800 group-hover/episode:border-amber-500/40 group-hover/episode:bg-amber-500/10 transition-all">
                                    <Play className="w-4 h-4 text-amber-500 fill-amber-500 group-hover/episode:scale-110 transition-all" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-slate-100">
                                      الحلقة {episode.episode_num}
                                    </p>
                                    {episode.title && (
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5 max-w-[200px]">
                                        {episode.title}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">
                                  {(episode.container_extension || "mp4").toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                          عذراً، لم نتمكن من العثور على حلقات مسجلة لهذا الموسم داخل خادم السيرفر.
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    تعذر تحميل تفاصيل المسلسل. يرجى إغلاق النافذة والمحاولة لاحقاً.
                  </div>
                )}

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
