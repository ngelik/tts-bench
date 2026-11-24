# Tiny Voca Uzbek Navoiy frontend notice

The browser frontend is an Apache-2.0 JavaScript port of the exact Uzbek
normalization, inference sentence splitting and phonemization shipped in
Inomjonov's `tiny-voca-uzbek-navoiy` model revision
`3d960bd05c728b21fff4ec5154cada7f6b082df1`. Its Tiny Voca model implementation
is adapted from Muhammed Nazeem's Apache-2.0 Tiny Voca source at
`62e2adef158bc997042cc6234f541f1e0e4cd55d`. The exact browser port and generated
tables are pinned by SHA-256 in `web/adapters/tiny-voca-uz-profile.mjs`.

The exported FP32 graph and M2 voice are model assets, not MIT harness code.
The model card attributes the model to the publisher and says that synthetic
training speech was generated with Aisha AI's Navoiy TTS from Common Voice
Uzbek and project-authored prompts. Preserve that provenance in any authorized
audio example. This notice does not grant rights to distribute audio or infer
speaker consent beyond the published model terms.
