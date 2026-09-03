"use client";

import { useState } from "react";
import {
  DAYS,
  STATS,
  STILL_CONFIRMING,
  LIBRARY,
  PRINCIPLES,
  SOURCES,
  type SlotTag,
} from "@/lib/training-data";
import "./training.css";

function tagClass(tag: SlotTag) {
  return `tag tag-${tag}`;
}

export function TrainingLedger({
  weekOf,
  initialDone,
}: {
  weekOf: string; // ISO date, Monday of the tracked week
  initialDone: string[]; // dayKeys already checked off this week
}) {
  const [done, setDone] = useState<Set<string>>(new Set(initialDone));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(dayKey: string) {
    const wasDone = done.has(dayKey);
    setPending(dayKey);
    const next = new Set(done);
    if (wasDone) next.delete(dayKey);
    else next.add(dayKey);
    setDone(next);
    try {
      await fetch("/api/training/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayKey, weekOf, done: !wasDone }),
      });
    } catch {
      // Revert on failure.
      setDone(done);
    } finally {
      setPending(null);
    }
  }

  const doneCount = done.size;

  return (
    <div className="fcl">
      <nav className="jump" aria-label="Jump to day">
        <div className="wrap">
          {DAYS.map((d) => (
            <a key={d.key} href={`#${d.key}`}>
              {d.label.slice(0, 3)}
            </a>
          ))}
          <a href="#library">Library</a>
          <a href="#principles">Rules</a>
          <a href="#sources">Sources</a>
        </div>
      </nav>

      <div className="wrap">
        <header className="masthead">
          <p className="kicker">Training system — long camp, no fixed date</p>
          <h1 className="title">Fight Camp Ledger</h1>
          <p className="dek">
            Seven days built around the real gym timetable, a 4-hour daily
            deep-work block on Protocol, and the strength, power, and
            recovery work that doesn&apos;t happen on the mats. Advanced/pro
            loading — not a taper week.
          </p>

          <div className="stat-row">
            {STATS.map((s) => (
              <div className="stat" key={s.l}>
                <div className="n">{s.n}</div>
                <div className="l">{s.l}</div>
              </div>
            ))}
            <div className="stat">
              <div className="n">
                {doneCount}/{DAYS.length}
              </div>
              <div className="l">Checked off this week</div>
            </div>
          </div>

          <div className="flag">
            <h2>Still worth confirming</h2>
            <ul>
              {STILL_CONFIRMING.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </header>

        {DAYS.map((day) => {
          const isDone = done.has(day.key);
          return (
            <section id={day.key} className="day" key={day.key}>
              <div className="day-head">
                <h3>{day.label}</h3>
                <span className="day-focus">{day.focus}</span>
                <span className="day-badge">{day.badge}</span>
                <label className={`day-checkbox ${isDone ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    disabled={pending === day.key}
                    onChange={() => toggle(day.key)}
                  />
                  {isDone ? "Done this week" : "Mark done"}
                </label>
              </div>
              <div className="timeline">
                {day.slots.map((slot, i) => (
                  <div className="slot" key={i}>
                    <div className="time">{slot.time}</div>
                    <span className={tagClass(slot.tag)}>{slot.tag}</span>
                    <div className="what">
                      <span className="name">
                        {slot.name}
                        {slot.verify && <span className="verify">confirm window</span>}
                      </span>
                      {slot.sub && <span className="sub">{slot.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section id="library">
          <div className="section-head">
            <h2 className="section-title">Session Library</h2>
            <span className="section-note">everything off the mats</span>
          </div>
          <p className="section-intro">
            The strength, power, conditioning, and recovery content
            referenced above. Built around three rules: lift before you
            condition, keep explosive work low-volume and fresh, and never
            stack a hard lift within a few hours of hard sparring.
          </p>
          <div className="lib-grid">
            {LIBRARY.map((card) => (
              <div className="card" key={card.title}>
                <div className="card-head">
                  <h4>{card.title}</h4>
                  <span className="when">{card.when}</span>
                </div>
                <p className="why">{card.why}</p>
                <ul className="ex-list">
                  {card.items.map((item) => (
                    <li key={item.name}>
                      <span>{item.name}</span>
                      <span className="dose">{item.dose}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="principles">
          <div className="section-head">
            <h2 className="section-title">Why It&apos;s Sequenced This Way</h2>
            <span className="section-note">from the research</span>
          </div>
          <ol className="prin-list">
            {PRINCIPLES.map((p) => (
              <li key={p.title}>
                <strong>{p.title}</strong>
                <span className="d">{p.d}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer id="sources">
          <div className="section-head">
            <h2 className="section-title">Sources</h2>
          </div>
          <ul className="src-list">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
