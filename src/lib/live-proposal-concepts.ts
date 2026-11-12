// Concept bank for Live Proposal. Claude adapts one of these to what it
// hears on the call rather than inventing a format cold, which is both
// faster mid-call and keeps the ideas in the style Vlad actually likes:
// a one-line question anyone can answer, a clear underdog or twist, a
// visible result at the end, and a headline before it even happens.
// Edit freely: this list is the "house taste" the AI works from.

export type ConceptPattern = { name: string; pattern: string; fitsBest: string };

export const CONCEPT_BANK: ConceptPattern[] = [
  { name: "1 vs the Room", pattern: "One elite athlete (pro, Olympian, champion) against the combined output of everyone in the room. Can the room beat one person? Live total on a screen.", fitsBest: "Spin, rowing, any studio with measurable machines. Strong media hook; best as event 2 of a series once trust exists." },
  { name: "Studio vs Team", pattern: "The studio's regulars against a local sports team (university varsity, rec league, club). Do trained athletes beat people who do this class 3x a week?", fitsBest: "Any studio near a campus or with a local team; brings the team's whole community as new faces." },
  { name: "Tribe vs Tribe", pattern: "Two communities face off in the studio's discipline: runners vs riders, climbers vs boxers, yogis vs CrossFitters. A rivalry with a scoreboard.", fitsBest: "Brings a second community through the door; great for collab posts." },
  { name: "Neighbourhood War", pattern: "Guests sign up under their neighbourhood; every rep/round/kilometre counts for their area. Leaderboard by neighbourhood all night, a trophy that lives at the studio.", fitsBest: "Local-pride angle that city media (MTLBlog) cover." },
  { name: "Coaches vs Everyone", pattern: "The studio's whole coaching team, handicapped, against all guests. Makes coaches the stars, which sells memberships after.", fitsBest: "Low budget, first-time clients, any discipline." },
  { name: "Room vs a Machine", pattern: "Can the room out-power a machine with a known output (a Zamboni, a snowblower, an e-bike) in an all-out effort? Pick a machine just above what the room can do so it stays close.", fitsBest: "Studios whose equipment measures watts or output." },
  { name: "Unexpected Collision", pattern: "Two worlds that never meet, inside the studio: a chess tournament in a boxing ring, a latte-art battle between rounds, a spelling bee on rowers. The twist is the headline.", fitsBest: "Any studio; works when the owner wants something weird and talked about." },
  { name: "Unlock the Level", pattern: "Build on the studio's own system (levels, phases, belts, class names): the night they unlock a level nobody has done yet. Heats by level, finalists advance, champion goes on a Wall of Fame.", fitsBest: "Studios with named levels or class tiers." },
  { name: "Bring Your Opposite", pattern: "Entry only works if you bring someone who has never done this discipline (your dad, your gym-hating friend). Pairs compete together; the newcomer's score counts double.", fitsBest: "When the main goal is new faces." },
];
