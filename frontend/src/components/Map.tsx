import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { BlurFilter, TextStyle } from "pixi.js";
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Instances, Instance,
  CameraControls,
  TransformControls,
  OrthographicCamera,
  Environment,
  Lightformer,
  OrbitControls,
  PivotControls,
} from "@react-three/drei";
import * as THREE from "three";
import TileMap from "./TileMap";

export enum MapMode {
  Move,
  Selection,
}

function Map({ contract, mode }) {
  const [origin, setOrigin] = useState({
    x: Math.floor(Math.pow(2, 32) / 2),
    y: Math.floor(Math.pow(2, 32) / 2),
  });
  const [tiles, setTiles] = useState({});
  const [fetchQueue, setFetchQueue] = useState(new Set());
  const [mapMode, setMapMode] = useState(MapMode.Move);
  const [movingMap, setMovingMap] = useState(null);

  const fetchTilesBatched = async (coords) => {
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x, y]) => {
        fetchQueue.add(`${x},${y}`);
      });
      return fetchQueue;
    });

    let remaining = coords.slice();
    let batch_size = 60;
    let concurrency = 5;

    while (remaining.length > 0) {
      await Promise.all(
        [...Array(concurrency).keys()]
          .map((i) => remaining.slice(i * batch_size, (i + 1) * batch_size))
          .map((b) => fetchBatch(b)),
      );
      remaining = remaining.slice(batch_size * concurrency);
    }
  };

  const fetchBatch = async (coords) => {
    let batch;
    try {
      batch = (await contract.functions.check_islands(coords).get()).value;
    } catch (e) {
      if (e.name == "FuelError" && e.message.includes("OutOfGas")) {
        // split
        await fetchBatch(coords.slice(0, coords.length / 2));
        await fetchBatch(coords.slice(coords.length / 2));
        return;
      }
      throw e;
    }

    let tiles_obj = {};
    for (let i = 0; i < coords.length; ++i) {
      const x = coords[i][0];
      const y = coords[i][1];
      tiles_obj[`${x},${y}`] = batch[i];
    }
    setTiles((tiles) => Object.assign(tiles_obj, tiles));
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x, y]) => {
        fetchQueue.delete(`${x},${y}`);
      });
      return fetchQueue;
    });
  };


  const mapCoordsToContractCoords = c => {
    return c.splitAt(',');
  };

  const handleSelect = selectionSet => {
    console.log(selectionSet);
    let coords = selectionSet.keys().map(
      k => {
        const nums = k.split(',').map(n => Number(n));
        return [nums[0] + origin.x, nums[1] + origin.y];
      }
    ).toArray();

    fetchTilesBatched(coords);

    console.log(coords);
  };

  const getTileType = (x, y) => {
    const tile = tiles[`${x+origin.x},${y+origin.y}`];
    if(tile === undefined) {
      return 1;
    } else if(tile) {
      return 0;
    } else {
      return 2;
    }
  };


  return (
    <TileMap
      getTileType={getTileType}
      onSelect={s => handleSelect(s)}
      shipPosition={[0,0]}
       />
  );
}

export default Map;
