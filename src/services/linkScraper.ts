// ============================================================
// Link Scraper – Auto-enriches items with metadata
// Supports: YouTube (oEmbed), Vimeo (oEmbed), Open Graph fallback
// ============================================================

export interface LinkMetadata {
    title?: string;
    thumbnail_url?: string;
    duration?: number;         // seconds
    channelName?: string;
    channelUrl?: string;
    platform?: 'youtube' | 'vimeo' | 'other';
    description?: string;
    siteName?: string;
    favicon?: string;
}

// -------------------------------------------------------
// Main entry point
// -------------------------------------------------------
export async function scrapeMetadata(url: string): Promise<LinkMetadata> {
    try {
        // 1. YouTube
        if (isYouTubeUrl(url)) {
            return await scrapeYouTube(url);
        }
        // 2. Vimeo
        if (isVimeoUrl(url)) {
            return await scrapeVimeo(url);
        }
        // 3. Generic Open Graph
        return await scrapeOpenGraph(url);
    } catch (err) {
        console.warn('[LinkScraper] Could not scrape metadata for', url, err);
        return { platform: 'other' };
    }
}

// -------------------------------------------------------
// YouTube via oEmbed API
// -------------------------------------------------------
async function scrapeYouTube(url: string): Promise<LinkMetadata> {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

    if (!resp.ok) throw new Error('YouTube oEmbed failed');

    const data = await resp.json();
    const videoId = extractYouTubeId(url);

    return {
        title: data.title,
        thumbnail_url: videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : data.thumbnail_url,
        channelName: data.author_name,
        channelUrl: data.author_url,
        platform: 'youtube',
        favicon: 'https://www.youtube.com/favicon.ico',
    };
}

function extractYouTubeId(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        return u.searchParams.get('v');
    } catch {
        return null;
    }
}

function isYouTubeUrl(url: string): boolean {
    return /youtube\.com|youtu\.be/.test(url);
}

// -------------------------------------------------------
// Vimeo via oEmbed API
// -------------------------------------------------------
async function scrapeVimeo(url: string): Promise<LinkMetadata> {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

    if (!resp.ok) throw new Error('Vimeo oEmbed failed');

    const data = await resp.json();
    return {
        title: data.title,
        thumbnail_url: data.thumbnail_url,
        duration: data.duration,
        channelName: data.author_name,
        channelUrl: data.author_url,
        platform: 'vimeo',
        favicon: 'https://vimeo.com/favicon.ico',
    };
}

function isVimeoUrl(url: string): boolean {
    return /vimeo\.com/.test(url);
}

// -------------------------------------------------------
// Generic Open Graph scraper via a CORS-safe proxy trick
// (Uses fetch with mode no-cors as fallback – only partial data)
// -------------------------------------------------------
async function scrapeOpenGraph(url: string): Promise<LinkMetadata> {
    try {
        const resp = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { 'Accept': 'text/html' },
        });
        if (!resp.ok) return {};

        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const getMeta = (property: string) =>
            doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`)
                ?.getAttribute('content') ?? undefined;

        const hostname = new URL(url).hostname;

        return {
            title: getMeta('og:title') || doc.querySelector('title')?.textContent || undefined,
            thumbnail_url: getMeta('og:image'),
            description: getMeta('og:description') || getMeta('description'),
            siteName: getMeta('og:site_name') || hostname,
            favicon:
                doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.getAttribute('href') ||
                `https://${hostname}/favicon.ico`,
            platform: 'other',
        };
    } catch {
        return { platform: 'other' };
    }
}

// -------------------------------------------------------
// Detect if a URL is a video (for auto-typing as 'Video')
// -------------------------------------------------------
export function detectItemType(url: string): 'Video' | 'RSS_Feed' | 'Tab' {
    if (isYouTubeUrl(url) || isVimeoUrl(url)) return 'Video';
    if (/\/rss|\/feed|\.rss|\.xml/.test(url)) return 'RSS_Feed';
    return 'Tab';
}
