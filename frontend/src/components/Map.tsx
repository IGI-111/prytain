import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { BlurFilter, TextStyle } from "pixi.js";
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CameraControls,
  TransformControls,
  OrthographicCamera,
  Environment,
  Lightformer,
  OrbitControls,
  PivotControls,
} from "@react-three/drei";
import * as THREE from "three";

enum MapMode {
  Move,
  Fetch,
}

function Map({ contract }) {
  const width = 1000;
  const height = 1000;
  const [origin, setorigin] = useState({
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
    let concurrency = 4;

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
    console.log("fetchBatch");
    let batch;
    try {
      batch = (await contract.functions.get_tile_batch(coords).get()).value;
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

  // FIXME: just run it once
  useEffect(() => {
    (async () => {
      const x0 = origin.x;
      const x1 = origin.x + 50;
      const y0 = origin.y;
      const y1 = origin.y + 50;
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);

      const coords = [];
      for (let x = left; x <= right; ++x) {
        for (let y = top; y <= bottom; ++y) {
          if (tiles[`${x},${y}`] == undefined) {
            coords.push([x, y]);
          }
        }
      }
      fetchTilesBatched(coords);
    })();
  }, []);

  console.log("render");

  return (
    <div style={{ height: "90vw" }}>
      <Canvas
        orthographic
        camera={{
          position: [0.2, -10, 8],
          rotation: [1, 0, -0],
          zoom: 65,
          fov: 75,
        }}
      >
        <color attach="background" args={["#0f0f0f"]} />

        <ambientLight intensity={1} />
        <group rotation={[0, 0, Math.PI / 4]}>
          <SelectionContext/>
        </group>
      </Canvas>
    </div>
  );
  // { fetchSelector !== null && <Selector fetchSelector={fetchSelector} origin={origin}/> }
}

// function SelectionContext(props) {
//   let [selection, setSelection] = useState(
//   return <TileMap
//             tiles={tiles}
//             origin={origin}
//             height={height}
//             width={width}
//             fetchQueue={fetchQueue}
//           />;
// }

function TileMap({
  tiles,
  origin,
  height,
  width,
  fetchQueue,
  selection,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerHover,
}) {
  const scaling = 0.1;
  const offset = (100 * scaling) / 2;

  const tileGeometry = useMemo(() => new THREE.PlaneGeometry(scaling, scaling));
  const fetchingMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#8f7f8f" }),
  );
  const selectedMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "yellow" }),
  );
  const unknownMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#7f7f7f" }),
  );

  const meshes = [];

  // draw tiles

  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const tile = tiles[`${origin.x + x},${origin.y + y}`];
      let position, material;
      if (tile !== undefined) {
        const terrainToColor = {
          Sea: `rgb(0,0,${tile.altitude})`,
          Coast: `rgb(${tile.altitude},${tile.altitude},0)`,
          Port: "black",
          Ground: `rgb(0,${tile.altitude},0)`,
        };
        position = [x * scaling - offset, y * scaling - offset, 0];
        material = new THREE.MeshBasicMaterial({
          color: terrainToColor[tile.terrain],
        });
      } else if (fetchQueue.has(`${x},${y}`)) {
        // TODO: move this into its own component
        position = [x * scaling - offset, y * scaling - offset, 0];
        material = fetchingMaterial;
      } else {
        position = [x * scaling - offset, y * scaling - offset, 0];
        material = unknownMaterial;
      }
      meshes.push(
        <mesh
          position={position}
          geometry={tileGeometry}
          material={material}
          onPointerDown={(e) => onPointerDown && onPointerDown(x, y, e)}
          onPointerUp={(e) => onPointerUp && onPointerUp(x, y, e)}
          onPointerMove={(e) => onPointerMove && onPointerMove(x, y, e)}
          onPointerHover={(e) => onPointerHover && onPointerHover(x, y, e)}
        />,
      );
    }
  }
  return (
    <group>
      {meshes.map((t, i) => (
        <group key={i}> {t} </group>
      ))}
    </group>
  );
}

export default Map;
