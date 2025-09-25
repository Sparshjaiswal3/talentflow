// src/db/seed.js
import { db } from "./dexie";
import { customAlphabet } from "nanoid";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];
const TAGS = [
  "remote",
  "hybrid",
  "onsite",
  "full-time",
  "intern",
  "hot",
  "priority",
  "referral",
  "react",
  "node",
  "typescript",
  "design",
];

const USERS = [
  "Ananya",
  "Rahul",
  "Priya",
  "Karan",
  "Zoya",
  "Rohit",
  "Meera",
  "Ishaan",
  "Sana",
  "Arjun",
].map((n) => ({ id: n.toLowerCase(), name: n }));

// ----- Helper pools for diversity -----
const FIRST_IN = [
  "Aarav","Vivaan","Reyansh","Ananya","Ishita","Riya","Kabir","Advait","Aditi","Manya",
  "Kunal","Neha","Samir","Ira","Zara","Rehan","Tanvi","Aarya","Kavya","Nisha",
];
const LAST_IN = [
  "Sharma","Gupta","Verma","Singh","Khan","Patel","Malhotra","Bose","Iyer","Nair",
  "Kapoor","Mehta","Bansal","Chopra","Desai","Reddy","Rao","Das","Shetty","Pillai",
];

const FIRST_INTL = [
  "Olivia","Liam","Emma","Noah","Amelia","Mia","Lucas","Sofia","Ethan","Ava",
  "Leo","Chloe","Aria","Mateo","Isabella","Hugo","Eva","Layla","Aiden","Mila",
];
const LAST_INTL = [
  "Johnson","Brown","Garcia","Martinez","Anderson","Clark","Lopez","Hernandez","Lee","Walker",
  "Silva","Kowalski","Novak","Santos","Rossi","Schmidt","Ivanov","Yamamoto","Khan","Nguyen",
];

const EMAIL_PROVIDERS = ["gmail.com","outlook.com","yahoo.com","proton.me","pm.me","mail.com","icloud.com"];
const CITIES = [
  "Bengaluru","Hyderabad","Pune","Gurugram","Mumbai","Chennai","Delhi",
  "Kolkata","Noida","Remote","Amsterdam","Berlin","London","Toronto","Singapore","Sydney"
];

// Job title parts for uniqueness
const JOB_AREAS = [
  "Frontend","Backend","Full-Stack","Mobile","Data","ML","Platform","SRE","Security","QA",
];
const JOB_STACK = [
  "React","Node","TypeScript","Python","Go","Kotlin","Swift","Java","Rust","Vue",
];
const JOB_LEVEL = [
  "Junior","Mid","Senior","Lead","Principal",
];

// Random helpers
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickSome = (arr, nMin = 1, nMax = 3) => {
  const n = Math.max(nMin, Math.min(arr.length, Math.floor(Math.random()*(nMax-nMin+1))+nMin));
  const copy = [...arr];
  const out = new Set();
  while (out.size < n) out.add(copy.splice(Math.floor(Math.random()*copy.length), 1)[0]);
  return Array.from(out);
};
const chance = (p) => Math.random() < p;

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Id helpers for assessments
const qId = () => `q_${nano()}`;
const sId = () => `s_${nano()}`;

// ---------------- Assessments ----------------
function buildAssessmentForJob(title) {
  // base questions (diverse kinds)
  const q1 = { id: qId(), kind: "single", label: "Do you have 2+ years of React?", required: true, options: ["Yes", "No"] };
  const q2 = { id: qId(), kind: "multi", label: "Backend frameworks you’ve used", options: ["Node", "Django", "Spring", "Rails"], required: false };
  const q3 = { id: qId(), kind: "short", label: "Current CTC (LPA)", maxLength: 20, required: true, showIf: { [q1.id]: "Yes" } };
  const q4 = { id: qId(), kind: "long", label: "Describe a hard production bug you fixed", maxLength: 500, required: true };
  const q5 = { id: qId(), kind: "number", label: "Total years of experience", min: 0, max: 40, required: true };
  const q6 = { id: qId(), kind: "file", label: "Resume (PDF)" };
  const q7 = { id: qId(), kind: "short", label: "LinkedIn URL", maxLength: 160 };
  const q8 = { id: qId(), kind: "single", label: "Comfort with TypeScript?", options: ["Beginner", "Intermediate", "Advanced"], required: true };
  const q9 = { id: qId(), kind: "multi", label: "Cloud providers used", options: ["AWS", "GCP", "Azure", "DigitalOcean"] };
  const q10 = { id: qId(), kind: "long", label: "Anything else to add?", maxLength: 400 };

  const q11 = { id: qId(), kind: "single", label: "Open to relocation?", options: ["Yes", "No"], required: true };
  const q12 = { id: qId(), kind: "short", label: "Preferred location", maxLength: 80, showIf: { [q11.id]: "Yes" } };
  const q13 = { id: qId(), kind: "number", label: "Notice period (days)", min: 0, max: 120, required: true };
  const q14 = { id: qId(), kind: "single", label: "Frontend frameworks used", options: ["React", "Vue", "Angular", "Svelte"], required: true };
  const q15 = { id: qId(), kind: "multi", label: "Testing tools", options: ["Jest", "RTL", "Cypress", "Playwright"] };

  return {
    title: `Assessment for ${title}`,
    sections: [
      { id: sId(), title: "Basics", questions: [q1, q2, q3, q4, q5] },
      { id: sId(), title: "Profile & Extras", questions: [q6, q7, q8, q9, q10, q11, q12, q13, q14, q15] },
    ],
  };
}

