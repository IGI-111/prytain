contract;

// use perlin::fp::compute_perlin;
use std::hash::*;
use std::block::timestamp;
use std::array_conversions::b256::*;

const ORIGIN: (u32, u32) = (u32::max()/2, u32::max()/2);

enum Order {
    Goto: (u32, u32),
}

struct Ship {
    origin: (u32, u32),
    embark_timestamp: u64,
    order: Order
}

impl Ship {
    pub fn current_position(self) -> (u32, u32) {
        let now = timestamp();
        let speed = 1; // in tiles per second
        match self.order {
            Order::Goto((tgt_x, tgt_y)) => {
                let dx = if self.origin.0 > tgt_x {
                    self.origin.0 - tgt_x
                } else {
                    tgt_x - self.origin.0
                };
                let dy = if self.origin.1 > tgt_y {
                    self.origin.1 - tgt_y
                } else {
                    tgt_y - self.origin.1
                };

                let dist = dx + dy;

                let elapsed = now - self.embark_timestamp;
                let dist_moved = u32::try_from(elapsed).unwrap() * speed;
                let progress = if dist_moved >= dist {
                    dist
                } else {
                    dist_moved
                };

                let x_progress = if dist == 0 {
                    0
                } else {
                    (progress * dx)/dist
                };
                let y_progress = if dist == 0 {
                    0
                } else {
                    (progress * dy)/dist
                };

                let x = if self.origin.0 <= tgt_x {
                    self.origin.0 + x_progress
                } else {
                    self.origin.0 - x_progress
                };

                let y = if self.origin.1 <= tgt_y {
                    self.origin.1 + y_progress
                } else {
                    self.origin.1 - y_progress
                };

                (x, y)
            }
        }
    }
}

struct Player {
    pub ship: Ship,
    pub gold: u64,
    pub inventory: [u64;4],
}

storage {
    players: StorageMap<Address, Player> = StorageMap {},
    prices: StorageMap<b256, [u8;4]> = StorageMap {},
}

fn simple_noise(x: u32, y: u32) -> u8 {

    const PRIME1: u256 = 16777619;  // FNV prime
    const PRIME2: u256 = 2166136261; // FNV offset basis
    
    // Combine x and y coordinates using prime multiplication
    let mut hash = PRIME2;
    hash = (hash * PRIME1) ^ x.into();
    hash = (hash * PRIME1) ^ y.into();

    // Mix bits
    hash = (hash ^ (hash >> 16));
    hash = hash * 0x85ebca6b;
    hash = (hash ^ (hash >> 13));

    // Return final byte
    u8::try_from(hash & 0xFF).unwrap()
}

fn altitude_at(x: u32, y:u32) -> u8 {
    // const SEED: u32 = 0;
    // const SCALE: u32 = 2;
    // const OCTAVES: u32 = 3;
    // compute_perlin(x, y, SEED, SCALE, OCTAVES)
    simple_noise(x,y)
}

fn island_exists_at(x: u32, y: u32) -> bool {
    altitude_at(x,y) > 250
}

fn island_id(x: u32, y:u32) -> b256 {
    let mut hasher = Hasher::new();
    (x,y).hash(hasher);
    hasher.keccak256()
}

#[storage(read)]
fn island_prices(x: u32, y: u32) -> Option<[u8;4]> {
    let id = island_id(x,y);

    if storage.prices.get(id).try_read().is_some() {
        let prices = storage.prices.get(id).read();
        Some(prices)
    } else if island_exists_at(x,y) {
        let bytes = id.to_le_bytes();
        let original_prices =[
            bytes[0],
            bytes[1],
            bytes[2],
            bytes[3],
        ];
        Some(original_prices)
    } else {
        None
    }
}


fn update_price_sell(price: u8, amount: u8) -> u8 {
    let price_move = u64::from(amount) / 10;
    
    let next_price = u64::from(u8::max()) + price.into() - price_move;
    // Ensure price doesn't go below 1
    let next_price = if next_price < u64::from(u8::max()) + 1 { 1 } else { next_price - u8::max().into() };
    u8::try_from(next_price).unwrap()
}

fn update_price_buy(price: u8, amount: u8) -> u8 {
    let price_move = u64::from(amount) / 10;

    let next_price = u64::from(price) + price_move;
    // Ensure price doesn't exceed u8::max()
    let next_price = if next_price > u8::max().into() { u64::from(u8::max()) } else { next_price };
    u8::try_from(next_price).unwrap()
}

