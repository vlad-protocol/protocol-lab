// Ports the Protocol B2B SOP's 7 client-facing templates (v1.3, Section 07)
// into real, fillable, exportable documents. Field defs drive both the
// editor UI and the printable "paper" HTML used for the PDF export.

export type SopDocType = "proposal" | "contract" | "attendee" | "runofshow" | "roster" | "survey" | "report";

export type SopFieldType = "text" | "date" | "textarea" | "select";

export type SopFieldDef = {
  key: string;
  label: string;
  type: SopFieldType;
  options?: string[];
  example?: string;
  full?: boolean; // span both columns in the editor grid
};

export type SopRowColumn = { key: string; label: string };

export type SopRowGroupDef = {
  key: string;
  title: string;
  columns: SopRowColumn[];
  seed: Record<string, string>[];
};

export type SopTemplateDef = {
  title: string;
  listTitle: string;
  docTitle: string;
  fields: SopFieldDef[];
  rowGroups?: SopRowGroupDef[];
};

export const TEMPLATE_DEFS: Record<SopDocType, SopTemplateDef> = {
  proposal: {
    title: "Proposal (07A)",
    listTitle: "Proposals",
    docTitle: "Proposal",
    fields: [
      { key: "brand", label: "Brand / venue", type: "text", example: "Idolem Griffintown" },
      { key: "preparedFor", label: "Prepared for (name, title)", type: "text", example: "Stephanie - Director" },
      { key: "date", label: "Date", type: "date" },
      { key: "validUntil", label: "Valid until", type: "date" },
      { key: "idea", label: "1 - The idea", type: "textarea", full: true, example: "One evening at Idolem Griffintown. A Pilates/HIIT class led by Vlad, then the lights drop into a no-alcohol dance party." },
      { key: "goal", label: "One goal (rule 1)", type: "text", example: "80 intro-class bookings with code PROTOCOL" },
      { key: "connection", label: "Connection (rule 2)", type: "text", example: "Trial + surprise and delight" },
      { key: "currency", label: "What guests pay (rule 3)", type: "text", example: "Email + SMS opt-in, a story tag" },
      { key: "story", label: "The story (rule 4)", type: "textarea", full: true, example: "Idolem helps Montreal beat the long winter; ECLIPSE is the night the lights go out and the room comes alive." },
      { key: "personality", label: "Brand personality - 3 words", type: "text", example: "Calm, strong, bold" },
      { key: "whatThisDoes", label: "2 - What this does for the brand", type: "textarea", full: true },
      { key: "packageTier", label: "Package", type: "select", options: ["Bronze", "Silver", "Gold"] },
      { key: "deliverablesNote", label: "Deliverables notes", type: "textarea", full: true, example: "1 recap reel, 10 edited stills, stories before/during/after, attendance + business report" },
      { key: "offerTonight", label: "Tonight-only offer", type: "text" },
      { key: "offerWeek", label: "Days 1-7 price", type: "text" },
      { key: "referralReward", label: "Referral reward", type: "text" },
      { key: "needFromBrand", label: "6 - What we need from the brand", type: "textarea", full: true },
      { key: "investmentTotal", label: "7 - Investment (incl. tax)", type: "text" },
      { key: "paymentSplit", label: "Payment schedule", type: "text", example: "20% on signing - 40% at T-7 days - 40% after delivery" },
      { key: "keyDates", label: "8 - Key dates", type: "textarea", full: true },
    ],
  },
  contract: {
    title: "Brand contract (07B)",
    listTitle: "Contracts",
    docTitle: "Event & Content Services Agreement",
    fields: [
      { key: "brandLegalName", label: "Brand legal name", type: "text" },
      { key: "brandAddress", label: "Brand address", type: "text" },
      { key: "repName", label: "Signing rep - name", type: "text" },
      { key: "repTitle", label: "Signing rep - title", type: "text" },
      { key: "packageFee", label: "Package fee (before tax)", type: "text" },
      { key: "paymentMethod", label: "Payment method", type: "text" },
      { key: "lateInterestRate", label: "Late interest rate", type: "text", example: "2% per month" },
      { key: "leadershipCount", label: "Leadership members required on-site", type: "text", example: "1" },
      { key: "promoCodeDeadline", label: "PROTOCOL code set up by", type: "date" },
      { key: "insuranceMin", label: "Protocol's insurance minimum", type: "text", example: "$2,000,000" },
    ],
  },
  attendee: {
    title: "Attendee form (07C)",
    listTitle: "Attendee forms",
    docTitle: "Participation, Risk & Consent",
    fields: [
      { key: "eventName", label: "Event name", type: "text" },
      { key: "eventDate", label: "Event date", type: "date" },
      { key: "place", label: "Place", type: "text" },
      { key: "brandName", label: "Brand", type: "text" },
      { key: "activityDescription", label: "Activity & risks description", type: "textarea", full: true, example: "A 45-minute Pilates/HIIT class and a dance party with loud music." },
      { key: "privacyContactName", label: "Privacy contact - name", type: "text" },
      { key: "privacyContactEmail", label: "Privacy contact - email", type: "text" },
    ],
  },
  runofshow: {
    title: "Run of show & shot list (07D)",
    listTitle: "Run-of-show docs",
    docTitle: "Run of Show",
    fields: [
      { key: "eventName", label: "Event name", type: "text" },
      { key: "doors", label: "Doors", type: "text", example: "7:00pm" },
      { key: "start", label: "Start", type: "text", example: "7:30pm" },
      { key: "end", label: "End", type: "text", example: "10:00pm" },
      { key: "venue", label: "Venue address", type: "text" },
    ],
    rowGroups: [
      {
        key: "rows_ros",
        title: "Run of show",
        columns: [
          { key: "time", label: "Time" },
          { key: "segment", label: "Segment" },
          { key: "what", label: "What happens" },
          { key: "lead", label: "Lead" },
          { key: "cue", label: "Cue / notes" },
        ],
        seed: [
          { time: "T-90", segment: "Setup", what: "Sound + light check, booth set, check-in table", lead: "M", cue: "Brand team arrives T-60" },
          { time: "T-60", segment: "Team brief", what: "Roles, emergency card, offer explained to every volunteer", lead: "V+M", cue: "Vests, radios" },
          { time: "T-30", segment: "Doors", what: "Check-in, form signed, warm-up music", lead: "Check-in", cue: "Count arrivals" },
          { time: "T0", segment: "Welcome", what: "Brand leader welcome, Vlad: the plan for the night", lead: "Brand + V", cue: "Shot 2" },
          { time: "T+50", segment: "Transition = brand moment", what: "Lights drop, DJ takes over, brand moment lands here", lead: "DJ + V + Brand", cue: "Shot 6 - camera ready" },
          { time: "T+75", segment: "Offer", what: "Brand explains the offer and PROTOCOL code", lead: "Brand", cue: "Shot 8 - music down" },
          { time: "T+120", segment: "Close", what: "Last song, group photo, thank-you", lead: "V", cue: "Shot 10" },
          { time: "T+150", segment: "Load-out", what: "Gear packed, venue checked, incident log closed", lead: "M", cue: "" },
        ],
      },
      {
        key: "rows_shots",
        title: "Shot list",
        columns: [
          { key: "num", label: "#" },
          { key: "moment", label: "Moment" },
          { key: "shot", label: "Shot" },
          { key: "device", label: "Device" },
          { key: "feeds", label: "Feeds" },
        ],
        seed: [
          { num: "1", moment: "Setup", shot: "Time-lapse of the room filling up", device: "Phone", feeds: "Story, recap open" },
          { num: "2", moment: "Welcome", shot: "Brand leader speaking, crowd reaction", device: "Phone", feeds: "Brand post" },
          { num: "3", moment: "Move", shot: "Wide shot of the whole room moving together", device: "Phone / Camera", feeds: "Recap" },
          { num: "6", moment: "Transition", shot: "The signature moment: lights drop, first beat", device: "Camera", feeds: "Recap hook" },
          { num: "8", moment: "Offer", shot: "Brand presenting the offer, people at the desk", device: "Phone", feeds: "Brand post, report" },
          { num: "10", moment: "Close", shot: "Group photo + final cheer", device: "Phone / Camera", feeds: "Recap end, stills" },
        ],
      },
    ],
  },
  roster: {
    title: "Volunteer roster (07E)",
    listTitle: "Rosters",
    docTitle: "Team Roster",
    fields: [
      { key: "eventName", label: "Event name", type: "text" },
      { key: "expectedAttendance", label: "Expected attendance", type: "text" },
      { key: "address", label: "Event address", type: "text" },
      { key: "meetingPoint", label: "Meeting point", type: "text" },
      { key: "hospital", label: "Nearest hospital", type: "text" },
      { key: "firstAiderPhone", label: "First-aider - name, phone", type: "text" },
      { key: "marwaPhone", label: "Marwa - phone", type: "text" },
      { key: "vladPhone", label: "Vlad - phone", type: "text" },
    ],
    rowGroups: [
      {
        key: "rows_roster",
        title: "Team roster",
        columns: [
          { key: "role", label: "Role" },
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "arrive", label: "Arrive" },
          { key: "station", label: "Station / task" },
        ],
        seed: [
          { role: "Event lead", name: "Vlad", phone: "", arrive: "T-90", station: "Energy, schedule, workout" },
          { role: "Operations lead", name: "Marwa", phone: "", arrive: "T-90", station: "Logistics, team, incidents" },
          { role: "First-aider (certified)", name: "", phone: "", arrive: "T-60", station: "Kit, near the activity" },
          { role: "Check-in x2", name: "", phone: "", arrive: "T-60", station: "Forms, wristbands, headcount" },
          { role: "Content (phone)", name: "", phone: "", arrive: "T-90", station: "Shot list, Stories" },
          { role: "Floor / hosts x2", name: "", phone: "", arrive: "T-60", station: "Water, guide guests, point to the desk" },
          { role: "Sweeper (outdoor)", name: "", phone: "", arrive: "T-60", station: "Last in the group" },
          { role: "Marshals (outdoor)", name: "", phone: "", arrive: "T-60", station: "Crossings" },
          { role: "Cargo bike rider + spotter", name: "", phone: "", arrive: "T-90", station: "Front of group with DJ" },
        ],
      },
    ],
  },
  survey: {
    title: "Attendee survey (07F)",
    listTitle: "Surveys",
    docTitle: "Survey / Sondage",
    fields: [{ key: "brandName", label: "Brand name (fills the bilingual questions)", type: "text" }],
  },
  report: {
    title: "Post-event report (07G)",
    listTitle: "Reports",
    docTitle: "Results",
    fields: [
      { key: "eventName", label: "Event name", type: "text" },
      { key: "brandName", label: "Brand", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "venue", label: "Venue", type: "text" },
      { key: "packageTier", label: "Package", type: "select", options: ["Bronze", "Silver", "Gold"] },
      { key: "attendanceTarget", label: "Attendance target", type: "text" },
      { key: "attendanceActual", label: "Attendance actual", type: "text" },
      { key: "dayOfConversions", label: "Day-of conversions", type: "text" },
      { key: "revenue", label: "Revenue (day-of + offer week)", type: "text" },
      { key: "costPerCustomer", label: "Cost per new customer", type: "text" },
      { key: "totalImpressions", label: "Total impressions", type: "text" },
      { key: "referralCount", label: "Referrals", type: "text" },
      { key: "nps", label: "NPS", type: "text" },
      { key: "recommendation", label: "Our one recommendation", type: "text", full: true },
      { key: "attendanceReach", label: "1 - Attendance & reach", type: "textarea", full: true },
      { key: "socialMedia", label: "2 - Social media performance", type: "textarea", full: true },
      { key: "salesRoi", label: "3 - Sales & return on investment", type: "textarea", full: true },
      { key: "experience", label: "4 - Attendee experience", type: "textarea", full: true },
      { key: "exposure", label: "5 - Brand exposure summary", type: "textarea", full: true },
      { key: "contentDelivered", label: "6 - Content delivered", type: "textarea", full: true },
      { key: "nextSteps", label: "7 - What we recommend next", type: "textarea", full: true },
    ],
  },
};

