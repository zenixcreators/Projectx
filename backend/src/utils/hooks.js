const HOOK_SETS = {
  tech: [
    { text: "You're using your phone wrong", style: "painful_truth" },
    { text: "This mistake is killing your battery", style: "painful_truth" },
    { text: "Stop doing this on your phone today", style: "bold_claim" },
    { text: "Before you buy a phone, watch this", style: "curiosity_gap" },
    { text: "Nobody tells you this about smartphones", style: "curiosity_gap" },
    { text: "Paid $1,000 for this device. Using 10% of it", style: "contradiction" },
    { text: "Every tech YouTuber got this recommendation wrong", style: "credibility_destroyer" },
    { text: "The setting that doubled my phone's performance", style: "specificity" },
    { text: "I switched to this 3 months ago. Won't go back", style: "contradiction" },
    { text: "Your privacy is leaking and you set it up yourself", style: "identity_challenge" },
  ],

  health: [
    { text: "Stop doing this before it ruins your sleep", style: "bold_claim" },
    { text: "You're harming your body without knowing", style: "painful_truth" },
    { text: "This mistake is killing your energy daily", style: "painful_truth" },
    { text: "Before you sleep tonight, watch this", style: "curiosity_gap" },
    { text: "Nobody tells you this about your health", style: "curiosity_gap" },
    { text: "Eating clean for a year. Still exhausted — here's why", style: "contradiction" },
    { text: "The supplement everyone recommends made things worse", style: "credibility_destroyer" },
    { text: "Tracked my sleep for 60 days. One habit changed everything", style: "specificity" },
    { text: "You're not tired. Your nervous system is stuck", style: "identity_challenge" },
    { text: "Working out harder is why you're not recovering", style: "counter_intuitive" },
  ],

  finance: [
    { text: "The savings advice keeping you broke", style: "credibility_destroyer" },
    { text: "I stopped budgeting. Saved more money", style: "counter_intuitive" },
    { text: "Your bank is quietly charging you for this", style: "painful_truth" },
    { text: "Paid off debt the 'right' way. It cost me years", style: "contradiction" },
    { text: "The number everyone chases is the wrong goal", style: "identity_challenge" },
    { text: "Cut three subscriptions. Saved $4,200 this year", style: "specificity" },
    { text: "What broke people say vs what wealthy people do", style: "status_flip" },
    { text: "Nobody tells you this about compound interest", style: "curiosity_gap" },
    { text: "Your financial advisor profits when you don't", style: "bold_claim" },
    { text: "The wealth habit that looks like failure at first", style: "counter_intuitive" },
  ],

  fitness: [
    { text: "Training every day is why you're not growing", style: "counter_intuitive" },
    { text: "I stopped going to the gym. Got better results", style: "contradiction" },
    { text: "The workout everyone recommends is a waste of time", style: "credibility_destroyer" },
    { text: "You're not weak. Your program is broken", style: "identity_challenge" },
    { text: "Tracked my lifts for 90 days. One change did everything", style: "specificity" },
    { text: "More protein is not the answer to this problem", style: "bold_claim" },
    { text: "The recovery habit top athletes never talk about", style: "curiosity_gap" },
    { text: "Beginners have an advantage veterans already lost", style: "status_flip" },
    { text: "The thing slowing your progress isn't effort", style: "painful_truth" },
    { text: "Stop optimizing your workout. Fix this first", style: "bold_claim" },
  ],

  business: [
    { text: "The strategy that scaled me almost killed the business", style: "contradiction" },
    { text: "Stop hiring until you fix this one thing", style: "bold_claim" },
    { text: "Your best customer is costing you the most money", style: "painful_truth" },
    { text: "I doubled revenue by doing less. Here's how", style: "counter_intuitive" },
    { text: "The metric everyone tracks is the wrong one", style: "credibility_destroyer" },
    { text: "Watched 200 founders fail. Same mistake every time", style: "specificity" },
    { text: "Nobody tells you this about scaling past six figures", style: "curiosity_gap" },
    { text: "Your competition isn't working harder — they stopped doing this", style: "identity_challenge" },
    { text: "The business advice that ages worst — and why", style: "credibility_destroyer" },
    { text: "What successful founders do that looks like failure", style: "status_flip" },
  ],

  marketing: [
    { text: "Your content isn't failing. Your hook is", style: "identity_challenge" },
    { text: "More posting made my reach collapse", style: "counter_intuitive" },
    { text: "The viral formula that actually kills engagement", style: "credibility_destroyer" },
    { text: "I stopped using CTAs. Conversions went up", style: "contradiction" },
    { text: "Three words I cut from my copy. Everything changed", style: "specificity" },
    { text: "Nobody in your niche is talking about this yet", style: "curiosity_gap" },
    { text: "Your audience isn't small. Your offer is wrong", style: "painful_truth" },
    { text: "The best-performing ad I ever ran looked like a mistake", style: "contradiction" },
    { text: "Amateurs chase followers. Professionals track this instead", style: "status_flip" },
    { text: "What works in marketing right now won't work next year", style: "bold_claim" },
  ],

  default: [
    { text: "You're doing this completely wrong", style: "painful_truth" },
    { text: "This mistake is costing you daily", style: "painful_truth" },
    { text: "Stop doing this immediately", style: "bold_claim" },
    { text: "Before you start, watch this", style: "curiosity_gap" },
    { text: "Nobody talks about this", style: "curiosity_gap" },
    { text: "The advice everyone gives is backwards", style: "credibility_destroyer" },
    { text: "I was embarrassed by how simple the fix was", style: "vulnerability" },
    { text: "Spent two years on this. One change fixed everything", style: "specificity" },
    { text: "The thing you think is helping is slowing you down", style: "counter_intuitive" },
    { text: "You're not the problem. The approach is", style: "identity_challenge" },
  ],
};

const TOPIC_MAP = [
  { keywords: ["tech", "phone", "software", "app", "device", "coding", "ai"], key: "tech" },
  { keywords: ["health", "sleep", "diet", "nutrition", "wellness", "mental"], key: "health" },
  { keywords: ["finance", "money", "invest", "budget", "saving", "wealth", "debt"], key: "finance" },
  { keywords: ["fitness", "gym", "workout", "training", "muscle", "weight"], key: "fitness" },
  { keywords: ["business", "startup", "founder", "revenue", "scaling", "hiring"], key: "business" },
  { keywords: ["marketing", "content", "social", "brand", "ads", "copy", "seo"], key: "marketing" },
];

function resolveCategory(topic) {
  const t = topic.toLowerCase();
  for (const { keywords, key } of TOPIC_MAP) {
    if (keywords.some(kw => t.includes(kw))) return key;
  }
  return "default";
}

function getHookSet(topic, options = {}) {
  const { style = null, limit = null } = options;
  const category = resolveCategory(topic);
  let hooks = HOOK_SETS[category];

  if (style) {
    hooks = hooks.filter(h => h.style === style);
  }

  if (limit) {
    hooks = hooks.slice(0, limit);
  }

  return hooks;
}

function getHookTexts(topic, options = {}) {
  return getHookSet(topic, options).map(h => h.text);
}

module.exports = { getHookSet, getHookTexts, HOOK_SETS, TOPIC_MAP };