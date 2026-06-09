#!/usr/bin/env python3
import argparse
import json
import math
import shutil
import sys
from pathlib import Path


def infer_base_path(output_path, fallback):
    parts = Path(output_path).resolve().parts
    if "public" not in parts:
        return fallback

    public_index = parts.index("public")
    relative_parts = parts[public_index + 1 :]
    if not relative_parts:
        return fallback

    return "/" + "/".join(relative_parts)


def resize_dimensions(source_width, source_height, max_width):
    if source_width <= 0 or source_height <= 0:
        raise ValueError("Video dimensions must be positive.")

    scale = min(1, max_width / source_width)
    width = max(1, int(round(source_width * scale)))
    height = max(1, int(round(source_height * scale)))

    if height % 2 == 1:
        height += 1

    return width, height


def build_frame_times(start_time, end_time, fps):
    if fps <= 0:
        raise ValueError("FPS must be positive.")

    sample_duration = max(0.001, end_time - start_time)
    sample_steps = math.ceil(round(sample_duration * fps, 9))
    frame_count = max(2, int(sample_steps) + 1)
    last_frame = max(1, frame_count - 1)

    return [
        round(start_time + (end_time - start_time) * (index / last_frame), 3)
        for index in range(frame_count)
    ]


def clean_output_dir(output_path, replace):
    if output_path.exists() and any(output_path.iterdir()) and not replace:
        raise SystemExit(
            f"Output directory is not empty: {output_path}\n"
            "Pass --replace to overwrite generated frames."
        )

    if output_path.exists() and replace:
        shutil.rmtree(output_path)

    output_path.mkdir(parents=True, exist_ok=True)


def load_dependencies():
    try:
        import cv2
    except ModuleNotFoundError as error:
        raise SystemExit(
            "Missing Python package: cv2\n"
            "Install it with: python3 -m pip install opencv-python pillow"
        ) from error

    try:
        from PIL import Image
    except ModuleNotFoundError as error:
        raise SystemExit(
            "Missing Python package: PIL\n"
            "Install it with: python3 -m pip install opencv-python pillow"
        ) from error

    return cv2, Image


def read_frame_at(cap, cv2, time_seconds, frame_interval=1 / 60, retries=6):
    for attempt in range(retries + 1):
        seek_time = max(0, time_seconds - frame_interval * attempt)
        cap.set(cv2.CAP_PROP_POS_MSEC, seek_time * 1000)
        ok, frame = cap.read()
        if ok:
            return frame

    raise RuntimeError(f"Cannot read frame at {time_seconds:.3f}s")


def read_frame_or_previous(cap, cv2, time_seconds, previous_frame=None, frame_interval=1 / 60):
    try:
        return read_frame_at(cap, cv2, time_seconds, frame_interval=frame_interval)
    except RuntimeError:
        if previous_frame is not None:
            print(
                f"Cannot read frame at {time_seconds:.3f}s; reusing previous frame",
                file=sys.stderr,
            )
            return previous_frame
        raise


def write_webp_frame(frame, cv2, Image, output_path, width, height, quality):
    resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(rgb)
    image.save(output_path, "WEBP", quality=quality, method=6)


def extract_frames(args):
    cv2, Image = load_dependencies()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input video does not exist: {input_path}")

    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open input video: {input_path}")

    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0
    source_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0

    duration = source_frames / source_fps if source_fps > 0 and source_frames > 0 else 0
    if duration <= 0:
        raise SystemExit(f"Cannot determine video duration: {input_path}")

    start_time = min(max(0, args.start), duration)
    end_time = min(max(start_time, args.end if args.end is not None else duration), duration)
    sample_duration = max(0.001, end_time - start_time)
    width, height = resize_dimensions(source_width, source_height, args.width)
    frame_times = build_frame_times(start_time, end_time, args.fps)

    clean_output_dir(output_path, args.replace)

    previous_frame = None

    try:
        for index, time_seconds in enumerate(frame_times):
            frame = read_frame_or_previous(
                cap,
                cv2,
                min(time_seconds, duration - 0.001),
                previous_frame=previous_frame,
                frame_interval=1 / args.fps,
            )
            previous_frame = frame
            frame_path = output_path / f"frame_{index:04d}.webp"
            write_webp_frame(frame, cv2, Image, frame_path, width, height, args.quality)

            if index % 25 == 0 or index == len(frame_times) - 1:
                print(f"wrote {index + 1}/{len(frame_times)}")
    finally:
        cap.release()

    if len(frame_times) < 2:
        raise SystemExit("Frame extraction produced fewer than 2 frames.")

    base_path = args.base_path or infer_base_path(output_path, "/frames/web_vedio")
    manifest = {
        "basePath": base_path,
        "duration": round(sample_duration, 3),
        "endTime": round(end_time, 3),
        "ext": "webp",
        "fps": args.fps,
        "frameCount": len(frame_times),
        "height": height,
        "pad": 4,
        "startTime": round(start_time, 3),
        "width": width,
    }

    manifest_path = output_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(f"wrote {len(frame_times)} frames")
    print(f"manifest: {manifest_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract a 2K 60fps WebP frame sequence and manifest for ScrollVideo with OpenCV."
    )
    parser.add_argument("--input", default="public/web_vedio.mp4")
    parser.add_argument("--output", default="public/frames/web_vedio")
    parser.add_argument("--base-path", default=None)
    parser.add_argument("--fps", type=float, default=60)
    parser.add_argument("--width", type=int, default=2560)
    parser.add_argument("--quality", type=int, default=78)
    parser.add_argument("--start", type=float, default=0.35)
    parser.add_argument("--end", type=float, default=None)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()

    extract_frames(args)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
