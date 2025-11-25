export interface Trail {
  name: string;
  link?: string | null;
}

export interface Campground {
  name: string;
  link?: string | null;
}

export interface CampgroundEntry {
  city: string;
  state: string;
  hookup_type: 'full' | 'partial' | 'none';
  campground: Campground;
  cg_notes?: string;
  trail?: Trail;
  trails?: Trail[];
  trail_notes?: string;
  directions?: string;
  other?: string;
  blog_post?: string;
  blog_post_link?: string;
  contributor?: string;
  contributor_blog?: string;
  contributor_blog_link?: string;
  part?: string; // For Part 4/5 entries
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface CampgroundDatabase {
  entries: CampgroundEntry[];
  metadata?: {
    version: string;
    source: string;
  };
}
