#!/usr/bin/env python3
"""Extrai imagens em base64 do catálogo e atualiza suas referências."""

from __future__ import annotations

import base64
import binascii
import json
import os
import re
import stat
import tempfile
import unicodedata
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent
PRODUCTS_FILE = PROJECT_ROOT / "data" / "products.json"
PRODUCT_IMAGES_DIR = PROJECT_ROOT / "assets" / "products"

MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
}

BASE64_PATTERN = re.compile(r"[A-Za-z0-9+/]*={0,2}")


def slugify(value: str) -> str:
    """Converte um texto em um trecho seguro para nome de arquivo."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "produto"


def decode_base64(payload: str) -> bytes:
    """Decodifica base64 padrão, tolerando espaços e padding ausente."""
    compact = re.sub(r"\s+", "", payload)
    if not compact or not BASE64_PATTERN.fullmatch(compact):
        raise ValueError("conteúdo base64 inválido")

    compact += "=" * (-len(compact) % 4)
    try:
        return base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("conteúdo base64 inválido") from error


def extension_from_image(data: bytes, mime_type: str | None = None) -> str | None:
    """Identifica a extensão pela assinatura do arquivo ou pelo MIME type."""
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    if data.startswith(b"BM"):
        return ".bmp"
    if data.startswith((b"II*\x00", b"MM\x00*")):
        return ".tiff"
    if data.startswith(b"\x00\x00\x01\x00"):
        return ".ico"
    if len(data) >= 12 and data[4:8] == b"ftyp":
        brand = data[8:12]
        if brand in {b"avif", b"avis"}:
            return ".avif"
        if brand in {b"heic", b"heix", b"hevc", b"hevx"}:
            return ".heic"
        if brand in {b"heif", b"mif1", b"msf1"}:
            return ".heif"

    beginning = data[:1024].lstrip(b"\xef\xbb\xbf\x00\t\r\n ").lower()
    if beginning.startswith(b"<svg") or (
        beginning.startswith(b"<?xml") and b"<svg" in beginning
    ):
        return ".svg"

    if mime_type:
        return MIME_EXTENSIONS.get(mime_type.lower())
    return None


def image_from_base64(value: Any) -> tuple[bytes, str] | None:
    """Retorna bytes e extensão quando o valor contém uma imagem em base64."""
    if not isinstance(value, str):
        return None

    if value.lower().startswith("data:"):
        header, separator, payload = value.partition(",")
        parts = header[5:].split(";")
        mime_type = parts[0].lower()

        if not separator or not mime_type.startswith("image/"):
            return None
        if "base64" not in {part.lower() for part in parts[1:]}:
            return None

        data = decode_base64(payload)
        extension = extension_from_image(data, mime_type)
        if extension is None:
            raise ValueError(f"formato de imagem não suportado: {mime_type}")
        return data, extension

    # Para base64 sem data URI, a assinatura precisa confirmar que é uma imagem.
    compact = re.sub(r"\s+", "", value)
    if len(compact) < 16 or not BASE64_PATTERN.fullmatch(compact):
        return None

    try:
        data = decode_base64(compact)
    except ValueError:
        return None

    extension = extension_from_image(data)
    return (data, extension) if extension else None


def products_from_catalog(catalog: Any) -> list[Any]:
    if isinstance(catalog, list):
        return catalog
    if isinstance(catalog, dict):
        for key in ("produtos", "products"):
            products = catalog.get(key)
            if isinstance(products, list):
                return products
    raise ValueError("products.json deve conter uma lista em 'produtos' ou 'products'")


def image_list_from_product(product: dict[str, Any]) -> tuple[str, list[Any]] | None:
    for key in ("imagens", "images"):
        if key in product:
            images = product[key]
            if not isinstance(images, list):
                raise ValueError(f"o campo '{key}' deve ser uma lista")
            return key, images
    return None


def available_path(stem: str, image_number: int, extension: str) -> Path:
    """Escolhe um nome ainda inexistente sem sobrescrever arquivos."""
    base_name = f"{stem}-{image_number}"
    candidate = PRODUCT_IMAGES_DIR / f"{base_name}{extension}"
    suffix = 2
    while candidate.exists():
        candidate = PRODUCT_IMAGES_DIR / f"{base_name}-{suffix}{extension}"
        suffix += 1
    return candidate


def write_catalog_atomically(catalog: Any) -> None:
    """Substitui o JSON somente depois de gravar por completo um temporário."""
    current_mode = stat.S_IMODE(PRODUCTS_FILE.stat().st_mode)
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=PRODUCTS_FILE.parent,
            prefix=f".{PRODUCTS_FILE.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(catalog, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())

        temporary_path.chmod(current_mode)
        os.replace(temporary_path, PRODUCTS_FILE)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


def main() -> int:
    with PRODUCTS_FILE.open(encoding="utf-8") as products_file:
        catalog = json.load(products_file)

    products = products_from_catalog(catalog)
    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    created_files: list[Path] = []
    converted_count = 0

    try:
        for product_index, product in enumerate(products, start=1):
            if not isinstance(product, dict):
                continue

            image_field = image_list_from_product(product)
            if image_field is None:
                continue

            _, images = image_field
            product_name = str(product.get("nome") or product.get("name") or "")
            product_code = str(
                product.get("codigo")
                or product.get("code")
                or product.get("id")
                or product_index
            )
            stem = slugify(product_name or f"produto-{product_code}")

            for image_index, image_value in enumerate(images, start=1):
                try:
                    decoded_image = image_from_base64(image_value)
                except ValueError as error:
                    label = product_name or product_code
                    raise ValueError(
                        f"imagem {image_index} do produto '{label}': {error}"
                    ) from error

                if decoded_image is None:
                    continue

                image_data, extension = decoded_image
                destination = available_path(stem, image_index, extension)

                # O modo "xb" também protege contra uma criação concorrente.
                while True:
                    try:
                        destination_file = destination.open("xb")
                        break
                    except FileExistsError:
                        destination = available_path(stem, image_index, extension)

                created_files.append(destination)
                with destination_file:
                    destination_file.write(image_data)
                    destination_file.flush()
                    os.fsync(destination_file.fileno())

                images[image_index - 1] = destination.relative_to(PROJECT_ROOT).as_posix()
                converted_count += 1

        if converted_count:
            write_catalog_atomically(catalog)
    except BaseException:
        for created_file in reversed(created_files):
            created_file.unlink(missing_ok=True)
        raise

    if converted_count:
        print(f"{converted_count} imagem(ns) criada(s) e products.json atualizado.")
    else:
        print("Nenhuma imagem em base64 encontrada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
