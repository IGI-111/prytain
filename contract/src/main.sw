contract;

mod noise;

use perlin::fp::compute_perlin;
use std::hash::*;


const ORIGIN: (u32, u32) = (u32::max()/2, u32::max()/2);



enum Terrain {
    Sea: (),
    Coast: (),
    Port: (),
    Ground: (),
}

impl Eq for Terrain {
    fn eq(self, other: Self) -> bool {
        match (self, other) {
            (Terrain::Sea, Terrain::Sea) |
            (Terrain::Coast, Terrain::Coast) |
            (Terrain::Port, Terrain::Port) |
            (Terrain::Ground, Terrain::Ground) => true,
            _ => false,
        }
    }
}

struct Tile {
    pub terrain: Terrain,
    pub altitude: u8,
}

impl Tile {
    fn tile_altitude(x: u32, y: u32) -> u8 {
        const SEED: u32 = 0;
        const SCALE: u32 = 9;
        const OCTAVES: u32 = 5;
        compute_perlin(x, y, SEED, SCALE, OCTAVES)
    }
    pub fn compute(x: u32, y: u32) -> Self {
        const SEED: u32 = 1;
        const SEA_LEVEL: u8 = 150;

        let altitude = Self::tile_altitude(x, y);

        let mut terrain = if altitude < SEA_LEVEL {
            Terrain::Sea
        } else {
            Terrain::Ground
        };


        if terrain == Terrain::Ground {
            // ground with adjascent sea is coastline
            if Self::tile_altitude(x+1, y) < SEA_LEVEL ||
                Self::tile_altitude(x-1, y) < SEA_LEVEL ||
                Self::tile_altitude(x, y+1) < SEA_LEVEL ||
                Self::tile_altitude(x, y-1) < SEA_LEVEL {
                terrain = Terrain::Coast;
            }
        }

        if terrain == Terrain::Coast {

            let mut hasher = Hasher::new();
            (x, y, SEED).hash(hasher);
            let randomness = u256::from(hasher.keccak256()); // TODO: reuse bytes of randomness

            // 1/50 coastline tiles are ports
            if randomness % 50 == 0 {
                terrain = Terrain::Port;
            }
        }
        
        Self { altitude, terrain }
    }
}


abi MyContract {
    fn get_tile(x: u32, y: u32) -> Tile;
    fn get_tile_batch(coords: Vec<(u32, u32)>) -> Vec<Tile>;
    // fn get_perlin(x: u32, y: u32, seed: u32, scale: u32, octaves: u32) -> u8;
    // fn get_perlin_batch(coords: Vec<(u32, u32)>, seed: u32, scale: u32, octaves: u32) -> Vec<u8>;
}

impl MyContract for Contract {
    fn get_tile(x: u32, y: u32) -> Tile {
        Tile::compute(x, y)
    }
    fn get_tile_batch(coords: Vec<(u32, u32)>) -> Vec<Tile> {
        let mut res = Vec::with_capacity(coords.len());
        let mut i = 0;
        while i < coords.len() {
            let c = coords.get(i).unwrap();
            res.push(
                Tile::compute(c.0, c.1)
            );
            i += 1;
        }
        res
    }
    // fn get_perlin(x: u32, y: u32, seed: u32, scale: u32, octaves: u32) -> u8 {
    //     compute_perlin(x, y, seed, scale, octaves)
    // }
    // fn get_perlin_batch(coords: Vec<(u32, u32)>, seed: u32, scale: u32, octaves: u32) -> Vec<u8> {
    //     let mut res = Vec::with_capacity(coords.len());
    //     let mut i = 0;
    //     while i < coords.len() {
    //         let c = coords.get(i).unwrap();
    //         res.push(
    //         );
    //         i += 1;
    //     }
    //     res
    // }
}

