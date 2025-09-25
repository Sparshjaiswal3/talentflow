// src/features/assessments/service.js
import { db } from "../../db/dexie";

const draftKey = (jobId, candidateId) => `${jobId}:${candidateId}`;

export async function loadDraft(jobId, candidateId) {
  const key = draftKey(jobId, candidateId);
  const rec = await db.responses_draft.get({ key });
  return rec?.answers || {};
}

export async function saveDraft(jobId, candidateId, answers) {
  const key = draftKey(jobId, candidateId);
  await db.responses_draft.put({
    key,
    jobId,
    candidateId,
    answers,
    updatedAt: Date.now(),
  });
}

export async function clearDraft(jobId, candidateId) {
  const key = draftKey(jobId, candidateId);
  await db.responses_draft.delete(key);
}
