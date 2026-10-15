export function currentPlanJob(chat) {
  const latest = chat.plans.at(-1);
  return chat.jobs.findLast((job) => job.planId === latest?.id) || null;
}

export function transcriptMatchesPlan(plan, chat, unsentMessage = "") {
  return Boolean(
    plan &&
    chat &&
    !unsentMessage.trim() &&
    plan.messageRevision === chat.messages.length,
  );
}
