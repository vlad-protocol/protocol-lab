-- Sales dashboard v2: match the Protocol Sales Playbook's actual funnel
-- (Dial -> Pitch -> Conversation -> Booked -> Held -> Won) and KPI
-- benchmarks, and seed the Scripts panel with the Playbook's real script
-- content so it's usable immediately instead of empty.

-- 1. Replace the simple CallOutcome with the Playbook's progressive
--    call-stage-reached funnel, plus result/objection tracking for the
--    "quality noes" metric.
CREATE TYPE "CallStageReached" AS ENUM ('NO_ANSWER', 'VOICEMAIL', 'GATEKEEPER', 'OWNER_REACHED', 'PITCHED', 'CONVERSATION_2MIN', 'VIDEO_CALL_BOOKED');
CREATE TYPE "CallResultTag" AS ENUM ('NONE', 'NOT_INTERESTED', 'FOLLOW_UP_SET', 'WRONG_NUMBER', 'DO_NOT_CONTACT');

ALTER TABLE "Interaction" ADD COLUMN "callStageReached" "CallStageReached";
ALTER TABLE "Interaction" ADD COLUMN "resultTag" "CallResultTag" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Interaction" ADD COLUMN "objectionHeard" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "objectionAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Interaction" ADD COLUMN "lastQuestionAsked" BOOLEAN NOT NULL DEFAULT false;

-- Best-effort carry-over from the short-lived callOutcome column (this
-- app was never deployed with it live, so this is precautionary).
UPDATE "Interaction" SET "callStageReached" = CASE "callOutcome"
  WHEN 'NO_ANSWER' THEN 'NO_ANSWER'::"CallStageReached"
  WHEN 'VOICEMAIL' THEN 'VOICEMAIL'::"CallStageReached"
  WHEN 'CONNECTED_NOT_BOOKED' THEN 'OWNER_REACHED'::"CallStageReached"
  WHEN 'DEMO_BOOKED' THEN 'VIDEO_CALL_BOOKED'::"CallStageReached"
  ELSE NULL
END
WHERE "callOutcome" IS NOT NULL;

ALTER TABLE "Interaction" DROP COLUMN "callOutcome";
DROP TYPE "CallOutcome";

-- 2. Per-rep daily dial target.
ALTER TABLE "User" ADD COLUMN "salesDailyDialTarget" INTEGER;

-- 3. Admin-editable KPI benchmarks, seeded with the Playbook's defaults.
CREATE TABLE "SalesBenchmark" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amberMin" DOUBLE PRECISION NOT NULL,
    "greenMin" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesBenchmark_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesBenchmark_metricKey_key" ON "SalesBenchmark"("metricKey");

INSERT INTO "SalesBenchmark" ("id", "metricKey", "label", "unit", "amberMin", "greenMin", "updatedAt") VALUES
  (gen_random_uuid()::text, 'dials_per_rep_day', 'Dials per rep per day', 'count', 50, 100, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'pickup_rate', 'Pickup rate (owner reached / dials)', 'percent', 5, 10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'pitch_rate', 'Pitch rate (pitched / owner reached)', 'percent', 50, 75, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'conversation_rate', 'Conversation rate (2min+ / owner reached)', 'percent', 10, 25, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'booking_rate', 'Booking rate (video call booked / owner reached)', 'percent', 2, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'show_rate', 'Show rate (held / booked) — needs Video Calls', 'percent', 50, 70, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'close_rate', 'Close rate (won / held) — needs Video Calls', 'percent', 20, 30, CURRENT_TIMESTAMP);

