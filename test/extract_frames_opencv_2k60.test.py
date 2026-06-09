import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "extract-frames-opencv-2k60.py"


def load_script():
    spec = importlib.util.spec_from_file_location("extract_frames_opencv_2k60", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ExtractFramesOpenCv2k60Test(unittest.TestCase):
    def test_infers_public_base_path(self):
        module = load_script()

        base_path = module.infer_base_path(ROOT / "public" / "frames" / "web_vedio", "/fallback")

        self.assertEqual(base_path, "/frames/web_vedio")

    def test_does_not_upscale_and_preserves_aspect_ratio(self):
        module = load_script()

        self.assertEqual(module.resize_dimensions(3840, 2160, 2560), (2560, 1440))
        self.assertEqual(module.resize_dimensions(1280, 720, 2560), (1280, 720))

    def test_builds_60fps_frame_times_inside_requested_range(self):
        module = load_script()

        times = module.build_frame_times(start_time=0.35, end_time=0.4, fps=60)

        self.assertEqual(times[0], 0.35)
        self.assertEqual(times[-1], 0.4)
        self.assertEqual(len(times), 4)

    def test_reads_nearby_earlier_frame_when_exact_tail_seek_fails(self):
        module = load_script()

        class FakeCv2:
            CAP_PROP_POS_MSEC = 0

        class FakeCap:
            def __init__(self):
                self.positions = []

            def set(self, prop, value):
                self.positions.append(value)

            def read(self):
                if len(self.positions) == 1:
                    return False, None
                return True, "frame"

        frame = module.read_frame_at(FakeCap(), FakeCv2, 10.016, frame_interval=1 / 60)

        self.assertEqual(frame, "frame")

    def test_reuses_previous_frame_when_tail_seek_still_fails(self):
        module = load_script()

        class FakeCv2:
            CAP_PROP_POS_MSEC = 0

        class FakeCap:
            def set(self, prop, value):
                pass

            def read(self):
                return False, None

        frame = module.read_frame_or_previous(
            FakeCap(),
            FakeCv2,
            10.016,
            previous_frame="previous-frame",
            frame_interval=1 / 60,
        )

        self.assertEqual(frame, "previous-frame")


if __name__ == "__main__":
    unittest.main()