abi MyContract {
    #[storage(read)]
    fn island_prices(x: u32, y: u32) -> Option<[u8;4]>;
    fn check_islands(coords: Vec<(u32, u32)>) -> Vec<bool>;
    #[storage(read, write)]
    fn spawn(); 
    #[storage(read, write)]
    fn order(order: Order);
    #[storage(read, write)]
    fn buy_item(item: u8, amount: u8);
    #[storage(read, write)]
    fn sell_item(item: u8, amount: u8);
    #[storage(read)]
    fn player_position() -> Option<(u32, u32)>;
    #[storage(read)]
    fn player_gold() -> Option<u64>;
    #[storage(read)]
    fn player_inventory() -> Option<[u64;4]>;
}

impl MyContract for Contract {
    #[storage(read)]
    fn island_prices(x: u32, y: u32) -> Option<[u8;4]> {
        island_prices(x, y)
    }
    fn check_islands(coords: Vec<(u32, u32)>) -> Vec<bool> {
        let mut res = Vec::with_capacity(coords.len());
        let mut i = 0;
        while i < coords.len() {
            let c = coords.get(i).unwrap();
            res.push(
                island_exists_at(c.0, c.1)
            );
            i += 1;
        }
        res
    }
    #[storage(read, write)]
    fn spawn() {
        let player_address = msg_sender().unwrap().as_address().unwrap();
       
        require(storage.players.get(player_address).try_read().is_none(), "Player already exists"); // not already spawned

        let player =  Player { ship: Ship { origin: ORIGIN, order: Order::Goto(ORIGIN), embark_timestamp: timestamp() }, gold: 1000, inventory: [0;4] };
        storage.players.get(player_address).write(player);
    }
    #[storage(read, write)]
    fn order(order: Order) {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let mut player = storage.players.get(player_address).read();

        let origin = player.ship.current_position();
        player.ship = Ship { origin, order, embark_timestamp: timestamp()  };
        
        storage.players.get(player_address).write(player);
    }
    #[storage(read, write)]
    fn buy_item(item: u8, amount: u8) {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let mut player = storage.players.get(player_address).read();

        // update player
        let position = player.ship.current_position();
        require(island_exists_at(position.0, position.1), "No island at this location");

        let mut prices = island_prices(position.0, position.1).unwrap();
        let spend = u64::from(prices[u64::from(item)]) * u64::from(amount);
        require(u64::from(spend) <= player.gold, "Not enough gold to buy item");
        player.inventory[u64::from(item)] += u64::from(amount);
        player.gold -= spend;

        // update prices
        prices[item.into()] = update_price_buy(prices[item.into()], amount);
        
        storage.players.get(player_address).write(player);
        storage.prices.get(island_id(position.0, position.1)).write(prices);
    }
    #[storage(read, write)]
    fn sell_item(item: u8, amount: u8) {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let mut player = storage.players.get(player_address).read();

        // update player
        let position = player.ship.current_position();
        require(island_exists_at(position.0, position.1), "No island at this location");

        let mut prices = island_prices(position.0, position.1).unwrap();
        require(player.inventory[u64::from(item)] >= u64::from(amount), "Not enough items to sell");
        let profit = u64::from(prices[u64::from(item)]) * u64::from(amount);
        player.inventory[u64::from(item)] -= u64::from(amount);
        player.gold += profit * 9 / 10;


        // update prices
        prices[item.into()] = update_price_sell(prices[item.into()], amount);

        storage.players.get(player_address).write(player);
        storage.prices.get(island_id(position.0, position.1)).write(prices);
    }
    #[storage(read)]
    fn player_position() -> Option<(u32, u32)> {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let player = storage.players.get(player_address).try_read();
        match player {
            None => None, 
            Some(player) => Some(player.ship.current_position()),
        }
    }
    #[storage(read)]
    fn player_gold() -> Option<u64> {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let player = storage.players.get(player_address).try_read();
        match player {
            None => None, 
            Some(player) => Some(player.gold),
        }
    }
    #[storage(read)]
    fn player_inventory() -> Option<[u64;4]> {
        let player_address = msg_sender().unwrap().as_address().unwrap();
        let player = storage.players.get(player_address).try_read();
        match player {
            None => None, 
            Some(player) => Some(player.inventory),
        }
    }
}
