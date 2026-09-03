// Static content for the Training tab — the "Fight Camp Ledger" schedule,
// session library, and training principles. This is reference data, not
// stored in the DB; only day-by-day adherence check-ins are (see
// TrainingCheckIn in schema.prisma).

export type SlotTag = "deep" | "skill" | "strength" | "recovery" | "life";

export type Slot = {
  time: string;
  tag: SlotTag;
  name: string;
  sub?: string;
  verify?: boolean;
};

export type Day = {
  key: string; // stable key for check-ins, e.g. "mon"
  label: string;
  focus: string;
  badge: string;
  slots: Slot[];
};

export const STATS = [
  { n: "7", l: "Skill sessions" },
  { n: "2+2", l: "Strength / power" },
  { n: "28h", l: "Deep work / wk" },
  { n: "1", l: "Full recovery day" },
];

export const STILL_CONFIRMING = [
  "Everything Mon/Tue/Wed/Thu/Sat below is pulled straight from the live gym schedule (week of Aug 23–29, 2026), instructor names included. Muay Thai only runs three times a week — Mon & Wed evening, Sat late morning — that's a real constraint of the gym, not a scheduling choice, so it drives the whole layout below.",
  "Friday and Sunday are still built on assumptions (a midday break window for Friday, a rest day for Sunday) — lock these in once the gym's real Friday/Sunday class list is confirmed.",
  "Still no spa or recovery service anywhere in the live class list. If there's a specific service in mind (in-house sauna/cold plunge vs. a separate facility), it can be folded in.",
];

