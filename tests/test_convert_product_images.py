import contextlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

import convert_product_images_to_webp as converter


class ConversionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.images = self.root / "assets/products"
        self.images.mkdir(parents=True)
        self.catalog = self.root / "data/products.json"
        self.catalog.parent.mkdir()
        paths = mock.patch.multiple(converter, PROJECT_ROOT=self.root, PRODUCTS_FILE=self.catalog)
        paths.start()
        self.addCleanup(paths.stop)

    def create_image(self, name, **options):
        path = self.images / name
        Image.new("RGBA", (8, 12), (0, 80, 200, 64)).save(path, **options)
        return path

    def write_refs(self, *paths):
        refs = [p.relative_to(self.root).as_posix() for p in paths]
        self.catalog.write_text(json.dumps([{"images": refs}]), encoding="utf-8")
        return self.catalog.read_bytes()

    def convert(self, *paths):
        with contextlib.redirect_stdout(io.StringIO()):
            return converter.convert_images(list(paths))

    def test_updates_all_image_fields_including_escaped_paths_and_preserves_metadata(self):
        source = self.create_image("São João.png")
        existing = self.create_image("antiga.webp")
        other = self.create_image("outra.png")
        existing_bytes = existing.read_bytes()
        source_ref = "assets/products/São João.png"
        other_ref = "assets/products/outra.png"
        existing_ref = "./assets/products/antiga.webp"
        catalog = {
            "produtos": [{"descricao": source_ref, "imagens": [source_ref, existing_ref, other_ref]}],
            "products": [{"images": ["./" + source_ref], "imagens": ["/" + source_ref]}],
        }
        text = json.dumps(catalog, ensure_ascii=True).replace("/", r"\/")
        self.catalog.write_text(text, encoding="utf-8-sig")

        self.assertEqual(self.convert(source, source, existing), 0)

        new_ref = "assets/products/São João.webp"
        catalog["produtos"][0]["imagens"][0] = new_ref
        catalog["products"][0] = {"images": [new_ref], "imagens": [new_ref]}
        self.assertEqual(json.loads(self.catalog.read_bytes()), catalog)
        with Image.open(self.root / new_ref) as image:
            self.assertEqual((image.format, image.size), ("WEBP", (8, 12)))
            self.assertEqual(image.getpixel((0, 0))[3], 64)
        self.assertFalse(source.exists())
        self.assertTrue(other.exists())
        self.assertEqual(existing.read_bytes(), existing_bytes)

    def test_webp_only_is_idempotent_and_rejects_mislabeled_content(self):
        source = self.create_image("pronta.WEBP")
        before = self.write_refs(source)
        content = source.read_bytes()
        self.convert(source)
        self.assertEqual(self.catalog.read_bytes(), before)
        self.assertEqual(source.read_bytes(), content)
        self.create_image(source.name, format="PNG")
        with self.assertRaisesRegex(ValueError, "extensão WebP"):
            self.convert(source)
        self.assertEqual(self.catalog.read_bytes(), before)
        self.assertTrue(source.exists())

    def test_rotates_jpeg_using_exif(self):
        source = self.images / "retrato.jpg"
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (18, 8)).save(source, exif=exif)
        self.write_refs(source)
        self.convert(source)
        with Image.open(source.with_suffix(".webp")) as image:
            self.assertEqual(image.size, (8, 18))
            self.assertEqual(image.getexif().get(274, 1), 1)

    def test_animation_keeps_frames_distinct_timing_and_play_count(self):
        for suffix, loop, expected in (
            ("gif", None, 1), ("gif", 2, 3), ("gif", 0, 0), ("png", 2, 2),
        ):
            with self.subTest(suffix=suffix, loop=loop):
                source = self.images / f"animacao-{suffix}-{loop}.{suffix}"
                options = {} if loop is None else {"loop": loop}
                first = Image.new("RGB", (12, 8), "red")
                second = Image.new("RGB", first.size, "blue")
                first.save(source, save_all=True, append_images=[second], duration=[40, 130], **options)
                self.write_refs(source)
                self.convert(source)
                with Image.open(source.with_suffix(".webp")) as image:
                    self.assertEqual(image.n_frames, 2)
                    self.assertEqual(image.info["loop"], expected)
                    for index, (channel, duration) in enumerate(((0, 40), (2, 130))):
                        image.seek(index)
                        self.assertGreater(image.getpixel((0, 0))[channel], 230)
                        self.assertEqual(image.info["duration"], duration)

    def test_rejects_unrepresentable_frames_and_preserves_the_original(self):
        for name, options in (("paginas.tiff", {}), ("capa.png", {"default_image": True})):
            with self.subTest(name=name):
                source = self.images / name
                first = Image.new("RGB", (8, 4), "red")
                second = Image.new("RGB", first.size, "blue")
                first.save(source, save_all=True, append_images=[second], **options)
                before = self.write_refs(source)
                with self.assertRaisesRegex(ValueError, "páginas independentes ou uma capa"):
                    self.convert(source)
                self.assertTrue(source.exists())
                self.assertFalse(source.with_suffix(".webp").exists())
                self.assertEqual(self.catalog.read_bytes(), before)

    def test_mixed_batch_rolls_back_all_outputs_and_reports_unreadable_files(self):
        good = self.create_image("boa.png")
        bad = self.images / "ruim.jpg"
        bad.write_bytes(b"truncada")
        svg = self.images / "vetor.svg"
        svg.write_text('<svg xmlns="http://www.w3.org/2000/svg"/>', encoding="utf-8")
        before = self.write_refs(good, bad, svg)
        with self.assertRaises(ValueError) as raised:
            self.convert(good, bad, svg)
        self.assertIn(bad.name, str(raised.exception))
        self.assertIn(svg.name, str(raised.exception))
        self.assertEqual(set(self.images.iterdir()), {good, bad, svg})
        self.assertEqual(self.catalog.read_bytes(), before)
        self.convert(good)
        self.assertTrue(good.with_suffix(".webp").is_file())

    def test_refuses_external_missing_unreferenced_and_colliding_paths(self):
        source = self.create_image("item.png")
        duplicate = self.create_image("item.bmp")
        unreferenced = self.create_image("outra.png")
        external = self.root / "fora.png"
        external.write_bytes(source.read_bytes())
        missing = self.images / "ausente.png"
        before = self.write_refs(source, duplicate, missing)
        for args in ((external,), (missing,), (unreferenced,), (source, duplicate)):
            with self.subTest(args=args), self.assertRaises((OSError, ValueError)):
                self.convert(*args)
        destination = self.images / "item.webp"
        destination.write_bytes(b"preexistente")
        with self.assertRaises(FileExistsError):
            self.convert(source)
        self.assertEqual(destination.read_bytes(), b"preexistente")
        self.assertTrue(source.is_file())
        self.assertEqual(self.catalog.read_bytes(), before)

    def test_failure_publishing_catalog_preserves_files_and_allows_retry(self):
        source = self.create_image("produto.png")
        source_bytes = source.read_bytes()
        before = self.write_refs(source)
        with mock.patch("os.replace", side_effect=OSError("disco cheio")):
            with self.assertRaisesRegex(OSError, "disco cheio"):
                self.convert(source)
        self.assertEqual(self.catalog.read_bytes(), before)
        self.assertEqual(source.read_bytes(), source_bytes)
        self.assertEqual(list(self.images.iterdir()), [source])
        self.assertEqual(list(self.catalog.parent.iterdir()), [self.catalog])
        self.convert(source)
        self.assertFalse(source.exists())
        self.assertTrue(source.with_suffix(".webp").exists())

    def test_interrupt_after_atomic_replace_keeps_published_images(self):
        source = self.create_image("produto.png")
        self.write_refs(source)
        replace = os.replace

        def replace_then_interrupt(*args):
            replace(*args)
            raise KeyboardInterrupt

        with mock.patch("os.replace", side_effect=replace_then_interrupt):
            with self.assertRaises(KeyboardInterrupt):
                self.convert(source)

        ref = json.loads(self.catalog.read_bytes())[0]["images"][0]
        self.assertEqual(ref, "assets/products/produto.webp")
        with Image.open(self.root / ref) as image:
            image.load()
        self.assertTrue(source.is_file())


if __name__ == "__main__":
    unittest.main()
