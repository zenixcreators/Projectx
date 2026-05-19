const axios = require("axios");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Robust ISO 8601 duration parser (e.g. PT1H2M3S -> 3723)
 */
function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Detects URL format and extracts handle/ID/custom path
 */
function parseChannelUrl(url) {
  if (!url) return null;
  const cleanUrl = url.trim();

  if (cleanUrl.startsWith("@")) {
    return { type: "handle", value: cleanUrl };
  }

  try {
    // Regex for /channel/UC...
    const channelMatch = cleanUrl.match(/(?:youtube\.com\/channel\/)(UC[a-zA-Z0-9_-]{22})/i);
    if (channelMatch) {
      return { type: "id", value: channelMatch[1] };
    }

    // Regex for /@handle
    const handleMatch = cleanUrl.match(/(?:youtube\.com\/)(@[a-zA-Z0-9_.-]+)/i);
    if (handleMatch) {
      return { type: "handle", value: handleMatch[1] };
    }

    // Regex for /c/customName
    const cMatch = cleanUrl.match(/(?:youtube\.com\/c\/)([a-zA-Z0-9_.-]+)/i);
    if (cMatch) {
      return { type: "c", value: cMatch[1] };
    }

    // Regex for /user/username
    const userMatch = cleanUrl.match(/(?:youtube\.com\/user\/)([a-zA-Z0-9_.-]+)/i);
    if (userMatch) {
      return { type: "user", value: userMatch[1] };
    }

    // Direct UC... ID
    if (cleanUrl.startsWith("UC") && cleanUrl.length === 24) {
      return { type: "id", value: cleanUrl };
    }
  } catch (e) {
    console.error("URL parsing error:", e);
  }
  return null;
}

/**
 * Resolves a channel canonical ID by scraping the public YouTube page (Costs 0 Quota!)
 */
async function resolveChannelIdFromHtml(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      timeout: 8000
    });
    const html = response.data;
    const idMatch = html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"/i) ||
                    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/i) ||
                    html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/i);
    if (idMatch) {
      return idMatch[1];
    }
  } catch (err) {
    console.error("HTML scraping failed for URL:", url, err.message);
  }
  return null;
}

/**
 * Resolves a channel to fetch details + uploads playlist (Costs 1 unit)
 */
async function resolveChannel(url) {
  const parsed = parseChannelUrl(url);
  if (!parsed) throw new Error("Invalid YouTube channel URL or handle.");

  let channelId = null;

  // 1. Check if it's already a UC ID
  if (parsed.type === "id") {
    channelId = parsed.value;
  } else {
    // 2. Try scraping to find the ID (highly efficient, handles custom /c/ URLs)
    const fullUrl = url.startsWith("http") ? url : `https://www.youtube.com/${parsed.value}`;
    channelId = await resolveChannelIdFromHtml(fullUrl);
  }

  const params = {
    part: "snippet,statistics,contentDetails",
    key: YOUTUBE_API_KEY
  };

  if (channelId) {
    params.id = channelId;
  } else {
    // Scraper failed, fallback to API search params
    if (parsed.type === "handle") {
      params.forHandle = parsed.value;
    } else if (parsed.type === "user") {
      params.forUsername = parsed.value;
    } else {
      throw new Error("Could not resolve custom custom /c/ URL. Please provide full link.");
    }
  }

  const res = await axios.get("https://www.googleapis.com/youtube/v3/channels", { params });
  if (!res.data.items || res.data.items.length === 0) {
    throw new Error("Channel not found on YouTube. Verify URL/handle.");
  }

  const item = res.data.items[0];
  return {
    channelId: item.id,
    channelName: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    stats: {
      subscribers: parseInt(item.statistics.subscriberCount || 0, 10),
      totalViews: parseInt(item.statistics.viewCount || 0, 10),
      videoCount: parseInt(item.statistics.videoCount || 0, 10),
      joinedYear: new Date(item.snippet.publishedAt).getFullYear(),
      country: item.snippet.country || "US"
    },
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads
  };
}

/**
 * Paginates uploaded videos playlist (Costs 1 unit per page)
 */
async function fetchVideoIds(uploadsPlaylistId, max = 100) {
  const videoList = [];
  let nextPageToken = "";
  const fetchLimit = Math.min(max, 150); // limit to 150 as per specs

  while (videoList.length < fetchLimit) {
    const params = {
      part: "contentDetails,snippet",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken,
      key: YOUTUBE_API_KEY
    };

    const res = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", { params });
    if (!res.data.items || res.data.items.length === 0) break;

    for (const item of res.data.items) {
      videoList.push({
        videoId: item.contentDetails.videoId,
        publishedAt: item.contentDetails.videoPublishedAt || item.snippet.publishedAt
      });
      if (videoList.length >= fetchLimit) break;
    }

    nextPageToken = res.data.nextPageToken;
    if (!nextPageToken) break;
  }
  return videoList;
}

/**
 * Batches video IDs and fetches full metrics (Costs 1 unit per 50 IDs)
 */
async function fetchVideoDetails(videoList) {
  const ids = videoList.map(v => v.videoId);
  const details = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const params = {
      part: "snippet,statistics,contentDetails",
      id: chunk.join(","),
      key: YOUTUBE_API_KEY
    };

    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", { params });
    if (!res.data.items) continue;

    for (const item of res.data.items) {
      const stats = item.statistics || {};
      const durationSecs = parseDuration(item.contentDetails?.duration || "PT0S");
      details.push({
        videoId: item.id,
        title: item.snippet.title,
        tags: item.snippet.tags || [],
        durationSecs,
        views: parseInt(stats.viewCount || 0, 10),
        likes: parseInt(stats.likeCount || 0, 10),
        comments: parseInt(stats.commentCount || 0, 10),
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id}`
      });
    }
  }
  return details;
}

module.exports = {
  parseChannelUrl,
  resolveChannel,
  fetchVideoIds,
  fetchVideoDetails
};
