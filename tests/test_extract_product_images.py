import base64
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import extract_product_images as script


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8A"
    "AQUBAScY42YAAAAASUVORK5CYII="
)
PNG_BASE64 = base64.b64encode(PNG_BYTES).decode("ascii")


class ImageFromBase64Tests(unittest.TestCase):
    def test_decodes_image_data_uri(self):
        result = script.image_from_base64(f"data:image/png;base64,{PNG_BASE64}")

        self.assertEqual(result, (PNG_BYTES, ".png"))

    def test_decodes_raw_base64_when_content_is_an_image(self):
        result = script.image_from_base64(PNG_BASE64)

        self.assertEqual(result, (PNG_BYTES, ".png"))

    def test_ignores_existing_image_path(self):
        self.assertIsNone(
            script.image_from_base64("assets/products/produto-existente.png")
        )

    def test_rejects_invalid_image_data_uri(self):
        with self.assertRaisesRegex(ValueError, "conteúdo base64 inválido"):
            script.image_from_base64("data:image/png;base64,não-é-base64")


class FileNameTests(unittest.TestCase):
    def test_slugify_removes_accents_and_unsafe_characters(self):
        self.assertEqual(
            script.slugify("  Maçã com Clipes & Chaveiro!  "),
            "maca-com-clipes-chaveiro",
        )

    def test_available_path_does_not_repeat_existing_name(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            images_directory = Path(temporary_directory)
            (images_directory / "produto-1.png").write_bytes(b"existente")

            with mock.patch.object(script, "PRODUCT_IMAGES_DIR", images_directory):
                result = script.available_path("produto", 1, ".png")

            self.assertEqual(result.name, "produto-1-2.png")


class MainTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.project_root = Path(self.temporary_directory.name)
        self.products_file = self.project_root / "data" / "products.json"
        self.images_directory = self.project_root / "assets" / "products"
        self.products_file.parent.mkdir(parents=True)
        self.images_directory.mkdir(parents=True)

        self.path_patches = (
            mock.patch.object(script, "PROJECT_ROOT", self.project_root),
            mock.patch.object(script, "PRODUCTS_FILE", self.products_file),
            mock.patch.object(
                script, "PRODUCT_IMAGES_DIR", self.images_directory
            ),
        )
        for path_patch in self.path_patches:
            path_patch.start()
            self.addCleanup(path_patch.stop)
        self.addCleanup(self.temporary_directory.cleanup)

    def write_catalog(self, catalog):
        self.products_file.write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def read_catalog(self):
        return json.loads(self.products_file.read_text(encoding="utf-8"))

    def test_creates_images_with_unique_names_and_updates_catalog(self):
        existing_image = self.images_directory / "produto-teste-1.png"
        existing_content = "não sobrescrever".encode("utf-8")
        existing_image.write_bytes(existing_content)
        self.write_catalog(
            {
                "produtos": [
                    {
                        "codigo": "42",
                        "nome": "Produto Teste",
                        "imagens": [
                            f"data:image/png;base64,{PNG_BASE64}",
                            PNG_BASE64,
                            "assets/products/existente.jpg",
                        ],
                    }
                ]
            }
        )

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = script.main()

        images = self.read_catalog()["produtos"][0]["imagens"]
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            images,
            [
                "assets/products/produto-teste-1-2.png",
                "assets/products/produto-teste-2.png",
                "assets/products/existente.jpg",
            ],
        )
        self.assertEqual(
            (self.project_root / images[0]).read_bytes(), PNG_BYTES
        )
        self.assertEqual(
            (self.project_root / images[1]).read_bytes(), PNG_BYTES
        )
        self.assertEqual(existing_image.read_bytes(), existing_content)
        self.assertIn("2 imagem(ns) criada(s)", output.getvalue())

    def test_does_not_rewrite_catalog_when_there_is_no_base64(self):
        original = (
            '{"produtos":[{"nome":"Sem base64","imagens":'
            '["assets/products/imagem.jpg"]}]}\n'
        )
        self.products_file.write_text(original, encoding="utf-8")

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            script.main()

        self.assertEqual(self.products_file.read_text(encoding="utf-8"), original)
        self.assertIn("Nenhuma imagem em base64 encontrada", output.getvalue())

    def test_removes_created_images_and_preserves_catalog_after_error(self):
        catalog = {
            "produtos": [
                {
                    "nome": "Produto com erro",
                    "imagens": [
                        f"data:image/png;base64,{PNG_BASE64}",
                        "data:image/png;base64,base64-inválido!",
                    ],
                }
            ]
        }
        self.write_catalog(catalog)
        original_json = self.products_file.read_bytes()

        with self.assertRaisesRegex(ValueError, "imagem 2"):
            script.main()

        self.assertEqual(self.products_file.read_bytes(), original_json)
        self.assertEqual(list(self.images_directory.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
