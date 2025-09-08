import { comparing, sorted, flatMap } from "iter-fns";

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

  const firstOffset = segment.offset % rowLength;
  if (firstOffset > 0) {
    const firstLength = Math.min(rowLength - firstOffset, n);
    segments.push({
      ...segment,
      offset,
      n: firstLength,
      hasStart: false,
      hasEnd: false,
    });

    offset += firstLength;
    n -= firstLength;
  }

  while (n >= rowLength) {
    segments.push({
      ...segment,
      offset,
      n: rowLength,
      hasStart: false,
      hasEnd: false,
    });

    offset += rowLength;
    n -= rowLength;
  }

  if (n > 0) {
    segments.push({
      ...segment,
      offset,
      n,
      hasStart: false,
      hasEnd: false,
    });
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

  for (const segment of flatMap(
    sorted(
      segments,
      comparing((seg) => seg.offset),
    ),
    (seg) => resegment(seg, rowLength),
  )) {
    const rowIndex = Math.floor(segment.offset / rowLength);
    const cellIndex = segment.offset % rowLength;

    if (rowIndex >= numRows) {
      continue;
    }

    const row = grid[rowIndex];

    let laneIndex = 0;
    // eslint-disable-next-line no-constant-condition
    findLane: while (true) {
      for (
        let offset = 0;
        offset < segment.n && cellIndex + offset < rowLength;
        ++offset
      ) {
        if (row[cellIndex + offset][laneIndex] !== undefined) {
          ++laneIndex;
          continue findLane;
        }
      }

      row[cellIndex][laneIndex] = segment;

      break;
    }

    for (
      let offset = 1;
      offset < segment.n && cellIndex + offset < rowLength;
      ++offset
    ) {
      row[cellIndex + offset][laneIndex] = null;
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
