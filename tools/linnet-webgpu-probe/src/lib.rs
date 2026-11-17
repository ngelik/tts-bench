use linnet_ops::ops::matmul_mm;

const M: usize = 37;
const K: usize = 64;
const N: usize = 128;
const OUTPUT_LEN: usize = M * N;

static mut OUTPUT: [f32; OUTPUT_LEN] = [0.0; OUTPUT_LEN];

fn left_value(index: usize) -> f32 {
    ((index * 17 % 23) as f32 - 11.0) * 0.03125
}

fn right_value(index: usize) -> f32 {
    ((index * 13 % 19) as f32 - 9.0) * 0.0234375
}

#[no_mangle]
pub extern "C" fn run_linnet_ops_matmul_probe() {
    let lhs: Vec<f32> = (0..M * K).map(left_value).collect();
    let rhs: Vec<f32> = (0..K * N).map(right_value).collect();
    let mut output = vec![0.0; OUTPUT_LEN];
    matmul_mm(&lhs, &rhs, M, K, N, &mut output);
    unsafe { OUTPUT.copy_from_slice(&output); }
}

#[no_mangle]
pub extern "C" fn linnet_ops_probe_output_ptr() -> *const f32 {
    core::ptr::addr_of!(OUTPUT).cast()
}

#[no_mangle]
pub extern "C" fn linnet_ops_probe_output_len() -> u32 {
    OUTPUT_LEN as u32
}
