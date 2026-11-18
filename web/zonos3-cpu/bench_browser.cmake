# Source-built CPU-only browser bridge for the upstream audio.cpp ZONOS3 port.
add_executable(bench_zonos3_cpu web/zonos3-cpu/bench_bridge.cpp src/capi/audiocpp.cpp)
target_include_directories(bench_zonos3_cpu PRIVATE include)
target_link_libraries(bench_zonos3_cpu PRIVATE engine_runtime ggml)
target_link_options(bench_zonos3_cpu PRIVATE
  "-sASSERTIONS=1" "--no-entry"
  "-sMODULARIZE=1" "-sEXPORT_NAME=createZonos3Cpu" "-sENVIRONMENT=worker"
  "-sINVOKE_RUN=0" "-sALLOW_MEMORY_GROWTH=1" "-sINITIAL_MEMORY=268435456"
  "-sMAXIMUM_MEMORY=4294967296" "-sGROWABLE_ARRAYBUFFERS=1" "-sSTACK_SIZE=8388608"
  "-sPTHREAD_POOL_SIZE=12" "-sPTHREAD_POOL_SIZE_STRICT=2"
  "-sFORCE_FILESYSTEM=1" "-sEXPORTED_RUNTIME_METHODS=ccall,FS,HEAPF32"
  "-sEXPORTED_FUNCTIONS=_bench_open,_bench_generate,_bench_error,_bench_pcm,_bench_frames,_bench_rate,_bench_channels,_bench_clear_result,_bench_shutdown")
