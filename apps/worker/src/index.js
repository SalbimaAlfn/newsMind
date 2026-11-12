var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// Source configuration for Phase 1
var SOURCES = {
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
};
// URL validation to prevent SSRF
function isValidUrl(url) {
    try {
        var parsed = new URL(url);
        // Only allow HTTP and HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        // Block localhost, private networks, link-local
        var hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname.startsWith('127.') ||
            hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
            hostname.startsWith('172.')) {
            return false;
        }
        return true;
    }
    catch (_a) {
        return false;
    }
}
// Feed fetch with timeout
function fetchFeed(url_1) {
    return __awaiter(this, arguments, void 0, function (url, timeoutMs) {
        var controller, timeoutId, response, err_1;
        if (timeoutMs === void 0) { timeoutMs = 5000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    controller = new AbortController();
                    timeoutId = setTimeout(function () { return controller.abort(); }, timeoutMs);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, { signal: controller.signal })];
                case 2:
                    response = _a.sent();
                    clearTimeout(timeoutId);
                    return [2 /*return*/, response];
                case 3:
                    err_1 = _a.sent();
                    clearTimeout(timeoutId);
                    throw err_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Parse RSS 2.0 and Atom feeds
function parseFeed(xml, sourceName) {
    var _a, _b, _c, _d, _e, _f, _g;
    var XMLParser = require('fast-xml-parser').XMLParser;
    var options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        parseAttributeValue: true
    };
    var parser = new XMLParser(options);
    var doc;
    try {
        doc = parser.parse(xml);
    }
    catch (_h) {
        throw new Error('Malformed XML');
    }
    var articles = [];
    var maxEntries = 10;
    // RSS 2.0: channel > item
    var rssItems = ((_b = (_a = doc === null || doc === void 0 ? void 0 : doc.rss) === null || _a === void 0 ? void 0 : _a.channel) === null || _b === void 0 ? void 0 : _b.item) || [];
    // Atom: feed > entry
    var atomEntries = ((_c = doc === null || doc === void 0 ? void 0 : doc.feed) === null || _c === void 0 ? void 0 : _c.entry) || [];
    var allItems = __spreadArray([], rssItems, true).concat(atomEntries);
    for (var _i = 0, _j = allItems.slice(0, maxEntries); _i < _j.length; _i++) {
        var item = _j[_i];
        var title = '';
        var url = '';
        var published = null;
        var excerpt = '';
        // RSS structure
        if (item.title) {
            title = typeof item.title === 'string' ? item.title : item.title. || '';
        }
        if (item.link) {
            // RSS: link can be string or object with href
            if (typeof item.link === 'string') {
                url = item.link;
            }
            else if ((_e = (_d = item.link) === null || _d === void 0 ? void 0 : _d['@']) === null || _e === void 0 ? void 0 : _e.href) {
                url = item.link['@'].href;
            }
        }
        if (item.pubDate) {
            published = item.pubDate;
        }
        if (item.description) {
            excerpt = typeof item.description === 'string' ? item.description : item.description. || '';
        }
        // Atom structure
        if (!title && item.title) {
            title = typeof item.title === 'string' ? item.title : item.title. || '';
        }
        if (!url && item.link) {
            // Atom: link is array of { href, rel }
            var linkArray = Array.isArray(item.link) ? item.link : [item.link];
            var selfLink = linkArray.find(function (l) { var _a; return ((_a = l === null || l === void 0 ? void 0 : l['@']) === null || _a === void 0 ? void 0 : _a.rel) === 'self'; });
            if (selfLink) {
                url = selfLink['@'].href;
            }
            if (!url) {
                var alternateLink = linkArray.find(function (l) { var _a; return ((_a = l === null || l === void 0 ? void 0 : l['@']) === null || _a === void 0 ? void 0 : _a.rel) === 'alternate'; });
                if (alternateLink) {
                    url = alternateLink['@'].href;
                }
            }
            if (!url && ((_g = (_f = linkArray[0]) === null || _f === void 0 ? void 0 : _f['@']) === null || _g === void 0 ? void 0 : _g.href)) {
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
            excerpt = typeof item.summary === 'string' ? item.summary : item.summary. || '';
        }
        if (item.description) {
            if (!excerpt) {
                excerpt = typeof item.description === 'string' ? item.description : item.description. || '';
            }
        }
        // Validate URL
        if (!url || !isValidUrl(url)) {
            continue;
        }
        articles.push({
            title: title,
            url: url,
            published: published,
            excerpt: excerpt,
            source: sourceName
        });
    }
    return articles;
}
// Health check endpoint
function handleHealth() {
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
function handlePreview(url) {
    return __awaiter(this, void 0, void 0, function () {
        var results, requestedSource, sourceIds, _i, sourceIds_1, sourceId, source, fetchUrl, response, xml, articles, err_2, errorMsg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = [];
                    requestedSource = url ? decodeURIComponent(url.split('=')[1]) : null;
                    sourceIds = requestedSource ? [requestedSource] : Object.keys(SOURCES);
                    _i = 0, sourceIds_1 = sourceIds;
                    _a.label = 1;
                case 1:
                    if (!(_i < sourceIds_1.length)) return [3 /*break*/, 7];
                    sourceId = sourceIds_1[_i];
                    if (!(sourceId in SOURCES)) {
                        results.push({
                            sourceId: sourceId,
                            sourceName: sourceId,
                            status: 'error',
                            articles: [],
                            error: 'Unknown source ID',
                            fetchedAt: new Date().toISOString()
                        });
                        return [3 /*break*/, 6];
                    }
                    source = SOURCES[sourceId];
                    fetchUrl = source.url;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, fetchFeed(fetchUrl)];
                case 3:
                    response = _a.sent();
                    if (!response.ok) {
                        results.push({
                            sourceId: sourceId,
                            sourceName: source.name,
                            status: 'error',
                            articles: [],
                            error: "HTTP ".concat(response.status),
                            fetchedAt: new Date().toISOString()
                        });
                        return [3 /*break*/, 6];
                    }
                    return [4 /*yield*/, response.text()];
                case 4:
                    xml = _a.sent();
                    if (!xml || xml.trim().length === 0) {
                        results.push({
                            sourceId: sourceId,
                            sourceName: source.name,
                            status: 'empty',
                            articles: [],
                            fetchedAt: new Date().toISOString()
                        });
                        return [3 /*break*/, 6];
                    }
                    articles = parseFeed(xml, source.name);
                    results.push({
                        sourceId: sourceId,
                        sourceName: source.name,
                        status: 'ok',
                        articles: articles,
                        fetchedAt: new Date().toISOString()
                    });
                    return [3 /*break*/, 6];
                case 5:
                    err_2 = _a.sent();
                    errorMsg = (err_2 === null || err_2 === void 0 ? void 0 : err_2.name) === 'AbortError' ? 'Timeout' : (err_2.message || 'Fetch error');
                    results.push({
                        sourceId: sourceId,
                        sourceName: source.name,
                        status: 'error',
                        articles: [],
                        error: errorMsg,
                        fetchedAt: new Date().toISOString()
                    });
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/, new Response(JSON.stringify({
                        feeds: results,
                        fetchedAt: new Date().toISOString()
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    })];
            }
        });
    });
}
// Main request handler
addEventListener('fetch', function (event) {
    event.respondWith(handleRequest(event.request));
});
function handleRequest(request) {
    return __awaiter(this, void 0, void 0, function () {
        var url;
        return __generator(this, function (_a) {
            url = new URL(request.url);
            // Health check
            if (url.pathname === '/health') {
                return [2 /*return*/, handleHealth()];
            }
            // Preview endpoint
            if (url.pathname === '/preview') {
                return [2 /*return*/, handlePreview(url.searchParams.get('only'))];
            }
            return [2 /*return*/, new Response('Not Found', { status: 404 })];
        });
    });
}
