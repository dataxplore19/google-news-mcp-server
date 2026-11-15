# Google News MCP Server

An MCP server that gives Claude, Cursor, VS Code Copilot, n8n AI agents and any other MCP client live **Google News** results: articles for any keyword, date range, country and language, or the top stories of a topic, with the real publisher URL and, if you want, the full article text.

Ask your assistant things like:

- "What happened with Nvidia today? Summarize the top 10 articles."
- "Find French news about electric cars from last week and list the sources."
- "Get every article about our brand between October 1 and October 31 and tell me the overall tone."
- "What are the top technology stories in Germany right now?"

The data comes from the [Google News Scraper](https://apify.com/data_xplorer/google-news-scraper-fast) Actor on Apify, which decodes Google News links to the original article, returns more than 100 articles per keyword, and extracts article text.

> Click **Watch > Custom > Releases** at the top of this page to be notified of new features.

## Tools

| Tool | What it does |
| --- | --- |
| `search_news` | Articles for up to 10 keywords: recent timeframe (`1h` to `all`) or custom date range, 84 country and language pairs, up to 500 articles per keyword, optional full text. Google operators work (`"exact phrase"`, `site:reuters.com`, `-word`). |
| `get_topic_news` | Top stories of a Google News topic (World, Nation, Business, Technology, Entertainment, Sports, Science, Health) in a country and language. |

Each article comes with `title`, `source`, `published_at`, `url` (publisher URL, not a news.google.com link), `description` and, with `full_text: true`, `full_text`.

## Setup

You need Node.js 18 or later and an Apify API token: create a free [Apify](https://apify.com) account, then copy your token from [Settings > API & Integrations](https://console.apify.com/settings/integrations).

### Claude Desktop

Open Settings > Developer > Edit Config and add:

```json
{
  "mcpServers": {
    "google-news": {
      "command": "npx",
      "args": ["-y", "google-news-mcp-server"],
      "env": { "APIFY_TOKEN": "your_apify_token" }
    }
  }
}
```

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add google-news -e APIFY_TOKEN=your_apify_token -- npx -y google-news-mcp-server
```

### Cursor

Add the same block as for Claude Desktop to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project).

### VS Code (Copilot agent mode)

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "google-news": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "google-news-mcp-server"],
      "env": { "APIFY_TOKEN": "your_apify_token" }
    }
  }
}
```

### Any other MCP client

Command `npx -y google-news-mcp-server`, transport stdio, environment variable `APIFY_TOKEN`.

## Example answer

`search_news` with `keywords: ["nvidia"]`, `timeframe: "1d"`, `max_articles: 2`, `full_text: true` returns:

```json
{
 "count": 2,
 "articles": [
  {
   "title": "Nvidia Needs Three CEOs in One - WSJ",
   "source": "WSJ",
   "published_at": "2026-11-15T08:12:14+00:00",
   "url": "https://www.wsj.com/cio-journal/nvidia-needs-three-ceos-in-one-59038b0c",
   "description": "...",
   "full_text": "...",
   "keyword": "nvidia"
  },
  "..."
 ]
}
```

## Good to know

- A call usually takes 5 to 40 seconds, longer for hundreds of articles.
- Full text is cut at 6,000 characters per article to keep answers readable. A few paywalled sites only give their first paragraphs.
- Google News covers recent news far better than old news: a date range a year back returns few articles.

## Other ways to use the same data

- Python script: [google-news-api-python](https://github.com/dataxplore19/google-news-api-python)
- Node.js script: [google-news-api-node](https://github.com/dataxplore19/google-news-api-node)
- No code, in n8n: [n8n workflow templates](https://github.com/dataxplore19/n8n-google-trends-news-templates)
- Directly on Apify: [Google News Scraper](https://apify.com/data_xplorer/google-news-scraper-fast)

## FAQ

### Is there an official Google News MCP server or API?

No. Google has no public Google News API since it deprecated the old one in 2011. This server gives an AI assistant structured Google News results through the Apify Actor.

### Can the assistant read the articles, not just the headlines?

Yes. Ask for the full text (`full_text: true`), and the assistant gets the body of each article to summarize or analyze.

### Does it work with ChatGPT?

It works with any client that supports MCP servers over stdio. For clients that only accept remote MCP servers, use the hosted Apify MCP server at `https://mcp.apify.com?tools=data_xplorer/google-news-scraper-fast` with your Apify token.

## Disclosure

I am the author of the Google News Scraper Actor used by this server.

## License

MIT
