#!/usr/bin/env python3
"""Converte imagens do catálogo para WebP e atualiza suas referências.

Uso: python3 convert_product_images_to_webp.py assets/products/imagem.jpg [...]
Requer Pillow: python3 -m pip install Pillow
"""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

from extract_product_images import PROJECT_ROOT, PRODUCTS_FILE, products_from_catalog, image_list_from_product


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('images', nargs='+', type=Path, help='imagens referenciadas no catálogo')
    args = parser.parse_args()
    text = PRODUCTS_FILE.read_text(encoding='utf-8')
    catalog = json.loads(text)
    references = {
        image
        for product in products_from_catalog(catalog) if isinstance(product, dict)
        for field in [image_list_from_product(product)] if field is not None
        for image in field[1] if isinstance(image, str)
    }
    created = []
    originals = []
    try:
        for source in args.images:
            source = source.resolve()
            if not source.is_relative_to((PROJECT_ROOT / 'assets' / 'products').resolve()):
                raise ValueError(f'Imagem fora de assets/products: {source}')
            relative = source.relative_to(PROJECT_ROOT).as_posix()
            if relative not in references:
                raise ValueError(f'Imagem não referenciada no catálogo: {relative}')
            if source.suffix.lower() == '.webp':
                raise ValueError(f'Imagem já está em WebP: {relative}')
            destination = source.with_suffix('.webp')
            if destination.exists():
                raise FileExistsError(f'Destino já existe: {destination}')
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                with destination.open('xb') as output:
                    created.append(destination)
                    image.save(output, format='WEBP', quality=85, method=6)
            replacement = destination.relative_to(PROJECT_ROOT).as_posix()
            text = text.replace(json.dumps(relative, ensure_ascii=False), json.dumps(replacement, ensure_ascii=False))
            originals.append(source)
        json.loads(text)
        PRODUCTS_FILE.write_text(text, encoding='utf-8')
    except BaseException:
        for path in created:
            path.unlink(missing_ok=True)
        raise
    for source in originals:
        source.unlink()
    print(f'{len(created)} imagem(ns) convertida(s) para WebP e catálogo atualizado.')


if __name__ == '__main__':
    main()
