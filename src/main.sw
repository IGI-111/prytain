contract;

use perlin::compute_perlin;

abi MyContract {
    fn get_perlin(x: u32, y: u32) -> (u64, u64);
}

impl MyContract for Contract {
    fn get_perlin(x: u32, y: u32) -> (u64, u64) {
        let p = compute_perlin(x, y, 0, 10);
        (p.upper(), p.lower())
    }
}
