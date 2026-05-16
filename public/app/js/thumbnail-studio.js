function generateThumbnails() {
  const prompt = document.getElementById('thumbPrompt').value.trim();
  if (!prompt) return;

  const btn = document.querySelector('.gen-btn-alt');
  const originalHtml = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="border-top-color: white;"></div><span>Analyzing...</span>';

  const data = {
    feeling: 'Vibrant & High-Energy',
    style: 'Cyberpunk Digital Art',
    score: '9.4/10',
    colorDesc: 'Electric blues and hot pinks create a high-energy contrast system.',
    styleDesc: 'Sharp focus with exaggerated neon bloom and digital distortion effects.',
    tones: ['High Octane', 'Digital', 'Attention Grabber'],
    swatches: ['#00F2FF', '#FF007A', '#121212', '#FFFFFF']
  };

  setTimeout(() => {
    document.getElementById('mainThumbImg').src = 'assets/thumbnails/medium2.png';

    document.getElementById('aiScore').textContent = data.score;
    document.getElementById('aiScoreBar').style.width = '94%';
    document.getElementById('aiFeeling').textContent = data.feeling;
    document.getElementById('aiStyle').textContent = data.style;
    document.getElementById('aiColorDesc').textContent = data.colorDesc;
    document.getElementById('aiStyleDesc').textContent = data.styleDesc;

    document.getElementById('aiToneChips').innerHTML =
      data.tones.map(t => `<span class="chip-sm">${t}</span>`).join('');

    document.getElementById('aiColorMood').innerHTML =
      data.swatches.map(c => `<div class="swatch" style="background: ${c}"></div>`).join('');

    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }, 2500);
}
