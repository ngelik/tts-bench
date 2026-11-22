// Browser binding for the eSpeak NG 1.52.0 quiet phoneme trace. GPL-3.0-or-later.
#include <espeak-ng/speak_lib.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *trace;

static int discard_audio(short *wave, int size, espeak_EVENT *events) {
    (void)wave;
    (void)size;
    (void)events;
    return 0;
}

int bench_espeak_init(const char *data_parent) {
    const int rate = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, data_parent, 0);
    if (rate <= 0) return -1;
    espeak_SetSynthCallback(discard_audio);
    return espeak_SetVoiceByName("en-us");
}

const char *bench_espeak_version(void) {
    return espeak_Info(NULL);
}

const char *bench_espeak_trace(const char *text) {
    if (!text) return NULL;
    free(trace);
    trace = NULL;
    size_t size = 0;
    FILE *stream = open_memstream(&trace, &size);
    if (!stream) return NULL;
    espeak_SetPhonemeTrace(2 | ('_' << 8), stream);
    const espeak_ERROR status = espeak_Synth(text, strlen(text) + 1, 0, POS_CHARACTER, 0,
                                            espeakCHARS_AUTO | espeakPHONEMES | espeakENDPAUSE,
                                            NULL, NULL);
    const espeak_ERROR finished = espeak_Synchronize();
    espeak_SetPhonemeTrace(0, NULL);
    const int closed = fclose(stream);
    if (status != EE_OK || finished != EE_OK || closed != 0) return NULL;
    return trace;
}

void bench_espeak_dispose(void) {
    espeak_Terminate();
    free(trace);
    trace = NULL;
}
