export async function createInferenceSessionsSequentially(models, createSession, sessions = []) {
  for (const model of models) sessions.push(await createSession(model));
  return sessions;
}
