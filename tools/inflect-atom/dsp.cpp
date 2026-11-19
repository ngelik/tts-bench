// Atom's harmonic/noise renderer, ported from the pinned Apache-2.0 source.
// Floating-point contraction is disabled by the reproducible build command.
#include <algorithm>
#include <cmath>
#include <complex>
#include <cstdint>
#include <random>
#include <vector>

namespace {
constexpr int rate = 24000;
constexpr int hop = 300;
constexpr int fft_size = 1024;
constexpr double pi = 3.14159265358979323846;

float interpolate(const float* values, int frames, int bands, int sample, int band) {
    float position = static_cast<float>(sample) / static_cast<float>(hop);
    int left = std::min(static_cast<int>(std::floor(position)), frames - 1);
    int right = std::min(left + 1, frames - 1);
    float alpha = position - static_cast<float>(left);
    return values[left * bands + band] * (1.0f - alpha) + values[right * bands + band] * alpha;
}

float mel_position(float frequency, int bands) {
    float maximum = static_cast<float>(2595.0 * std::log10(1.0 + (rate / 2.0) / 700.0));
    float mel = 2595.0f * std::log10(1.0f + std::max(frequency, 0.0f) / 700.0f);
    return std::clamp(mel / maximum * static_cast<float>(bands - 1), 0.0f, static_cast<float>(bands - 1));
}

void fft(std::vector<std::complex<float>>& values, bool inverse) {
    static const std::vector<std::complex<float>> rotations = [] {
        std::vector<std::complex<float>> table(fft_size / 2);
        for (int index = 0; index < fft_size / 2; ++index) {
            double angle = -2.0 * pi * index / fft_size;
            table[index] = {static_cast<float>(std::cos(angle)), static_cast<float>(std::sin(angle))};
        }
        return table;
    }();
    for (int index = 1, reverse = 0; index < fft_size; ++index) {
        int bit = fft_size >> 1;
        for (; reverse & bit; bit >>= 1) reverse ^= bit;
        reverse ^= bit;
        if (index < reverse) std::swap(values[index], values[reverse]);
    }
    for (int length = 2; length <= fft_size; length <<= 1) {
        for (int start = 0; start < fft_size; start += length) {
            for (int offset = 0; offset < length / 2; ++offset) {
                auto rotation = rotations[offset * (fft_size / length)];
                if (inverse) rotation = std::conj(rotation);
                auto even = values[start + offset];
                auto odd = values[start + offset + length / 2] * rotation;
                values[start + offset] = even + odd;
                values[start + offset + length / 2] = even - odd;
            }
        }
    }
    if (inverse) for (auto& value : values) value /= static_cast<float>(fft_size);
}
}