// ---------------- Seeder ----------------
export async function seedIfEmpty() {
  const [jobsCount, candidatesCount, assessmentsCount] = await Promise.all([
    db.jobs.count(),
    db.candidates.count(),
    db.assessments.count(),
  ]);
  if (jobsCount > 0 && candidatesCount > 0 && assessmentsCount > 0) return;

  const now = Date.now();

  // --------- Jobs (25) with varied titles/tags/status ---------
  const jobs = Array.from({ length: 25 }).map((_, i) => {
    const area = rand(JOB_AREAS);
    const stack = rand(JOB_STACK);
    const level = rand(JOB_LEVEL);
    const title = `${level} ${area} Engineer — ${stack} ${i + 1}`;
    const status = chance(0.22) ? "archived" : "active";
    const tagSet = pickSome(TAGS, 2, 4);
    // bias a bit toward the stack/tag
    if (!tagSet.includes(stack.toLowerCase())) tagSet.push(stack.toLowerCase());

    return {
      id: nano(),
      title,
      slug: slugify(`${title}-${i + 1}`),
      status,
      tags: Array.from(new Set(tagSet)).slice(0, 4),
      order: i,
      createdAt: now - i * 86400000,
      updatedAt: now - i * 86400000,
    };
  });

  // --------- Candidates (1200) — mixed names, providers, location, optional extras ---------
  const providersShuffled = [...EMAIL_PROVIDERS].sort(() => Math.random() - 0.5);

  const candidates = Array.from({ length: 1200 }).map((_, idx) => {
    // Mix Indian + international names for diversity
    const useIntl = chance(0.35);
    const first = useIntl ? rand(FIRST_INTL) : rand(FIRST_IN);
    const last  = useIntl ? rand(LAST_INTL)  : rand(LAST_IN);

    const name = `${first} ${last}`;
    const provider = providersShuffled[idx % providersShuffled.length];
    const noisy = Math.floor(Math.random() * 10000);
    const email = `${first}.${last}${noisy}@${provider}`.toLowerCase();

    const job = rand(jobs);
    const stage = weightedStage();

    // timestamps spread across ~90 days
    const createdAt = now - Math.floor(Math.random() * 90) * 86400000 - Math.floor(Math.random()*86400000);
    const updatedAt = createdAt + Math.floor(Math.random() * (now - createdAt + 1));

    // Optional extras (won't break your UI if unused)
    const location = rand(CITIES);
    const phone = chance(0.35) ? `+91-${7000000000 + Math.floor(Math.random()*2999999999)}` : undefined;
    const linkedin = chance(0.28) ? `https://www.linkedin.com/in/${slugify(first + "-" + last)}-${(noisy % 997) + 3}` : undefined;
    const skills = chance(0.6) ? pickSome(["react","node","ts","python","go","java","aws","gcp","azure","docker","k8s"], 2, 6) : undefined;

    return {
      id: nano(),
      name,
      email,
      stage,
      jobId: job.id,
      createdAt,
      updatedAt,
      // optional extras:
      location,
      phone,
      linkedin,
      skills,
    };
  });

  // --------- Timelines (richer, with ids) ---------
  const timelines = candidates.slice(0, 400).flatMap((c) => {
    const baseAt = c.createdAt - Math.floor(Math.random()*3)*86400000;
    const t1 = { id: nano(), candidateId: c.id, at: baseAt, type: "applied", payload: { jobId: c.jobId } };
    const t2 = chance(0.7)
      ? { id: nano(), candidateId: c.id, at: baseAt + 86400000, type: "note", payload: { text: `Screening planned with @${rand(USERS).id}` } }
      : null;
    const t3 = chance(0.5)
      ? { id: nano(), candidateId: c.id, at: baseAt + 2*86400000, type: "stage", payload: { stage: rand(STAGES) } }
      : null;
    return [t1, t2, t3].filter(Boolean);
  });

  // --------- Assessments (5 jobs) ---------
  const assessments = jobs.slice(0, 5).map((j) => ({
    jobId: j.id,
    schema: buildAssessmentForJob(j.title),
  }));

  // --------- Commit ---------
  await db.transaction(
    "rw",
    db.jobs,
    db.candidates,
    db.timelines,
    db.assessments,
    db.users,
    async () => {
      if (jobsCount === 0) await db.jobs.bulkAdd(jobs);
      if (candidatesCount === 0) await db.candidates.bulkAdd(candidates);
      if ((await db.timelines.count()) === 0) await db.timelines.bulkAdd(timelines);
      if (assessmentsCount === 0) await db.assessments.bulkAdd(assessments);
      if ((await db.users.count()) === 0) await db.users.bulkAdd(USERS);
    }
  );
}

// Weighted stage distribution: more “applied/screen”, fewer “hired/rejected”
function weightedStage() {
  // tuple: [stage, weight]
  const table = [
    ["applied", 28],
    ["screen", 22],
    ["tech", 18],
    ["offer", 10],
    ["hired", 7],
    ["rejected", 15],
  ];
  const total = table.reduce((s, [,w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [stage, w] of table) {
    if ((r -= w) <= 0) return stage;
  }
  return "applied";
}
