#!/usr/bin/env python3
"""Converte imagens do catálogo para WebP e atualiza suas referências.

Uso: python3 convert_product_images_to_webp.py assets/products/imagem.jpg [...]
Requer Pillow: python3 -m pip install Pillow
"""

from __future__ import annotations

import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, BinaryIO

from PIL import Image, ImageOps, ImageSequence, features

from extract_product_images import (
    PROJECT_ROOT,
    PRODUCTS_FILE,
    catalog_image_lists,
    locked_catalog,
    publish_images,
)


def plan_conversion(paths: list[Path], catalog: Any) -> dict[Path, Path]:
    """Valida o lote e troca somente as referências de imagens, ainda em memória."""
    jobs: dict[Path, Path] = {}
    destinations: set[Path] = set()
    replacements: dict[str, str] = {}
    for path in paths:
        source = path.resolve()
        if not source.is_relative_to(PROJECT_ROOT / "assets" / "products"):
            raise ValueError(f"Imagem fora de assets/products: {path}")
        if source != Path(os.path.abspath(path)):
            raise ValueError(f"Imagem acessada por link simbólico: {path}")
        if source in jobs:
            continue
        if not source.is_file():
            raise ValueError(f"Imagem de origem ausente ou inválida: {path}")

        destination = source
        if source.suffix.lower() != ".webp":
            destination = source.with_suffix(".webp")
            if destination in destinations or os.path.lexists(destination):
                raise FileExistsError(f"Destino já existe ou se repete no lote: {destination}")
        jobs[source] = destination
        destinations.add(destination)
        relative = source.relative_to(PROJECT_ROOT).as_posix()
        replacements[relative] = destination.relative_to(PROJECT_ROOT).as_posix()

    found = set()
    for _, _, images in catalog_image_lists(catalog):
        for index, value in enumerate(images):
            if not isinstance(value, str):
                continue
            relative = value.strip().removeprefix("./").removeprefix("/")
            if relative in replacements:
                found.add(relative)
                if relative != replacements[relative]:
                    images[index] = replacements[relative]
    missing = replacements.keys() - found
    if missing:
        raise ValueError(f"Imagem não referenciada no catálogo: {', '.join(sorted(missing))}")
    return jobs


def save_webp(image: Image.Image, output: BinaryIO) -> None:
    options = {"quality": 85, "method": 6}
    if getattr(image, "n_frames", 1) == 1:
        image.load()
        if image.getexif().get(274, 1) != 1:
            image = ImageOps.exif_transpose(image)
        image.save(output, format="WEBP", **options)
        return

    if image.format not in {"GIF", "PNG", "AVIF", "WEBP"} or image.info.get("default_image"):
        raise ValueError("WebP não preserva páginas independentes ou uma capa separada da animação")

    # O encoder WebP do Pillow usa uma duração fixa se não receber a lista.
    # Mantenha os quadros no arquivo de origem durante as duas passagens.
    loop = image.info.get("loop", 1)
    if image.format == "GIF" and image.info.get("loop", 0) > 0:
        # GIF conta repetições após a primeira exibição. WebP conta exibições.
        loop += 1
    if loop > 65535:
        raise ValueError("quantidade de repetições excede o limite do WebP")

    durations = []
    rotate_frames = False
    for frame in ImageSequence.Iterator(image):
        frame.load()
        if frame.getexif().get(274, 1) != 1:
            rotate_frames = True
        durations.append(frame.info.get("duration", 0))
    image.seek(0)
    if rotate_frames:
        first, *others = [ImageOps.exif_transpose(frame) for frame in ImageSequence.Iterator(image)]
        options["append_images"] = others
        image = first
    image.save(
        output, format="WEBP", save_all=True, duration=durations, loop=loop,
        background=(0, 0, 0, 0), **options,
    )


def convert_file(source: Path, destination: Path, created: list[Path]) -> None:
    try:
        with Image.open(source) as image:
            if source == destination:
                if image.format != "WEBP":
                    raise ValueError("conteúdo incompatível com a extensão WebP")
                for frame in ImageSequence.Iterator(image):
                    frame.load()
                return
            with destination.open("xb") as output:
                created.append(destination)
                save_webp(image, output)
                output.flush()
                os.fsync(output.fileno())
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError) as error:
        raise ValueError(f"{source.name}: {error}") from error


def convert_catalog_images(paths: list[Path], catalog: Any) -> list[Path]:
    """Converte o lote com o catálogo já bloqueado pelo chamador."""
    if not features.check("webp"):
        raise ValueError("Esta instalação do Pillow não tem suporte a WebP")
    jobs = plan_conversion(paths, catalog)
    with publish_images(catalog, PRODUCTS_FILE) as created:
        # Limite a quantidade de imagens descomprimidas ao mesmo tempo.
        errors = []
        with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as pool:
            tasks = [pool.submit(convert_file, src, dst, created) for src, dst in jobs.items()]
            for task in tasks:
                try:
                    task.result()
                except ValueError as error:
                    errors.append(str(error))
        if errors:
            raise ValueError("\n".join(errors))

    pending = []
    for source, destination in jobs.items():
        if source != destination:
            try:
                source.unlink(missing_ok=True)
            except OSError as error:
                pending.append(str(error))
    if pending:
        raise OSError("Catálogo atualizado. Falha ao remover originais:\n" + "\n".join(pending))

    return created


def convert_images(paths: list[Path]) -> int:
    with locked_catalog(PRODUCTS_FILE) as catalog:
        created = convert_catalog_images(paths, catalog)
    if created:
        print(f"{len(created)} imagem(ns) convertida(s) para WebP e catálogo atualizado.")
    else:
        print("As imagens indicadas já estão em WebP.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", type=Path, help="imagens referenciadas no catálogo")
    return convert_images(parser.parse_args().images)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        sys.exit(str(error))
