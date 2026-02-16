#!/usr/bin/env python3
"""
Calendar Image Overlay Service
Lightweight Flask app that overlays a monthly calendar onto an uploaded image.
Supports English and Ukrainian languages.
"""

import calendar
import io
import os
from datetime import datetime

from flask import Flask, render_template, request, send_file, jsonify
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB upload limit

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ---------------------------------------------------------------------------
# Font registry  (id -> display name, regular file, bold file)
# If bold file is None, the regular file is used for both (variable-weight).
# ---------------------------------------------------------------------------

FONTS = {
    "dejavu": {
        "name": "DejaVu Sans Mono",
        "regular": "DejaVuSansMono.ttf",
        "bold": "DejaVuSansMono-Bold.ttf",
    },
    "jetbrains": {
        "name": "JetBrains Mono",
        "regular": "JetBrainsMono-Regular.ttf",
        "bold": "JetBrainsMono-Bold.ttf",
    },
    "fira": {
        "name": "Fira Mono",
        "regular": "FiraMono-Regular.ttf",
        "bold": "FiraMono-Bold.ttf",
    },
    "ubuntu": {
        "name": "Ubuntu Mono",
        "regular": "UbuntuMono-Regular.ttf",
        "bold": "UbuntuMono-Bold.ttf",
    },
    "roboto": {
        "name": "Roboto Mono",
        "regular": "RobotoMono-Regular.ttf",
        "bold": "RobotoMono-Bold.ttf",
    },
    "source-code": {
        "name": "Source Code Pro",
        "regular": "SourceCodePro-Regular.ttf",
        "bold": "SourceCodePro-Bold.ttf",
    },
}

DEFAULT_FONT = "dejavu"

# Title (month name) decorative fonts -- these support Cyrillic
TITLE_FONTS = {
    "same": {"name": "Same as grid", "file": None},
    "lobster": {"name": "Lobster", "file": "Lobster-Regular.ttf"},
    "comforter": {"name": "Comforter", "file": "Comforter-Regular.ttf"},
    "kurale": {"name": "Kurale", "file": "Kurale-Regular.ttf"},
    "caveat": {"name": "Caveat", "file": "Caveat-Regular.ttf"},
    "irpin-type": {"name": "Irpin Type", "file": "IrpinType-Regular.otf"},
    "fixel-display": {"name": "Fixel Display", "file": "FixelDisplay-SemiBold.ttf"},
    "e-ukraine": {"name": "e-Ukraine Head", "file": "e-UkraineHead-Regular.otf"},
    "arsenal": {"name": "Arsenal", "file": "Arsenal-Bold.ttf"},
    "unbounded": {"name": "Unbounded", "file": "Unbounded-Variable.ttf"},
    "shantell-sans": {"name": "Shantell Sans", "file": "ShantellSans-Regular.ttf"},
}

DEFAULT_TITLE_FONT = "irpin-type"

# ---------------------------------------------------------------------------
# Locale data
# ---------------------------------------------------------------------------

