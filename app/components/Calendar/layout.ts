import { comparing, sorted } from "iter-fns";

export interface Segment {
  index: number;
  offset: number;
  n: number;
  hasStart: boolean;
  hasEnd: boolean;
}

function resegment(segment: Segment, rowLength: number): Segment[] {
  const segments: Segment[] = [];
  let { offset, n } = segment;

  if (offset > 0) {
    const first = Math.min(rowLength - offset, n);
    segments.push({
      ...segment,
      offset,
      n: first,
      hasStart: false,
      hasEnd: false,
    });
    offset = 0;
    n -= first;
  }

  while (n >= rowLength) {
    segments.push({
      ...segment,
      offset,
      n: rowLength,
      hasStart: false,
      hasEnd: false,
    });
    n -= rowLength;
  }

  if (n > 0) {
    segments.push({ ...segment, offset, n, hasStart: false, hasEnd: false });
  }

  if (segments.length > 0) {
    segments[0].hasStart = segment.hasStart;
    segments[segments.length - 1].hasEnd = segment.hasEnd;
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

    for (const subsegment of resegment(
      { ...segment, offset: segment.offset % rowLength },
      rowLength,
    )) {
      const cellIndex = subsegment.offset % rowLength;

      if (rowIndex >= numRows) {
        continue;
      }

      const row = grid[rowIndex];

      let laneIndex = 0;
      // eslint-disable-next-line no-constant-condition
      findLane: while (true) {
        for (
          let offset = 0;
          offset < subsegment.n && cellIndex + offset < rowLength;
          ++offset
        ) {
          if (row[cellIndex + offset][laneIndex] !== undefined) {
            ++laneIndex;
            continue findLane;
          }
        }

        row[cellIndex][laneIndex] = subsegment;

        break;
      }

      for (
        let offset = 1;
        offset < subsegment.n && cellIndex + offset < rowLength;
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
