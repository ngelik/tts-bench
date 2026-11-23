cmake_minimum_required(VERSION 3.20)
project(benchmark_hindi LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
add_subdirectory("${GGML_SOURCE}" ggml EXCLUDE_FROM_ALL)

add_executable(benchmark-hindi
    bridge.cpp
    "${HINDI_SOURCE}/tts.cpp"
    "${HINDI_SOURCE}/g2p.cpp"
    "${HINDI_SOURCE}/synth.cpp")
target_include_directories(benchmark-hindi PRIVATE "${HINDI_SOURCE}")
target_link_libraries(benchmark-hindi PRIVATE ggml)
set_target_properties(benchmark-hindi PROPERTIES SUFFIX ".mjs")
target_link_options(benchmark-hindi PRIVATE
    -fwasm-exceptions -msimd128
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker
    -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1
    "-sEXPORTED_RUNTIME_METHODS=ccall,FS,HEAPF32,UTF8ToString")