extern "C" {
// The port uses a specified MT19937/polar Gaussian stream on both browser
// providers. Export parity passes identical supplied noise to both renderers.
void atom_noise(float* output, int samples, uint32_t seed) {
    std::mt19937 generator(seed);
    int offset = 0;
    while (offset < samples) {
        double left = 2.0 * (static_cast<double>(generator()) + 0.5) / 4294967296.0 - 1.0;
        double right = 2.0 * (static_cast<double>(generator()) + 0.5) / 4294967296.0 - 1.0;
        double radius = left * left + right * right;
        if (radius <= 0.0 || radius >= 1.0) continue;
        double scale = std::sqrt(-2.0 * std::log(radius) / radius);
        output[offset++] = static_cast<float>(left * scale);
        if (offset < samples) output[offset++] = static_cast<float>(right * scale);
    }
}

int atom_render(const float* f0, const float* voiced, const float* harmonic,
                const float* noise_log, const float* noise, const float* theta,
                const float* fir, int frames, float f0_mean, float f0_std, float* output) {
    if (frames < 2 || frames > 4096) return 1;
    int samples = frames * hop;
    std::vector<float> waveform(samples);
    double cumulative_frequency = 0.0;
    for (int sample = 0; sample < samples; ++sample) {
        float fundamental = std::clamp(std::exp(interpolate(f0, frames, 1, sample, 0) * f0_std + f0_mean), 20.0f, rate * 0.45f);
        cumulative_frequency += fundamental;
        float phase;
        if (samples > 32768) {
            phase = static_cast<float>(std::fmod((cumulative_frequency - fundamental) * (2.0 * pi / rate), 2.0 * pi));
        } else {
            float prefix = static_cast<float>(cumulative_frequency) - fundamental;
            phase = std::fmod(prefix * static_cast<float>(2.0 * pi / rate), static_cast<float>(2.0 * pi));
        }
        float total = 0.0f;
        for (int harmonic_index = 0; harmonic_index < 80; ++harmonic_index) {
            float order = static_cast<float>(harmonic_index + 1);
            float frequency = fundamental * order;
            if (frequency > 0.95f * rate / 2.0f) continue;
            float position = mel_position(frequency, 40);
            int lower = static_cast<int>(std::floor(position));
            int upper = std::min(lower + 1, 39);
            float alpha = position - lower;
            float low = std::clamp(interpolate(harmonic, frames, 40, sample, lower), -12.0f, 6.0f);
            float high = std::clamp(interpolate(harmonic, frames, 40, sample, upper), -12.0f, 6.0f);
            float gain = std::exp(low * (1.0f - alpha) + high * alpha);
            total += std::sin(phase * order + theta[harmonic_index]) * gain;
        }
        float probability = 1.0f / (1.0f + std::exp(-interpolate(voiced, frames, 1, sample, 0)));
        waveform[sample] = total * probability;
    }
    std::vector<float> window(fft_size);
    for (int index = 0; index < fft_size; ++index) {
        window[index] = 0.5f - 0.5f * std::cos(static_cast<float>(2.0 * pi * index / fft_size));
    }
    std::vector<float> accumulated(samples + fft_size, 0.0f);
    std::vector<float> normalization(samples + fft_size, 0.0f);
    std::vector<std::complex<float>> spectrum(fft_size);
    for (int frame = 0; frame <= frames; ++frame) {
        for (int index = 0; index < fft_size; ++index) {
            int source = frame * hop + index - fft_size / 2;
            if (source < 0) source = -source;
            if (source >= samples) source = 2 * samples - 2 - source;
            spectrum[index] = {noise[source] * window[index], 0.0f};
        }
        fft(spectrum, false);
        const float* envelope = noise_log + std::min(frame, frames - 1) * 24;
        for (int bin = 0; bin <= fft_size / 2; ++bin) {
            float position = mel_position(static_cast<float>(bin) * rate / fft_size, 24);
            int lower = static_cast<int>(std::floor(position));
            int upper = std::min(lower + 1, 23);
            float alpha = position - lower;
            float gain = std::exp(std::clamp(envelope[lower], -12.0f, 6.0f) * (1.0f - alpha) + std::clamp(envelope[upper], -12.0f, 6.0f) * alpha);
            spectrum[bin] *= gain;
            if (bin > 0 && bin < fft_size / 2) spectrum[fft_size - bin] = std::conj(spectrum[bin]);
        }
        fft(spectrum, true);
        for (int index = 0; index < fft_size; ++index) {
            int destination = frame * hop + index;
            accumulated[destination] += spectrum[index].real() * window[index];
            normalization[destination] += window[index] * window[index];
        }
    }
    for (int sample = 0; sample < samples; ++sample) {
        int index = sample + fft_size / 2;
        if (normalization[index] <= 0.0f) return 2;
        waveform[sample] += accumulated[index] / normalization[index];
    }
    for (int sample = 0; sample < samples; ++sample) {
        float total = 0.0f;
        for (int tap = 0; tap < 65; ++tap) {
            int index = sample + tap - 32;
            if (index >= 0 && index < samples) total += waveform[index] * fir[tap];
        }
        output[sample] = total;
        if (!std::isfinite(total) || std::abs(total) >= 1.0f) return 3;
    }
    return 0;
}
}
