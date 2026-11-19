"""Add observation-only frontend exports to a disposable pinned Kokopop build.

The ordinary runtime has already been copied and hash-checked before this runs.
No branch condition, token decision, preprocessing or inference code is changed.
"""
from pathlib import Path
import sys
source = Path(sys.argv[1])
header = source / 'src/arch/sanotts/sano_tokenizer.h'
with header.open('a') as file:
    file.write('''\nnamespace kokopop::sano {
struct FrontendAuditSkip { std::string symbol; bool missing; bool special; bool framing; };
void begin_frontend_audit();
std::vector<FrontendAuditSkip> finish_frontend_audit();
}\n''')
p = source / 'src/arch/sanotts/sano_tokenizer.cpp'
s = p.read_text()
needle = 'namespace kokopop::sano {\nnamespace {'
assert s.count(needle) == 1
s = s.replace(needle, '''namespace kokopop::sano {
static bool frontend_audit_active = false;
static std::vector<FrontendAuditSkip> frontend_audit_skips;
void begin_frontend_audit() { frontend_audit_skips.clear(); frontend_audit_active = true; }
std::vector<FrontendAuditSkip> finish_frontend_audit() { frontend_audit_active = false; return frontend_audit_skips; }
namespace {''')
for symbol in ['symbol','ch']:
    needle = f'if (id == nullptr || table.is_special({symbol}) || table.is_framing_id(*id)) {{\n            continue;'
    assert s.count(needle) == 1
    s = s.replace(needle, f'''if (id == nullptr || table.is_special({symbol}) || table.is_framing_id(*id)) {{
            if (frontend_audit_active) frontend_audit_skips.push_back({{std::string({symbol}), id == nullptr, table.is_special({symbol}), id != nullptr && table.is_framing_id(*id)}});
            continue;''')
p.write_text(s)
p = source / 'src/kokopop.cpp'
s = p.read_text()
s = '#include "arch/sanotts/sano_arch.h"\n#include <yyjson.h>\n' + s
s += r'''
// Diagnostic-only: invoke the same LONG_FORM frontend, never an inference graph.
extern "C" const char * kokopop_frontend_audit(kokopop_model * handle, const char * text, const char * voice) {
    static std::string encoded;
    auto * doc = yyjson_mut_doc_new(nullptr);
    auto * root = yyjson_mut_obj(doc);
    yyjson_mut_doc_set_root(doc, root);
    std::string error;
    kokopop::VoiceFrontend frontend;
    auto add_skips = [&](yyjson_mut_val * parent, const char * key, const std::vector<kokopop::sano::FrontendAuditSkip> & skips) {
        auto * array = yyjson_mut_arr(doc);
        for (const auto & skip : skips) {
            auto * object = yyjson_mut_obj(doc);
            yyjson_mut_obj_add_strcpy(doc, object, "symbol", skip.symbol.c_str());
            yyjson_mut_obj_add_bool(doc, object, "missing", skip.missing);
            yyjson_mut_obj_add_bool(doc, object, "special", skip.special);
            yyjson_mut_obj_add_bool(doc, object, "framing", skip.framing);
            yyjson_mut_arr_append(array, object);
        }
        yyjson_mut_obj_add_val(doc, parent, key, array);
    };
    bool ok = handle && handle->impl && kokopop::make_voice_frontend(*handle->impl, voice ? voice : "", frontend, error);
    if (ok && handle->impl->arch->arch() == kokopop::Arch::SanoTTS) {
        auto & model = *handle->impl;
        auto & arch = static_cast<kokopop::SanoArch &>(*model.arch);
        const auto * selected = arch.voice_for(frontend.voice);
        const auto config = arch.adjust_chunk_config(kokopop::make_long_form_config(), frontend.voice);
        kokopop::sano::begin_frontend_audit();
        const auto chunks = kokopop::chunk_text(text ? text : "", config, frontend.phonemize, frontend.tokenize, frontend.style_tag, error);
        add_skips(root, "planningPassSkips", kokopop::sano::finish_frontend_audit());
        ok = !chunks.empty() && error.empty() && selected;
        auto * array = yyjson_mut_arr(doc);
        for (const auto & chunk : chunks) {
            auto * row = yyjson_mut_obj(doc);
            yyjson_mut_obj_add_strcpy(doc, row, "text", chunk.text.c_str());
            yyjson_mut_obj_add_strcpy(doc, row, "phonemes", chunk.phonemes.c_str());
            kokopop::sano::begin_frontend_audit();
            std::vector<uint32_t> repeated;
            const bool tokenized = frontend.tokenize(chunk.phonemes, repeated, error);
            add_skips(row, "finalTokenizationSkips", kokopop::sano::finish_frontend_audit());
            const bool equal = tokenized && repeated == chunk.tokens;
            ok = ok && equal;
            yyjson_mut_obj_add_bool(doc, row, "matchesInferenceTokens", equal);
            auto * tokens = yyjson_mut_arr(doc);
            for (const auto token : chunk.tokens) yyjson_mut_arr_add_uint(doc, tokens, token);
            yyjson_mut_obj_add_val(doc, row, "tokens", tokens);
            if (selected) {
                for (const auto & component : {std::make_pair("duration", selected->dur.vocab), std::make_pair("acoustic", selected->ac.vocab)}) {
                    std::vector<uint32_t> clamped;
                    const bool valid = kokopop::sano::clamp_ids_to_vocab(chunk.tokens, component.second, selected->tokens, component.first, clamped, error);
                    ok = ok && valid;
                    auto * replacements = yyjson_mut_arr(doc);
                    for (size_t index = 0; valid && index < clamped.size(); ++index) {
                        if (clamped[index] == chunk.tokens[index]) continue;
                        auto * replacement = yyjson_mut_obj(doc);
                        yyjson_mut_obj_add_uint(doc, replacement, "index", index);
                        yyjson_mut_obj_add_uint(doc, replacement, "originalId", chunk.tokens[index]);
                        yyjson_mut_obj_add_uint(doc, replacement, "replacementId", clamped[index]);
                        yyjson_mut_arr_append(replacements, replacement);
                    }
                    yyjson_mut_obj_add_val(doc, row, component.first, replacements);
                }
            }
            yyjson_mut_arr_append(array, row);
        }
        yyjson_mut_obj_add_val(doc, root, "chunks", array);
        yyjson_mut_obj_add_strcpy(doc, root, "voice", frontend.voice.name.c_str());
        yyjson_mut_obj_add_uint(doc, root, "sampleRate", frontend.voice.sample_rate);
    } else {
        ok = false;
        if (error.empty()) error = "Expected a loaded Sano model";
    }
    yyjson_mut_obj_add_bool(doc, root, "ok", ok);
    yyjson_mut_obj_add_strcpy(doc, root, "error", error.c_str());
    char * json = yyjson_mut_write(doc, 0, nullptr);
    encoded = json ? json : "{\"ok\":false,\"error\":\"JSON encoding failed\"}";
    std::free(json);
    yyjson_mut_doc_free(doc);
    return encoded.c_str();
}
'''
p.write_text(s)
p=source/'web/bindings.cpp'
with p.open('a') as file:
    file.write('''\nextern "C" const char * kokopop_frontend_audit(kokopop_model *, const char *, const char *);
extern "C" EMSCRIPTEN_KEEPALIVE const char * kp_frontend_audit(kokopop_model * model, const char * text, const char * voice) {
    return kokopop_frontend_audit(model, text, voice);
}\n''')