export const DAYS: Day[] = [
  {
    key: "mon",
    label: "Monday",
    focus: "Muay Thai · Lower-body strength",
    badge: "Gym visit — evening only",
    slots: [
      { time: "06:30", tag: "life", name: "Wake, joint prep flow", sub: "10–15 min — ankle circles, hip CARs, thoracic rotations (see Joint Care Circuit)" },
      { time: "06:45", tag: "deep", name: "Protocol — focused block", sub: "4h, phone away. No gym until evening — this is the longest uninterrupted window all week." },
      { time: "10:45", tag: "life", name: "Afternoon open", sub: "Admin, meals, errands. (Optional: the 12:00–1:00 BJJ All-Levels class is also on the board today for extra mat time — skip it to keep Monday to one session plus lifting.)" },
      { time: "18:55", tag: "life", name: "Drive to the gym", sub: "~40 min" },
      { time: "19:45", tag: "skill", name: "Kickboxing / Muay Thai Striking", sub: "7:45–8:45 PM — confirmed from live schedule" },
      { time: "20:45", tag: "strength", name: "Strength A — Lower body / hip drive", sub: "~45 min, right after class. Full session in the Library below." },
      { time: "21:30", tag: "life", name: "Home, light meal, 10 min wind-down mobility", sub: "Late finish (~10:30–10:40 PM) — if lifting this late starts costing sleep, move Strength A to its own separate midday trip instead." },
    ],
  },
  {
    key: "tue",
    label: "Tuesday",
    focus: "BJJ midday only",
    badge: "Work 8:00 PM — no Muay Thai today",
    slots: [
      { time: "06:00", tag: "life", name: "Wake, joint prep flow", sub: "10–15 min" },
      { time: "06:15", tag: "deep", name: "Protocol — focused block", sub: "4h" },
      { time: "10:15", tag: "life", name: "Drive to the gym", sub: "~40 min" },
      { time: "11:00", tag: "skill", name: "Pro Sparring", sub: "11:00–12:00 — MMA Sparring — confirmed" },
      { time: "12:00", tag: "skill", name: "BJJ All-Levels", sub: "12:00–1:00 PM — No-gi — confirmed" },
      { time: "13:00", tag: "life", name: "Home, eat" },
      { time: "14:20", tag: "life", name: "Free / admin / nap", sub: "No Muay Thai slot today, and Tuesday evening's BJJ (6:45–9 PM) runs too close to the shift — leave it. One skill session is the right amount today." },
      { time: "18:45", tag: "life", name: "Leave with a real buffer", sub: "Gym → job runs ~40 min — don't cut this close" },
      { time: "20:00", tag: "life", name: "Shift begins" },
    ],
  },
  {
    key: "wed",
    label: "Wednesday",
    focus: "Muay Thai · Upper-body strength",
    badge: "Gym visit — evening only",
    slots: [
      { time: "06:30", tag: "life", name: "Wake, joint prep flow", sub: "10–15 min" },
      { time: "06:45", tag: "deep", name: "Protocol — focused block", sub: "4h" },
      { time: "10:45", tag: "life", name: "Afternoon open", sub: "Admin, meals, errands. (Optional extra mat time: 11:00 MMA Drills + 12:00 BJJ All-Levels are both on the board if wanted — not required.)" },
      { time: "18:55", tag: "life", name: "Drive to the gym", sub: "~40 min" },
      { time: "19:45", tag: "skill", name: "Kickboxing / Muay Thai Striking", sub: "7:45–8:45 PM — confirmed from live schedule" },
      { time: "20:45", tag: "strength", name: "Strength B — Upper pull / grip", sub: "~45 min, right after class. Full session in the Library below." },
      { time: "21:30", tag: "life", name: "Home, light meal, 10 min wind-down mobility" },
    ],
  },
  {
    key: "thu",
    label: "Thursday",
    focus: "BJJ · Power primer · Conditioning",
    badge: "Gym visit — midday",
    slots: [
      { time: "06:00", tag: "life", name: "Wake, joint prep flow", sub: "10–15 min" },
      { time: "06:00", tag: "deep", name: "Protocol — focused block", sub: "4h — starts right at wake to leave a warm-up buffer before the 11 AM class" },
      { time: "10:00", tag: "life", name: "Drive to the gym", sub: "~40 min" },
      { time: "10:40", tag: "strength", name: "Plyo primer", sub: "~15 min, low volume, done fresh before class — full detail in Library" },
      { time: "11:00", tag: "skill", name: "MMA Drills", sub: "11:00–12:00 — MMA Fundamentals — confirmed" },
      { time: "12:00", tag: "skill", name: "BJJ All-Levels", sub: "12:00–1:00 PM — No-gi — confirmed" },
      { time: "13:00", tag: "strength", name: "Anaerobic interval finisher", sub: "~20–25 min. Full protocol in the Library." },
      { time: "13:25", tag: "life", name: "Home, eat" },
      { time: "20:30", tag: "recovery", name: "Wind-down mobility", sub: "10 min" },
    ],
  },
  {
    key: "fri",
    label: "Friday",
    focus: "Lightest day by design",
    badge: "Split shift 8:45–~19:00",
    slots: [
      { time: "06:15", tag: "life", name: "Wake, light stretch", sub: "10 min — keep it short, on the clock" },
      { time: "08:45", tag: "life", name: "Morning shift" },
      { time: "~12:00", tag: "recovery", name: "Midday mobility & yoga", verify: true, sub: "30 min from the Joint Care / Mobility protocol, plus a real lunch. No strength or plyo today — this is the programmed light day." },
      { time: "~13:30", tag: "life", name: "Afternoon/evening shift" },
      { time: "19:00", tag: "life", name: "Shift ends" },
      { time: "19:15", tag: "deep", name: "Protocol — focused block", sub: "4h, the one day it lands in the evening. If four hours after a full shift proves unsustainable, split it across Friday and Saturday morning." },
      { time: "23:15", tag: "life", name: "Wind down, no phone" },
    ],
  },
  {
    key: "sat",
    label: "Saturday",
    focus: "Muay Thai + BJJ + Open Mat · Full plyo",
    badge: "Heaviest day — trim first in taper",
    slots: [
      { time: "08:15", tag: "life", name: "Wake, joint prep flow", sub: "10–15 min" },
      { time: "08:30", tag: "life", name: "Light breakfast, get ready" },
      { time: "09:25", tag: "life", name: "Drive to the gym", sub: "~40 min" },
      { time: "10:05", tag: "strength", name: "Full plyometric session", sub: "~20 min, done fresh before class — full protocol in the Library" },
      { time: "10:30", tag: "skill", name: "Kickboxing / Muay Thai Striking", sub: "10:30–11:30 AM — confirmed from live schedule" },
      { time: "11:30", tag: "life", name: "Refuel at/near the gym", sub: "30 min — the real gap between classes — light carbs + fluids" },
      { time: "12:00", tag: "skill", name: "BJJ All-Levels", sub: "12:00–1:00 PM — No-gi — confirmed" },
      { time: "13:00", tag: "skill", name: "BJJ Open Mat (optional)", sub: "1:00–2:00 PM — No-gi — confirmed on the board — skip if Muay Thai + plyo already cooked the legs" },
      { time: "14:00", tag: "life", name: "Home", sub: "~40 min" },
      { time: "14:40", tag: "life", name: "Real meal, shower/contrast" },
      { time: "15:30", tag: "deep", name: "Protocol — focused block", sub: "4h — pushed to the afternoon since the earliest real class is 10:30 AM" },
    ],
  },
  {
    key: "sun",
    label: "Sunday",
    focus: "Full recovery",
    badge: "No gym visit",
    slots: [
      { time: "08:30", tag: "life", name: "Wake at own pace" },
      { time: "08:45", tag: "deep", name: "Protocol — focused block", sub: "4h" },
      { time: "13:00", tag: "recovery", name: "Dedicated yoga session", sub: "45–60 min — hips, shoulders, spine. Full flow in the Library." },
      { time: "14:15", tag: "recovery", name: "Easy Zone 1–2 movement", sub: "20–30 min walk or light bike — conversational pace only" },
      { time: "Evening", tag: "life", name: "Meal prep, foam roll, early sleep", sub: "Protect this day — it's the one true reset in the week" },
    ],
  },
];

