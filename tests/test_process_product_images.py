import base64
import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


class LocalWorkflowTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "loja"
        self.assets = self.root / "assets/products"
        self.assets.mkdir(parents=True)
        self.catalog = self.root / "data/products.json"
        self.catalog.parent.mkdir()
        for script in ("process_product_images.py", "extract_product_images.py",
                       "convert_product_images_to_webp.py"):
            shutil.copyfile(ROOT / script, self.root / script)

    def run_script(self, expected=0):
        result = subprocess.run(
            [sys.executable, str(self.root / "process_product_images.py")],
            cwd=self.root.parent, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, expected, result.stderr + result.stdout)
        return result

    def write_catalog(self, images):
        self.catalog.write_text(json.dumps({"produtos": [{"nome": "Léo", "imagens": images}]}))

    def snapshot(self):
        return {p: (p.stat().st_mtime_ns, p.read_bytes())
                for directory in (self.assets, self.catalog.parent)
                for p in directory.rglob("*") if p.is_file()}

    def test_converts_only_extracted_files_and_is_idempotent(self):
        existing = self.assets / "leo-1.webp"
        Image.new("RGB", (32, 16), "red").save(existing)
        original = existing.read_bytes()
        thumbs = self.assets / "thumbs"
        thumbs.mkdir()
        Image.new("RGB", (11, 11), "blue").save(thumbs / existing.name)
        thumbnail = (thumbs / existing.name).read_bytes()
        legacy = self.assets / "foto antiga.png"
        Image.new("RGBA", (600, 300), (30, 60, 90, 150)).save(legacy)
        legacy_bytes = legacy.read_bytes()
        unreferenced = self.assets / "fora-do-catalogo.png"
        unreferenced.write_bytes(legacy_bytes)
        png = "data:image/png;base64," + base64.b64encode(legacy_bytes).decode()
        webp = base64.b64encode(original).decode()
        self.write_catalog([png, webp, "./assets/products/foto antiga.png",
                            "/assets/products/foto antiga.png", "assets/products/leo-1.webp",
                            "https://example.org/externa.jpg"])

        self.run_script()
        refs = json.loads(self.catalog.read_bytes())["produtos"][0]["imagens"]
        self.assertEqual(refs[:2], ["assets/products/leo-1-2.webp", "assets/products/leo-2.webp"])
        self.assertEqual(refs[2:4], ["./assets/products/foto antiga.png", "/assets/products/foto antiga.png"])
        self.assertEqual((self.root / refs[1]).read_bytes(), original)
        self.assertEqual(existing.read_bytes(), original)
        self.assertEqual((thumbs / existing.name).read_bytes(), thumbnail)
        self.assertEqual(legacy.read_bytes(), legacy_bytes)
        self.assertFalse(legacy.with_suffix(".webp").exists())
        self.assertFalse((self.assets / "leo-1-2.png").exists())
        self.assertFalse((thumbs / unreferenced.name).exists())
        for name, fmt, size in (("leo-1-2.webp", "WEBP", (480, 240)),
                                ("leo-2.webp", "WEBP", (32, 16)),
                                (legacy.name, "PNG", (480, 240))):
            with Image.open(thumbs / name) as image:
                self.assertEqual((image.format, image.size), (fmt, size))
                image.load()
        before = self.snapshot()
        self.run_script()
        self.assertEqual(self.snapshot(), before)

    def test_no_base64_still_creates_oriented_and_nested_thumbnails(self):
        directory = self.assets / "coleção"
        directory.mkdir()
        source = directory / "retrato.JPG"
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (640, 320)).save(source, exif=exif)
        gif = self.assets / "animado.gif"
        Image.new("RGB", (24, 18), "red").save(
            gif, save_all=True, append_images=[Image.new("RGB", (24, 18), "blue")], duration=100,
        )
        self.catalog.write_text(json.dumps([{"images": [source.relative_to(self.root).as_posix(),
                                                        gif.relative_to(self.root).as_posix()]}]))
        before = self.catalog.read_bytes()
        self.run_script()
        self.assertEqual(self.catalog.read_bytes(), before)
        with Image.open(directory / "thumbs" / source.name) as thumb:
            self.assertEqual((thumb.format, thumb.size), ("JPEG", (240, 480)))
            self.assertEqual(thumb.getexif().get(274, 1), 1)
        with Image.open(self.assets / "thumbs" / gif.name) as thumb:
            self.assertEqual((thumb.n_frames, thumb.size), (1, (24, 18)))
            self.assertEqual(thumb.convert("RGB").getpixel((0, 0)), (255, 0, 0))

    def test_failed_batch_validates_published_catalog_and_keeps_extracted_sources(self):
        png = io.BytesIO()
        Image.new("RGB", (12, 6)).save(png, "PNG")
        self.write_catalog([base64.b64encode(png.getvalue()).decode(),
                            "data:image/svg+xml;base64," + base64.b64encode(b"<svg/>").decode()])
        result = self.run_script(expected=1)
        self.assertIn("leo-2.svg", result.stderr)
        self.assertIn("leo-1.png", result.stderr)
        self.assertEqual(json.loads(self.catalog.read_bytes())["produtos"][0]["imagens"],
                         ["assets/products/leo-1.png", "assets/products/leo-2.svg"])
        self.assertEqual((self.assets / "leo-1.png").read_bytes(), png.getvalue())
        self.assertEqual((self.assets / "leo-2.svg").read_bytes(), b"<svg/>")
        self.assertFalse(list(self.assets.rglob("*.webp")))
        with Image.open(self.assets / "thumbs/leo-1.png") as thumb:
            thumb.load()
        self.assertFalse((self.assets / "thumbs/leo-2.svg").exists())

    def test_reports_invalid_sources_and_existing_thumbnails_and_continues(self):
        thumbs = self.assets / "thumbs"
        thumbs.mkdir()
        corrupt = thumbs / "produto.png"
        corrupt.write_bytes(b"miniatura original ilegivel")
        Image.new("RGB", (20, 12)).save(self.assets / "produto.png")
        Image.new("RGB", (12, 20)).save(self.assets / "outra.png")
        (self.assets / "ilegivel.jpg").write_bytes(b"quebrada")
        Image.new("RGB", (3, 3)).save(self.assets / "falsa.webp", format="PNG")
        self.write_catalog(["assets/products/" + name for name in
                            ("produto.png", "ausente.png", "ilegivel.jpg", "falsa.webp", "outra.png")])
        before = self.catalog.read_bytes()
        result = self.run_script(expected=1)
        for name in ("thumbs/produto.png", "ausente.png", "ilegivel.jpg", "falsa.webp"):
            self.assertIn(name, result.stderr)
        self.assertEqual(corrupt.read_bytes(), b"miniatura original ilegivel")
        self.assertTrue((thumbs / "outra.png").is_file())
        self.assertEqual(self.catalog.read_bytes(), before)

    def test_bad_json_and_failed_extraction_do_not_publish_partial_results(self):
        self.catalog.write_text("{")
        self.run_script(expected=1)
        self.assertEqual(self.catalog.read_text(), "{")
        data = io.BytesIO()
        Image.new("RGB", (8, 4)).save(data, "PNG")
        self.write_catalog([base64.b64encode(data.getvalue()).decode(), "data:image/png;base64,inválido"])
        before = self.catalog.read_bytes()
        result = self.run_script(expected=1)
        self.assertIn("base64 ainda presente", result.stderr)
        self.assertIn("base64 inválido", result.stderr)
        self.assertEqual(self.catalog.read_bytes(), before)
        self.assertEqual(list(self.assets.iterdir()), [])

    def test_paths_outside_assets_cannot_create_thumbnails(self):
        outside = self.root.parent / "fora"
        outside.mkdir()
        try:
            (self.assets / "thumbs").symlink_to(outside, target_is_directory=True)
        except OSError as error:
            self.skipTest(str(error))
        Image.new("RGB", (2, 2)).save(self.assets / "antiga.png")
        self.write_catalog(["assets/products/antiga.png", "assets/../../foto.png"])
        result = self.run_script(expected=1)
        self.assertIn("Miniatura fora de assets", result.stderr)
        self.assertIn("caminho local inválido", result.stderr)
        self.assertEqual(list(outside.iterdir()), [])

    def test_reports_inline_base64_that_the_extractor_left_in_the_catalog(self):
        self.write_catalog(["data:application/octet-stream;base64,YWJj"])
        before = self.catalog.read_bytes()
        result = self.run_script(expected=1)
        self.assertIn("imagem base64 ainda presente", result.stderr)
        self.assertEqual(self.catalog.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
