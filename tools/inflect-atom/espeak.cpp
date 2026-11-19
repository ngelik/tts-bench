// Browser binding for pinned eSpeak NG 1.52.0. GPL-3.0-or-later.
#include <espeak-ng/speak_lib.h>
#include <string>
extern "C" {
int atom_espeak_init() {
    int rate = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, "/data", 0);
    if (rate <= 0) return -1;
    return espeak_SetVoiceByName("en-us");
}
const char* atom_espeak(const char* input) {
    static std::string result;
    result.clear();
    const void* position = input;
    while (position) {
        const char* phones = espeak_TextToPhonemes(&position, 1, 0x02 | (1 << 7) | (0x361 << 8));
        if (!phones) return nullptr;
        if (!result.empty()) result += " ";
        result += phones;
    }
    return result.c_str();
}
}
