export async function createKleinSessionsSequentially(ort, encoderBytes, decoderBytes, options) {
  let encoder;
  try {
    encoder = await ort.InferenceSession.create(encoderBytes, options);
    const decoder = await ort.InferenceSession.create(decoderBytes, options);
    return { encoder, decoder };
  } catch (error) {
    try { await encoder?.release(); } catch {}
    throw error;
  }
}
