/**
 * Calendar Image Overlay - Frontend Logic
 * Handles image upload, calendar preview, drag/resize, and download.
 */

(function () {
    "use strict";

    // -----------------------------------------------------------------------
    // Month names per language (mirrored from backend for the month selector)
    // -----------------------------------------------------------------------
    const MONTHS = {
        en: [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
        ua: [
            "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
            "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
        ],
    };

    // -----------------------------------------------------------------------
    // UI translations
    // -----------------------------------------------------------------------
    const UI_STRINGS = {
        en: {
            title: "Calendar Overlay",
            upload_prompt: 'Drop image or <span class="link">browse</span>',
            placeholder: "Upload an image to start",
            sec_frame: "Frame",
            sec_calendar: "Calendar",
            sec_month_title: "Month Title",
            sec_grid_text: "Grid Text",
            sec_background: "Background",
            sec_border: "Border",
            lbl_phone_model: "Phone Model",
            lbl_month: "Month",
            lbl_year: "Year",
            lbl_language: "Language",
            lbl_font_weight: "Font Weight",
            lbl_show_year: "Show year",
            lbl_font: "Font",
            lbl_color: "Color",
            lbl_size: "Size: {v}px",
            lbl_opacity: "Opacity: {v}%",
            lbl_thickness: "Thickness: {v}px",
            lbl_padding: "Padding: {v}px",
            lbl_radius: "Radius: {v}px",
            lbl_width: "Width: {v}px",
            opt_regular: "Regular",
            opt_bold: "Bold",
            btn_reset: "Reset Position",
            btn_download: "Download",
            btn_download_busy: "Processing...",
            btn_change_image: "Change Image",
        },
        ua: {
            title: "Календар на шпалерах",
            upload_prompt: 'Перетягніть зображення або <span class="link">оберіть</span>',
            placeholder: "Завантажте зображення для початку",
            sec_frame: "Рамка",
            sec_calendar: "Календар",
            sec_month_title: "Назва місяця",
            sec_grid_text: "Текст сітки",
            sec_background: "Фон",
            sec_border: "Обведення",
            lbl_phone_model: "Модель телефону",
            lbl_month: "Місяць",
            lbl_year: "Рік",
            lbl_language: "Мова",
            lbl_font_weight: "Товщина шрифту",
            lbl_show_year: "Показувати рік",
            lbl_font: "Шрифт",
            lbl_color: "Колір",
            lbl_size: "Розмір: {v}px",
            lbl_opacity: "Прозорість: {v}%",
            lbl_thickness: "Товщина: {v}px",
            lbl_padding: "Відступ: {v}px",
            lbl_radius: "Радіус: {v}px",
            lbl_width: "Ширина: {v}px",
            opt_regular: "Звичайний",
            opt_bold: "Жирний",
            btn_reset: "Скинути позицію",
            btn_download: "Завантажити",
            btn_download_busy: "Обробка...",
            btn_change_image: "Змінити зображення",
        },
    };

    // -----------------------------------------------------------------------
    // UI translation engine
    // -----------------------------------------------------------------------
    function translateUI(lang) {
        const s = UI_STRINGS[lang] || UI_STRINGS.en;

        // Simple text/html elements with data-i18n
        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (s[key] !== undefined) {
                if (key === "upload_prompt" || key === "placeholder") {
                    el.innerHTML = s[key];
                } else {
                    el.textContent = s[key];
                }
            }
        });

        // Select options with data-i18n-opt
        document.querySelectorAll("[data-i18n-opt]").forEach((el) => {
            const key = el.getAttribute("data-i18n-opt");
            if (s[key] !== undefined) el.textContent = s[key];
        });

        // Template labels with dynamic values (data-i18n-tpl)
        document.querySelectorAll("[data-i18n-tpl]").forEach((el) => {
            const key = el.getAttribute("data-i18n-tpl");
            if (s[key] === undefined) return;
            const span = el.querySelector("span");
            if (span) {
                const val = span.textContent;
                const parts = s[key].split("{v}");
                el.innerHTML = "";
                el.appendChild(document.createTextNode(parts[0] || ""));
                el.appendChild(span);
                if (parts[1]) el.appendChild(document.createTextNode(parts[1]));
            }
        });

        document.documentElement.lang = lang === "ua" ? "uk" : "en";
    }

    // -----------------------------------------------------------------------
    // DOM refs
    // -----------------------------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");
    const controls = document.getElementById("controls");
    const previewArea = document.getElementById("preview-area");
    const previewImage = document.getElementById("preview-image");
    const imageWrapper = document.getElementById("image-wrapper");
    const calendarOverlay = document.getElementById("calendar-overlay");
    const calendarTitle = document.getElementById("calendar-title");
    const calendarGrid = document.getElementById("calendar-grid");

    const monthSelect = document.getElementById("month-select");
    const yearInput = document.getElementById("year-input");
    const langSelect = document.getElementById("lang-select");
    const boldSelect = document.getElementById("bold-select");
    const showYearCheckbox = document.getElementById("show-year-checkbox");

    const titleFontSelect = document.getElementById("title-font-select");
    const titleSizeSlider = document.getElementById("title-size-slider");
    const titleSizeValue = document.getElementById("title-size-value");

    const fontSelect = document.getElementById("font-select");
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeValue = document.getElementById("font-size-value");
    const colorPicker = document.getElementById("color-picker");
    const opacitySlider = document.getElementById("opacity-slider");
    const opacityValue = document.getElementById("opacity-value");
    const strokeSlider = document.getElementById("stroke-slider");
    const strokeValue = document.getElementById("stroke-value");
    const bgColorPicker = document.getElementById("bg-color-picker");
    const bgOpacitySlider = document.getElementById("bg-opacity-slider");
    const bgOpacityValue = document.getElementById("bg-opacity-value");
    const bgPaddingSlider = document.getElementById("bg-padding-slider");
    const bgPaddingValue = document.getElementById("bg-padding-value");
    const bgRadiusSlider = document.getElementById("bg-radius-slider");
    const bgRadiusValue = document.getElementById("bg-radius-value");
    const borderColorPicker = document.getElementById("border-color-picker");
    const borderWidthSlider = document.getElementById("border-width-slider");
    const borderWidthValue = document.getElementById("border-width-value");
    const borderOpacitySlider = document.getElementById("border-opacity-slider");
    const borderOpacityValue = document.getElementById("border-opacity-value");
    const frameSelect = document.getElementById("frame-select");
    const phoneFrame = document.getElementById("phone-frame");
    const resetBtn = document.getElementById("reset-btn");
    const downloadBtn = document.getElementById("download-btn");
    const changeImageBtn = document.getElementById("change-image-btn");
    const previewPlaceholder = document.getElementById("preview-placeholder");

    let uploadedFile = null;
    let naturalWidth = 0;
    let naturalHeight = 0;
    let pendingReposition = false;

    // -----------------------------------------------------------------------
    // Font registry
    // -----------------------------------------------------------------------
    const fontRegistry = {};
    let fontsReady = false;

    // Grid font CSS families
    const FONT_CSS_FAMILIES = {
        "dejavu":      "'DejaVu Sans Mono', monospace",
        "jetbrains":   "'JetBrains Mono', monospace",
        "fira":        "'Fira Mono', monospace",
        "ubuntu":      "'Ubuntu Mono', monospace",
        "roboto":      "'Roboto Mono', monospace",
        "source-code": "'Source Code Pro', monospace",
    };

    // Grid font files (regular + bold)
    const FONT_FILES = {
        "dejavu":      { regular: "DejaVuSansMono.ttf", bold: "DejaVuSansMono-Bold.ttf" },
        "jetbrains":   { regular: "JetBrainsMono-Regular.ttf", bold: "JetBrainsMono-Bold.ttf" },
        "fira":        { regular: "FiraMono-Regular.ttf", bold: "FiraMono-Bold.ttf" },
        "ubuntu":      { regular: "UbuntuMono-Regular.ttf", bold: "UbuntuMono-Bold.ttf" },
        "roboto":      { regular: "RobotoMono-Regular.ttf", bold: "RobotoMono-Bold.ttf" },
        "source-code": { regular: "SourceCodePro-Regular.ttf", bold: "SourceCodePro-Bold.ttf" },
    };

    // Title (decorative) font CSS families and files
    const TITLE_FONT_CSS = {
        "lobster":        "'Lobster', cursive",
        "comforter":      "'Comforter', cursive",
        "kurale":         "'Kurale', serif",
        "caveat":         "'Caveat', cursive",
        "irpin-type":     "'Irpin Type', serif",
        "fixel-display":  "'Fixel Display', sans-serif",
        "e-ukraine":      "'e-Ukraine Head', sans-serif",
        "arsenal":        "'Arsenal', sans-serif",
        "unbounded":      "'Unbounded', sans-serif",
        "shantell-sans":  "'Shantell Sans', cursive",
    };

    const TITLE_FONT_FILES = {
        "lobster":        "Lobster-Regular.ttf",
        "comforter":      "Comforter-Regular.ttf",
        "kurale":         "Kurale-Regular.ttf",
        "caveat":         "Caveat-Regular.ttf",
        "irpin-type":     "IrpinType-Regular.otf",
        "fixel-display":  "FixelDisplay-SemiBold.ttf",
        "e-ukraine":      "e-UkraineHead-Regular.otf",
        "arsenal":        "Arsenal-Bold.ttf",
        "unbounded":      "Unbounded-Variable.ttf",
        "shantell-sans":  "ShantellSans-Regular.ttf",
    };

    function loadFonts() {
        fetch("/api/fonts")
            .then((r) => r.json())
            .then((data) => {
                // Populate grid font selector
                fontSelect.innerHTML = "";
                data.fonts.forEach((f) => {
                    fontRegistry[f.id] = f;
                    const opt = document.createElement("option");
                    opt.value = f.id;
                    opt.textContent = f.name;
                    if (f.id === data.default) opt.selected = true;
                    fontSelect.appendChild(opt);
                });

                // Populate title font selector
                titleFontSelect.innerHTML = "";
                data.title_fonts.forEach((f) => {
                    const opt = document.createElement("option");
                    opt.value = f.id;
                    opt.textContent = f.name;
                    if (f.id === data.title_default) opt.selected = true;
                    titleFontSelect.appendChild(opt);
                });

                // Inject @font-face rules for grid fonts
                let css = "";
                for (const [id, files] of Object.entries(FONT_FILES)) {
                    const family = FONT_CSS_FAMILIES[id]?.split(",")[0]?.replace(/'/g, "") || id;
                    css += `@font-face { font-family: '${family}'; font-weight: 400; font-style: normal; src: url('/fonts/${files.regular}') format('truetype'); font-display: swap; }\n`;
                    css += `@font-face { font-family: '${family}'; font-weight: 700; font-style: normal; src: url('/fonts/${files.bold}') format('truetype'); font-display: swap; }\n`;
                }

                // Inject @font-face rules for title fonts
                for (const [id, file] of Object.entries(TITLE_FONT_FILES)) {
                    const family = TITLE_FONT_CSS[id]?.split(",")[0]?.replace(/'/g, "") || id;
                    css += `@font-face { font-family: '${family}'; font-weight: 400; font-style: normal; src: url('/fonts/${file}') format('truetype'); font-display: swap; }\n`;
                }

                const style = document.createElement("style");
                style.textContent = css;
                document.head.appendChild(style);

                fontsReady = true;
            })
            .catch(() => {});
    }

    loadFonts();

    // -----------------------------------------------------------------------
    // Init month selector
    // -----------------------------------------------------------------------
    function populateMonths() {
        const lang = langSelect.value;
        const names = MONTHS[lang] || MONTHS.en;
        const prev = monthSelect.value;
        monthSelect.innerHTML = "";
        names.forEach((name, i) => {
            const opt = document.createElement("option");
            opt.value = i + 1;
            opt.textContent = name;
            monthSelect.appendChild(opt);
        });
        if (prev) monthSelect.value = prev;
        if (!monthSelect.value) monthSelect.value = window.__currentMonth || 1;
    }

    populateMonths();
    translateUI(langSelect.value);

    // -----------------------------------------------------------------------
    // Upload handling
    // -----------------------------------------------------------------------
    uploadArea.addEventListener("click", () => fileInput.click());

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith("image/")) return;
        uploadedFile = file;

        // Set month and year to current on each image upload
        monthSelect.value = window.__currentMonth || new Date().getMonth() + 1;
        yearInput.value = window.__currentYear || new Date().getFullYear();

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.onload = () => {
                naturalWidth = previewImage.naturalWidth;
                naturalHeight = previewImage.naturalHeight;

                uploadArea.classList.add("hidden");
                controls.classList.remove("hidden");
                previewArea.classList.remove("hidden");
                if (previewPlaceholder) previewPlaceholder.classList.add("hidden");

                pendingReposition = true;
                refreshCalendarText();
            };
        };
        reader.readAsDataURL(file);
    }

    // -----------------------------------------------------------------------
    // Calendar text fetching & rendering
    // -----------------------------------------------------------------------
    let fetchController = null;

    function refreshCalendarText() {
        if (fetchController) fetchController.abort();
        fetchController = new AbortController();

        const month = monthSelect.value;
        const year = yearInput.value;
        const lang = langSelect.value;
        const showYear = showYearCheckbox.checked ? "1" : "0";

        fetch(`/calendar-text?year=${year}&month=${month}&lang=${lang}&show_year=${showYear}`, {
            signal: fetchController.signal,
        })
            .then((r) => r.json())
            .then((data) => {
                calendarTitle.textContent = data.title;
                calendarGrid.textContent = data.grid.join("\n");
                applyOverlayStyles();
                if (pendingReposition) {
                    pendingReposition = false;
                    resetOverlayPosition();
                }
            })
            .catch(() => {});
    }

    function applyOverlayStyles() {
        const fontSize = fontSizeSlider.value;
        const color = colorPicker.value;
        const opacityPct = opacitySlider.value;
        const isBold = boldSelect.value === "bold";

        // Grid font
        const fontId = fontSelect.value;
        const fontFamily = FONT_CSS_FAMILIES[fontId] || "monospace";

        calendarGrid.style.fontFamily = fontFamily;
        calendarGrid.style.fontSize = fontSize + "px";
        calendarGrid.style.color = color;
        calendarGrid.style.opacity = opacityPct / 100;
        calendarGrid.style.fontWeight = isBold ? "bold" : "normal";

        // Grid stroke/thickness
        const strokePx = parseInt(strokeSlider.value, 10);
        if (strokePx > 0 || isBold) {
            const autoStroke = isBold && strokePx === 0 ? Math.max(0.5, parseInt(fontSize, 10) / 40) : strokePx;
            calendarGrid.style.webkitTextStroke = autoStroke + "px " + color;
            calendarGrid.style.paintOrder = "stroke fill";
        } else {
            calendarGrid.style.webkitTextStroke = "";
            calendarGrid.style.paintOrder = "";
        }

        // Title font
        const titleFontId = titleFontSelect.value;
        const titleSize = titleSizeSlider.value;
        let titleFamily;
        if (titleFontId === "same") {
            titleFamily = fontFamily;
        } else {
            titleFamily = TITLE_FONT_CSS[titleFontId] || fontFamily;
        }
        calendarTitle.style.fontFamily = titleFamily;
        calendarTitle.style.fontSize = titleSize + "px";
        calendarTitle.style.color = color;
        calendarTitle.style.opacity = opacityPct / 100;
        calendarTitle.style.fontWeight = (titleFontId === "same" && isBold) ? "bold" : "normal";

        // Center title when year is hidden
        if (!showYearCheckbox.checked) {
            calendarTitle.classList.add("centered");
        } else {
            calendarTitle.classList.remove("centered");
        }

        // Title stroke (only for "same" monospace font when bold)
        if (titleFontId === "same" && (strokePx > 0 || isBold)) {
            const autoStroke = isBold && strokePx === 0 ? Math.max(0.5, parseInt(titleSize, 10) / 40) : strokePx;
            calendarTitle.style.webkitTextStroke = autoStroke + "px " + color;
            calendarTitle.style.paintOrder = "stroke fill";
        } else {
            calendarTitle.style.webkitTextStroke = "";
            calendarTitle.style.paintOrder = "";
        }

        fontSizeValue.textContent = fontSize;
        titleSizeValue.textContent = titleSize;
        opacityValue.textContent = opacityPct;
        strokeValue.textContent = strokePx;

        // Background controls
        const bgColor = bgColorPicker.value;
        const bgOpacityPct = bgOpacitySlider.value;
        const bgPadding = bgPaddingSlider.value;
        const bgRadius = bgRadiusSlider.value;

        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        calendarOverlay.style.background = `rgba(${r}, ${g}, ${b}, ${bgOpacityPct / 100})`;
        calendarOverlay.style.padding = bgPadding + "px";
        calendarOverlay.style.borderRadius = bgRadius + "px";

        bgOpacityValue.textContent = bgOpacityPct;
        bgPaddingValue.textContent = bgPadding;
        bgRadiusValue.textContent = bgRadius;

        // Border controls
        const borderColor = borderColorPicker.value;
        const borderWidth = parseInt(borderWidthSlider.value, 10);
        const borderOpacityPct = parseInt(borderOpacitySlider.value, 10);
        if (borderWidth > 0) {
            const br = parseInt(borderColor.slice(1, 3), 16);
            const bg2 = parseInt(borderColor.slice(3, 5), 16);
            const bb = parseInt(borderColor.slice(5, 7), 16);
            calendarOverlay.style.border = `${borderWidth}px solid rgba(${br}, ${bg2}, ${bb}, ${borderOpacityPct / 100})`;
        } else {
            calendarOverlay.style.border = "none";
        }
        borderWidthValue.textContent = borderWidth;
        borderOpacityValue.textContent = borderOpacityPct;
    }

    // -----------------------------------------------------------------------
    // Controls event listeners
    // -----------------------------------------------------------------------
    monthSelect.addEventListener("change", refreshCalendarText);
    yearInput.addEventListener("change", refreshCalendarText);
    langSelect.addEventListener("change", () => {
        translateUI(langSelect.value);
        populateMonths();
        refreshCalendarText();
    });
    showYearCheckbox.addEventListener("change", refreshCalendarText);
    titleFontSelect.addEventListener("change", applyOverlayStyles);
    titleSizeSlider.addEventListener("input", applyOverlayStyles);
    fontSelect.addEventListener("change", applyOverlayStyles);
    fontSizeSlider.addEventListener("input", applyOverlayStyles);
    boldSelect.addEventListener("change", applyOverlayStyles);
    colorPicker.addEventListener("input", applyOverlayStyles);
    opacitySlider.addEventListener("input", applyOverlayStyles);
    strokeSlider.addEventListener("input", applyOverlayStyles);
    bgColorPicker.addEventListener("input", applyOverlayStyles);
    bgOpacitySlider.addEventListener("input", applyOverlayStyles);
    bgPaddingSlider.addEventListener("input", applyOverlayStyles);
    bgRadiusSlider.addEventListener("input", applyOverlayStyles);
    borderColorPicker.addEventListener("input", applyOverlayStyles);
    borderWidthSlider.addEventListener("input", applyOverlayStyles);
    borderOpacitySlider.addEventListener("input", applyOverlayStyles);

    // -----------------------------------------------------------------------
    // Frame selector
    // -----------------------------------------------------------------------
    function applyFrame() {
        const frame = frameSelect.value;
        phoneFrame.classList.remove("frame-iphone", "frame-samsung");
        phoneFrame.classList.add("frame-" + frame);
    }
    frameSelect.addEventListener("change", applyFrame);

    // -----------------------------------------------------------------------
    // Drag logic
    // -----------------------------------------------------------------------
    let isDragging = false;
    let isResizing = false;
    let dragStartX, dragStartY, overlayStartX, overlayStartY;
    let resizeStartX, resizeStartFontSize;

    calendarOverlay.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("resize-handle")) {
            startResize(e);
            return;
        }
        startDrag(e);
    });

    calendarOverlay.addEventListener("touchstart", (e) => {
        if (e.target.classList.contains("resize-handle")) {
            startResize(e.touches[0]);
            e.preventDefault();
            return;
        }
        startDrag(e.touches[0]);
        e.preventDefault();
    }, { passive: false });

    function startDrag(e) {
        isDragging = true;
        calendarOverlay.classList.add("dragging");
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        overlayStartX = calendarOverlay.offsetLeft;
        overlayStartY = calendarOverlay.offsetTop;
    }

    function startResize(e) {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartFontSize = parseInt(fontSizeSlider.value, 10);
    }

    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("touchmove", (e) => {
        if (isDragging || isResizing) {
            onPointerMove(e.touches[0]);
            e.preventDefault();
        }
    }, { passive: false });

    function onPointerMove(e) {
        if (isDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            calendarOverlay.style.left = (overlayStartX + dx) + "px";
            calendarOverlay.style.top = (overlayStartY + dy) + "px";
        }
        if (isResizing) {
            const dx = e.clientX - resizeStartX;
            const newSize = Math.max(8, Math.min(120, resizeStartFontSize + Math.round(dx / 3)));
            fontSizeSlider.value = newSize;
            applyOverlayStyles();
        }
    }

    document.addEventListener("mouseup", endInteraction);
    document.addEventListener("touchend", endInteraction);

    function endInteraction() {
        isDragging = false;
        isResizing = false;
        calendarOverlay.classList.remove("dragging");
    }

    // -----------------------------------------------------------------------
    // Reset position
    // -----------------------------------------------------------------------
    function resetOverlayPosition() {
        // Position at bottom-center of the image wrapper
        requestAnimationFrame(() => {
            const wrapperW = imageWrapper.offsetWidth;
            const wrapperH = imageWrapper.offsetHeight;
            const overlayW = calendarOverlay.offsetWidth;
            const overlayH = calendarOverlay.offsetHeight;
            const left = Math.max(0, Math.round((wrapperW - overlayW) / 2));
            const top = Math.max(0, wrapperH - overlayH - 20);
            calendarOverlay.style.left = left + "px";
            calendarOverlay.style.top = top + "px";
        });
    }

    resetBtn.addEventListener("click", resetOverlayPosition);

    // -----------------------------------------------------------------------
    // Change Image
    // -----------------------------------------------------------------------
    if (changeImageBtn) {
        changeImageBtn.addEventListener("click", () => fileInput.click());
    }

    // -----------------------------------------------------------------------
    // Download
    // -----------------------------------------------------------------------
    downloadBtn.addEventListener("click", () => {
        if (!uploadedFile) return;

        downloadBtn.disabled = true;
        const s = UI_STRINGS[langSelect.value] || UI_STRINGS.en;
        downloadBtn.textContent = s.btn_download_busy;

        // Phone screen container dimensions
        const wrapperRect = imageWrapper.getBoundingClientRect();
        const containerW = wrapperRect.width;
        const containerH = wrapperRect.height;
        const overlayLeft = calendarOverlay.offsetLeft;
        const overlayTop = calendarOverlay.offsetTop;

        const cropRatio = containerH / containerW;

        let croppedW, croppedH;
        if (naturalWidth / naturalHeight > containerW / containerH) {
            croppedH = naturalHeight;
            croppedW = Math.round(naturalHeight / cropRatio);
        } else {
            croppedW = naturalWidth;
            croppedH = Math.round(naturalWidth * cropRatio);
        }

        const scale = croppedW / containerW;

        const realX = Math.round(overlayLeft * scale);
        const realY = Math.round(overlayTop * scale);
        const realFontSize = Math.round(parseInt(fontSizeSlider.value, 10) * scale);
        const realTitleFontSize = Math.round(parseInt(titleSizeSlider.value, 10) * scale);
        const opacityPct = parseInt(opacitySlider.value, 10);
        const opacity255 = Math.round((opacityPct / 100) * 255);

        const bgOpacityPct = parseInt(bgOpacitySlider.value, 10);
        const bgOpacity255 = Math.round((bgOpacityPct / 100) * 255);
        const realBgPadding = Math.round(parseInt(bgPaddingSlider.value, 10) * scale);
        const realBgRadius = Math.round(parseInt(bgRadiusSlider.value, 10) * scale);

        const formData = new FormData();
        formData.append("image", uploadedFile);
        formData.append("year", yearInput.value);
        formData.append("month", monthSelect.value);
        formData.append("lang", langSelect.value);
        formData.append("show_year", showYearCheckbox.checked ? "1" : "0");
        formData.append("x", realX);
        formData.append("y", realY);
        formData.append("font_size", realFontSize);
        formData.append("title_font_id", titleFontSelect.value);
        formData.append("title_font_size", realTitleFontSize);
        formData.append("color", colorPicker.value);
        formData.append("opacity", opacity255);
        formData.append("bold", boldSelect.value === "bold" ? "1" : "0");
        formData.append("font_id", fontSelect.value);
        formData.append("stroke_width", Math.round(parseInt(strokeSlider.value, 10) * scale));
        formData.append("bg_color", bgColorPicker.value);
        formData.append("bg_opacity", bgOpacity255);
        formData.append("bg_padding", realBgPadding);
        formData.append("bg_radius", realBgRadius);
        formData.append("border_color", borderColorPicker.value);
        formData.append("border_width", Math.round(parseInt(borderWidthSlider.value, 10) * scale));
        const borderOpPct = parseInt(borderOpacitySlider.value, 10);
        formData.append("border_opacity", Math.round((borderOpPct / 100) * 255));
        formData.append("crop_ratio", cropRatio);

        fetch("/render", { method: "POST", body: formData })
            .then((r) => {
                if (!r.ok) throw new Error("Render failed");
                return r.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `calendar_${yearInput.value}_${monthSelect.value.padStart(2, "0")}.jpg`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            })
            .catch((err) => {
                alert("Error rendering image: " + err.message);
            })
            .finally(() => {
                downloadBtn.disabled = false;
                const sl = UI_STRINGS[langSelect.value] || UI_STRINGS.en;
                downloadBtn.textContent = sl.btn_download;
            });
    });

})();
