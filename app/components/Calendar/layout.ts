import { comparing, sorted } from "iter-fns";

export interface Segment {
  index: number;
  offset: number;
  n: number;
  hasStart: boolean;
  hasEnd: boolean;
}

function* resegment(
  offset: number,
  n: number,
  chunkSize: number = 7,
): Iterable<{ offset: number; n: number }> {
  if (offset > 0) {
    const first = chunkSize - offset;
    yield { offset, n: first };
    offset = 0;
    n -= first;
  }

  while (n >= chunkSize) {
    yield { offset, n: chunkSize };
    n -= chunkSize;
  }

  if (n > 0) {
    yield { offset, n };
  }
}

export default function layout(
  segments: Segment[],
  numChunks: number,
  chunkSize: number = 7,
): (Segment | null)[][][] {
  const grid = Array.from({ length: numChunks }, () =>
    Array.from({ length: chunkSize }, () => [] as (Segment | null)[]),
  );

  for (const segment of sorted(
    segments,
    comparing((seg) => seg.offset),
  )) {
    let chunkIndex = Math.floor(segment.offset / chunkSize);
    const resegmented = Array.from(
      resegment(segment.offset % chunkSize, segment.n, chunkSize),
    );
    for (let i = 0; i < resegmented.length; ++i) {
      const seg = resegmented[i];

      const cellIndex = seg.offset % chunkSize;

      if (chunkIndex >= numChunks) {
        continue;
      }

      const chunk = grid[chunkIndex];

      let laneIndex = 0;
      // eslint-disable-next-line no-constant-condition
      findLane: while (true) {
        for (
          let offset = 0;
          offset < seg.n && cellIndex + offset < chunkSize;
          ++offset
        ) {
          if (chunk[cellIndex + offset][laneIndex] !== undefined) {
            ++laneIndex;
            continue findLane;
          }
        }

        chunk[cellIndex][laneIndex] = {
          ...segment,
          offset: seg.offset,
          n: seg.n,
          hasStart: segment.hasStart && i == 0,
          hasEnd: segment.hasEnd && i == resegmented.length - 1,
        };

        break;
      }

      for (
        let offset = 1;
        offset < seg.n && cellIndex + offset < chunkSize;
        ++offset
      ) {
        chunk[cellIndex + offset][laneIndex] = null;
      }

      ++chunkIndex;
    }
  }

  for (const chunk of grid) {
    for (const cell of chunk) {
      let lastFilled = cell.length - 1;
      while (lastFilled >= 0 && cell[lastFilled] == null) {
        --lastFilled;
      }
      cell.length = lastFilled + 1;
    }
  }

  return grid;
}
