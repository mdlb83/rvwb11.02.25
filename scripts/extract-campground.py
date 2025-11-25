#!/usr/bin/env python3
"""
Extract a single campground entry from PDF and get coordinates from Google Places API.
Designed for one-at-a-time verification.

Usage:
    python scripts/extract-campground.py --page 17  # Extract from specific page
    python scripts/extract-campground.py --save     # Save after verification
"""

import os
import sys
import json
import re
import argparse
import requests
import pdfplumber
import PyPDF2

# Configuration
PDF_PATH = "eBook PDF/rving-with-bikes-11-21-2025-final-edition_6920b822.pdf"
NEW_DATABASE_PATH = "data/campgrounds_new.json"
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY') or os.environ.get('GOOGLE_PLACES_API_KEY')

def extract_links_from_page(pdf_path: str, page_num: int) -> list:
    """Extract all links from a PDF page with their positions."""
    links = []
    
    with pdfplumber.open(pdf_path) as pdf:
        page_height = pdf.pages[page_num - 1].height
    
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        pdf_page = reader.pages[page_num - 1]
        
        if '/Annots' in pdf_page:
            for annot in pdf_page['/Annots']:
                annot_obj = annot.get_object()
                if annot_obj.get('/Subtype') == '/Link':
                    if '/A' in annot_obj:
                        action = annot_obj['/A']
                        if '/URI' in action:
                            rect = annot_obj.get('/Rect', [])
                            if rect:
                                # Convert to pdfplumber coordinates (top-down)
                                y_top = page_height - rect[3]
                                y_bottom = page_height - rect[1]
                                links.append({
                                    'uri': action['/URI'],
                                    'x0': rect[0],
                                    'x1': rect[2],
                                    'y_top': y_top,
                                    'y_bottom': y_bottom
                                })
    
    return links


def find_link_for_position(links: list, text_y: float) -> str:
    """Find a link that overlaps with the given y position."""
    for link in links:
        if link['y_top'] - 5 <= text_y <= link['y_bottom'] + 5:
            return link['uri']
    return None


def find_entries_on_page(pdf_path: str, page_num: int) -> list:
    """Find all campground entries on a page and return their text blocks."""
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num - 1]
        text = page.extract_text()
    
    lines = text.split('\n')
    entries = []
    current_entry_lines = []
    current_entry_start = None
    
    for i, line in enumerate(lines):
        # Check if this line starts a new entry (City, ST or City, ST (X) pattern)
        match = re.match(r'^([A-Z][a-zA-Z\s\.\']+),\s+([A-Z]{2})(?:\s+\(([A-Z])\))?$', line.strip())
        if match:
            # Save previous entry if exists
            if current_entry_lines:
                entries.append({
                    'start_line': current_entry_start,
                    'text': '\n'.join(current_entry_lines),
                    'city': None,  # Will be parsed later
                    'state': None
                })
            # Start new entry
            current_entry_lines = [line]
            current_entry_start = i
        elif current_entry_start is not None:
            # Skip footer lines
            if 'RVingwithBikes.Com' in line or line.strip().startswith('Page '):
                continue
            current_entry_lines.append(line)
    
    # Don't forget the last entry
    if current_entry_lines:
        entries.append({
            'start_line': current_entry_start,
            'text': '\n'.join(current_entry_lines),
            'city': None,
            'state': None
        })
    
    return entries


