const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

if (process.platform === "win32") {
  ffmpeg.setFfmpegPath(path.join(__dirname, "../backend/bin/ffmpeg.exe"));
  ffmpeg.setFfprobePath(path.join(__dirname, "../backend/bin/ffprobe.exe"));
}

ffmpeg.getAvailableFormats(function(err, formats) {
  if (err) {
    console.error("FFmpeg formats error:", err.message);
  } else {
    console.log("FFmpeg is available!");
  }
});

ffmpeg.ffprobe("tmp/verify_tenglish.js", function(err, metadata) {
  if (err) {
    console.log("FFprobe error on actual file (expected invalid format since it's JS):", err.message);
  } else {
    console.log("FFprobe metadata:", metadata);
  }
});
