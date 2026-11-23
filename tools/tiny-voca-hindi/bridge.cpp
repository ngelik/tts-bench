// Browser transport for RL10x's Apache-2.0 Hindi C++ engine.
// The speech plan follows upstream cpp/src/main.cpp (speak_text).
#include <algorithm>
#include <cmath>
#include <exception>
#include <functional>
#include <memory>
#include <string>
#include <vector>
#include <emscripten/emscripten.h>

#include "g2p.h"
#include "tts.h"

namespace {
std::unique_ptr<TtsModel> model;
std::unique_ptr<HindiG2P> frontend;
std::vector<float> pcm;
std::string error;

std::vector<float> speak(const std::string& text) {
    const int limit = model->max_tokens() - 12;
    std::vector<std::vector<float>> sentences;
    std::function<void(const std::string&)> read = [&](const std::string& piece) {
        Phonemized tokens;
        try {
            tokens = frontend->phonemize(piece);
        } catch (const NothingToPronounce&) {
            return;
        }
        if (int(tokens.ids.size()) <= limit) {
            try {
                TtsOptions options;
                options.seed = sentences.size();
                sentences.push_back(model->synthesize(tokens.ids, tokens.stress, options));
                return;
            } catch (const UtteranceTooLong&) {
                // Use the upstream recursive split when acoustic frames overflow.
            }
        }
        const auto parts = shorter(piece);
        if (parts.empty()) throw std::runtime_error("one word is too long to speak");
        for (const auto& part : parts) read(part);
    };
    for (const auto& sentence : split_sentences(finished(text))) read(sentence);
    if (sentences.empty()) throw NothingToPronounce("nothing in the text could be read (Devanagari only)");
    std::vector<float> result;
    for (const auto& sentence : sentences) result.insert(result.end(), sentence.begin(), sentence.end());
    float loudest = 0;
    for (float sample : result) loudest = std::max(loudest, std::fabs(sample));
    if (loudest > 0.99f) for (float& sample : result) sample *= 0.99f / loudest;
    return result;
}
}

extern "C" {
EMSCRIPTEN_KEEPALIVE int hindi_load(const char* path) {
    try {
        auto candidate = TtsModel::load(path, 1);
        if (candidate->styles().empty() || candidate->styles().front() != "neutral") {
            throw std::runtime_error("expected neutral style at index zero");
        }
        frontend = std::make_unique<HindiG2P>(candidate->symbols());
        model = std::move(candidate);
        return model->sample_rate();
    } catch (const std::exception& failure) {
        error = failure.what();
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE int hindi_speak(const char* text) {
    try {
        if (!model) throw std::runtime_error("Hindi model is not loaded");
        pcm = speak(text);
        return pcm.size();
    } catch (const std::exception& failure) {
        pcm.clear();
        error = failure.what();
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE const float* hindi_pcm() { return pcm.data(); }
EMSCRIPTEN_KEEPALIVE const char* hindi_error() { return error.c_str(); }
}