export type SopDocValues = { fields: Record<string, string>; rows: Record<string, Record<string, string>[]> };

function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function ft(v: unknown): string {
  return esc(v || "-");
}

// Produces the printable "paper" HTML for one document - the same markup
// used for the editor's live preview and for the PDF export.
export function renderSopPaper(type: SopDocType, values: SopDocValues): string {
  const f = values.fields || {};
  const rows = values.rows || {};
  let html = "";

  if (type === "proposal") {
    html =
      `<h3>${ft(f.brand)}</h3><div class="paper-meta">Prepared for ${ft(f.preparedFor)} - By Vlad &amp; Marwa, Protocol - ${ft(f.date)} - Valid until ${ft(f.validUntil)}</div>` +
      `<h4>1 - The idea</h4><p>${ft(f.idea)}</p>` +
      `<h4>Goal, story &amp; how we measure it</h4><table><tr><td><b>One goal</b></td><td>${ft(f.goal)}</td></tr><tr><td><b>Connection</b></td><td>${ft(f.connection)}</td></tr><tr><td><b>Currency</b></td><td>${ft(f.currency)}</td></tr><tr><td><b>Story</b></td><td>${ft(f.story)} - Personality: ${ft(f.personality)}</td></tr></table>` +
      `<h4>2 - What this does for ${ft(f.brand)}</h4><p>${ft(f.whatThisDoes)}</p>` +
      `<h4>3 - Why Protocol</h4><p>Protocol brings its own community: 6,000 followers, a 1,500-person email/SMS list, sold-out AFTR:HOURS nights, and a top reel at 350K views. One brief, one team, one invoice.</p>` +
      `<h4>4 - What you get - ${ft(f.packageTier)}</h4><p>${ft(f.deliverablesNote)}</p>` +
      `<h4>5 - The offer at the event</h4><p>Tonight only: ${ft(f.offerTonight)}. Days 1-7: ${ft(f.offerWeek)}. Referral reward: ${ft(f.referralReward)}.</p>` +
      `<h4>6 - What we need from ${ft(f.brand)}</h4><p>${ft(f.needFromBrand)}</p>` +
      `<h4>7 - Investment</h4><p>${ft(f.investmentTotal)} - ${ft(f.paymentSplit)}</p>` +
      `<h4>8 - Key dates</h4><p>${ft(f.keyDates)}</p>` +
      `<h4>9 - Next step</h4><p>Reply "yes" and we'll send the agreement and the deposit invoice the same day. The date is held once the deposit arrives.</p>`;
  } else if (type === "contract") {
    html =
      `<h3>Event &amp; Content Services Agreement</h3><div class="paper-meta">Protocol &amp; ${ft(f.brandLegalName)}</div>` +
      `<div class="legal-flag">DRAFT - needs a Quebec lawyer's review before use, same as every Protocol contract.</div>` +
      `<p><b>Between</b> Protocol and <b>${ft(f.brandLegalName)}</b>, ${ft(f.brandAddress)}, represented by ${ft(f.repName)}, ${ft(f.repTitle)}.</p>` +
      `<h4>Fees &amp; payment</h4><p>Package fee: ${ft(f.packageFee)}, plus GST/QST. 20% on signing, 40% at T-7 days, 40% within 72h of content delivery. Payment by ${ft(f.paymentMethod)}. Late balances accrue interest at ${ft(f.lateInterestRate)} starting 7 days after the due date.</p>` +
      `<h4>Brand commitments</h4><p>At least ${ft(f.leadershipCount)} leadership member(s) present. PROTOCOL code set up by ${ft(f.promoCodeDeadline)}.</p>` +
      `<h4>Insurance</h4><p>Protocol keeps commercial general liability insurance of at least ${ft(f.insuranceMin)}.</p>` +
      `<p>Full standard clauses (exclusivity, content rights, cancellation, weather, liability) per Protocol's B2B SOP Section 06/07B.</p>`;
  } else if (type === "attendee") {
    html =
      `<h3>Participation, Risk &amp; Consent</h3><div class="paper-meta">${ft(f.eventName)} - ${ft(f.eventDate)} - ${ft(f.place)} - with ${ft(f.brandName)}</div>` +
      `<h4>1 - The activity and its risks</h4><p>${ft(f.activityDescription)} Physical activity carries risks. I understand these risks and choose to take part.</p>` +
      `<h4>2 - My fitness</h4><p>I'm 18 or older (under 18: a parent/guardian signs below). I have no medical condition that makes this activity unsafe for me. I'll follow the team's instructions.</p>` +
      `<h4>3 - My belongings</h4><p>I'm responsible for my own belongings.</p>` +
      `<div class="legal-flag">Nothing in this form limits Protocol's or ${ft(f.brandName)}'s responsibility for bodily or moral injury caused by their fault, as required by the Civil Code of Quebec.</div>` +
      `<h4>4 - Photos and video</h4><p>I agree to be photographed and filmed (or I'll ask for a no-photo wristband at check-in).</p>` +
      `<h4>5 - My information</h4><p>Protocol collects this to run the event safely and measure results. Kept 3 years. Contact for access/correction/deletion: ${ft(f.privacyContactName)}, ${ft(f.privacyContactEmail)}.</p>`;
  } else if (type === "runofshow") {
    html = `<h3>Run of Show - ${ft(f.eventName)}</h3><div class="paper-meta">Doors ${ft(f.doors)} - Start ${ft(f.start)} - End ${ft(f.end)} - ${ft(f.venue)}</div>`;
    const ros = rows.rows_ros || [];
    if (ros.length) {
      html += `<h4>Run of show</h4><table><thead><tr><th>Time</th><th>Segment</th><th>What</th><th>Lead</th><th>Cue</th></tr></thead><tbody>`;
      ros.forEach((r) => {
        html += `<tr><td>${ft(r.time)}</td><td>${ft(r.segment)}</td><td>${ft(r.what)}</td><td>${ft(r.lead)}</td><td>${ft(r.cue)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    const shots = rows.rows_shots || [];
    if (shots.length) {
      html += `<h4>Shot list</h4><table><thead><tr><th>#</th><th>Moment</th><th>Shot</th><th>Device</th><th>Feeds</th></tr></thead><tbody>`;
      shots.forEach((r) => {
        html += `<tr><td>${ft(r.num)}</td><td>${ft(r.moment)}</td><td>${ft(r.shot)}</td><td>${ft(r.device)}</td><td>${ft(r.feeds)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
  } else if (type === "roster") {
    html =
      `<h3>Team Roster - ${ft(f.eventName)}</h3><div class="paper-meta">Expected attendance ${ft(f.expectedAttendance)}</div>` +
      `<table><thead><tr><th>Role</th><th>Name</th><th>Phone</th><th>Arrive</th><th>Station</th></tr></thead><tbody>`;
    (rows.rows_roster || []).forEach((r) => {
      html += `<tr><td>${ft(r.role)}</td><td>${ft(r.name)}</td><td>${ft(r.phone)}</td><td>${ft(r.arrive)}</td><td>${ft(r.station)}</td></tr>`;
    });
    html +=
      `</tbody></table>` +
      `<h4>Emergency card</h4><p><b>Serious injury: call 911 first.</b> Event address: ${ft(f.address)} - Meeting point: ${ft(f.meetingPoint)} - Nearest hospital: ${ft(f.hospital)}<br>First-aider: ${ft(f.firstAiderPhone)} - Marwa: ${ft(f.marwaPhone)} - Vlad: ${ft(f.vladPhone)}</p>`;
  } else if (type === "survey") {
    const b = ft(f.brandName);
    html =
      `<h3>Survey / Sondage</h3><p class="paper-meta">2 minutes - next morning by text, questions 1-2 only</p>` +
      `<table><thead><tr><th>Francais</th><th>English</th></tr></thead><tbody>` +
      `<tr><td>Comment evalues-tu l'evenement?</td><td>How would you rate the event overall? (1-5)</td></tr>` +
      `<tr><td>Probabilite de recommander cet evenement?</td><td>How likely to recommend this event? (NPS 0-10)</td></tr>` +
      `<tr><td>Connaissais-tu ${b} avant ce soir?</td><td>Did you know ${b} before tonight?</td></tr>` +
      `<tr><td>As-tu profite de l'offre ${b}?</td><td>Did you take the ${b} offer?</td></tr>` +
      `<tr><td>Reviendrais-tu a un evenement Protocol x ${b}?</td><td>Would you come to another Protocol x ${b} event?</td></tr>` +
      `</tbody></table>`;
  } else if (type === "report") {
    html =
      `<h3>${ft(f.eventName)} - Results</h3><div class="paper-meta">${ft(f.brandName)} x Protocol - ${ft(f.date)} - ${ft(f.venue)} - Package ${ft(f.packageTier)}</div>` +
      `<h4>Page 1 - Scorecard</h4><table>` +
      `<tr><td>Attendance</td><td>${ft(f.attendanceActual)} / target ${ft(f.attendanceTarget)}</td></tr>` +
      `<tr><td>Day-of conversions</td><td>${ft(f.dayOfConversions)}</td></tr>` +
      `<tr><td>Revenue</td><td>${ft(f.revenue)}</td></tr>` +
      `<tr><td>Cost per new customer</td><td>${ft(f.costPerCustomer)}</td></tr>` +
      `<tr><td>Total impressions</td><td>${ft(f.totalImpressions)}</td></tr>` +
      `<tr><td>Referrals</td><td>${ft(f.referralCount)}</td></tr>` +
      `<tr><td>NPS</td><td>${ft(f.nps)}</td></tr>` +
      `</table><p><b>Our one recommendation:</b> ${ft(f.recommendation)}</p>` +
      `<h4>1 - Attendance &amp; reach</h4><p>${ft(f.attendanceReach)}</p>` +
      `<h4>2 - Social media</h4><p>${ft(f.socialMedia)}</p>` +
      `<h4>3 - Sales &amp; ROI</h4><p>${ft(f.salesRoi)}</p>` +
      `<h4>4 - Attendee experience</h4><p>${ft(f.experience)}</p>` +
      `<h4>5 - Brand exposure</h4><p>${ft(f.exposure)}</p>` +
      `<h4>6 - Content delivered</h4><p>${ft(f.contentDelivered)}</p>` +
      `<h4>7 - What we recommend next</h4><p>${ft(f.nextSteps)}</p>`;
  }

  return `<div class="sop-paper">${html}</div>`;
}

export function seedRowsFor(type: SopDocType): Record<string, Record<string, string>[]> {
  const def = TEMPLATE_DEFS[type];
  const out: Record<string, Record<string, string>[]> = {};
  (def.rowGroups || []).forEach((g) => {
    out[g.key] = g.seed.map((r) => ({ ...r }));
  });
  return out;
}
