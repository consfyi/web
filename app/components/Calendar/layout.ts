import { comparing, sorted } from "iter-fns";

export interface Segment {
  index: number;
  offset: number;
  n: number;
  hasStart: boolean;
  hasEnd: boolean;
}

function resegment(
  offset: number,
  n: number,
  rowLength: number,
): { offset: number; n: number }[] {
  const segments = [];
  if (offset > 0) {
    const first = Math.min(rowLength - offset, n);
    segments.push({ offset, n: first });
    offset = 0;
    n -= first;
  }

  while (n >= rowLength) {
    segments.push({ offset, n: rowLength });
    n -= rowLength;
  }

  if (n > 0) {
    segments.push({ offset, n });
  }
  return segments;
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

    const resegmented = resegment(
      segment.offset % rowLength,
      segment.n,
      rowLength,
    );

    for (let i = 0; i < resegmented.length; ++i) {
      const { offset, n } = resegmented[i];

      const cellIndex = offset % rowLength;

      if (rowIndex >= numRows) {
        continue;
      }

      const row = grid[rowIndex];

      let laneIndex = 0;
      // eslint-disable-next-line no-constant-condition
      findLane: while (true) {
        for (
          let offset = 0;
          offset < n && cellIndex + offset < rowLength;
          ++offset
        ) {
          if (row[cellIndex + offset][laneIndex] !== undefined) {
            ++laneIndex;
            continue findLane;
          }
        }

        row[cellIndex][laneIndex] = {
          ...segment,
          offset,
          n,
          hasStart: segment.hasStart && i == 0,
          hasEnd: segment.hasEnd && i == resegmented.length - 1,
        };

        break;
      }

      for (
        let offset = 1;
        offset < n && cellIndex + offset < rowLength;
        ++offset
      ) {
        row[cellIndex + offset][laneIndex] = null;
      }

      ++rowIndex;
    }
  }

  for (const row of grid) {
    for (const cell of row) {
      let lastFilled = cell.length - 1;
      while (lastFilled >= 0 && cell[lastFilled] == null) {
        --lastFilled;
      }
      cell.length = lastFilled + 1;
    }
  }

  return grid;
}
