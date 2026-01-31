#!/usr/bin/env python3
"""
faststart_mp4.py

Moves the `moov` atom to the front of an MP4 ("fast start") and adjusts chunk offsets.
This is similar to `qtfaststart`, but implemented in pure Python.

Usage:
  python3 scripts/video/faststart_mp4.py public/assets/hero/h_h_1.mp4
  python3 scripts/video/faststart_mp4.py public/assets/hero/h_h_*.mp4
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable, Iterator, Tuple


ContainerBoxes = {
    "moov",
    "trak",
    "mdia",
    "minf",
    "stbl",
    "edts",
    "dinf",
    "udta",
    "meta",  # has 4-byte version/flags header before children
    "ilst",
}


def _u32(b: bytes) -> int:
    return int.from_bytes(b, "big", signed=False)


def _u64(b: bytes) -> int:
    return int.from_bytes(b, "big", signed=False)


def _p32(v: int) -> bytes:
    return int(v).to_bytes(4, "big", signed=False)


def _p64(v: int) -> bytes:
    return int(v).to_bytes(8, "big", signed=False)


def iter_boxes(buf: bytes, start: int, end: int) -> Iterator[Tuple[str, int, int, int]]:
    """
    Yields (type, box_start, box_size, header_size) for immediate child boxes in [start, end).
    """
    i = start
    while i + 8 <= end:
        size32 = _u32(buf[i : i + 4])
        typ = buf[i + 4 : i + 8].decode("ascii", errors="replace")
        header = 8
        size = size32
        if size32 == 1:
            if i + 16 > end:
                break
            size = _u64(buf[i + 8 : i + 16])
            header = 16
        elif size32 == 0:
            size = end - i

        if size < header:
            break
        if i + size > end:
            break

        yield (typ, i, size, header)
        i += size


def find_top_level_atoms(buf: bytes) -> dict[str, Tuple[int, int, int]]:
    """
    Returns mapping: type -> (start, size, header_size) for top-level boxes.
    If multiple boxes of same type exist, the last one wins (fine for our use).
    """
    out: dict[str, Tuple[int, int, int]] = {}
    for typ, start, size, header in iter_boxes(buf, 0, len(buf)):
        out[typ] = (start, size, header)
    return out


def adjust_chunk_offsets(moov: bytearray, delta: int) -> None:
    """
    Adjusts chunk offsets in `stco` (32-bit) and `co64` (64-bit) boxes inside moov by +delta.
    """

    def recurse(region_start: int, region_end: int, parent_type: str) -> None:
        for typ, start, size, header in iter_boxes(moov, region_start, region_end):
            data_start = start + header
            data_end = start + size

            if typ in ContainerBoxes:
                if typ == "meta":
                    # meta begins with 4 bytes version/flags then children boxes
                    if data_start + 4 <= data_end:
                        recurse(data_start + 4, data_end, typ)
                else:
                    recurse(data_start, data_end, typ)
                continue

            if typ == "stco":
                # version/flags (4) + entry_count (4) ...
                if data_start + 8 > data_end:
                    continue
                entry_count = _u32(moov[data_start + 4 : data_start + 8])
                table_start = data_start + 8
                table_bytes = entry_count * 4
                if table_start + table_bytes > data_end:
                    continue
                for i in range(entry_count):
                    off = table_start + i * 4
                    val = _u32(moov[off : off + 4])
                    moov[off : off + 4] = _p32(val + delta)
                continue

            if typ == "co64":
                if data_start + 8 > data_end:
                    continue
                entry_count = _u32(moov[data_start + 4 : data_start + 8])
                table_start = data_start + 8
                table_bytes = entry_count * 8
                if table_start + table_bytes > data_end:
                    continue
                for i in range(entry_count):
                    off = table_start + i * 8
                    val = _u64(moov[off : off + 8])
                    moov[off : off + 8] = _p64(val + delta)
                continue

    recurse(0, len(moov), "moov")


def moov_is_faststart(buf: bytes, moov_start: int, mdat_start: int) -> bool:
    return moov_start >= 0 and (mdat_start < 0 or moov_start < mdat_start)


def process_file(path: Path) -> None:
    data = path.read_bytes()
    atoms = find_top_level_atoms(data)

    if "moov" not in atoms or "ftyp" not in atoms:
        raise RuntimeError(f"{path}: missing required top-level atoms (need ftyp + moov)")

    moov_start, moov_size, _ = atoms["moov"]
    ftyp_start, ftyp_size, _ = atoms["ftyp"]
    mdat_start, _, _ = atoms.get("mdat", (-1, -1, -1))

    if moov_is_faststart(data, moov_start, mdat_start):
        print(f"{path}: already faststart (moov before mdat)")
        return

    if ftyp_start != 0:
        # uncommon, but we can still insert after ftyp box (wherever it is).
        pass

    insert_at = ftyp_start + ftyp_size
    if insert_at <= 0 or insert_at > len(data):
        raise RuntimeError(f"{path}: invalid ftyp size; cannot determine insert point")

    if moov_start < insert_at:
        raise RuntimeError(f"{path}: unexpected layout (moov before insert point but after mdat?)")

    moov_bytes = bytearray(data[moov_start : moov_start + moov_size])
    delta = moov_size
    adjust_chunk_offsets(moov_bytes, delta=delta)

    out_path = path.with_suffix(path.suffix + ".faststart")
    # New layout: [prefix up to insert_at] + [moov (adjusted)] + [rest excluding moov]
    rebuilt = (
        data[:insert_at]
        + bytes(moov_bytes)
        + data[insert_at:moov_start]
        + data[moov_start + moov_size :]
    )

    out_path.write_bytes(rebuilt)

    # quick verification: moov should now appear early
    check = out_path.read_bytes()
    check_atoms = find_top_level_atoms(check)
    new_moov_start, _, _ = check_atoms["moov"]
    new_mdat_start, _, _ = check_atoms.get("mdat", (-1, -1, -1))
    print(
        f"{path.name}: wrote {out_path.name} | old moov@{moov_start} -> new moov@{new_moov_start} | mdat@{new_mdat_start}"
    )


def main(argv: Iterable[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+", help="MP4 files to faststart")
    args = parser.parse_args(list(argv))

    for f in args.files:
        p = Path(f)
        if not p.exists():
            raise FileNotFoundError(f"{p} not found")
        process_file(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(os.sys.argv[1:]))

