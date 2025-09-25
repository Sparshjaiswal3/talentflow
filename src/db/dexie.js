// src/db/dexie.js
import Dexie from "dexie";

export const db = new Dexie("talentflow");

// v1
db.version(1).stores({
  jobs: "id, slug, status, order",
  candidates: "id, email, stage, jobId",
  timelines: "++id, candidateId, at",
  assessments: "jobId",
  responses: "++id, jobId, candidateId, submittedAt",
  users: "id",
});

// v2: drafts (compound via synthetic key)
db.version(2).stores({
  responses_draft: "&key, jobId, candidateId", // key = `${jobId}:${candidateId}`
}).upgrade(async (_tx) => {
  // nothing to migrate
});