def extract_entry_from_page(pdf_path: str, page_num: int, entry_index: int = 0) -> dict:
    """Extract campground entry data from a specific PDF page.
    
    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        entry_index: Which entry on the page (0-indexed, default 0 for first entry)
    """
    
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num - 1]
        full_text = page.extract_text()
        words = page.extract_words()
    
    links = extract_links_from_page(pdf_path, page_num)
    
    # Find all entries on this page
    page_entries = find_entries_on_page(pdf_path, page_num)
    
    if not page_entries:
        return {}, full_text, links
    
    if entry_index >= len(page_entries):
        print(f"⚠️  Entry index {entry_index} out of range. Page has {len(page_entries)} entries.")
        return {}, full_text, links
    
    # Get the specific entry's text block
    text = page_entries[entry_index]['text']
    
    entry = {}
    
    # Parse city/state from the entry text
    lines = text.split('\n')
    for line in lines:
        match = re.match(r'^([A-Z][a-zA-Z\s\.\']+),\s+([A-Z]{2})(?:\s+\(([A-Z])\))?$', line.strip())
        if match:
            entry['city'] = match.group(1).strip()
            entry['state'] = match.group(2)
            entry['hookup_code'] = match.group(3) if match.group(3) else None
            break
    
    # Campground name and link
    # Find the Nth occurrence of "Campground:" that corresponds to this entry
    cg_match = re.search(r'Campground:\s*(.+?)\.?\s*\n', text)
    if cg_match:
        cg_name = cg_match.group(1).strip().rstrip('.')
        cg_link = None
        
        # Find all "Campground:" words on the page and use the one at entry_index
        cg_words = [w for w in words if w['text'] == 'Campground:']
        if entry_index < len(cg_words):
            potential_link = find_link_for_position(links, cg_words[entry_index]['top'])
            # Validate: campground link shouldn't look like a trail/path link
            if potential_link:
                trail_keywords = ['/trail/', '/trails', 'traillink.com', 'recreationtrails', 
                                  'loop', 'greenway', 'bikeway', 'pathway', '/bicycling']
                is_trail_link = any(kw in potential_link.lower() for kw in trail_keywords)
                if not is_trail_link:
                    cg_link = potential_link
        
        entry['campground'] = {'name': cg_name, 'link': cg_link}
    
    # CG Notes (strip trailing period for non-sentences)
    cg_notes_match = re.search(r'CG Notes:\s*(.+?)(?=\nTrail:|\nTrail Notes:|\nDirections:|\nOther:|\nRelated|\nContributor:|\nRVingwithBikes|$)', text, re.DOTALL)
    if cg_notes_match:
        cg_notes = cg_notes_match.group(1).strip().rstrip('.')
        entry['cg_notes'] = cg_notes
    
    # Trail name(s) and link(s) - can have multiple trails
    # Find all "Trail:" lines in this entry's text (before "Trail Notes:")
    trail_section = text.split('Trail Notes:')[0] if 'Trail Notes:' in text else text
    trail_matches = re.findall(r'Trail:\s*(.+?)\.?\s*(?:\n|$)', trail_section)
    
    if trail_matches:
        # Find all "Trail:" words on the page for link matching
        trail_words = [w for w in words if w['text'] == 'Trail:']
        
        trails = []
        for i, trail_name in enumerate(trail_matches):
            trail_name = trail_name.strip().rstrip('.')
            trail_link = None
            
            # Calculate which trail word index to use based on entry_index and trail index within entry
            # Count how many Trail: words appear before this entry
            trail_word_offset = 0
            for ei in range(entry_index):
                # Count trails in previous entries on this page
                prev_entry_text = page_entries[ei]['text'] if ei < len(page_entries) else ""
                prev_trail_section = prev_entry_text.split('Trail Notes:')[0] if 'Trail Notes:' in prev_entry_text else prev_entry_text
                trail_word_offset += len(re.findall(r'Trail:\s*(.+?)\.?\s*(?:\n|$)', prev_trail_section))
            
            word_index = trail_word_offset + i
            if word_index < len(trail_words):
                trail_link = find_link_for_position(links, trail_words[word_index]['top'])
            
            trails.append({'name': trail_name, 'link': trail_link})
        
        # Store as single trail for backwards compatibility, or multiple
        if len(trails) == 1:
            entry['trail'] = trails[0]
        else:
            entry['trails'] = trails
            entry['trail'] = trails[0]  # Keep first trail for display compatibility
    
    # Trail Notes
    trail_notes_match = re.search(r'Trail Notes:\s*(.+?)(?=\nDirections:|\nOther:|\nRelated|\nContributor:|\nRVingwithBikes|$)', text, re.DOTALL)
    if trail_notes_match:
        entry['trail_notes'] = trail_notes_match.group(1).strip()
    
    # Directions
    dir_match = re.search(r'Directions:\s*(.+?)(?=\nOther:|\nRelated|\nContributor:|\nRVingwithBikes|$)', text, re.DOTALL)
    if dir_match:
        entry['directions'] = dir_match.group(1).strip()
    
    # Other
    other_match = re.search(r'Other:\s*(.+?)(?=\nRelated|\nContributor:|\nRVingwithBikes|$)', text, re.DOTALL)
    if other_match:
        entry['other'] = other_match.group(1).strip()
    
    # Related Blog Post
    blog_match = re.search(r'Related Blog Post:\s*(.+?)(?=\nContributor:|\nRVingwithBikes|$)', text, re.DOTALL)
    if blog_match:
        entry['blog_post'] = blog_match.group(1).strip()
        # Find "Related" words on the page and use position for the correct entry
        related_words = [w for w in words if w['text'] == 'Related']
        # Count how many Related Blog Posts appear before this entry
        related_word_offset = 0
        for ei in range(entry_index):
            prev_entry_text = page_entries[ei]['text'] if ei < len(page_entries) else ""
            if 'Related Blog Post:' in prev_entry_text:
                related_word_offset += 1
        
        if related_word_offset < len(related_words):
            blog_y = float(related_words[related_word_offset]['top'])
            # Find the chambersontheroad link closest to this position
            blog_links = [l for l in links if 'chambersontheroad' in l['uri']]
            if blog_links:
                # Find the link with y position closest to blog_y
                best_link = min(blog_links, key=lambda l: abs(float(l['y_top']) - blog_y))
                entry['blog_post_link'] = best_link['uri']
    
    # Contributor
    contrib_match = re.search(r'Contributor:\s*(.+?)(?=\n|$)', text)
    if contrib_match:
        entry['contributor'] = contrib_match.group(1).strip()
    
    # Contributor's Blog
    contrib_blog_match = re.search(r"Contributor's Blog:\s*(.+?)(?=\n|$)", text)
    if contrib_blog_match:
        entry['contributor_blog'] = contrib_blog_match.group(1).strip()
        # Find the contributor blog link (not campground, trail, or blog post link)
        used_links = [
            entry.get('campground', {}).get('link'),
            entry.get('trail', {}).get('link'),
            entry.get('blog_post_link')
        ]
        for link in links:
            if link['uri'] not in used_links and 'chambersontheroad' not in link['uri']:
                entry['contributor_blog_link'] = link['uri']
                break
    
    return entry, text, links


