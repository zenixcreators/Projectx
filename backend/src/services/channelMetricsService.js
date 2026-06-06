/**
 * Helper to calculate median value of an array
 */
function getMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates metrics from channel statistics and retrieved video details
 */
function calculateMetrics(channelStats, videos) {
  const totalVideosAnalysed = videos.length;

  if (totalVideosAnalysed === 0) {
    return {
      growthPhase: "stable",
      viewVelocity: 1.0,
      avgViewsPerVideo: 0,
      avgEngagementRate: 0,
      likeToViewRatio: 0,
      commentToViewRatio: 0,
      uploadsPerWeek: 0,
      avgVideoDurationMinutes: 0,
      uploadSchedule: "Sporadic",
      bestPerformingLength: "Mid-form",
      topKeywords: [],
      topVideos: [],
      totalVideosAnalysed: 0
    };
  }

  // 1. Sort videos newest first (descending by publishedAt)
  const sortedVideos = [...videos].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // 2. Calculate View Velocity & Growth Phase
  let viewVelocity = 1.0;
  let growthPhase = "stable";

  if (totalVideosAnalysed >= 5) {
    const recentCount = Math.min(10, Math.ceil(totalVideosAnalysed * 0.3));
    const recent = sortedVideos.slice(0, recentCount);
    const prev = sortedVideos.slice(recentCount, recentCount + 20);

    const recentAvg = recent.reduce((sum, v) => sum + v.views, 0) / recent.length;
    const prevAvg = prev.length > 0
      ? prev.reduce((sum, v) => sum + v.views, 0) / prev.length
      : recentAvg;

    if (prevAvg > 0) {
      viewVelocity = parseFloat((recentAvg / prevAvg).toFixed(2));
    }

    if (viewVelocity > 2.0) growthPhase = "exploding";
    else if (viewVelocity > 1.2) growthPhase = "growing";
    else if (viewVelocity < 0.7) growthPhase = "declining";
    else growthPhase = "stable";
  }

  // 3. Average Views, Likes, Comments, Engagement
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let erSum = 0;
  let erCount = 0;
  let durationSum = 0;

  for (const v of sortedVideos) {
    totalViews += v.views;
    totalLikes += v.likes;
    totalComments += v.comments;
    durationSum += v.durationSecs;

    if (v.views > 0) {
      const er = ((v.likes + v.comments) / v.views) * 100;
      erSum += er;
      erCount++;
    }
  }

  const avgViewsPerVideo = Math.round(totalViews / totalVideosAnalysed);
  const avgEngagementRate = erCount > 0 ? parseFloat((erSum / erCount).toFixed(2)) : 0;
  const likeToViewRatio = totalViews > 0 ? parseFloat(((totalLikes / totalViews) * 100).toFixed(2)) : 0;
  const commentToViewRatio = totalViews > 0 ? parseFloat(((totalComments / totalViews) * 100).toFixed(2)) : 0;
  const avgVideoDurationMinutes = parseFloat(((durationSum / totalVideosAnalysed) / 60).toFixed(2));

  // 4. Upload Frequency & Schedule (Last 90 Days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentUploads = sortedVideos.filter(v => new Date(v.publishedAt) >= ninetyDaysAgo);
  const uploadsPerWeek = parseFloat((recentUploads.length / 13).toFixed(2));

  let uploadSchedule = "Sporadic";
  if (totalVideosAnalysed >= 3) {
    const gaps = [];
    for (let i = 0; i < sortedVideos.length - 1; i++) {
      const curr = new Date(sortedVideos[i].publishedAt);
      const next = new Date(sortedVideos[i + 1].publishedAt);
      const diffDays = Math.abs(curr - next) / (1000 * 60 * 60 * 24);
      gaps.push(diffDays);
    }
    const medianGap = getMedian(gaps);

    if (medianGap <= 1.5) uploadSchedule = "Daily";
    else if (medianGap <= 3.5) uploadSchedule = "2-3 Times a Week";
    else if (medianGap <= 8) uploadSchedule = "Weekly";
    else if (medianGap <= 16) uploadSchedule = "Bi-weekly";
    else if (medianGap <= 31) uploadSchedule = "Monthly";
  }

  // 5. Best Performing Length (Shorts < 60s, Mid-form 1m-10m, Long-form >= 10m)
  const durationGroups = {
    "Shorts": { views: 0, count: 0 },
    "Mid-form": { views: 0, count: 0 },
    "Long-form": { views: 0, count: 0 }
  };

  for (const v of sortedVideos) {
    let group = "Mid-form";
    if (v.durationSecs < 60) group = "Shorts";
    else if (v.durationSecs >= 600) group = "Long-form";

    durationGroups[group].views += v.views;
    durationGroups[group].count += 1;
  }

  let bestPerformingLength = "Mid-form";
  let maxAvgViews = -1;

  for (const [group, data] of Object.entries(durationGroups)) {
    if (data.count > 0) {
      const avgViews = data.views / data.count;
      if (avgViews > maxAvgViews) {
        maxAvgViews = avgViews;
        bestPerformingLength = group;
      }
    }
  }

  // 6. Title Word Frequency (Top 10 Keywords)
  const stopWords = new Set([
    "the", "a", "and", "in", "to", "of", "for", "with", "on", "at", "by", "an",
    "is", "it", "this", "that", "from", "as", "are", "how", "what", "why", "you",
    "your", "my", "we", "our", "their", "me", "new", "get", "make", "be", "or",
    "so", "up", "out", "can", "do", "about", "who", "when", "where", "if", "then"
  ]);

  const wordCounts = {};
  for (const v of sortedVideos) {
    const cleanTitle = v.title.toLowerCase().replace(/[^\w\s@#]/g, " ");
    const words = cleanTitle.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
  }

  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);

  // 7. Top 10 Videos by View Count
  const topVideos = [...sortedVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map(v => ({
      videoId: v.videoId,
      title: v.title,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      publishedAt: v.publishedAt,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl
    }));

  // 8. Estimate Monthly Revenue (Industry standard CPM of $3.00 to $9.00)
  const monthlyUploads = Math.max(0.2, uploadsPerWeek * 4.33);
  const estimatedMonthlyViews = Math.round(avgViewsPerVideo * monthlyUploads);
  const estMinMonthlyRevenue = Math.round((estimatedMonthlyViews * 3.0) / 1000);
  const estMaxMonthlyRevenue = Math.round((estimatedMonthlyViews * 9.0) / 1000);

  return {
    growthPhase,
    viewVelocity,
    avgViewsPerVideo,
    avgEngagementRate,
    likeToViewRatio,
    commentToViewRatio,
    uploadsPerWeek,
    avgVideoDurationMinutes,
    uploadSchedule,
    bestPerformingLength,
    topKeywords,
    topVideos,
    totalVideosAnalysed,
    estMinMonthlyRevenue,
    estMaxMonthlyRevenue
  };
}

module.exports = {
  calculateMetrics
};
