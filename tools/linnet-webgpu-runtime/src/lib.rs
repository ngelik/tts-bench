use core::alloc::Layout;
use core::ffi::c_void;
use core::ptr::{addr_of, addr_of_mut, null_mut};
use std::alloc::{alloc, dealloc};
use std::slice;

use linnet_tts::{Linnet, Session, SynthParams, VoiceLatents};

static mut MODEL: *mut Linnet = null_mut();
static mut VOICE: *mut VoiceLatents = null_mut();
static mut SESSION: *mut Session<'static> = null_mut();
static mut OUTPUT: Vec<f32> = Vec::new();
static mut ERROR: Vec<u8> = Vec::new();

fn set_error(message: impl AsRef<str>) {
    unsafe {
        let error = &mut *addr_of_mut!(ERROR);
        error.clear();
        error.extend_from_slice(message.as_ref().as_bytes());
    }
}

fn clear_error() {
    unsafe { (&mut *addr_of_mut!(ERROR)).clear(); }
}

unsafe fn input_bytes<'a>(pointer: *const u8, length: usize) -> Result<&'a [u8], &'static str> {
    if pointer.is_null() || length == 0 {
        return Err("input buffer is empty");
    }
    Ok(slice::from_raw_parts(pointer, length))
}

#[no_mangle]
pub extern "C" fn lt_alloc(length: usize) -> *mut c_void {
    if length == 0 {
        return null_mut();
    }
    let Ok(layout) = Layout::from_size_align(length, 16) else {
        return null_mut();
    };
    unsafe { alloc(layout).cast() }
}

#[no_mangle]
pub unsafe extern "C" fn lt_free(pointer: *mut c_void, length: usize) {
    if pointer.is_null() || length == 0 {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(length, 16) {
        dealloc(pointer.cast(), layout);
    }
}

#[no_mangle]
pub unsafe extern "C" fn lt_load(
    weights_pointer: *const u8,
    weights_length: usize,
    tokenizer_pointer: *const u8,
    tokenizer_length: usize,
) -> i32 {
    clear_error();
    let result = (|| {
        let weights = input_bytes(weights_pointer, weights_length)?.to_vec();
        let tokenizer = input_bytes(tokenizer_pointer, tokenizer_length)?;
        let model = Linnet::from_bytes(weights, tokenizer).map_err(|error| error.to_string())?;
        model.set_threads(1);
        let model_pointer = Box::into_raw(Box::new(model));
        if !(*addr_of!(SESSION)).is_null() {
            drop(Box::from_raw(*addr_of!(SESSION)));
            *addr_of_mut!(SESSION) = null_mut();
        }
        if !(*addr_of!(VOICE)).is_null() {
            drop(Box::from_raw(*addr_of!(VOICE)));
            *addr_of_mut!(VOICE) = null_mut();
        }
        if !(*addr_of!(MODEL)).is_null() {
            drop(Box::from_raw(*addr_of!(MODEL)));
        }
        *addr_of_mut!(MODEL) = model_pointer;
        Ok::<(), String>(())
    })();
    match result {
        Ok(()) => 0,
        Err(error) => { set_error(error); -1 }
    }
}

#[no_mangle]
pub unsafe extern "C" fn lt_voice(pointer: *const u8, length: usize) -> i32 {
    clear_error();
    let result = (|| {
        let bytes = input_bytes(pointer, length).map_err(|error| error.to_owned())?;
        let voice = VoiceLatents::from_npy_bytes(bytes).map_err(|error| error.to_string())?;
        let voice_pointer = Box::into_raw(Box::new(voice));
        if !(*addr_of!(VOICE)).is_null() {
            drop(Box::from_raw(*addr_of!(VOICE)));
        }
        *addr_of_mut!(VOICE) = voice_pointer;
        Ok::<(), String>(())
    })();
    match result {
        Ok(()) => 1,
        Err(error) => { set_error(error); -1 }
    }
}

#[no_mangle]
pub unsafe extern "C" fn lt_start(
    voice_id: i32,
    text_pointer: *const u8,
    text_length: usize,
    temperature: f32,
    cfg: f32,
    seed: u32,
) -> i32 {
    clear_error();
    if voice_id != 1 || (*addr_of!(MODEL)).is_null() || (*addr_of!(VOICE)).is_null() {
        set_error("model or preset voice is not loaded");
        return -1;
    }
    let result = (|| {
        let text = std::str::from_utf8(input_bytes(text_pointer, text_length)?).map_err(|error| error.to_string())?;
        if !(*addr_of!(SESSION)).is_null() {
            drop(Box::from_raw(*addr_of!(SESSION)));
            *addr_of_mut!(SESSION) = null_mut();
        }
        let model: &'static Linnet = &*(*addr_of!(MODEL));
        let voice = &*(*addr_of!(VOICE));
        let params = SynthParams { temp: temperature, cfg, seed: seed as u64, threads: 1, ..SynthParams::default() };
        let mut session = Session::new(model, voice, params).map_err(|error| error.to_string())?;
        session.prime(text).map_err(|error| error.to_string())?;
        *addr_of_mut!(SESSION) = Box::into_raw(Box::new(session));
        Ok::<(), String>(())
    })();
    match result {
        Ok(()) => 0,
        Err(error) => { set_error(error); -1 }
    }
}

#[no_mangle]
pub unsafe extern "C" fn lt_step() -> i32 {
    clear_error();
    if (*addr_of!(SESSION)).is_null() {
        set_error("no active Linnet synthesis session");
        return -1;
    }
    match (&mut *(*addr_of_mut!(SESSION))).step() {
        Some(chunk) => {
            let output = &mut *addr_of_mut!(OUTPUT);
            output.clear();
            output.extend_from_slice(chunk);
            output.len() as i32
        }
        None => 0,
    }
}

#[no_mangle]
pub unsafe extern "C" fn lt_chunk_ptr() -> *const f32 {
    (&*addr_of!(OUTPUT)).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn lt_sample_rate() -> u32 {
    if (*addr_of!(MODEL)).is_null() { 0 } else { (&*(*addr_of!(MODEL))).sample_rate() }
}

#[no_mangle]
pub unsafe extern "C" fn lt_error_ptr() -> *const u8 {
    (&*addr_of!(ERROR)).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn lt_error_len() -> usize {
    (&*addr_of!(ERROR)).len()
}

#[no_mangle]
pub unsafe extern "C" fn lt_dispose() {
    if !(*addr_of!(SESSION)).is_null() { drop(Box::from_raw(*addr_of!(SESSION))); }
    if !(*addr_of!(VOICE)).is_null() { drop(Box::from_raw(*addr_of!(VOICE))); }
    if !(*addr_of!(MODEL)).is_null() { drop(Box::from_raw(*addr_of!(MODEL))); }
    *addr_of_mut!(SESSION) = null_mut();
    *addr_of_mut!(VOICE) = null_mut();
    *addr_of_mut!(MODEL) = null_mut();
    (&mut *addr_of_mut!(OUTPUT)).clear();
    clear_error();
}