def get_coordinates_from_google(campground_name: str, city: str, state: str) -> dict:
    """Get coordinates from Google Places API using text search."""
    if not GOOGLE_PLACES_API_KEY:
        return {'error': 'No API key found'}
    
    # Use the Places API Text Search
    url = "https://places.googleapis.com/v1/places:searchText"
    
    search_query = f"{campground_name}, {city}, {state}"
    
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
    }
    
    payload = {
        'textQuery': search_query,
        'maxResultCount': 1
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        if data.get('places') and len(data['places']) > 0:
            place = data['places'][0]
            location = place.get('location', {})
            return {
                'placeId': place.get('id'),
                'displayName': place.get('displayName', {}).get('text'),
                'formattedAddress': place.get('formattedAddress'),
                'latitude': location.get('latitude'),
                'longitude': location.get('longitude')
            }
        else:
            return {'error': 'No places found'}
    
    except requests.exceptions.RequestException as e:
        return {'error': str(e)}


def display_entry(entry: dict, coordinates: dict = None):
    """Display the extracted entry for verification."""
    print("=" * 70)
    print("EXTRACTED CAMPGROUND ENTRY")
    print("=" * 70)
    
    hookup_display = entry.get('hookup_type', 'N/A').capitalize()
    
    print(f"""
📍 LOCATION
   City: {entry.get('city', 'N/A')}
   State: {entry.get('state', 'N/A')}
   Hookup Type: {hookup_display}

🏕️ CAMPGROUND
   Name: {entry.get('campground', {}).get('name', 'N/A')}
   Link: {entry.get('campground', {}).get('link', 'N/A')}

📝 CG NOTES
   {entry.get('cg_notes', 'N/A')}
""")
    
    # Handle multiple trails
    print("🚴 TRAIL(S)")
    if 'trails' in entry and len(entry['trails']) > 1:
        for i, trail in enumerate(entry['trails'], 1):
            print(f"   Trail {i}: {trail.get('name', 'N/A')}")
            print(f"   Link {i}: {trail.get('link', 'N/A')}")
    else:
        print(f"   Name: {entry.get('trail', {}).get('name', 'N/A')}")
        print(f"   Link: {entry.get('trail', {}).get('link', 'N/A')}")
    
    print(f"""
📋 TRAIL NOTES
   {entry.get('trail_notes', 'N/A')}

🗺️ DIRECTIONS
   {entry.get('directions', 'N/A')}

📌 OTHER
   {entry.get('other', 'N/A')}

📰 RELATED BLOG POST
   {entry.get('blog_post', 'N/A')}
   Link: {entry.get('blog_post_link', 'N/A')}

👤 CONTRIBUTOR
   {entry.get('contributor', 'N/A')}

🔗 CONTRIBUTOR'S BLOG
   {entry.get('contributor_blog', 'N/A')}
   Link: {entry.get('contributor_blog_link', 'N/A')}
""")
    
    if coordinates:
        print("=" * 70)
        print("GOOGLE PLACES COORDINATES")
        print("=" * 70)
        if 'error' in coordinates:
            print(f"   ❌ Error: {coordinates['error']}")
        else:
            print(f"""
   Place ID: {coordinates.get('placeId', 'N/A')}
   Display Name: {coordinates.get('displayName', 'N/A')}
   Address: {coordinates.get('formattedAddress', 'N/A')}
   Latitude: {coordinates.get('latitude', 'N/A')}
   Longitude: {coordinates.get('longitude', 'N/A')}
""")
    
    print("=" * 70)


def load_database():
    """Load existing database or create new one."""
    if os.path.exists(NEW_DATABASE_PATH):
        with open(NEW_DATABASE_PATH, 'r') as f:
            return json.load(f)
    return {"entries": [], "metadata": {"version": "2.0", "source": "eBook PDF extraction"}}


def save_entry_to_database(entry: dict, coordinates: dict):
    """Save a verified entry to the database."""
    db = load_database()
    
    # Build the final entry structure
    # Note: hookup_type is determined by which part of the PDF we're extracting from
    # Part 1 = full, Part 2 = partial
    final_entry = {
        "city": entry.get('city'),
        "state": entry.get('state'),
        "hookup_type": entry.get('hookup_type', 'full'),  # Default to full for Part 1
        "campground": entry.get('campground'),
        "cg_notes": entry.get('cg_notes'),
        "trail": entry.get('trail'),
        "trails": entry.get('trails'),  # Multiple trails if present
        "trail_notes": entry.get('trail_notes'),
        "directions": entry.get('directions'),
        "other": entry.get('other'),
        "blog_post": entry.get('blog_post'),
        "blog_post_link": entry.get('blog_post_link'),
        "contributor": entry.get('contributor'),
        "contributor_blog": entry.get('contributor_blog'),
        "contributor_blog_link": entry.get('contributor_blog_link'),
        "latitude": coordinates.get('latitude') if coordinates and 'latitude' in coordinates else None,
        "longitude": coordinates.get('longitude') if coordinates and 'longitude' in coordinates else None,
        "placeId": coordinates.get('placeId') if coordinates and 'placeId' in coordinates else None
    }
    
    # Remove None values
    final_entry = {k: v for k, v in final_entry.items() if v is not None}
    
    # Check for duplicates
    existing = next((e for e in db['entries'] 
                    if e.get('city') == final_entry['city'] 
                    and e.get('state') == final_entry['state']
                    and e.get('campground', {}).get('name') == final_entry.get('campground', {}).get('name')), None)
    
    if existing:
        print(f"⚠️  Entry already exists. Updating...")
        idx = db['entries'].index(existing)
        db['entries'][idx] = final_entry
    else:
        db['entries'].append(final_entry)
    
    # Save
    with open(NEW_DATABASE_PATH, 'w') as f:
        json.dump(db, f, indent=2)
    
    print(f"✅ Saved to {NEW_DATABASE_PATH}")
    print(f"   Total entries: {len(db['entries'])}")


def main():
    parser = argparse.ArgumentParser(description='Extract campground entry from PDF')
    parser.add_argument('--page', type=int, default=17, help='PDF page number to extract from')
    parser.add_argument('--entry', type=int, default=0, help='Entry index on page (0-indexed)')
    parser.add_argument('--part', type=int, default=1, choices=[1, 2], help='Part 1 (full hookups) or Part 2 (partial)')
    parser.add_argument('--list', action='store_true', help='List all entries on the page')
    parser.add_argument('--save', action='store_true', help='Save the entry to database')
    parser.add_argument('--no-coords', action='store_true', help='Skip Google Places API lookup')
    args = parser.parse_args()
    
    # Set hookup type based on part
    hookup_type = 'full' if args.part == 1 else 'partial'
    
    # List mode - show all entries on the page
    if args.list:
        print(f"\n📖 Entries on page {args.page}:\n")
        entries = find_entries_on_page(PDF_PATH, args.page)
        for i, e in enumerate(entries):
            # Parse city/state from entry text
            lines = e['text'].split('\n')
            city_state = lines[0] if lines else "Unknown"
            cg_match = re.search(r'Campground:\s*(.+?)\.?\s*\n', e['text'])
            cg_name = cg_match.group(1).strip() if cg_match else "Unknown"
            print(f"  [{i}] {city_state} - {cg_name}")
        print(f"\nUse --entry N to extract a specific entry")
        return
    
    print(f"\n📖 Extracting from page {args.page}, entry {args.entry} (Part {args.part} - {hookup_type} hookups)...\n")
    
    # Extract entry
    entry, raw_text, links = extract_entry_from_page(PDF_PATH, args.page, args.entry)
    entry['hookup_type'] = hookup_type  # Set hookup type based on part
    
    # Get coordinates
    coordinates = None
    if not args.no_coords and entry.get('campground', {}).get('name'):
        print("🌍 Looking up coordinates from Google Places API...")
        coordinates = get_coordinates_from_google(
            entry.get('campground', {}).get('name'),
            entry.get('city', ''),
            entry.get('state', '')
        )
    
    # Display for verification
    display_entry(entry, coordinates)
    
    # Save if requested
    if args.save:
        save_entry_to_database(entry, coordinates)
    else:
        print("\n💡 To save this entry, run with --save flag")
        print(f"   python scripts/extract-campground.py --page {args.page} --entry {args.entry} --save")


if __name__ == '__main__':
    main()

