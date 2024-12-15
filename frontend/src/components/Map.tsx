import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { BlurFilter, TextStyle } from 'pixi.js';
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { Stage, Container, Sprite, Text, Graphics } from '@pixi/react';
import '@pixi/events';

enum MapMode {
  Move,
  Fetch,
}


function Map({ contract }) {
  const width = 1000;
  const height = 1000;
  const [offset, setOffset] = useState({x: Math.floor(Math.pow(2, 32)/2), y: Math.floor(Math.pow(2, 32)/2)});
  const [tiles, setTiles] = useState({});
  const [fetchQueue, setFetchQueue] = useState(new Set());
  const [fetchSelector, setFetchSelector] = useState(null);
  const [mapMode, setMapMode] = useState(MapMode.Move);
  const [movingMap, setMovingMap] = useState(null);

  const draw = useCallback(async (g) => {
    console.log("draw")

    g.beginFill("#7f7f7f");
    g.drawRect( 0, 0, 1000, 1000 );
    g.endFill();

    // draw tiles
    for(let y = offset.y; y < offset.y+height/10; ++y) {
      for(let x = offset.x ; x < offset.x+width/10; ++x) {
        const tile = tiles[`${x},${y}`];
        if(tile !== undefined) {
          if (tile.terrain === 'Sea') {
            g.beginFill(`rgb(0,0,${tile.altitude})`);
          } else if (tile.terrain === 'Coast') {
            g.beginFill(`rgb(${tile.altitude},${tile.altitude},0)`);
          } else if (tile.terrain === 'Port') {
            g.beginFill(`rgb(0,0,0)`);
          } else if (tile.terrain === 'Ground') {
            g.beginFill(`rgb(0,${tile.altitude},0)`);
          } else {
            console.error("Unknown tile terrain", tile.terrain);
          }
          g.drawRect( (x-offset.x)*10, (y-offset.y)*10, 10, 10 );
          g.endFill();
        } else if (fetchQueue.has(`${x},${y}`)) {
          g.beginFill("#8f7f8f");
          g.drawRect( (x-offset.x)*10, (y-offset.y)*10, 10, 10 );
          g.endFill();
        } else {
          // g.beginFill("#7f7f7f");
          // g.drawRect( (x-offset.x)*10, (y-offset.y)*10, 10, 10 );
          // g.endFill();
        }
      }
    }

    // draw selector
    if(fetchSelector !== null) {
      // g.beginFill("rgba(128,0,128,0.5)");
      const x0 = fetchSelector[0][0];
      const x1 = fetchSelector[1][0];
      const y0 = fetchSelector[0][1];
      const y1 = fetchSelector[1][1];
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);
      g.beginFill("#8f7f8f");
      g.drawRect((left-offset.x)*10, (top-offset.y)*10, (right-left+1)*10, (bottom-top+1)*10);
      g.endFill();
    }

  }, [contract, tiles, fetchSelector, fetchQueue, offset]);  

  const screenToCoords = (screen) => {
    return [
      offset.x + Math.floor(screen.x / 10),
      offset.y + Math.floor(screen.y / 10),
    ];
  };

  const selectorDelay = 100;

  const fetchTilesBatched = async (coords) => {
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x,y]) => {
        fetchQueue.add(`${x},${y}`);
      });
      return fetchQueue;
    });


    let remaining = coords.slice();
    let batch_size = 60;
    while(remaining.length > 0) {
      const batch = remaining.slice(0, batch_size);
      fetchBatch(batch);
      remaining = remaining.slice(batch_size);
      await new Promise(r => setTimeout(r, selectorDelay));
    }
  };

  const fetchBatch = async (coords) => {
    console.log("fetchBatch");
    let batch;
    try {
      batch = (await contract.functions.get_tile_batch(coords).get()).value;
    } catch (e) {
      if(e.name == "FuelError" && e.message.includes("OutOfGas")) {

        fetchBatch(coords.slice(0, coords.length/2));
        await new Promise(r => setTimeout(r, selectorDelay));
        fetchBatch(coords.slice(coords.length/2));
        return;
      }
      throw e;
    }

    let tiles_obj = {};
    for(let i = 0;i<coords.length;++i) {
      const x = coords[i][0];
      const y = coords[i][1];
      tiles_obj[`${x},${y}`] = batch[i];
    }
    setTiles(tiles => Object.assign(tiles_obj, tiles));
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x,y]) => {
        fetchQueue.delete(`${x},${y}`);
      });
      return fetchQueue;
    });
  };

  const fulfillFetchSelector = useCallback(async (event) => {
    const x0 = fetchSelector[0][0];
    const x1 = screenToCoords(event.screen)[0];
    const y0 = fetchSelector[0][1];
    const y1 = screenToCoords(event.screen)[1];
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);

    const coords = [];
    for(let x=left;x<=right;++x) {
      for(let y=top;y<=bottom;++y) {
        if(tiles[`${x},${y}`] == undefined) {
          coords.push([x, y]);
        }
      }
    }
    fetchTilesBatched(coords);
    setFetchSelector(null);
  }, [contract, fetchSelector]);

  const createFetchSelector = useCallback(async (event) => {
    const coords = screenToCoords(event.screen);
    setFetchSelector([coords.slice(), coords.slice()]);
  }, [contract, offset.x, offset.y]);

  const moveFetchSelector = useCallback(async (event) => {
    if(fetchSelector != null) {
      const coords = screenToCoords(event.screen);
      setFetchSelector(fetchSelector => ([fetchSelector[0], coords.slice()]));
    }
  }, [contract, fetchSelector, offset]);

  return (
    <Box>
      <Button isDisabled={mapMode == MapMode.Fetch} onPress={() => { console.log("Fetch"); setMapMode(MapMode.Fetch); }}>Fetch</Button>
      <Button isDisabled={mapMode == MapMode.Move} onPress={() => { console.log("Move"); setMapMode(MapMode.Move); }}>Move</Button>
      <Stage width={width} height={height}>
        { mapMode == MapMode.Fetch &&
          <Graphics draw={draw}  
            eventMode="static"
            pointerup={(event) => {
              if(fetchSelector != null) {
                fulfillFetchSelector(event);
              } else {
                createFetchSelector(event);
              }
            }}
            pointermove={(event) => {
              moveFetchSelector(event);
            }}
          />
        }
        { mapMode == MapMode.Move &&
          <Graphics draw={draw}  
            eventMode="static"
            pointerup={(event) => {
              setMovingMap(null);
            }}
            pointerdown={(event) => {
              setMovingMap(Object.assign({ originalX: offset.x, originalY: offset.y }, event.screen));
            }}
            pointermove={(event) => {
              if(movingMap != null) {
                const xoff = movingMap.originalX + Math.floor((movingMap.x - event.screen.x) / 10);
                const yoff = movingMap.originalY + Math.floor((movingMap.y - event.screen.y) / 10);
                setOffset({ x: xoff, y: yoff });
              }
            }}
          />
        }
      </Stage>
    </Box>
  );

}

export default Map;