LOCALE_DATA = {
    "en": {
        "months": [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
        "days_short": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    },
    "ua": {
        "months": [
            "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
            "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
        ],
        "days_short": ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
    },
}


def build_calendar_lines(year: int, month: int, lang: str, show_year: bool = True) -> list[str]:
    """Return (title, grid_lines) for the calendar.

    title      -- month name (optionally with year)
    grid_lines -- [day_header, week1, week2, ...]
    """
    loc = LOCALE_DATA.get(lang, LOCALE_DATA["en"])
    month_name = loc["months"][month - 1]
    days_header = loc["days_short"]

    cal = calendar.Calendar(firstweekday=0)  # Monday first
    weeks = cal.monthdayscalendar(year, month)

    title = f"{month_name} {year}" if show_year else month_name
    header = "  ".join(f"{d:>2}" for d in days_header)

    grid_lines = [header]
    for week in weeks:
        row = "  ".join(f"{d:2d}" if d != 0 else "  " for d in week)
        grid_lines.append(row)

    return title, grid_lines


def _load_font_pair(font_id: str, font_size: int):
    """Load regular and bold ImageFont objects for the given font_id."""
    finfo = FONTS.get(font_id, FONTS[DEFAULT_FONT])
    reg_path = os.path.join(FONT_DIR, finfo["regular"])
    bold_path = os.path.join(FONT_DIR, finfo["bold"])

    try:
        font_regular = ImageFont.truetype(reg_path, font_size)
    except (OSError, IOError):
        font_regular = ImageFont.load_default()
    try:
        font_bold = ImageFont.truetype(bold_path, font_size)
    except (OSError, IOError):
        font_bold = font_regular

    return font_regular, font_bold


def _load_title_font(title_font_id: str, font_size: int, fallback_font):
    """Load a decorative title font.  Returns fallback_font if id is 'same'."""
    if title_font_id == "same" or title_font_id not in TITLE_FONTS:
        return fallback_font
    finfo = TITLE_FONTS[title_font_id]
    if finfo["file"] is None:
        return fallback_font
    path = os.path.join(FONT_DIR, finfo["file"])
    try:
        return ImageFont.truetype(path, font_size)
    except (OSError, IOError):
        return fallback_font


def render_calendar_on_image(
    image_bytes: bytes,
    year: int,
    month: int,
    lang: str,
    x: int,
    y: int,
    font_size: int,
    color: str,
    opacity: int,
    bg_color: str = "#000000",
    bg_opacity: int = 128,
    bg_padding: int = 12,
    bg_radius: int = 8,
    bold: bool = True,
    font_id: str = "dejavu",
    stroke_width: int = 0,
    border_color: str = "#FFFFFF",
    border_width: int = 0,
    border_opacity: int = 255,
    crop_ratio: float = 0,
    title_font_id: str = "same",
    title_font_size: int = 0,
    show_year: bool = True,
    shadow: bool = True,
) -> io.BytesIO:
    """Render calendar text onto the image and return as BytesIO (JPEG)."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    # Center-crop to phone screen aspect ratio (same as CSS object-fit: cover)
    if crop_ratio > 0:
        w, h = img.size
        target_h = w * crop_ratio
        if target_h <= h:
            # Image is taller than needed -- crop top/bottom
            top = int((h - target_h) / 2)
            img = img.crop((0, top, w, top + int(target_h)))
        else:
            # Image is wider than needed -- crop left/right
            target_w = h / crop_ratio
            left = int((w - target_w) / 2)
            img = img.crop((left, 0, left + int(target_w), h))

    # Create an overlay for the calendar (supports opacity)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Load grid fonts (monospace)
    font_regular, font_bold = _load_font_pair(font_id, font_size)

    # Load title (month name) font -- may be decorative or same as grid
    actual_title_size = title_font_size if title_font_size > 0 else font_size
    grid_bold_for_title = font_bold if bold else font_regular
    if title_font_id == "same":
        title_font = grid_bold_for_title
        # When same font, match grid size
        if title_font_size > 0:
            title_font = _load_font_pair(font_id, actual_title_size)[1 if bold else 0]
    else:
        title_font = _load_title_font(title_font_id, actual_title_size, grid_bold_for_title)

    title, grid_lines = build_calendar_lines(year, month, lang, show_year)

    # Choose font for grid lines (line 0 = day header, lines 1+ = weeks)
    def pick_grid_font(line_index):
        if bold:
            return font_bold
        return font_bold if line_index == 0 else font_regular

    # Effective stroke for grid text
    effective_stroke = stroke_width
    if bold and effective_stroke == 0:
        effective_stroke = max(1, font_size // 40)

    # Title stroke
    title_stroke = stroke_width
    if bold and title_stroke == 0 and title_font_id == "same":
        title_stroke = max(1, actual_title_size // 40)

    # Measure title
    title_line_spacing = int(actual_title_size * 1.4)
    title_bbox = draw.textbbox((0, 0), title, font=title_font, stroke_width=title_stroke)
    title_width = title_bbox[2] - title_bbox[0]
    title_height = title_line_spacing

    # Measure grid lines
    grid_line_spacing = int(font_size * 1.4)
    max_grid_width = 0
    for i, line in enumerate(grid_lines):
        bbox = draw.textbbox((0, 0), line, font=pick_grid_font(i), stroke_width=effective_stroke)
        max_grid_width = max(max_grid_width, bbox[2] - bbox[0])
    grid_total_height = grid_line_spacing * len(grid_lines)

    # Total block dimensions
    max_line_width = max(title_width, max_grid_width)
    total_height = title_height + grid_total_height

    # Calculate background box coordinates (reused for bg fill and border)
    bg_x0 = x - bg_padding
    bg_y0 = y - bg_padding
    bg_x1 = x + max_line_width + bg_padding
    bg_y1 = y + total_height + bg_padding

    # Draw rounded-rectangle background behind the calendar
    if bg_opacity > 0:
        bg_rgb = _hex_to_rgb(bg_color)
        bg_fill = (*bg_rgb, bg_opacity)
        draw.rounded_rectangle(
            [bg_x0, bg_y0, bg_x1, bg_y1],
            radius=bg_radius,
            fill=bg_fill,
        )

    # Draw border around the calendar box
    if border_width > 0 and border_opacity > 0:
        brd_rgb = _hex_to_rgb(border_color)
        brd_fill = (*brd_rgb, border_opacity)
        draw.rounded_rectangle(
            [bg_x0, bg_y0, bg_x1, bg_y1],
            radius=bg_radius,
            outline=brd_fill,
            width=border_width,
        )

    # Parse the text hex color
    color_rgb = _hex_to_rgb(color)
    text_color = (*color_rgb, opacity)
    shadow_color = (0, 0, 0, min(opacity, 160))

    stroke_fill = shadow_color if shadow else (0, 0, 0, 0)

    current_y = y

    # Draw title (month name) -- center horizontally when year is hidden
    if not show_year and title_width < max_line_width:
        title_x = x + (max_line_width - title_width) // 2
    else:
        title_x = x
    if shadow:
        draw.text((title_x + 2, current_y + 2), title, font=title_font, fill=shadow_color)
    draw.text(
        (title_x, current_y), title, font=title_font, fill=text_color,
        stroke_width=title_stroke, stroke_fill=stroke_fill,
    )
    current_y += title_height

    # Draw grid lines (header + weeks)
    for i, line in enumerate(grid_lines):
        font = pick_grid_font(i)
        if shadow:
            draw.text((x + 2, current_y + 2), line, font=font, fill=shadow_color)
        draw.text(
            (x, current_y), line, font=font, fill=text_color,
            stroke_width=effective_stroke, stroke_fill=stroke_fill,
        )
        current_y += grid_line_spacing

    # Composite
    result = Image.alpha_composite(img, overlay)
    result = result.convert("RGB")

    buf = io.BytesIO()
    result.save(buf, format="JPEG", quality=95)
    buf.seek(0)
    return buf


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert '#RRGGBB' to (R, G, B) tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (255, 255, 255)
    try:
        return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return (255, 255, 255)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    now = datetime.now()
    return render_template("index.html", current_year=now.year, current_month=now.month)


@app.route("/api/fonts", methods=["GET"])
def list_fonts():
    """Return the list of available grid and title fonts."""
    grid = []
    for fid, finfo in FONTS.items():
        grid.append({"id": fid, "name": finfo["name"]})
    title = []
    for fid, finfo in TITLE_FONTS.items():
        title.append({"id": fid, "name": finfo["name"]})
    return jsonify({
        "fonts": grid, "default": DEFAULT_FONT,
        "title_fonts": title, "title_default": DEFAULT_TITLE_FONT,
    })


@app.route("/fonts/<path:filename>")
def serve_font(filename):
    """Serve a font file (used by the frontend for @font-face)."""
    from flask import send_from_directory
    return send_from_directory(FONT_DIR, filename)


@app.route("/calendar-text", methods=["GET"])
def calendar_text():
    """Return calendar title + grid lines as JSON (used by frontend for live preview)."""
    year = request.args.get("year", datetime.now().year, type=int)
    month = request.args.get("month", datetime.now().month, type=int)
    lang = request.args.get("lang", "en")
    show_year = request.args.get("show_year", "1") == "1"

    month = max(1, min(12, month))
    year = max(1900, min(2100, year))

    title, grid_lines = build_calendar_lines(year, month, lang, show_year)
    return jsonify({"title": title, "grid": grid_lines})


@app.route("/render", methods=["POST"])
def render():
    """Render calendar on the uploaded image and return the result."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    image_bytes = file.read()

    year = request.form.get("year", datetime.now().year, type=int)
    month = request.form.get("month", datetime.now().month, type=int)
    lang = request.form.get("lang", "en")
    x = request.form.get("x", 50, type=int)
    y = request.form.get("y", 50, type=int)
    font_size = request.form.get("font_size", 24, type=int)
    color = request.form.get("color", "#FFFFFF")
    opacity = request.form.get("opacity", 255, type=int)
    bg_color = request.form.get("bg_color", "#000000")
    bg_opacity = request.form.get("bg_opacity", 128, type=int)
    bg_padding = request.form.get("bg_padding", 12, type=int)
    bg_radius = request.form.get("bg_radius", 8, type=int)
    bold = request.form.get("bold", "1") == "1"
    font_id = request.form.get("font_id", DEFAULT_FONT)
    stroke_width = request.form.get("stroke_width", 0, type=int)
    border_color = request.form.get("border_color", "#FFFFFF")
    border_width = request.form.get("border_width", 0, type=int)
    border_opacity = request.form.get("border_opacity", 255, type=int)
    crop_ratio = request.form.get("crop_ratio", 0, type=float)
    title_font_id = request.form.get("title_font_id", DEFAULT_TITLE_FONT)
    title_font_size = request.form.get("title_font_size", 0, type=int)
    show_year = request.form.get("show_year", "1") == "1"
    if font_id not in FONTS:
        font_id = DEFAULT_FONT
    if title_font_id not in TITLE_FONTS:
        title_font_id = DEFAULT_TITLE_FONT

    month = max(1, min(12, month))
    year = max(1900, min(2100, year))
    font_size = max(8, min(200, font_size))
    opacity = max(0, min(255, opacity))
    bg_opacity = max(0, min(255, bg_opacity))
    bg_padding = max(0, min(200, bg_padding))
    bg_radius = max(0, min(200, bg_radius))
    stroke_width = max(0, min(20, stroke_width))
    border_width = max(0, min(20, border_width))
    border_opacity = max(0, min(255, border_opacity))
    crop_ratio = max(0, min(10, crop_ratio))
    title_font_size = max(0, min(400, title_font_size))

    result_buf = render_calendar_on_image(
        image_bytes, year, month, lang, x, y, font_size, color, opacity,
        bg_color=bg_color, bg_opacity=bg_opacity, bg_padding=bg_padding, bg_radius=bg_radius,
        bold=bold, font_id=font_id, stroke_width=stroke_width,
        border_color=border_color, border_width=border_width, border_opacity=border_opacity,
        crop_ratio=crop_ratio,
        title_font_id=title_font_id, title_font_size=title_font_size, show_year=show_year,
    )

    return send_file(
        result_buf,
        mimetype="image/jpeg",
        as_attachment=True,
        download_name=f"calendar_{year}_{month:02d}.jpg",
    )


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5555, debug=False)
