import { XMLParser } from 'fast-xml-parser';
import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';

interface Env {
  DB?: D1Database;
}

// Source configuration
const SOURCES = {
  'bbc-news': {
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml'
  },
  'bbc-tech': {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml'
  },
  'arxiv-ai': {
    name: 'arXiv AI',
    url: 'https://rss.arxiv.org/rss/cs.AI'
  },
  'google-news-ai': {
    name: 'Google News AI',
    url: 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en'
  }
} as const;

type SourceId = keyof typeof SOURCES;

interface Article {
  title: string;
  url: string;
  published: string | null;
  excerpt: string;
  source: string;
}

interface FeedResult {
  sourceId: string;
  sourceName: string;
  status: 'ok' | 'empty' | 'error';
  articles: Article[];
  error?: string;
  fetchedAt: string;
}

// Helper to safely extract text from parsed XML
function getText(obj: any): string {
  if (typeof obj === 'string') return obj;
  if (obj && typeof obj === 'object') {
    if (typeof obj['#text'] === 'string') return obj['#text'];
    for (const key of Object.keys(obj)) {
      if (key !== '@' && typeof obj[key] === 'string') return obj[key];
    }
  }
  return '';
}

// URL validation to prevent SSRF
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.startsWith('127.') ||
        hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
        hostname.startsWith('172.') || hostname.startsWith('169.254.')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Feed fetch with timeout (5 second timeout per feed)
async function fetchFeed(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Parse RSS 2.0 and Atom feeds
function parseFeed(xml: string, sourceName: string): Article[] {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    allowBooleanAttributes: true,
    parseAttributeValue: true
  };

  const parser = new XMLParser(options);

  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new Error('Malformed XML');
  }

  const articles: Article[] = [];
  const maxEntries = 10;

  // RSS 2.0: channel > item
  let rssItems: any[] = [];
  if (doc?.rss?.channel?.item) {
    rssItems = Array.isArray(doc.rss.channel.item) ? doc.rss.channel.item : [doc.rss.channel.item];
  }

  // Atom: feed > entry
  let atomEntries: any[] = [];
  if (doc?.feed?.entry) {
    atomEntries = Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry];
  }

  const allItems = [...rssItems, ...atomEntries];

  for (const item of allItems.slice(0, maxEntries)) {
    let title = '';
    let url = '';
    let published: string | null = null;
    let excerpt = '';

    if (item.title) {
      title = getText(item.title);
    }
    if (item.link) {
      if (typeof item.link === 'string') {
        url = item.link;
      } else if (item.link['@']?.href) {
        url = item.link['@'].href;
      }
    }
    if (item.pubDate) {
      published = item.pubDate;
    }
    if (item.description) {
      excerpt = getText(item.description);
    }

    if (!title && item.title) {
      title = getText(item.title);
    }
    if (!url && item.link) {
      const linkArray = Array.isArray(item.link) ? item.link : [item.link];
      const selfLink = linkArray.find((l: any) => l?.['@']?.rel === 'self');
      if (selfLink && selfLink['@']?.href) {
        url = selfLink['@'].href;
      }
      if (!url) {
        const alternateLink = linkArray.find((l: any) => l?.['@']?.rel === 'alternate');
        if (alternateLink && alternateLink['@']?.href) {
          url = alternateLink['@'].href;
        }
      }
      if (!url && linkArray[0]?.['@']?.href) {
        url = linkArray[0]['@'].href;
      }
    }
    if (!published && item.published) {
      published = item.published;
    }
    if (!published && item.updated) {
      published = item.updated;
    }
    if (item.summary) {
      excerpt = getText(item.summary);
    }
    if (!excerpt && item.description) {
      excerpt = getText(item.description);
    }

    if (!url || !isValidUrl(url)) {
      continue;
    }

    articles.push({
      title,
      url,
      published,
      excerpt,
      source: sourceName
    });
  }

  return articles;
}