-- 4. Seed the Scripts panel with the Playbook's actual script content
--    (Protocol_Sales_Playbook.pdf, Nov 10 2026) so it's usable right
--    away. Owner can edit/add/remove from the dashboard afterward.
CREATE TABLE "SalesScript" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesScript_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalesScript_category_sortOrder_idx" ON "SalesScript"("category", "sortOrder");
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed script content from the Playbook
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('80dcedcd-1915-40e8-bced-0be5fd3029b1', 'Cold call — opener & pitch', 'Cold call', 'Before you dial (30 seconds): check the studio''s Instagram (follower count, prices, anything new — opening, new class, new location — that''s your trigger); know the owner''s first name; have the tracker open to log the outcome.

1. OPENER (permission-based)

Cold:
"Hi [name]? [pause] It''s Vlad from Protocol. I''ll be upfront, it''s a dreaded cold call. Do you want to throw your phone out the window now, or give me 30 seconds and then decide?"
FR: "Salut [nom]? C''est Vlad de Protocol. Je vais être honnête, c''est un appel à froid. Tu veux lancer ton téléphone par la fenêtre tout de suite, ou tu me donnes 30 secondes et tu décides après ?"

Trigger (when you saw something new): "Hi [name], it''s Vlad from Protocol. I''m calling about [the new location / the strength launch]. Has that changed how you''re filling classes?"

Warm: "Hey [name], it''s Vlad from Protocol. You weren''t expecting my call, but I hope you can help. You''re one of 20 Montreal studios I''d love to work with. Can you help me understand if it''s even relevant?"
— No clear yes: "Let me briefly explain. If it''s not relevant, you''ll never hear from me again, fair?"
— Hard no: "Was my opener that bad, or do you hate sales calls that much?"

2. PITCH (problems only, 20 seconds)
"Our clients are boutique studio owners in Montreal who run into a couple of obstacles to filling their classes. New people don''t walk in: Instagram and ClassPass bring browsers, not members. People try a class but don''t sign up. And members love the studio but don''t bring friends, so growth depends on ads. I have a feeling you''ll tell me the opposite: every class is full and you''re turning people away."
Then stop talking.
— They recognise a problem → "Out of those, which one''s the most pressing?"
— "We''re good" → "Sounds like everything''s perfect. Can I ask one last question? Is that because you genuinely don''t have empty spots, or you don''t trust a cold caller could help?"
— A question ("What do you do exactly?") → "Great question. Before I chew your ears off, which of those problems should I explain?"', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('ac501c12-c53f-49d5-a712-70e5f870b337', 'Cold call — qualify (BANT)', 'Cold call', '3. QUALIFY: problem → example → impact → root cause
Ask more, tell less. Repeat their last 1-3 words back (mirroring) and name the feeling ("Sounds frustrating").
— Problem: "When you say [their words], what do you mean exactly?"
— Example (required): "Can you give me an example? When''s the last time you noticed it?" No example = no problem. Don''t move on without one.
— Impact: "What happens if things just stay as they are?" → "From 1 to 10, how much of a priority is this?" → "Why not a lower number?"
— Root cause: "What have you tried to fix it? Why didn''t it work?"

BANT check (weave in, don''t interrogate):
Budget — "Roughly what do you spend a month to get new members?" Red flag: a new member worth under $500 (monthly price × months they stay) — offer a Partner Perks spot instead; log the spend for the budget test.
Authority — "Is anyone else involved in decisions for the studio?" Red flag: a partner exists → they must be on the video call.
Need — the example above. Red flag: no example.
Timing — "Is this something you want fixed before January?" Red flag: "Maybe next year" → future lead, set a follow-up date.

"Just looking for info" → "Oh, just info? You probably could have Googled that. I''m guessing you''re not the type who takes calls just to chat. What''s the real problem you want solved?"

4. SUMMARY + CLOSE (negative frame)
"Let me see if I got this right: [problem, their example, what they tried]. Can I ask a tough question? Have you accepted this is just how it is?"
"I''m not sure I can help yet. But if I told you there''s a way to fix [their problem] without spending more on ads, would it be a stupid idea to sit down for 30 minutes on video? We go through your numbers and I show you where new people slip away before they join. If you think I don''t know what I''m talking about by the end, we leave it there."', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('3198b2d0-f7ca-46b1-8cbb-bf709b375bee', 'Cold call — book it', 'Cold call', '5. BOOK IT (two precise options, soon)
"I''ve got tomorrow at 10:15 or Thursday at 5:45. Which is better?"
— Same day or next day whenever possible. Use 15-minute times (10:15, not 10:00).
— Partner involved: "Can [partner] join too, so we''re not going back and forth?"
— Secure it: "I''ve only got a couple of spots this week, so moving it is hard. Is there any reason you might not make it?"
— BAMFAM: never hang up without the date, time and link agreed.

NOT NOW / WRONG FIT
"Sounds like it''s not a priority right now. I''ll call you on [exact date]. One last weird question: what''s your favourite pizza topping?"
Log the date and the topping. Open the next call with it.', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('7e57d753-074d-4ce1-8cef-115179e30a44', 'Gatekeeper & voicemail', 'Cold call', 'GATEKEEPER (front desk)
"Hi, who am I speaking with? Hi [name], I was hoping you could help me. I''m Vlad, trying to reach [owner]. Can you put me through?" If asked why: "I help studio owners fill empty spots in their classes. That''s what [owner] looks after, right?"
Be friendly; ask when the owner is usually in and log it.

VOICEMAIL (no pitch, no number)
"Hi [name], no need to call me back. I''ll text you a quick note so you have some context. It''s Vlad, by the way. Have a great day."', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('b191e4e3-5132-470d-9f45-6790b5470832', 'Objections — cold call', 'Objections', 'Pause 2-3 seconds ("Huh.") → accept it → ask permission → ask a question. Calm, curious, cool.

"Send me an email." → "Of course, what''s the best email? Before I do, would you be opposed to hearing what it''s about so I know it''s even relevant?"
"Not interested." → "I''m not surprised, I''m a stranger interrupting your day. Would you be mad if I asked one last question? Is that because you hate sales calls, or because you''ve got zero empty spots?"
"We have marketing / an agency." → "I thought you would. Does that mean everything''s perfect? What''s one thing they can''t seem to fix?"
"No budget." → "Must be frustrating. (pause) I''m guessing even with budget, filling classes wouldn''t be a priority anyway, right?"
"Busy." → "Ouch, my timing''s awful. Would it be a stupid idea to explain in 30 seconds so you never hear from me again if it''s irrelevant?"
"Call me next week." → "Ahh, famous last words. (pause) What does that mean 95 times out of 100 on a sales call?"
"We tried events." → "Oh, I don''t hear that often. What exactly didn''t work?"
"How much is it?" → "Depends on what we find, and I''d only suggest it if the numbers pay you back several times. That''s what the 30 minutes are for. Tomorrow at 10:15 or Thursday at 5:45?"
"Where did you get my number?" → "If I told you I Googled ''best boutique studios in Montreal'' and you came up, would you believe me?"

Still ending? One last question: "Before I go, can I ask one last question? If you could fix one thing about filling your classes, what would it be?"', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('83941ed1-c1cc-41b4-b263-70ac5b0e594f', '28-day cadence', 'Follow-up', 'Day 1: Call + voicemail · email "Missed call" · Instagram follow
Day 2, 3: Call
Day 5: Call + text
Day 7: Call + voicemail · email 2 · Instagram DM
Day 10: Call
Day 13: Call + WhatsApp
Day 18: Call + text + email
Day 23: Call
Day 28: Call + final email

Late text (after ~8 tries): "After 8 tries you''re either super busy or I''m barking up the wrong phone. Is this irrelevant?"
Anyone who says "don''t call again" is marked Do Not Contact the same day.', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('ce10f7f6-b007-4bf8-9d1c-11cbb9901a80', 'Confirmations (show rate)', 'Confirmations', 'Within 2 min: "Great chatting, [name]. Confirmed: [day] at [time] on video, link: [link]. I''ll have your numbers ready. — Vlad, Protocol"
24h before: "Looking forward to tomorrow. I checked out [studio]''s Instagram and already have a couple of ideas for [their problem]." (voice memo works best)
Morning of: "Quick reminder, we''re on at [time] today."
1h before: "See you in an hour, here''s the link: [link]"
No-show (within 10 min): "[Name], I know you didn''t just ghost me like that, I''ve got a whole bowl of tears over here 😄 I''m sure something came up. Same time tomorrow, or a better day this week?" One more soft follow-up max, then move on.

If a slot opens today, call this week''s booked owners and offer it. Same-day calls show best.', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('f2fc5fee-cdc5-4b6d-b4cb-96e7ea0a660b', 'Demo call — rapport, frame & discovery', 'Demo call', 'Goal: a decision, yes or a clean no. The owner talks two-thirds of the time. You ask, they convince themselves. Never answer a detail question you don''t know the right answer to: ask what they were hoping for first.

Before the call (5 minutes): re-read the cold-call notes (their problem, their example, what they tried, budget, partner); open the 07I Member Drive Plan with their name, ready to screen-share; have the Takeover one-pager and two event dates ready. Camera on, eye level, good light, quiet room. Ask at the start before recording: "Mind if I record so I don''t have to take notes?"

1. RAPPORT (under 2 minutes)
"Good to see you, [name]. How''s the week at [studio] going?" One more personal question, then move on.

2. FRAME + AGENDA
"Here''s how I''d like to use our 30 minutes. I''ll ask about the studio and your numbers, then if I think we can help, I''ll show you exactly how. If it makes sense, we can lock it in today. If not, no pressure, you''ll still leave with a plan. Sound good?"
Yes/No/Maybe frame (say it now, before the pitch): "At the end there are really three answers: ''yes, let''s go'', ''no'', which I''m 100% fine with, or ''maybe, let me think''. That last one is usually a polite no, so can we keep it to a yes or a no today?"

3. DISCOVERY: the Roller Coaster — start high (where they want to go), then go low (what''s hurting), then you are the bridge.
— Why now: "What made you want to look at this now?" Restate it: "So it''s really about [reason]."
— Future goal: "Picture it''s three months from now and this worked. What does the studio look like? How full are the classes? What changes for you personally?"
— Bigger goal: "Beyond that, what''s the bigger picture? A second location, stepping back from the desk, the opening?"
— Current struggles: "Where are you today versus that? What have you tried to get there? Why didn''t it work? How long has it been like this?" Dig into every answer: "What do you mean by that?"', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('49516e8a-1398-44dc-b0cc-0236636e5373', 'Demo call — member math & pre-handled objections', 'Demo call', '5. THE MEMBER MATH (screen-share the 07I plan)
"How many members today? What''s your monthly price? How long does a member usually stay?" → "So one new member is worth about $[X] to you."
"How many new members a month do you get now? What does each one cost you?"
"If 10 or 15 guests bought your tonight-only offer and became members, what would that be worth?" Let them say the number.

6. PRE-HANDLE THE OBJECTIONS (the Revolver)
Timing — ask "How soon would you want this to happen?" — prevents "Let''s revisit in a few months"
Commitment — ask "To get that result, your team runs the desk and does 8 promotion actions we write for you: posts, emails and texts to members, class mentions, friend invites and calls. As long as we handle our side, would you be ready to move forward?" — prevents "I need to think about it"
Decision-maker — ask "Is anyone else involved in this decision who should hear this?" — prevents "I need to talk to my partner"
Availability — ask "We''d need your space for one evening and your team for the night. Is that doable in [month]?" — prevents "We''re too busy"
Finances — ask "Just so I scope this right, what are you comfortable investing to fill the room and sell [X] tonight-only offers?" — prevents "I can''t afford it"', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('003a9e6f-f29f-453a-b83f-ad5b94e8c35c', 'Demo call — pitch & close', 'Demo call', '4. TRANSITION (one sentence)
"Based on everything you shared, you want [their goal] and you''ve been stuck on [their pain]. We can definitely help with that. Mind if I show you how we''d do it?"

5. PITCH: 3 PILLARS (Problem → Feature → Solution)
Sell the vacation, not the plane ride. After each pillar: "Does that make sense? Do you feel that would help?" Get the yes before the next one.
— Traffic: "You mentioned [new people don''t walk in]. We take over your studio for one night and turn it into something nobody''s seen there. Your members bring their friends with a Friend Pass, and we promote it on our channels too. What that means is a room full of new faces who''ve never been inside, all in one night."
— Conversion: "You also said [people try but don''t join]. Your team gets a word-for-word closing script, a tonight-only offer and our follow-up texts for 7 days. So people sign up while they''re still buzzing, not three weeks later."
— Proof + referrals: "And you told me [members don''t bring friends / you can''t tell what works]. Every new member gets a friend pass, and at day 30 you get a report: new members, revenue, cost per member. You''ll know exactly what one night brought in."
"That covers everything. Any questions on any of that?"

6. CLOSE: 4 STEPS
1. Exhaust questions. One sentence per answer. Keep going until "No, I think you covered it."
2. Alignment. "Before we get into numbers, do you feel this could get you [their goal] and fix [their problem]?" You need a real yes. A weak yes: "What''s making you hesitate?"
3. Value stack + price, then silence: "For everything: the full Takeover Night, promotion, your closing script, the 7-day follow-up, the referral system, the 30-day content kit, the partner gift bags and the day-30 report, which is about $9,500 if you hired it separately, the founding rate is $3,000. Your part is a short promotion playbook, and we write all of it. If we don''t bring the headcount we agree on and you''ve done your part, your next one is half off. And if you do the full playbook, hit the sales target with code PROTOCOL and let us film your story, $1,000 goes toward your next Takeover." Then stop talking and wait.
4. Assume the close. "Next steps are simple. Most studios pay in full today, that''s $2,850 instead of $3,000, or we split it 20/40/40. Then we pick the date: [date] or [date]?"
When they say yes, stop talking. Send the agreement and payment link while you''re still on video.', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('ba268c96-7d8f-409e-9ab2-f0af819f9b2c', 'Objections — demo call (AAA + Revolver)', 'Objections', 'AAA: Acknowledge (repeat it back) → Associate ("That''s what our best clients ask" or a past-client story) → Advance (a question, never a statement). Start with "Huh. Tell me more about that."
If it still comes up, the Revolver: (1) "Setting that aside, do you still feel this could get you [goal]?" (2) "What specifically stood out to you?" (3) "So when you say [objection], what''s really coming up?" Handle the real one, then assume the close again.

"It''s too expensive." → "Totally fair. Too expensive compared to what, another option, or what you expected to spend? Then: You said 10 new members is worth $[X] to you. What would make $3,000 feel like money well spent?"
"Can you do it cheaper?" → "We could actually go up. (smile) Seriously, what I can do is change how you pay: 20% now, 40% before, 40% after." Never cut the price. If truly out of reach, offer Takeover Coaching: consultation hours where we help their team plan and run its own event.
"I need to think about it." → "Of course, it''s a real investment. You said we''d keep it to a yes or no, so what''s the main thing you''d be thinking about? Let''s work through it now."
"Send me the proposal." → "Absolutely, I''ll send it right after. So I follow up properly, what''s the main thing you''ll be weighing when you read it?"
"I need to talk to my partner." → "Makes total sense. If they were here and asked the one question that could make this a no, what would it be?" Handle it. "Let''s book 15 minutes with all three of us. Tomorrow at 5:15 or 7:45?"
"We tried events, they didn''t work." → "Oh, I don''t hear that often. What exactly didn''t work?" Then show how this one is different: the desk script, the tracked offer, the follow-up.
"Can you guarantee members?" → "Great question, what would a guarantee need to cover for you to feel safe?" Then: we guarantee the headcount and every deliverable, and the Playbook Credit rewards you if you do your part and hit the sales target. On a first event we don''t promise a number of sales: we set a target and show you exactly what the night sold.
"Not now, after the opening / New Year." → "Totally fair. Is there a time that works best? January dates fill first, and I''d hate for you to lose the window."
"I''m talking to other companies." → "Smart, that''s what I''d do. What are you comparing between them? So if we cover all of those, we''d be your pick?"', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "SalesScript" ("id", "title", "category", "body", "sortOrder", "createdAt", "updatedAt") VALUES ('5c728845-b89d-4e71-be8f-b288b3fbdd04', 'When they stall / not a fit / after the call', 'Follow-up', 'WHEN THEY STALL (one question at a time)
1. "What''s your main concern right now?"
2. "What are you most afraid of having happen?"
3. "What would make this an easy yes?"
4. "If price weren''t a factor, would you move forward today?"
5. "From 1 to 10, where are you? What would make it a 10?"
Zoom out: "Let''s zoom out. You want [goal]. We do [this]. What''s actually getting in the way?" → "What would make you feel 100%?"
Best case / worst case: "Worst case, we miss the headcount and your next one is half off. Best case, you open January with a full room and [X] tonight-only offers sold. What''s holding us back?"

WHEN IT''S GENUINELY NOT A FIT (exit cleanly)
"Based on everything you''ve told me, I don''t think the timing is right today. Keep the plan, it''s yours. When [the opening / January] gets close, call me first." Log a follow-up in 6-8 weeks.

AFTER THE CALL
They said yes: within the hour — "[Name], awesome to have you on board, you made a great call. Next: agreement signed today, we pick the concept this week, promotion starts [date]."
No decision, same day: proposal + a text quoting something they said: "Loved hearing about [detail]. That''s exactly the kind of studio we do this best for."
Day 2 morning: "Did you get a chance to look it over? Happy to answer anything."
Day 5-7: "I know you''re thinking it over. [Month] dates are filling, wanted to give you first pick."
Week 2, no reply: a light meme: "Did we lose you?"', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
