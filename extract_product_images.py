#!/usr/bin/env python3
"""Extrai imagens em base64 do catálogo e atualiza suas referências."""

from __future__ import annotations

import base64
import binascii
import json
import os
import re
import stat
import sys
import tempfile
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
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


def slugify(value: str) -> str:
    """Converte um texto em um trecho seguro para nome de arquivo."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "produto"


def decode_base64(payload: str) -> bytes:
    """Decodifica base64 padrão, tolerando espaços e padding ausente."""
    compact = "".join(payload.split())
    padding = -len(compact) % 4
    if not compact or compact.endswith("===") or (compact.endswith("=") and padding > 1):
        raise ValueError("conteúdo base64 inválido")

    if padding:
        compact += "=" * padding
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
    if len(data) >= 14 and data.startswith(b"BM"):
        return ".bmp"
    if data.startswith((b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")):
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
            # A marca principal pode indicar apenas o contêiner HEIF.
            box_size = int.from_bytes(data[:4], "big") or len(data)
            for index in range(16, min(box_size, len(data)) - 3, 4):
                compatible = data[index:index + 4]
                if compatible in {b"avif", b"avis"}:
                    return ".avif"
                if compatible in {b"heic", b"heix", b"hevc", b"hevx"}:
                    return ".heic"
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
    value = value.lstrip()
    if value.startswith(("assets/", "./", "/assets/", "https:", "http:")):
        return None

    if value[:5].lower() == "data:":
        header, separator, payload = value.partition(",")
        mime_type, *parameters = (part.strip().lower() for part in header[5:].split(";"))

        if not mime_type.startswith("image/") or "base64" not in parameters:
            return None
        if not separator:
            raise ValueError("data URI de imagem sem conteúdo base64")

        data = decode_base64(payload)
        extension = extension_from_image(data, mime_type)
        if extension is None:
            raise ValueError(f"formato de imagem não suportado: {mime_type}")
        return data, extension

    # Para base64 sem data URI, a assinatura precisa confirmar que é uma imagem.
    try:
        data = decode_base64(value)
    except ValueError:
        return None

    extension = extension_from_image(data)
    if len(data) < 12 and extension != ".svg":
        return None
    return (data, extension) if extension else None


def products_from_catalog(catalog: Any) -> list[Any]:
    if isinstance(catalog, list):
        return catalog
    if isinstance(catalog, dict):
        lists = [
            catalog[key] for key in ("produtos", "products")
            if isinstance(catalog.get(key), list)
        ]
        if lists:
            return lists[0] if len(lists) == 1 else lists[0] + lists[1]
    raise ValueError("products.json deve conter uma lista em 'produtos' ou 'products'")


def catalog_image_lists(catalog: Any) -> Iterator[tuple[int, dict[str, Any], list[Any]]]:
    for index, product in enumerate(products_from_catalog(catalog), start=1):
        if not isinstance(product, dict):
            continue
        for key in ("imagens", "images"):
            if key in product:
                images = product[key]
                if not isinstance(images, list):
                    raise ValueError(f"o campo '{key}' deve ser uma lista")
                yield index, product, images


def existing_image_stems() -> dict[str, int]:
    # Uma miniatura existente também reserva o nome da imagem publicada.
    reserved = {}
    for directory in (PRODUCT_IMAGES_DIR, PRODUCT_IMAGES_DIR / "thumbs"):
        if directory.is_dir():
            reserved.update((path.stem.lower(), 2) for path in directory.iterdir())
    return reserved


def available_path(
    stem: str, image_number: int, extension: str, reserved: dict[str, int] | None = None
) -> Path:
    """Escolhe um nome ainda inexistente sem sobrescrever arquivos."""
    if reserved is None:
        reserved = existing_image_stems()
    # O slug é ASCII. Deixe espaço no componente de 255 bytes para índice e sufixos.
    base_name = f"{stem[:220].rstrip('-')}-{image_number}"
    name = base_name
    if base_name in reserved:
        suffix = reserved[base_name]
        while f"{base_name}-{suffix}" in reserved:
            suffix += 1
        name = f"{base_name}-{suffix}"
        reserved[base_name] = suffix + 1
    reserved[name] = 2
    return PRODUCT_IMAGES_DIR / f"{name}{extension}"


@contextmanager
def locked_catalog(path: Path) -> Iterator[Any]:
    """Serializa as duas ferramentas mesmo quando o JSON é substituído por rename."""
    if os.name == "nt":
        # O Windows remove o arquivo automaticamente ao encerrar o processo.
        try:
            flags = os.O_CREAT | os.O_EXCL | os.O_TEMPORARY | os.O_RDWR
            fd = os.open(path.with_suffix(".lock"), flags)
        except FileExistsError as error:
            raise OSError("Outra operação de imagens está atualizando o catálogo") from error
    else:
        import fcntl

        fd = os.open(path.parent, os.O_RDONLY)
    try:
        if os.name != "nt":
            fcntl.flock(fd, fcntl.LOCK_EX)
        with path.open(encoding="utf-8-sig") as catalog_file:
            catalog = json.load(catalog_file)
        yield catalog
    finally:
        os.close(fd)


def write_catalog_atomically(catalog: Any, path: Path | None = None) -> None:
    """Substitui o JSON somente depois de gravar por completo um temporário."""
    path = PRODUCTS_FILE if path is None else path
    current_mode = stat.S_IMODE(path.stat().st_mode)
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(catalog, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())

        temporary_path.chmod(current_mode)
        os.replace(temporary_path, path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


@contextmanager
def publish_images(catalog: Any, path: Path) -> Iterator[list[Path]]:
    """Publica as referências somente após a gravação de todos os arquivos."""
    original = path.stat()
    created_files: list[Path] = []
    try:
        yield created_files
        if created_files:
            write_catalog_atomically(catalog, path)
    except BaseException:
        # Uma interrupção pode chegar logo após os.replace ter publicado o JSON.
        if os.path.samestat(original, path.stat()):
            for created_file in reversed(created_files):
                created_file.unlink(missing_ok=True)
        raise


def extract_image_files(catalog: Any) -> list[Path]:
    """Retorna somente os arquivos criados e publicados nesta extração."""
    reserved = None
    with publish_images(catalog, PRODUCTS_FILE) as created_files:
        for product_index, product, images in catalog_image_lists(catalog):
            product_name = str(product.get("nome") or product.get("name") or "")
            product_code = str(
                product.get("codigo")
                or product.get("code")
                or product.get("id")
                or product_index
            )
            stem = None

            for image_index, image_value in enumerate(images, start=1):
                try:
                    decoded = image_from_base64(image_value)
                except ValueError as error:
                    raise ValueError(
                        f"imagem {image_index} do produto '{product_name or product_code}': {error}"
                    ) from error
                if decoded is None:
                    continue

                if reserved is None:
                    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
                    reserved = existing_image_stems()
                if stem is None:
                    stem = slugify(product_name or f"produto-{product_code}")
                data, extension = decoded
                while True:
                    destination = available_path(stem, image_index, extension, reserved)
                    try:
                        output = destination.open("xb")
                        break
                    except FileExistsError:
                        continue
                with output:
                    created_files.append(destination)
                    output.write(data)
                    output.flush()
                    os.fsync(output.fileno())

                images[image_index - 1] = destination.relative_to(PROJECT_ROOT).as_posix()

    return created_files


def extract_images(catalog: Any) -> int:
    created_files = extract_image_files(catalog)
    if created_files:
        print(f"{len(created_files)} imagem(ns) criada(s) e products.json atualizado.")
    else:
        print("Nenhuma imagem em base64 encontrada.")
    return 0


def main() -> int:
    with locked_catalog(PRODUCTS_FILE) as catalog:
        return extract_images(catalog)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as error:
        sys.exit(str(error))