// Health check endpoint
function handleHealth(): Response {
  return new Response(JSON.stringify({
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'newsmind-worker'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Preview endpoint - fetch configured feeds
async function handlePreview(onlyParam: string | null): Promise<Response> {
  const results: FeedResult[] = [];
  let feedsAttempted = 0;
  let feedsSucceeded = 0;
  let errorSummary: string[] = [];

  const requestedSource = onlyParam ? decodeURIComponent(onlyParam) : null;
  const sourceIds = requestedSource ? [requestedSource] : Object.keys(SOURCES);

  for (const sourceId of sourceIds) {
    feedsAttempted++;

    if (!(sourceId in SOURCES)) {
      results.push({
        sourceId,
        sourceName: sourceId,
        status: 'error',
        articles: [],
        error: 'Unknown source ID',
        fetchedAt: new Date().toISOString()
      });
      continue;
    }

    const source = SOURCES[sourceId as SourceId];
    const fetchUrl = source.url;

    try {
      const response = await fetchFeed(fetchUrl);

      if (!response.ok) {
        results.push({
          sourceId,
          sourceName: source.name,
          status: 'error',
          articles: [],
          error: `HTTP ${response.status}`,
          fetchedAt: new Date().toISOString()
        });
        continue;
      }

      const xml = await response.text();

      if (!xml || xml.trim().length === 0) {
        results.push({
          sourceId,
          sourceName: source.name,
          status: 'empty',
          articles: [],
          fetchedAt: new Date().toISOString()
        });
        continue;
      }

      const articles = parseFeed(xml, source.name);

      results.push({
        sourceId,
        sourceName: source.name,
        status: 'ok',
        articles,
        fetchedAt: new Date().toISOString()
      });
      feedsSucceeded++;
    } catch (err: any) {
      const errorMsg = err?.name === 'AbortError' ? 'Timeout' : (err.message || 'Fetch error');
      results.push({
        sourceId,
        sourceName: source.name,
        status: 'error',
        articles: [],
        error: errorMsg,
        fetchedAt: new Date().toISOString()
      });
      errorSummary.push(errorMsg);
    }
  }

  return new Response(JSON.stringify({
    feeds: results,
    collected: {
      feedsAttempted,
      feedsSucceeded,
      errorSummary: errorSummary.length > 0 ? errorSummary.join('; ') : null
    },
    fetchedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Scheduled handler for cron (uses D1 if available, otherwise in-memory)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return handleHealth();
    }

    if (url.pathname === '/preview') {
      return handlePreview(url.searchParams.get('only'));
    }

    if (url.pathname === '/collect') {
      return handleCollect(env);
    }

    return new Response('Not Found', { status: 404 });
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    await handleCollect(env);
  }
}

// Collection endpoint - preview without D1 dependency for Phase 1
async function handleCollect(env: Env): Promise<Response> {
  const results: FeedResult[] = [];
  let feedsAttempted = 0;
  let feedsSucceeded = 0;
  let errorSummary: string[] = [];

  for (const sourceId of Object.keys(SOURCES)) {
    feedsAttempted++;

    try {
      const source = SOURCES[sourceId as SourceId];
      const response = await fetchFeed(source.url);
      const xml = await response.text();

      if (!xml || xml.trim().length === 0) {
        results.push({
          sourceId,
          sourceName: source.name,
          status: 'empty',
          articles: [],
          fetchedAt: new Date().toISOString()
        });
        feedsSucceeded++;
        continue;
      }

      const articles = parseFeed(xml, source.name);
      results.push({
        sourceId,
        sourceName: source.name,
        status: 'ok',
        articles,
        fetchedAt: new Date().toISOString()
      });
      feedsSucceeded++;
    } catch (err: any) {
      const errorMsg = err?.name === 'AbortError' ? 'Timeout' : (err.message || 'Fetch error');
      results.push({
        sourceId,
        sourceName: SOURCES[sourceId as SourceId].name,
        status: 'error',
        articles: [],
        error: errorMsg,
        fetchedAt: new Date().toISOString()
      });
      errorSummary.push(errorMsg);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    feedsAttempted,
    feedsSucceeded,
    errorSummary: errorSummary.length > 0 ? errorSummary.join('; ') : null,
    fetchedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}