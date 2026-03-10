// ============================================================
// RSS Parser Service
// Fetches and parses RSS/Atom feeds, returns Item candidates
// ============================================================

export interface RssEntry {
    title: string;
    url: string;
    published: string;
    summary?: string;
    thumbnail?: string;
}

// -------------------------------------------------------
// Fetch and parse an RSS feed URL
// -------------------------------------------------------
export async function fetchAndParseFeed(feedUrl: string): Promise<RssEntry[]> {
    const response = await fetch(feedUrl, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');

    // Detect format
    const isAtom = doc.querySelector('feed') !== null;
    return isAtom ? parseAtomFeed(doc) : parseRssFeed(doc);
}

function parseRssFeed(doc: Document): RssEntry[] {
    const items = Array.from(doc.querySelectorAll('item'));
    return items.map(item => ({
        title: getText(item, 'title'),
        url: getText(item, 'link') || getText(item, 'guid'),
        published: getText(item, 'pubDate') || new Date().toISOString(),
        summary: getText(item, 'description'),
        thumbnail:
            item.querySelector('media\\:thumbnail,thumbnail')?.getAttribute('url') ||
            extractFirstImageUrl(getText(item, 'description')),
    })).filter(e => e.url);
}

function parseAtomFeed(doc: Document): RssEntry[] {
    const entries = Array.from(doc.querySelectorAll('entry'));
    return entries.map(entry => ({
        title: getText(entry, 'title'),
        url:
            entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
            entry.querySelector('link')?.getAttribute('href') ||
            '',
        published: getText(entry, 'published') || getText(entry, 'updated') || new Date().toISOString(),
        summary: getText(entry, 'summary') || getText(entry, 'content'),
        thumbnail: extractFirstImageUrl(getText(entry, 'content')),
    })).filter(e => e.url);
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function getText(parent: Element, tag: string): string {
    return parent.querySelector(tag)?.textContent?.trim() ?? '';
}

function extractFirstImageUrl(html: string): string | undefined {
    if (!html) return undefined;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1];
}

// -------------------------------------------------------
// Determine if a URL is already saved (dedup helper)
// -------------------------------------------------------
export function normalizeRssUrl(url: string): string {
    try {
        const u = new URL(url);
        u.hash = '';
        return u.href.replace(/\/$/, '');
    } catch {
        return url;
    }
}
