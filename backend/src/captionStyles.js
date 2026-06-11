/**
 * Caption Style templates config
 */
const captionStyles = {
  hormozi: {
    font: "Arial Black",
    fontSize: 24,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 3,
    position: "bottom-center",
    animationType: "word",
    wordsPerSegment: 1,
    bgOpacity: 0
  },
  viral: {
    font: "Montserrat",
    fontSize: 22,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 2,
    position: "bottom-center",
    animationType: "highlight",
    wordsPerSegment: 1,
    bgOpacity: 0
  },
  subtitle: {
    font: "Arial",
    fontSize: 18,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 1.5,
    position: "bottom-center",
    animationType: "line",
    wordsPerSegment: 8,
    bgOpacity: 0
  },
  cinematic: {
    font: "Georgia",
    fontSize: 20,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 1,
    position: "center",
    animationType: "fade",
    wordsPerSegment: 6,
    bgOpacity: 0.4
  }
};

module.exports = captionStyles;
