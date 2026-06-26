export interface SeriesCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface SeriesItem {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5count: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface SeasonInfo {
  air_date?: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  cover?: string;
}

export interface EpisodeItem {
  id: string | number;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    duration_secs?: number;
    duration?: string;
    movie_image?: string;
    plot?: string;
    releasedate?: string;
    rating?: number | string;
  };
  custom_sid?: any;
  added?: string;
  season?: number;
}

export interface SeriesInfo {
  seasons: SeasonInfo[];
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    category_id: string;
    backdrop_path: string[];
  };
  episodes: {
    [seasonNumber: string]: EpisodeItem[];
  };
}

export interface WatchedHistory {
  seriesId: number;
  seriesName: string;
  seriesCover: string;
  seasonNum: number;
  episodeNum: number;
  episodeTitle: string;
  episodeId: string | number;
  extension: string;
  timestamp: number;
}
