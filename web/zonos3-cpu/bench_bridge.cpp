// Minimal CPU-only C ABI bridge for the pinned audio.cpp ZONOS3-Mini build.
// Copyright (c) 2026 tts-bench contributors.
// audio.cpp and Zyphra-derived code retain their own licenses; see NOTICE.md.
#include "audiocpp.h"

#include <emscripten/emscripten.h>

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <limits>
#include <string>

namespace {
audiocpp_registry * registry = nullptr;
audiocpp_model * model = nullptr;
audiocpp_session * session = nullptr;
audiocpp_result * result = nullptr;
const float * pcm = nullptr;
size_t frames = 0;
int rate = 0;
int channels = 0;
char bridge_error[2048] = {};

void clear_result() {
    if (result != nullptr) audiocpp_result_free(result);
    result = nullptr;
    pcm = nullptr;
    frames = 0;
    rate = 0;
    channels = 0;
}

void close_all() {
    clear_result();
    if (session != nullptr) audiocpp_session_free(session);
    session = nullptr;
    if (model != nullptr) audiocpp_model_free(model);
    model = nullptr;
    if (registry != nullptr) audiocpp_registry_free(registry);
    registry = nullptr;
}

int fail(audiocpp_status status) {
    const char * message = audiocpp_last_error();
    if (message != nullptr && message[0] != '\0') {
        std::snprintf(bridge_error, sizeof(bridge_error), "%s", message);
    } else {
        std::snprintf(bridge_error, sizeof(bridge_error), "audio.cpp returned status %d", static_cast<int>(status));
    }
    return static_cast<int>(status == AUDIOCPP_OK ? AUDIOCPP_ERR_RUNTIME : status);
}

}  // namespace

extern "C" {
EMSCRIPTEN_KEEPALIVE int bench_open(const char * model_path, const char * backend, int threads) {
    close_all();
    bridge_error[0] = '\0';
    if (model_path == nullptr || backend == nullptr || threads < 1 || threads > 16 ||
        std::strcmp(backend, "cpu") != 0) {
        std::snprintf(bridge_error, sizeof(bridge_error), "ZONOS3 CPU bridge requires a model path, CPU backend and 1-16 threads.");
        return static_cast<int>(AUDIOCPP_ERR_INVALID_ARGUMENT);
    }

    const auto registry_status = audiocpp_registry_create(nullptr, &registry);
    if (registry_status != AUDIOCPP_OK) {
        const int code = fail(registry_status);
        close_all();
        return code;
    }

    audiocpp_model_config config{};
    config.family_hint = "zonos3";
    const auto model_status = audiocpp_model_load(registry, model_path, &config, nullptr, &model);
    if (model_status != AUDIOCPP_OK) {
        const int code = fail(model_status);
        close_all();
        return code;
    }

    audiocpp_backend_config provider{"cpu", 0, threads};
    const auto session_status = audiocpp_session_create(model, "tts", "offline", &provider, nullptr, &session);
    if (session_status != AUDIOCPP_OK) {
        const int code = fail(session_status);
        close_all();
        return code;
    }
    return static_cast<int>(AUDIOCPP_OK);
}

EMSCRIPTEN_KEEPALIVE int bench_generate(const char * text, uint32_t seed, int chunk_id) {
    clear_result();
    bridge_error[0] = '\0';
    if (session == nullptr || text == nullptr || text[0] == '\0' || chunk_id < 0 ||
        seed != 42u + static_cast<uint32_t>(chunk_id)) {
        std::snprintf(bridge_error, sizeof(bridge_error), "ZONOS3 CPU synthesis requires nonempty text and seed 42 + zero-based chunk id.");
        return static_cast<int>(AUDIOCPP_ERR_INVALID_ARGUMENT);
    }

    audiocpp_request * request = audiocpp_request_create();
    if (request == nullptr) {
        std::snprintf(bridge_error, sizeof(bridge_error), "Could not allocate audio.cpp request.");
        return static_cast<int>(AUDIOCPP_ERR_RUNTIME);
    }

    audiocpp_status status = audiocpp_request_set_text(request, text, "en_us");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "speaker_embedding_file", "/inputs/Imogen_en-British_F_1.embedding.npy");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "speaker_mode", "embedding");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "text_normalization", "false");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "seed", std::to_string(seed).c_str());
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "max_tokens", "2000");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "temperature", "0.75");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "top_k", "80");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "top_p", "0.69");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "min_p", "0.0");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "repetition_penalty", "2.4");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "repetition_window", "96");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "repetition_codebooks", "6");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "guidance_scale", "1.0");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "silence_prefill_frames", "3");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "headroom_db", "3.0");
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "soft_limit", "true");
    // The harness already supplies the canonical text span. Keep the runtime
    // from splitting that span into additional generation calls.
    if (status == AUDIOCPP_OK) status = audiocpp_request_set_option(request, "text_chunk_size", "20000");

    if (status == AUDIOCPP_OK) status = audiocpp_session_run(session, request, &result);
    if (status == AUDIOCPP_OK) status = audiocpp_result_audio(result, &pcm, &frames, &rate, &channels);
    audiocpp_request_free(request);
    if (status != AUDIOCPP_OK) {
        const int code = fail(status);
        clear_result();
        return code;
    }
    if (pcm == nullptr || frames == 0 || rate != 44100 || channels != 1 ||
        frames > static_cast<size_t>(std::numeric_limits<int>::max())) {
        std::snprintf(bridge_error, sizeof(bridge_error), "audio.cpp returned invalid ZONOS3 mono PCM metadata.");
        clear_result();
        return static_cast<int>(AUDIOCPP_ERR_INVALID_ARGUMENT);
    }
    return static_cast<int>(AUDIOCPP_OK);
}

EMSCRIPTEN_KEEPALIVE const char * bench_error() {
    if (bridge_error[0] != '\0') return bridge_error;
    return audiocpp_last_error();
}
EMSCRIPTEN_KEEPALIVE const float * bench_pcm() { return pcm; }
EMSCRIPTEN_KEEPALIVE int bench_frames() { return static_cast<int>(frames); }
EMSCRIPTEN_KEEPALIVE int bench_rate() { return rate; }
EMSCRIPTEN_KEEPALIVE int bench_channels() { return channels; }
EMSCRIPTEN_KEEPALIVE void bench_clear_result() { clear_result(); }
EMSCRIPTEN_KEEPALIVE void bench_shutdown() { close_all(); }
}
