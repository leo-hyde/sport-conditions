// The sports the app covers. Each sport will have its own settings and its
// own sites. Only Parakiting is set up so far; the others show as "coming soon".

const SPORTS = [
  { id: "parakiting", name: "Parakiting", icon: "🪁", ready: true },
  { id: "paragliding", name: "Paragliding", icon: "🪂", ready: false },
  { id: "surfing", name: "Surfing", icon: "🏄", ready: false },
];

function currentSport() {
  return SPORTS.find(sport => sport.id === state.sport) || SPORTS[0];
}
