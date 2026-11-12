-- Seed initial sources
INSERT OR IGNORE INTO sources (id, name, feed_url, category, enabled) VALUES
  ('bbc-news', 'BBC News', 'https://feeds.bbci.co.uk/news/rss.xml', 'news', 1),
  ('bbc-tech', 'BBC Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml', 'technology', 1),
  ('arxiv-ai', 'arXiv AI', 'https://rss.arxiv.org/rss/cs.AI', 'research', 1),
  ('google-news-ai', 'Google News AI', 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en', 'news', 1);