export type LibraryCard = {
  title: string;
  when: string;
  why: string;
  items: { name: string; dose: string }[];
};

export const LIBRARY: LibraryCard[] = [
  {
    title: "Strength A — Lower body / hip drive",
    when: "Monday, post-Muay Thai",
    why: "Posterior chain and hip power feed takedowns, sprawls, and kick torque. This is the heavy day — keep it to compounds.",
    items: [
      { name: "Trap bar deadlift or back squat", dose: "4 × 3–5 @ 80–87%" },
      { name: "Bulgarian split squat", dose: "3 × 6–8 / leg" },
      { name: "Single-leg RDL", dose: "3 × 8 / leg" },
      { name: "Weighted hip thrust", dose: "3 × 6–8" },
      { name: "Pallof press (anti-rotation)", dose: "3 × 10 / side" },
      { name: "4-way neck harness", dose: "3 × 12" },
    ],
  },
  {
    title: "Strength B — Upper pull / grip",
    when: "Wednesday, post-Muay Thai",
    why: "Pulling strength and grip endurance decide clinch fights and guard retention. Balances the pushing volume already trained via striking.",
    items: [
      { name: "Weighted pull-up or lat pulldown", dose: "4 × 4–6" },
      { name: "DB bench press or push press", dose: "4 × 5" },
      { name: "Single-arm DB row", dose: "3 × 8 / side" },
      { name: "Farmer's carry", dose: "3 × 40m" },
      { name: "Rotational cable chop", dose: "3 × 10 / side" },
      { name: "Plate pinch or towel pull-up hang", dose: "3 sets to near-failure" },
    ],
  },
  {
    title: "Power primer — Contrast",
    when: "Thursday, pre-MMA Drills",
    why: "Short and near-maximal, done right before striking so it potentiates the session instead of pre-fatiguing it. Under five reps a set, full recovery between.",
    items: [
      { name: "Depth jumps", dose: "3 × 3" },
      { name: "Rotational med ball throw", dose: "3 × 5 / side" },
      { name: "Broad jumps", dose: "3 × 3" },
    ],
  },
  {
    title: "Full plyometric session",
    when: "Saturday, pre-Muay Thai",
    why: "The one longer power session of the week. Still low rep, high quality — stop a set the moment output drops, not when it's \"hard.\"",
    items: [
      { name: "Box jumps", dose: "4 × 3" },
      { name: "Lateral bounds", dose: "3 × 5 / side" },
      { name: "Clap push-ups", dose: "3 × 5" },
      { name: "Kettlebell swings", dose: "4 × 8" },
      { name: "Mace or battle-rope slams", dose: "3 × 20s" },
    ],
  },
  {
    title: "Anaerobic interval finisher",
    when: "Thursday, post-BJJ",
    why: "Rolling already taxes the aerobic system — this adds the short, ugly anaerobic capacity that decides championship rounds. Pick one.",
    items: [
      { name: "Assault bike / rower: 20s all-out, 40s easy", dose: "8–10 rounds" },
      { name: "Bag combo + burpee + sprawl circuit", dose: "5 × 3min, 1min rest" },
    ],
  },
  {
    title: "Joint care circuit",
    when: "Every morning, 10–15 min",
    why: "Standing daily maintenance for the joints combat sport loads hardest — shoulders, hips, knees, ankles, spine. Not optional on rest days either.",
    items: [
      { name: "Ankle circles + banded ankle distraction", dose: "1 min / side" },
      { name: "Hip CARs (controlled articular rotations)", dose: "5 / side, slow" },
      { name: "90/90 hip switches", dose: "8 / side" },
      { name: "Thoracic rotations + cat-cow", dose: "10 reps" },
      { name: "Shoulder CARs + banded external rotation isometric hold", dose: "30–45s / side" },
    ],
  },
  {
    title: "Dedicated yoga flow",
    when: "Sunday, 45–60 min",
    why: "The longer session daily mobility can't replace — range of motion under control, not just movement prep.",
    items: [
      { name: "Hip-opening flow (pigeon, lizard, 90/90)", dose: "~15 min" },
      { name: "Shoulder & thoracic sequence", dose: "~15 min" },
      { name: "Spinal flexion/extension/rotation flow", dose: "~15 min" },
      { name: "Breath-led cooldown", dose: "~10 min" },
    ],
  },
  {
    title: "Friday midday mobility",
    when: "Friday break, ~30 min",
    why: "Trimmed version for a short window between shifts — the parts that matter most after a morning on the feet at work.",
    items: [
      { name: "Hip flexor / groin stretch", dose: "45s / side" },
      { name: "Neck mobility flow", dose: "2 min" },
      { name: "Wrist & ankle care", dose: "2 min" },
      { name: "Box breathing", dose: "4 min" },
    ],
  },
];

