#!/usr/bin/env python3
"""
audit_mp4_keyframes.py

Best-effort MP4 audit without ffprobe:
- finds the primary video track (handler='vide')
- reads mdhd duration/timescale
- reads stsz sample_count (approx frame count)
- reads stss sync sample count (keyframes)

Outputs approximate FPS and average keyframe interval.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterator, Tuple, Optional


def _u32(b: bytes) -> int:
    return int.from_bytes(b, "big", signed=False)


def _u64(b: bytes) -> int:
    return int.from_bytes(b, "big", signed=False)


def iter_boxes(buf: bytes, start: int, end: int) -> Iterator[Tuple[str, int, int, int]]:
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

        yield typ, i, size, header
        i += size


def find_first(buf: bytes, path: list[str]) -> Optional[Tuple[int, int, int]]:
    """
    Finds the first occurrence of a nested box path.
    Returns (start, size, header) or None.
    """

    def walk(region_start: int, region_end: int, idx: int) -> Optional[Tuple[int, int, int]]:
        want = path[idx]
        for typ, start, size, header in iter_boxes(buf, region_start, region_end):
            if typ != want:
                continue
            if idx == len(path) - 1:
                return (start, size, header)
            data_start = start + header
            data_end = start + size
            # meta has 4-byte version/flags before children
            if typ == "meta":
                if data_start + 4 <= data_end:
                    return walk(data_start + 4, data_end, idx + 1)
                return None
            return walk(data_start, data_end, idx + 1)
        return None

    return walk(0, len(buf), 0)


def parse_mdhd(buf: bytes, start: int, size: int, header: int) -> tuple[int, int]:
    data = buf[start + header : start + size]
    if len(data) < 4:
        raise ValueError("mdhd too small")
    version = data[0]
    if version == 1:
        # version(1)/flags(3) + creation(8) + mod(8) + timescale(4) + duration(8)
        if len(data) < 32:
            raise ValueError("mdhd v1 too small")
        timescale = _u32(data[20:24])
        duration = _u64(data[24:32])
        return timescale, int(duration)
    # v0: version/flags + creation(4) + mod(4) + timescale(4) + duration(4)
    if len(data) < 20:
        raise ValueError("mdhd v0 too small")
    timescale = _u32(data[12:16])
    duration = _u32(data[16:20])
    return timescale, duration


def parse_hdlr_handler_type(buf: bytes, start: int, size: int, header: int) -> str:
    data = buf[start + header : start + size]
    # version/flags (4) + pre_defined (4) + handler_type (4)
    if len(data) < 12:
        return ""
    return data[8:12].decode("ascii", errors="replace")


def parse_stsz_sample_count(buf: bytes, start: int, size: int, header: int) -> int:
    data = buf[start + header : start + size]
    # version/flags (4) + sample_size (4) + sample_count (4)
    if len(data) < 12:
        return 0
    return _u32(data[8:12])


def parse_stss_sync_count(buf: bytes, start: int, size: int, header: int) -> int:
    data = buf[start + header : start + size]
    # version/flags (4) + entry_count (4)
    if len(data) < 8:
        return 0
    return _u32(data[4:8])


def locate_video_trak(buf: bytes) -> Optional[Tuple[int, int, int]]:
    moov = find_first(buf, ["moov"])
    if not moov:
        return None
    moov_start, moov_size, moov_header = moov
    moov_data_start = moov_start + moov_header
    moov_data_end = moov_start + moov_size

    for typ, start, size, header in iter_boxes(buf, moov_data_start, moov_data_end):
        if typ != "trak":
            continue
        # handler type lives at trak->mdia->hdlr
        hdlr = find_first(buf[start : start + size], ["trak", "mdia", "hdlr"])
        # The above approach doesn't work on sliced buffer; do manual in trak region.
        trak_data_start = start + header
        trak_data_end = start + size
        mdia_box = None
        for t2, s2, sz2, h2 in iter_boxes(buf, trak_data_start, trak_data_end):
            if t2 == "mdia":
                mdia_box = (s2, sz2, h2)
                break
        if not mdia_box:
            continue
        mdia_start, mdia_size, mdia_header = mdia_box
        mdia_data_start = mdia_start + mdia_header
        mdia_data_end = mdia_start + mdia_size
        hdlr_box = None
        for t3, s3, sz3, h3 in iter_boxes(buf, mdia_data_start, mdia_data_end):
            if t3 == "hdlr":
                hdlr_box = (s3, sz3, h3)
                break
        if not hdlr_box:
            continue
        handler = parse_hdlr_handler_type(buf, *hdlr_box)
        if handler == "vide":
            return (start, size, header)

    return None


def audit_file(path: Path) -> None:
    buf = path.read_bytes()
    trak = locate_video_trak(buf)
    if not trak:
        print(f"{path.name}: unable to locate video track")
        return

    trak_start, trak_size, trak_header = trak
    trak_data_start = trak_start + trak_header
    trak_data_end = trak_start + trak_size

    # mdhd at trak->mdia->mdhd
    mdhd_box = None
    stsz_box = None
    stss_box = None

    # walk trak->mdia
    mdia_box = None
    for typ, start, size, header in iter_boxes(buf, trak_data_start, trak_data_end):
        if typ == "mdia":
            mdia_box = (start, size, header)
            break
    if not mdia_box:
        print(f"{path.name}: missing mdia")
        return

    mdia_start, mdia_size, mdia_header = mdia_box
    mdia_data_start = mdia_start + mdia_header
    mdia_data_end = mdia_start + mdia_size

    for typ, start, size, header in iter_boxes(buf, mdia_data_start, mdia_data_end):
        if typ == "mdhd":
            mdhd_box = (start, size, header)
        if typ == "minf":
            # descend to stbl
            minf_data_start = start + header
            minf_data_end = start + size
            stbl_box = None
            for t2, s2, sz2, h2 in iter_boxes(buf, minf_data_start, minf_data_end):
                if t2 == "stbl":
                    stbl_box = (s2, sz2, h2)
                    break
            if stbl_box:
                stbl_start, stbl_size, stbl_header = stbl_box
                stbl_data_start = stbl_start + stbl_header
                stbl_data_end = stbl_start + stbl_size
                for t3, s3, sz3, h3 in iter_boxes(buf, stbl_data_start, stbl_data_end):
                    if t3 == "stsz":
                        stsz_box = (s3, sz3, h3)
                    if t3 == "stss":
                        stss_box = (s3, sz3, h3)

    if not mdhd_box or not stsz_box:
        print(f"{path.name}: missing mdhd/stsz (cannot estimate FPS)")
        return

    timescale, duration_units = parse_mdhd(buf, *mdhd_box)
    duration_s = (duration_units / timescale) if timescale else 0.0
    sample_count = parse_stsz_sample_count(buf, *stsz_box)
    sync_count = parse_stss_sync_count(buf, *stss_box) if stss_box else 0

    fps = (sample_count / duration_s) if duration_s > 0 else 0.0
    avg_keyframe_s = (duration_s / sync_count) if (duration_s > 0 and sync_count > 0) else 0.0
    samples_per_keyframe = (sample_count / sync_count) if sync_count > 0 else 0.0

    print(
        f"{path.name}: duration={duration_s:.2f}s, samples={sample_count}, keyframes={sync_count}, "
        f"fps≈{fps:.2f}, avg_keyframe_interval≈{avg_keyframe_s:.2f}s (≈{samples_per_keyframe:.1f} frames)"
    )


def main(argv) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="MP4 files to audit")
    args = ap.parse_args(argv)
    for f in args.files:
        audit_file(Path(f))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(os.sys.argv[1:]))
