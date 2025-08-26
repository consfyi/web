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
  rowLength: number = 7,
): Iterable<{ offset: number; n: number }> {
  if (offset > 0) {
    const first = rowLength - offset;
    yield { offset, n: first };
    offset = 0;
    n -= first;
  }

  while (n >= rowLength) {
    yield { offset, n: rowLength };
    n -= rowLength;
  }

  if (n > 0) {
    yield { offset, n };
  }
}

export default function layout(
  segments: Segment[],
  numRows: number,
  rowLength: number = 7,
): (Segment | null)[][][] {
  const grid = Array.from({ length: numRows }, () =>
    Array.from({ length: rowLength }, () => [] as (Segment | null)[]),
  );

  for (const segment of sorted(
    segments,
    comparing((seg) => seg.offset),
  )) {
    let rowIndex = Math.floor(segment.offset / rowLength);
    const resegmented = Array.from(
      resegment(segment.offset % rowLength, segment.n, rowLength),
    );
    for (let i = 0; i < resegmented.length; ++i) {
      const seg = resegmented[i];

      const cellIndex = seg.offset % rowLength;

      if (rowIndex >= numRows) {
        continue;
      }

      const chunk = grid[rowIndex];

      let laneIndex = 0;
      // eslint-disable-next-line no-constant-condition
      findLane: while (true) {
        for (
          let offset = 0;
          offset < seg.n && cellIndex + offset < rowLength;
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
        offset < seg.n && cellIndex + offset < rowLength;
        ++offset
      ) {
        chunk[cellIndex + offset][laneIndex] = null;
      }

      ++rowIndex;
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