export const PRINCIPLES = [
  { title: "Lift before you condition", d: "Heavy strength work goes before any intervals or hard cardio on the same day — conditioning first blunts force output and motor unit recruitment for the lift." },
  { title: "Explosive work stays fresh and low-volume", d: "Plyometrics are done first in a session (or as a primer beforehand), under five reps a set, at all-out effort with full recovery between — volume kills quality here faster than anywhere else." },
  { title: "Separate hard strength from hard sparring by hours, not minutes", d: "At least 4–6 hours between competing stimuli, or better, different days entirely — this is why both strength days land on Muay Thai evenings, well clear of Saturday's three-class stack." },
  { title: "One hard system per day", d: "Never pair a heavy lift with an intense interval session on the same day. Each day has one primary physical stress — strength, power, or conditioning — with skill work as the constant." },
  { title: "Two strength sessions a week is the target, not more", d: "At advanced/pro level with 7 skill sessions already on the calendar, 2 dedicated lifts plus 2 power sessions is the ceiling before it starts eating into recovery for the mats." },
  { title: "Recovery is programmed, not leftover", d: "Daily joint care, one full rest day, and a same-week deload if fatigue stacks up aren't nice-to-haves — they're what lets the hard days stay hard." },
  { title: "This is a base camp, not fight week", d: "Built for 8+ weeks out with no date set. Once a fight is booked, Saturday's three-class stack is the first thing to trim — drop the Open Mat first — strength volume drops in the final 10–14 days, and skill work shifts from volume to sharpness." },
];

export const SOURCES = [
  { label: "Get Physical — Combat Block Periodization for MMA", url: "https://www.getphysical.com/blog/combat-periodization-proper-programming-mma-strength-conditioning" },
  { label: "Vitruve — MMA Strength & Conditioning Program", url: "https://vitruve.fit/blog/mma-strength-and-conditioning-program/" },
  { label: "Get Physical — Plyometric Exercises for MMA", url: "https://www.getphysical.com/blog/plyometric-exercises-for-mma" },
  { label: "Combat Fitness — The Interference Effect Explained", url: "https://www.combatfitness.co/post/the-interference-effect-explained" },
  { label: "BudoBelly — Active Recovery for Martial Artists", url: "https://budobelly.com/active-recovery-for-martial-artists-what-actually-works/" },
];
