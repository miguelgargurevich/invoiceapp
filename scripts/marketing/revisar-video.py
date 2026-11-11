#!/usr/bin/env python3
"""Revisión de un video de Facturo ya montado (MP4): cuadros a 1 por segundo, hoja de contacto y OCR.

Uso: scripts/marketing/revisar-video.py <f1|f2|f3> <escritorio|celular>
  - cuadros → .claude/videos/<f>/<formato>/cuadros/ (uno por segundo, para OCR y para mirar);
  - hoja de contacto → .claude/videos/<f>/hoja-<formato>.png (mosaico de todos los cuadros);
  - OCR con tesseract (-l spa; si no hay spa, eng) → .claude/videos/<f>/ocr-<formato>.txt.
    Sale con código 1 si aparece gargurevich, miguel, 10409241862 o gmail. La única excepción es el dominio
    «facturo.gargurevich.dev» de la tarjeta de cierre, que el brief pide tal cual: se quita del texto antes de buscar.
"""
import pathlib
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

PROHIBIDO = re.compile(r"gargurevich|miguel|10409241862|gmail", re.IGNORECASE)
DOMINIO_CIERRE = re.compile(r"facturo\.gargurevich\.dev", re.IGNORECASE)


def idioma_ocr():
    listado = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
    return "spa" if "spa" in listado.split() else "eng"


def extraer_cuadros(mp4, carpeta):
    carpeta.mkdir(parents=True, exist_ok=True)
    for viejo in carpeta.glob("*.png"):
        viejo.unlink()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-vf", "fps=1", str(carpeta / "%03d.png")],
        check=True,
    )
    return sorted(carpeta.glob("*.png"))


def hoja(cuadros, salida, formato):
    ancho = 320 if formato == "escritorio" else 180
    columnas = 6 if formato == "escritorio" else 8
    fuente = ImageFont.load_default()
    imagenes = []
    for cuadro in cuadros:
        im = Image.open(cuadro).convert("RGB")
        alto = round(im.height * ancho / im.width)
        imagenes.append(im.resize((ancho, alto), Image.LANCZOS))
    if not imagenes:
        raise SystemExit("sin cuadros")
    alto_celda = max(im.height for im in imagenes) + 22
    filas = (len(imagenes) + columnas - 1) // columnas
    lienzo = Image.new("RGB", (columnas * (ancho + 8) + 8, filas * (alto_celda + 8) + 8), (242, 240, 236))
    dibujo = ImageDraw.Draw(lienzo)
    for i, im in enumerate(imagenes):
        x = 8 + (i % columnas) * (ancho + 8)
        y = 8 + (i // columnas) * (alto_celda + 8)
        dibujo.text((x + 2, y + 4), f"{i // 60:d}:{i % 60:02d}", fill=(40, 20, 40), font=fuente)
        lienzo.paste(im, (x, y + 22))
    lienzo.save(salida)


def ocr(cuadros, idioma):
    textos = []
    for cuadro in cuadros:
        salida = subprocess.run(
            ["tesseract", str(cuadro), "stdout", "-l", idioma, "--psm", "11"],
            capture_output=True, text=True,
        ).stdout
        textos.append((cuadro.stem, salida))
    return textos


def main():
    video, formato = sys.argv[1], sys.argv[2]
    base = pathlib.Path.cwd() / ".claude/videos" / video
    mp4 = base / f"facturo-{video}-{formato}.mp4"
    if not mp4.exists():
        raise SystemExit(f"falta {mp4}: monta primero")
    cuadros = extraer_cuadros(mp4, base / formato / "cuadros")
    hoja(cuadros, base / f"hoja-{formato}.png", formato)

    idioma = idioma_ocr()
    hallazgos = []
    lineas = []
    for segundo, texto in ocr(cuadros, idioma):
        limpio = DOMINIO_CIERRE.sub("", texto)
        for m in PROHIBIDO.finditer(limpio):
            hallazgos.append((segundo, m.group(0)))
        lineas.append(f"[{segundo}] {' '.join(texto.split())}")
    (base / f"ocr-{formato}.txt").write_text("\n".join(lineas) + "\n", encoding="utf-8")

    print(f"{mp4}: {len(cuadros)} cuadros, OCR en {idioma}")
    print(f"hoja: {base / f'hoja-{formato}.png'}")
    if hallazgos:
        for segundo, palabra in hallazgos:
            print(f"  DATO PROHIBIDO en el cuadro {segundo}: «{palabra}»")
        raise SystemExit(1)
    print("OCR: sin coincidencias de gargurevich | miguel | 10409241862 | gmail")


if __name__ == "__main__":
    main()
