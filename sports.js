// The sports the app covers. Each sport has its own settings and its own
// sites. Sports that aren't set up yet show as "coming soon".

const SPORTS = [
  { id: "parakiting", name: "Parakiting", icon: "🪁", ready: true },
  { id: "paragliding", name: "Paragliding", icon: "🪂", ready: false },
  { id: "surfing", name: "Surfing", icon: "🏄", ready: true },
];

// Your sites for the sport you're looking at.
function sportSites() {
  return state.sites.filter(site => (site.sport || "parakiting") === state.sport);
}

function currentSport() {
  return SPORTS.find(sport => sport.id === state.sport) || SPORTS[0];
}
