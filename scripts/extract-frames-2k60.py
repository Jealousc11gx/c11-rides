#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def require_tool(name):
    path = shutil.which(name)
    if not path:
        raise SystemExit(f"Missing required command: {name}")
    return path


def ffprobe_duration(input_path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(input_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def infer_base_path(output_path, fallback):
    parts = output_path.resolve().parts
    if "public" not in parts:
        return fallback

    public_index = parts.index("public")
    relative_parts = parts[public_index + 1 :]
    if not relative_parts:
        return fallback

    return "/" + "/".join(relative_parts)


def clean_output_dir(output_path, replace):
    if output_path.exists() and any(output_path.iterdir()) and not replace:
        raise SystemExit(
            f"Output directory is not empty: {output_path}\n"
            "Pass --replace to overwrite generated frames."
        )

    if output_path.exists() and replace:
        shutil.rmtree(output_path)

    output_path.mkdir(parents=True, exist_ok=True)


def count_frames(output_path):
    return len(list(output_path.glob("frame_*.webp")))


def main():
    parser = argparse.ArgumentParser(
        description="Extract a 2K 60fps WebP frame sequence and manifest for ScrollVideo."
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

    require_tool("ffmpeg")
    require_tool("ffprobe")

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input video does not exist: {input_path}")

    duration = ffprobe_duration(input_path)
    start_time = min(max(0, args.start), duration)
    end_time = min(max(start_time, args.end if args.end is not None else duration), duration)
    sample_duration = max(0.001, end_time - start_time)

    clean_output_dir(output_path, args.replace)

    output_pattern = output_path / "frame_%04d.webp"
    scale_filter = f"fps={args.fps},scale='min({args.width},iw)':-2:flags=lanczos"
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{start_time:.3f}",
        "-i",
        str(input_path),
        "-t",
        f"{sample_duration:.3f}",
        "-vf",
        scale_filter,
        "-q:v",
        str(args.quality),
        "-start_number",
        "0",
        str(output_pattern),
    ]

    subprocess.run(command, check=True)

    frame_count = count_frames(output_path)
    if frame_count < 2:
        raise SystemExit("Frame extraction produced fewer than 2 frames.")

    base_path = args.base_path or infer_base_path(output_path, "/frames/web_vedio")
    manifest = {
        "basePath": base_path,
        "frameCount": frame_count,
        "fps": args.fps,
        "duration": round(sample_duration, 3),
        "startTime": round(start_time, 3),
        "endTime": round(end_time, 3),
        "width": args.width,
        "pad": 4,
        "ext": "webp",
    }

    manifest_path = output_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(f"wrote {frame_count} frames")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(f"Command failed with exit code {error.returncode}", file=sys.stderr)
        raise SystemExit(error.returncode)
