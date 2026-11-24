#!/usr/bin/env python3
"""Extrai imagens do catálogo, converte as novas para WebP e completa as miniaturas locais."""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageOps
except ModuleNotFoundError as error:
    if __name__ == "__main__" and error.name == "PIL":
        sys.exit("Instale o Pillow com o comando python3 -m pip install Pillow")
    raise

from convert_product_images_to_webp import convert_catalog_images
from extract_product_images import (
    PRODUCTS_FILE,
    PRODUCT_IMAGES_DIR,
    PROJECT_ROOT,
    catalog_image_lists,
    extract_image_files,
    image_from_base64,
    locked_catalog,
)

IMAGE_ERRORS = (OSError, ValueError, SyntaxError, EOFError, Image.DecompressionBombError)


def local_image_paths(catalog: Any, errors: list[str]) -> set[Path]:
    paths = set()
    for product_index, product, images in catalog_image_lists(catalog):
        name = product.get("nome") or product.get("name") or product_index
        for index, value in enumerate(images, 1):
            try:
                if not isinstance(value, str) or not value.strip():
                    raise ValueError("referência de imagem vazia ou inválida")
                ref = value.strip()
                inline_base64 = re.match(r"^data:[^,]*;\s*base64\s*(?:;|,|$)", ref, re.I)
                if inline_base64 or image_from_base64(ref) is not None:
                    raise ValueError("imagem base64 ainda presente no catálogo")
                if re.match(r"^[a-z][a-z0-9+.\-]*:|^//", ref, re.I):
                    continue
                ref = re.sub(r"^\.?/", "", ref, count=1)
                if (not ref.startswith("assets/") or re.search(r"[%?#\\\x00-\x1f\x7f]", ref)
                        or any(part in {"", ".", ".."} for part in ref.split("/"))):
                    raise ValueError(f"caminho local inválido: {ref[:120]}")
                source = PROJECT_ROOT / ref
                if not source.resolve().is_relative_to(PROJECT_ROOT / "assets"):
                    raise ValueError(f"caminho fora de assets: {ref}")
                paths.add(source)
            except (OSError, RuntimeError, ValueError) as error:
                errors.append(f"Produto '{name}', imagem {index}: {error}")
    return paths


def load_frames(image: Image.Image, expected_format: str | None) -> None:
    if expected_format and image.format != expected_format:
        raise ValueError(f"formato {image.format}, esperado {expected_format}")
    for index in range(getattr(image, "n_frames", 1)):
        image.seek(index)
        image.load()


def create_thumbnail(image: Image.Image, path: Path, image_format: str | None) -> bool:
    if not image_format or image_format not in Image.SAVE:
        raise ValueError(f"Pillow não grava miniaturas com extensão {path.suffix}")
    image.seek(0)
    thumb = ImageOps.exif_transpose(image)
    thumb.thumbnail((480, 480), Image.LANCZOS)
    if image_format == "JPEG" and thumb.mode not in {"RGB", "L", "CMYK"}:
        thumb = thumb.convert("RGB")
    options = {"sizes": [thumb.size]} if image_format == "ICO" else {}

    # A codificação termina antes de criar o destino. O modo exclusivo preserva
    # uma miniatura que outro processo tenha publicado durante a geração.
    with io.BytesIO() as encoded:
        thumb.save(encoded, format=image_format, **options)
        path.parent.mkdir(exist_ok=True)
        try:
            output = path.open("xb")
        except FileExistsError:
            return False
        try:
            with output:
                output.write(encoded.getbuffer())
        except BaseException:
            path.unlink(missing_ok=True)
            raise
    return True


def check_thumbnail_pair(source: Path) -> tuple[bool, list[str]]:
    # productThumbnailUrl insere thumbs/ ao lado da imagem, inclusive em subpastas.
    thumbnail = source.parent / "thumbs" / source.name
    try:
        if not thumbnail.resolve().is_relative_to(PROJECT_ROOT / "assets"):
            raise ValueError("Miniatura fora de assets")
    except (OSError, RuntimeError, ValueError) as error:
        return False, [f"{thumbnail.relative_to(PROJECT_ROOT)}: {error}"]

    errors = []
    created = False
    image_format = Image.registered_extensions().get(source.suffix.lower())
    checking = source
    try:
        if not source.is_file():
            raise ValueError("arquivo de origem ausente ou inválido")
        with Image.open(source) as image:
            load_frames(image, "WEBP" if source.suffix.lower() == ".webp" else None)
            if not os.path.lexists(thumbnail):
                checking = thumbnail
                created = create_thumbnail(image, thumbnail, image_format)
    except IMAGE_ERRORS as error:
        errors.append(f"{checking.relative_to(PROJECT_ROOT)}: {error}")

    if os.path.lexists(thumbnail):
        try:
            if not thumbnail.is_file():
                raise ValueError("miniatura ausente ou inválida")
            with Image.open(thumbnail) as image:
                load_frames(image, image_format)
        except IMAGE_ERRORS as error:
            if created:
                thumbnail.unlink(missing_ok=True)
                created = False
            errors.append(f"{thumbnail.relative_to(PROJECT_ROOT)}: {error}")
    return created, errors


def main() -> int:
    errors: list[str] = []
    with locked_catalog(PRODUCTS_FILE) as catalog:
        if not PRODUCT_IMAGES_DIR.resolve().is_relative_to(PROJECT_ROOT / "assets"):
            raise ValueError("O diretório de imagens de produtos aponta para fora de assets")
        extracted: list[Path] = []
        converted: list[Path] = []
        try:
            extracted = extract_image_files(catalog)
        except (ValueError, OSError) as error:
            errors.append(f"Falha na extração: {error}")

        candidates = [path for path in extracted if path.suffix.lower() != ".webp"]
        if candidates:
            try:
                converted = convert_catalog_images(candidates, catalog)
            except IMAGE_ERRORS as error:
                errors.append(f"Falha na conversão: {error}")

        # Uma conversão pode ter revertido o lote. Valide as referências que
        # realmente foram publicadas, inclusive quando uma etapa informou erro.
        with PRODUCTS_FILE.open(encoding="utf-8-sig") as published:
            sources = local_image_paths(json.load(published), errors)
        for path in set(converted) - sources:
            errors.append(f"WebP convertido sem referência no catálogo: {path.name}")
        for path in candidates:
            if path in sources:
                errors.append(f"Imagem extraída mantida no formato original: {path.name}")
        # A gravação do catálogo pode ter sido concluída mesmo que a remoção
        # dos originais tenha falhado. Conte a conversão publicada em disco.
        converted_count = sum(path not in sources and path.with_suffix(".webp") in sources
                              for path in candidates)

        Image.init()
        thumbnails_created = 0
        with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as pool:
            for created, problems in pool.map(check_thumbnail_pair, sorted(sources)):
                thumbnails_created += int(created)
                errors.extend(problems)

    print(f"Extraídas: {len(extracted)}. Convertidas para WebP: {converted_count}. "
          f"Miniaturas criadas: {thumbnails_created}. Imagens locais verificadas: {len(sources)}.")
    for error in errors:
        print(error, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        sys.exit(str(error))
