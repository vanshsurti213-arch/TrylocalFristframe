import creatorsJson from './creators.json';

export interface Reel {
  id: string;
  label: string;
  videoUrl: string;
  thumbnailUrl?: string;
  views?: string;
  likes?: string;
}

export interface Creator {
  id: string;
  name: string;
  handle?: string;
  profileUrl?: string;
  followers: string;
  avgViews: string;
  engagementRate?: string;
  niches: string[];
  reels: Reel[];
  videoUrl?: string;
  brandCollabs?: number;
}

export const creators: Creator[] = creatorsJson as Creator[];
