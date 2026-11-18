/** Close a successful engine response or expose a post-start inference failure to its stream reader. */
export function finishEngineResponse(pending, error) {
  if (!pending) return;
  if (error !== undefined && error !== null) {
    const failure = error instanceof Error ? error : new Error(String(error));
    if (pending.controller) {
      try { pending.controller.error(failure); }
      catch { /* a concurrent abort already closed or errored this stream */ }
    }
    else pending.reject(failure);
  } else if (pending.controller) {
    try { pending.controller.close(); }
    catch { /* a concurrent abort already closed or errored this stream */ }
  }
}

export function failEngineResponses(pendingResponses, error) {
  const failure = error instanceof Error ? error : new Error(String(error));
  for (const [id, pending] of pendingResponses) {
    finishEngineResponse(pending, failure.message);
    pendingResponses.delete(id);
  }
}
