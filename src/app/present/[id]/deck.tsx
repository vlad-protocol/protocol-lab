"use client";

// Protocol-branded 16:9 deck rendered from a live proposal. Ten slides are
// fixed (package, bonuses, guarantee, add-ons, proof, price — Operations
// Manual v2.2); the rest fill from the discovery fields and the chosen
// concept. Every number comes from deckNumbers(), never from the AI.
// Keys: ← → (or click) to move, F for full screen.

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { deckNumbers, val, type Fields, type LiveConcept, type PriceTier } from "@/lib/live-proposal";

const BG = "#050505", OFF = "#F4F2ED", GR = "#5F6065", BODY = "#C9C7C1", P = "#A206F4", PL = "#C78BFF", LINE = "#2A2A2E";
const H = "var(--deck-head), Impact, sans-serif", B = "var(--deck-body), Arial, sans-serif", M = "var(--deck-mono), monospace", BR = "var(--deck-brush), cursive";

type Proposal = {
  id: string; title: string; priceTier: string; fields: Fields; concepts: LiveConcept[]; chosenConcept: number | null;
  acceptedAt: string | null; paymentChoice: string | null;
};

const fmtDate = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

function Label({ children, color = PL }: { children: ReactNode; color?: string }) {
  return <p style={{ fontFamily: M, fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color }}>{children}</p>;
}
function Title({ children, size = 72, color = OFF }: { children: ReactNode; size?: number; color?: string }) {
  return <h2 style={{ fontFamily: H, fontSize: size, fontWeight: 400, lineHeight: 1.05, textTransform: "uppercase", color }}>{children}</h2>;
}
function Text({ children, size = 28, color = BODY, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  return <p style={{ fontFamily: B, fontSize: size, lineHeight: 1.4, color, ...style }}>{children}</p>;
}
function Head({ label, title }: { label: string; title: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Label>{label}</Label><Title>{title}</Title></div>;
}
function Card({ title, num, children, border = GR }: { title: string; num?: string; children: ReactNode; border?: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: "28px 32px", border: `1px solid ${border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        {num && <span style={{ fontFamily: H, fontSize: 40, color: P }}>{num}</span>}
        <h3 style={{ fontFamily: H, fontSize: 32, fontWeight: 400, textTransform: "uppercase", color: OFF }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Slide({ children, bg = BG, n, total, studio }: { children: ReactNode; bg?: string; n: number; total: number; studio: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, padding: "128px 128px 160px", display: "flex", flexDirection: "column", gap: 40, color: OFF }}>
      {children}
      <p style={{ position: "absolute", left: 128, bottom: 64, fontFamily: M, fontSize: 24, letterSpacing: 3, color: bg === P ? "#E9D2FF" : GR }}>PROTOCOL × {studio.toUpperCase()}</p>
      <p style={{ position: "absolute", right: 128, bottom: 64, fontFamily: M, fontSize: 24, color: bg === P ? "#E9D2FF" : GR }}>{String(n).padStart(2, "0")} / {total}</p>
    </div>
  );
}
function Table({ rows, head }: { rows: ReactNode[][]; head?: string[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {head && <thead><tr>{head.map((h) => <th key={h} style={{ fontFamily: M, fontSize: 22, color: GR, textAlign: "left", padding: "0 24px 10px 0" }}>{h}</th>)}</tr></thead>}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} style={{ padding: "13px 24px 13px 0", borderBottom: `1px solid ${LINE}`, fontFamily: j === 0 ? H : B, fontSize: j === 0 ? 28 : 26, textTransform: j === 0 ? "uppercase" : "none", color: j === 0 ? OFF : BODY, verticalAlign: "top" }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Deck({ id }: { id: string }) {
  const [p, setP] = useState<Proposal | null>(null);
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(1);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/live-proposals/${id}`);
    if (res.ok) setP((await res.json()).proposal);
  }, [id]);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const slides = p ? buildSlides(p, async (choice) => {
    setAccepting(true);
    await fetch(`/api/live-proposals/${id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentChoice: choice }) });
    setAccepting(false);
    load();
  }, accepting) : [];
  const total = slides.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") setI((x) => Math.min(x + 1, total - 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setI((x) => Math.max(x - 1, 0));
      if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (!p) return <div style={{ position: "fixed", inset: 0, background: BG }} />;
  const studio = val(p.fields, "studioName", p.title);
  const current = Math.min(i, total - 1);
  const s = slides[current];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          setI((x) => (e.clientX > window.innerWidth / 2 ? Math.min(x + 1, total - 1) : Math.max(x - 1, 0)));
        }}
        style={{ position: "absolute", left: "50%", top: "50%", width: 1920, height: 1080, transform: `translate(-50%, -50%) scale(${scale})`, cursor: "pointer" }}
      >
        {s.cover ? s.node : <Slide n={current + 1} total={total} studio={studio} bg={s.bg}>{s.node}</Slide>}
      </div>
    </div>
  );
}

type Built = { node: ReactNode; bg?: string; cover?: boolean };

function buildSlides(p: Proposal, accept: (choice: "PAY_IN_FULL" | "SPLIT_20_40_40") => void, accepting: boolean): Built[] {
  const f = p.fields || {};
  const n = deckNumbers(f, (p.priceTier as PriceTier) || "FOUNDING");
  const c: LiveConcept | undefined = p.concepts?.[p.chosenConcept ?? 0];
  const studio = val(f, "studioName", p.title);
  const owner = val(f, "ownerName", "[owner]");
  const today = new Date();
  const valid = new Date(today.getTime() + 14 * 86400000);
  const tbd = "[to confirm]";
  const m = n.money;
  const pending = <Text color={PL}>The concept is being built from our conversation…</Text>;

  const slides: Built[] = [];

  // 1 · Cover
  slides.push({
    cover: true,
    node: (
      <div style={{ position: "absolute", inset: 0, background: "#0B0710", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 1080, top: -260, width: 1100, height: 1100, borderRadius: "50%", background: "#2A0742" }} />
        <div style={{ position: "absolute", left: 1300, top: -60, width: 700, height: 700, borderRadius: "50%", background: "#4A0A78" }} />
        <div style={{ position: "absolute", left: 128, top: 128, width: 1600 }}><Label>The Studio Takeover · Proposal</Label></div>
        <h1 style={{ position: "absolute", left: 120, top: 220, width: 1700, fontFamily: H, fontSize: (c?.name || "").length > 14 ? 200 : 300, fontWeight: 400, lineHeight: 0.95, textTransform: "uppercase", color: OFF }}>{c?.name || "Your Takeover"}</h1>
        <p style={{ position: "absolute", left: 128, top: 590, width: 1500, fontFamily: H, fontSize: 64, textTransform: "uppercase", color: OFF }}>{studio} <span style={{ color: P }}>×</span> Protocol</p>
        <div style={{ position: "absolute", left: 128, top: 690, width: 1250 }}><Text size={32}>{c?.headline || "One night inside your studio, built around what only you have."}</Text></div>
        <p style={{ position: "absolute", left: 1340, top: 840, width: 500, fontFamily: BR, fontSize: 56, color: P }}>Keep moving.</p>
        <p style={{ position: "absolute", left: 128, bottom: 64, width: 1700, fontFamily: M, fontSize: 24, letterSpacing: 2, color: GR, textTransform: "uppercase" }}>
          Prepared for {owner}, {studio} · by Vlad &amp; Marwa, Protocol · {fmtDate(today)} · valid until {fmtDate(valid)}
        </p>
      </div>
    ),
  });

  // 2 · What we heard
  slides.push({
    node: (
      <>
        <Head label="01 · What we heard" title={<>Here&apos;s where <span style={{ color: P }}>{studio}</span> is today</>} />
        <div style={{ flex: 1, display: "flex", gap: 24 }}>
          <Card num="01" title="The challenge"><Text size={26}>{val(f, "biggestPain", tbd)}</Text></Card>
          <Card num="02" title="The hard months"><Text size={26}>{val(f, "slowPeriod", tbd)}</Text></Card>
          <Card num="03" title="What you want"><Text size={26}>{val(f, "eventGoal", "New members through the door, and a night people talk about.")}</Text></Card>
        </div>
      </>
    ),
  });

  // 3 · The idea
  slides.push({
    node: (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Label>02 · The idea</Label><Title size={80}>{c?.name || "The concept"}</Title></div>
        {c ? (
          <div style={{ display: "flex", gap: 64, flex: 1 }}>
            <div style={{ flex: 3, display: "flex", flexDirection: "column", gap: 24 }}>
              <Text size={36} color={OFF}>{c.headline}</Text>
              <Text size={30}>{c.howItWorks}</Text>
            </div>
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 18, padding: "36px 40px", border: `1px solid ${P}` }}>
              <Label>The world</Label>
              {(["look", "sound", "rules", "souvenir"] as const).map((k) => (
                <Text key={k} size={25}><b style={{ color: OFF, textTransform: "capitalize" }}>{k}:</b> {c.world?.[k]}</Text>
              ))}
            </div>
          </div>
        ) : pending}
      </>
    ),
  });

  // 4 · Run of night
  slides.push({
    node: (
      <>
        <Head label="03 · How the night runs" title="One evening, start to finish" />
        {c?.runOfNight?.length ? (
          <Table head={["TIME", "MOMENT", "WHAT HAPPENS"]} rows={c.runOfNight.map((r) => [<span key="t" style={{ fontFamily: M, color: PL, fontSize: 26 }}>{r.time}</span>, r.moment, r.what])} />
        ) : pending}
      </>
    ),
  });

  // 5 · Wow moments
  slides.push({
    node: (
      <>
        <Head label="04 · The wow moments" title="Six things people will film" />
        {c?.wowMoments?.length ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 20 }}>
            {c.wowMoments.slice(0, 6).map((w, k) => (
              <Card key={k} num={String(k + 1).padStart(2, "0")} title={w.title}><Text size={24}>{w.desc}</Text></Card>
            ))}
          </div>
        ) : pending}
      </>
    ),
  });

  // 6 · The offer (purple)
  slides.push({
    bg: P,
    node: (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Label color={OFF}>05 · The offer at the peak</Label><Title size={80}>Tonight only</Title></div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Tonight only", n.tonight, "Paid at your desk with code PROTOCOL"], ["Days 1–7", n.week, "The clock is real"], ["Day 8", "Offer expires", "Back to your regular price"]].map(([a, b, d]) => (
            <div key={a} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "32px 36px", background: BG }}>
              <Label>{a}</Label>
              <p style={{ fontFamily: H, fontSize: 48, lineHeight: 1.05, textTransform: "uppercase", color: OFF }}>{b}</p>
              <Text size={24}>{d}</Text>
            </div>
          ))}
        </div>
        <Text size={28} color={OFF}><b>Bring a friend:</b> a friend who buys with PROTOCOL gets tonight&apos;s price until day 7. The member who brought them gets {n.friend}.</Text>
      </>
    ),
  });

  // 7 · Goal & measurement
  slides.push({
    node: (
      <>
        <Head label="06 · Goal and how we measure it" title="What success looks like" />
        <Table rows={[
          ["One goal", `${n.passTarget} tonight-only offers sold with code PROTOCOL`],
          ["Headcount (guaranteed)", `${n.headcount} guests checked in at the peak`],
          ["The real win", `${n.members30} new paying members by day 30`],
          ["Connection", c?.connection || "Trial + surprise and delight"],
          ["What guests “pay”", "Email + SMS opt-in at RSVP, a story tag"],
          ["The story", c?.story || tbd],
          ["We'll measure", "Check-ins, new faces, offers sold, close rate, day-30 members"],
        ]} />
      </>
    ),
  });

  // 8 · The math
  slides.push({
    node: (
      <>
        <Head label="07 · The math for you" title={n.roi ? `${n.members30} members pays for the night` : "Your numbers"} />
        <div style={{ display: "flex", gap: 48 }}>
          {[[String(n.members30), "new members by day 30"], [n.membersValue ? m(Math.round(n.membersValue)) : "$—", `their value over ${n.months} months`], [n.roi ? `${n.roi.toFixed(1)}×` : "—", "return on the event"]].map(([a, b]) => (
            <div key={b} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingTop: 28, borderTop: `2px solid ${P}` }}>
              <p style={{ fontFamily: H, fontSize: 150, lineHeight: 1, color: OFF }}>{a}</p>
              <Text>{b}</Text>
            </div>
          ))}
        </div>
        <Text size={26}>{n.price ? `Based on ${m(n.price)} a month and an average stay of ${n.months} months: ${n.members30} × ${m(n.price)} × ${n.months} = ${m(Math.round(n.membersValue || 0))}. Plus 100+ new opt-ins you can sell to later, and 30 days of content.` : "We'll fill this with your monthly price and how long a member stays."}</Text>
      </>
    ),
  });

  // 9 · Package + bonuses (fixed)
  const items: [string, string, string][] = [
    ["The Takeover Night", "Concept, run of show, full production (DJ, sound, lights, team, safety, insurance), promotion to our 6,000 followers and 1,500-person list, hosted by Vlad", "$5,000"],
    ["Bonus 1 · Front-Desk Closer Script", "Word-for-word pitch, desk script, objection answers, 10-min staff briefing", "$500"],
    ["Bonus 2 · 48-Hour Follow-Up", "Same-night text, survey, personal notes, email and last call over 7 days", "$750"],
    ["Bonus 3 · Bring-a-Friend Engine", "Two-sided rewards, Friend Pass, scripts, tracking with PROTOCOL", "$750"],
    ["Bonus 4 · 30-Day Content Kit", "Recap video, 3 short videos, 20+ photos, captions, 12-post plan", "$1,500"],
    ["Bonus 5 · Partner Perks Bag", "Free products from 2–4 local brands for every guest", "$500"],
    ["Bonus 6 · Day-30 Member Report", "72h scorecard, full report, day-30 update and debrief call", "$500"],
  ];
  slides.push({
    node: (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Label>08 · What you get</Label><Title size={64}>The full package + six bonuses</Title></div>
        <Table rows={[...items.map(([a, b, v]) => [a, b, <span key="v" style={{ fontFamily: M, color: OFF }}>{v}</span>]), ["Total value", <span key="t" style={{ color: PL }}>Your price: {m(n.tier.price)}</span>, <span key="v" style={{ fontFamily: H, fontSize: 40, color: P }}>$9,500</span>]]} />
      </>
    ),
  });

  // 10 · Guarantee
  slides.push({
    node: (
      <>
        <Head label="09 · Our promise" title="We guarantee the room is full" />
        <div style={{ flex: 1, display: "flex", gap: 24 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: "40px 44px", border: `2px solid ${P}` }}>
            <Label>The Full House Guarantee</Label>
            <p style={{ fontFamily: H, fontSize: 56, lineHeight: 1.05, textTransform: "uppercase", color: OFF }}>{n.headcount} guests at the peak, or your next Takeover is 50% off.</p>
            <Text size={26}>You do your 5 promotion actions (we write them all). We bring the crowd and deliver every item on its date.</Text>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: "40px 44px", border: `1px solid ${GR}` }}>
            <Label>The Playbook Credit</Label>
            <p style={{ fontFamily: H, fontSize: 56, lineHeight: 1.05, textTransform: "uppercase", color: OFF }}>$1,000 toward your next one.</p>
            <Text size={26}>Do all 8 playbook actions, sell {n.passTarget} offers by day 7, and let us film a 60-second case study.</Text>
          </div>
        </div>
        <Text size={24}>What we don&apos;t promise: a number of sales. Your team runs the desk. We set up everything that makes the sales happen, and the report shows exactly what the night brought in.</Text>
      </>
    ),
  });

  // 11 · Add-ons
  slides.push({
    node: (
      <>
        <Head label="10 · Add-ons" title="Optional, on top" />
        <Text>Quoted per item, from $300 to $1,500.</Text>
        <Table rows={[
          ["Camera crew", "Cinema-quality video and photos with a dedicated crew and lights"],
          ["More videos", "+4 or +8 short vertical videos: a full month of posts"],
          ["Spotlight on Protocol", "A dedicated email blast and a Story takeover on event day"],
          ["Creators", "3–10 Montreal fitness creators taking part, briefed and filmed"],
          ["Ad-ready cuts", "Video versions with cleared music, ready for paid ads"],
        ]} />
      </>
    ),
  });

  // 12 · Proof
  slides.push({
    node: (
      <>
        <Head label="11 · Why Protocol" title="We built our crowd from zero" />
        <div style={{ display: "flex", gap: 24 }}>
          <Card title="Calisthenics Gym Montreal"><Text size={26}>3 workout + after-party events, ~80 people each, ~60% came back</Text></Card>
          <Card title="Maison Local"><Text size={26}>A free workout and run from their store: ~600 people, ~$6K in sales that day</Text></Card>
          <Card title="MTL Street Food Festival"><Text size={26}>~300 new sign-ups and +600 followers from one collab post</Text></Card>
        </div>
        <p style={{ fontFamily: H, fontSize: 44, lineHeight: 1.15, textTransform: "uppercase", color: OFF }}>Events with 500+ people · three sold-out AFTR:HOURS nights · 6,000 followers built from zero · a top reel at 350K views</p>
      </>
    ),
  });

  // 13 · Investment
  slides.push({
    node: (
      <>
        <Head label="12 · Investment" title={`${n.tier.label.split(" (")[0]}: ${m(n.tier.price)}`} />
        <div style={{ flex: 1, display: "flex", gap: 64 }}>
          <div style={{ flex: 3 }}>
            <Table rows={[
              [n.tier.label, <span key="a" style={{ fontFamily: M, color: OFF }}>{m(n.tier.price)}</span>],
              ["Add-ons", "$0 unless chosen"],
              ["Pass-through", "$0 · your space"],
              ["GST 5% + QST 9.975%", <span key="b" style={{ fontFamily: M, color: OFF }}>{m(Math.round(n.tax * 100) / 100)}</span>],
              ["Total", <span key="c" style={{ fontFamily: M, color: OFF }}>{m(Math.round(n.total * 100) / 100)}</span>],
            ]} />
          </div>
          <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "28px 32px", border: `2px solid ${P}` }}>
              <Label>Pay in full today</Label>
              <p style={{ fontFamily: H, fontSize: 64, lineHeight: 1, color: OFF }}>{m(n.tier.payInFull)} + tax</p>
              <Text size={24}>{m(Math.round(n.pif * 100) / 100)} total. Most studios choose this.</Text>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "28px 32px", border: `1px solid ${GR}` }}>
              <Label>Or 20 / 40 / 40</Label>
              <Text size={24} color={OFF}>{n.split.map((x) => m(Math.round(x * 100) / 100)).join(" · ")}: on signing, seven days before, after delivery</Text>
            </div>
          </div>
        </div>
        <Text size={24} color={PL}>Book within 14 days and lock this rate for your next two Takeovers: Quarterly Partner, $9,000 for three.</Text>
      </>
    ),
  });

  // 14 · Your part
  const needs = [
    "You and your team present on the night; your staff at the offer desk, handling payments",
    "Code PROTOCOL and a “Referred by” field in your booking system before launch",
    "The 8 actions in your Studio Playbook: posts, emails and texts we write for you, class mentions, Friend Passes, calls to past leads",
    `Your space after hours${val(f, "equipment") ? ` (${val(f, "equipment")})` : ""}`,
    "Your sales numbers at day 2, day 10 and day 30",
  ];
  slides.push({
    bg: "#0E0D10",
    node: (
      <>
        <Head label="13 · Your part" title="What we need from you" />
        <div>
          {needs.map((t, k) => (
            <div key={k} style={{ display: "flex", gap: 28, alignItems: "baseline", padding: "16px 0", borderBottom: `1px solid ${LINE}` }}>
              <span style={{ fontFamily: H, fontSize: 36, color: P, width: 60 }}>{String(k + 1).padStart(2, "0")}</span>
              <Text>{t}</Text>
            </div>
          ))}
        </div>
      </>
    ),
  });

  // 15 · Next step + accept
  const steps: [string, string][] = [["Today", "Sign + deposit"], ["T-21 days", "Promotion launches"], ["T-7 days", "Second payment"], [val(f, "preferredDate", "[date]"), c?.name || "The night"], ["Next day", "Recap + photos"], ["+5 business days", "Report + debrief"]];
  slides.push({
    node: (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Label>14 · Next step</Label><Title size={96}>{p.acceptedAt ? "Welcome aboard." : "Let’s lock your date"}</Title></div>
        <div style={{ display: "flex", gap: 24 }}>
          {steps.map(([a, b], k) => (
            <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingTop: 24, borderTop: k === 3 ? `4px solid ${P}` : `2px solid ${GR}` }}>
              <Label color={k === 3 ? PL : BODY}>{a}</Label>
              <h3 style={{ fontFamily: H, fontSize: 32, fontWeight: 400, textTransform: "uppercase", color: OFF }}>{b}</h3>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {p.acceptedAt ? (
          <Text size={32} color={OFF}>Done: {p.paymentChoice === "PAY_IN_FULL" ? "paid in full" : "20 / 40 / 40"}. The agreement and invoice are on their way today.</Text>
        ) : (
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <button disabled={accepting} onClick={() => accept("PAY_IN_FULL")} style={{ fontFamily: H, fontSize: 40, textTransform: "uppercase", background: P, color: OFF, border: "none", padding: "28px 48px", cursor: "pointer" }}>Yes · pay in full {m(n.tier.payInFull)}</button>
            <button disabled={accepting} onClick={() => accept("SPLIT_20_40_40")} style={{ fontFamily: H, fontSize: 40, textTransform: "uppercase", background: "transparent", color: OFF, border: `2px solid ${OFF}`, padding: "26px 48px", cursor: "pointer" }}>Yes · 20 / 40 / 40</button>
            <p style={{ marginLeft: "auto", fontFamily: BR, fontSize: 64, color: P }}>Keep moving.</p>
          </div>
        )}
      </>
    ),
  });

  return slides;
}
