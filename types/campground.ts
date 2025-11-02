export interface Contributor {
  name: string;
  location: string | null;
}

export interface Trail {
  description: string;
  name: string;
  distance: string;
  surface: string;
}

export interface Campground {
  name: string;
  type: string;
  info: string;
  notes: string;
}

export interface CampgroundEntry {
  city: string;
  state: string;
  hookup_type: 'full' | 'partial';
  campground: Campground;
  trails: Trail[];
  blog_post: string | null;
  contributor: Contributor | null;
  exception?: string;
  latitude: number;
  longitude: number;
}

export interface CampgroundDatabase {
  entries: CampgroundEntry[];
}

