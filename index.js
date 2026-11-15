#!/usr/bin/env node
/**
 * Google News MCP server.
 *
 * Gives AI assistants (Claude, Cursor, VS Code, n8n agents...) live Google News results:
 * articles by keyword, date range, country and language, or by topic, with real article URLs
 * and optionally the full article text.
 * Data comes from the Apify Actor data_xplorer/google-news-scraper-fast. Needs APIFY_TOKEN.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApifyClient } from 'apify-client';
import { z } from 'zod';

const ACTOR = 'data_xplorer/google-news-scraper-fast';
const MAX_TEXT = 6000; // characters of full text kept per article, to protect the assistant's context

async function runActor(input) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN is not set. Get one at https://console.apify.com/settings/integrations');
    const client = new ApifyClient({ token });
    const run = await client.actor(ACTOR).call(input, { log: null });
    if (run.status !== 'SUCCEEDED') throw new Error(`Apify run ${run.id} ended with status ${run.status}`);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
}

const slim = (a) => ({
    title: a.title,
    source: a.source,
    published_at: a.publishedAt,
    url: a.url,
    description: a.description || undefined,
    image: a.image || undefined,
    full_text: a.fullText ? a.fullText.slice(0, MAX_TEXT) : undefined,
    keyword: a.metadata?.keyword,
});
const reply = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 1) }] });
const fail = (err) => ({ isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] });

const region = z.string().default('US:en')
    .describe('Country:language, e.g. US:en, GB:en, IN:en, FR:fr, DE:de, ES:es, BR:pt-419, JP:ja (84 pairs)');

const server = new McpServer({ name: 'google-news', version: '1.0.0' });

server.registerTool('search_news', {
    title: 'Google News: search articles',
    description: 'Search Google News for one or more keywords and get articles with the real publisher URL, source, '
        + 'publication date, description and optionally the full article text. Supports a recent timeframe or a custom '
        + 'date range, any country and language, and more than 100 articles per keyword. Google operators work in '
        + 'keywords ("exact phrase", site:reuters.com, -word).',
    inputSchema: {
        keywords: z.array(z.string().min(1)).min(1).max(10).describe('Search keywords'),
        timeframe: z.enum(['1h', '1d', '7d', '30d', '1y', 'all']).default('1d').describe('Recent period. Ignored if date_from or date_to is set'),
        date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date YYYY-MM-DD'),
        date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date YYYY-MM-DD'),
        region,
        max_articles: z.number().int().min(1).max(500).default(20).describe('Max articles per keyword. Above 100 the search is split by date'),
        full_text: z.boolean().default(false).describe('Include the full article text (longer answer)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ keywords, timeframe, date_from, date_to, region: regionLanguage, max_articles, full_text }) => {
    try {
        const input = {
            keywords,
            maxArticles: max_articles,
            region_language: regionLanguage,
            decodeUrls: true,
            extractDescriptions: true,
            extractImages: false,
            extractFullText: full_text,
        };
        if (date_from || date_to) Object.assign(input, { dateFrom: date_from ?? '', dateTo: date_to ?? '' });
        else input.timeframe = timeframe;
        const items = await runActor(input);
        return reply({ count: items.length, articles: items.map(slim) });
    } catch (err) { return fail(err); }
});

server.registerTool('get_topic_news', {
    title: 'Google News: top stories by topic',
    description: 'Get the current Google News top stories for a topic (world, business, technology, sports...) '
        + 'in a given country and language.',
    inputSchema: {
        topic: z.enum(['WORLD', 'NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH']),
        region,
        max_articles: z.number().int().min(1).max(100).default(20),
        full_text: z.boolean().default(false).describe('Include the full article text (longer answer)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ topic, region: regionLanguage, max_articles, full_text }) => {
    try {
        const items = await runActor({
            topics: [topic],
            maxArticles: max_articles,
            region_language: regionLanguage,
            decodeUrls: true,
            extractDescriptions: true,
            extractImages: false,
            extractFullText: full_text,
        });
        return reply({ topic, count: items.length, articles: items.map(slim) });
    } catch (err) { return fail(err); }
});

await server.connect(new StdioServerTransport());
