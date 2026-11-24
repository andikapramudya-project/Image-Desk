const state = {
  files: [],
  results: new Map(),
  isProcessing: false,
  estimateTimer: null,
  estimateRequestId: 0,
  estimateUrl: "",
  selectedKey: "",
  qualityByFile: new Map(),
  renderedKeys: new Set(),
};

const defaults = {
  format: "image/jpeg",
  quality: 82,
  resize: true,
  width: 1600,
  height: 1600,
  watermark: false,
  watermarkText: "Image Desk",
  watermarkPosition: "bottom-right",
  watermarkOpacity: 42,
  preset: "custom",
  target: false,
  targetKb: 200,
};

const presets = {
  instagram: { format: "image/jpeg", quality: 85, width: 1080, height: 1350 },
  whatsapp: { format: "image/jpeg", quality: 75, width: 1600, height: 1600 },
  web: { format: "image/webp", quality: 80, width: 1920, height: 1920 },
  thumbnail: { format: "image/webp", quality: 75, width: 400, height: 400 },
  email: { format: "image/jpeg", quality: 70, width: 1280, height: 1280 },
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  pickButton: document.querySelector("#pickButton"),
  themeButton: document.querySelector("#themeButton"),
  dropZone: document.querySelector("#dropZone"),
  imageList: document.querySelector("#imageList"),
  imageTemplate: document.querySelector("#imageItemTemplate"),
  fileCount: document.querySelector("#fileCount"),
  clearButton: document.querySelector("#clearButton"),
  downloadAllButton: document.querySelector("#downloadAllButton"),
  processButton: document.querySelector("#processButton"),
  resetButton: document.querySelector("#resetButton"),
  formatSelect: document.querySelector("#formatSelect"),
  qualityRange: document.querySelector("#qualityRange"),
  qualityValue: document.querySelector("#qualityValue"),
  qualityPreview: document.querySelector("#qualityPreview"),
  estimateImage: document.querySelector("#estimateImage"),
  estimateTitle: document.querySelector("#estimateTitle"),
  estimateText: document.querySelector("#estimateText"),
  estimateGrid: document.querySelector("#estimateGrid"),
  estimateSize: document.querySelector("#estimateSize"),
  estimateBatch: document.querySelector("#estimateBatch"),
  estimateDimensions: document.querySelector("#estimateDimensions"),
  resizeToggle: document.querySelector("#resizeToggle"),
  sizeControls: document.querySelector("#sizeControls"),
  widthInput: document.querySelector("#widthInput"),
  heightInput: document.querySelector("#heightInput"),
  watermarkToggle: document.querySelector("#watermarkToggle"),
  watermarkControls: document.querySelector("#watermarkControls"),
  watermarkText: document.querySelector("#watermarkText"),
  positionSelect: document.querySelector("#positionSelect"),
  watermarkOpacity: document.querySelector("#watermarkOpacity"),
  opacityValue: document.querySelector("#opacityValue"),
  progressCard: document.querySelector("#progressCard"),
  progressFill: document.querySelector("#progressFill"),
  progressLabel: document.querySelector("#progressLabel"),
  progressPercent: document.querySelector("#progressPercent"),
  presetSelect: document.querySelector("#presetSelect"),
  targetToggle: document.querySelector("#targetToggle"),
  targetControls: document.querySelector("#targetControls"),
  targetInput: document.querySelector("#targetInput"),
  targetHint: document.querySelector("#targetHint"),
  batchSummary: document.querySelector("#batchSummary"),
  compareDialog: document.querySelector("#compareDialog"),
  compareInfo: document.querySelector("#compareInfo"),
  compareClose: document.querySelector("#compareClose"),
  compareStage: document.querySelector("#compareStage"),
  compareBefore: document.querySelector("#compareBefore"),
  compareAfter: document.querySelector("#compareAfter"),
  compareRange: document.querySelector("#compareRange"),
};

elements.pickButton.addEventListener("click", () => elements.fileInput.click());
elements.themeButton.addEventListener("click", toggleTheme);
elements.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
elements.clearButton.addEventListener("click", clearFiles);
elements.downloadAllButton.addEventListener("click", downloadAllResults);
elements.processButton.addEventListener("click", processAllImages);
elements.resetButton.addEventListener("click", resetControls);
elements.presetSelect.addEventListener("change", applyPreset);
elements.targetToggle.addEventListener("change", updateControlState);
elements.targetInput.addEventListener("input", updateControlState);
elements.compareClose.addEventListener("click", closeCompare);
elements.compareDialog.addEventListener("close", releaseCompare);
elements.compareDialog.addEventListener("click", (event) => {
  if (event.target === elements.compareDialog) closeCompare();
});
elements.compareRange.addEventListener("input", updateCompareSplit);

elements.qualityRange.addEventListener("input", () => {
  updateSelectedQuality();
  updateControlState();
});
elements.formatSelect.addEventListener("change", markCustomPreset);
elements.resizeToggle.addEventListener("change", updateControlState);
elements.widthInput.addEventListener("input", markCustomPreset);
elements.heightInput.addEventListener("input", markCustomPreset);
elements.watermarkToggle.addEventListener("change", updateControlState);
elements.watermarkText.addEventListener("input", updateControlState);
elements.positionSelect.addEventListener("change", updateControlState);
elements.watermarkOpacity.addEventListener("input", updateControlState);

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

function addFiles(fileList) {
  const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  const existingKeys = new Set(state.files.map(getFileKey));
  const uniqueFiles = imageFiles.filter((file) => !existingKeys.has(getFileKey(file)));
  const currentQuality = Number(elements.qualityRange.value);

  state.files.push(...uniqueFiles);
  uniqueFiles.forEach((file) => state.qualityByFile.set(getFileKey(file), currentQuality));
  if (!state.selectedKey && state.files.length > 0) {
    state.selectedKey = getFileKey(state.files[0]);
  }
  elements.fileInput.value = "";
  renderImageList();
  syncQualityControl();
  scheduleQualityEstimate();
}

function clearFiles() {
  state.results.forEach((result) => {
    if (result.url) URL.revokeObjectURL(result.url);
  });
  state.files = [];
  state.results.clear();
  state.selectedKey = "";
  state.qualityByFile.clear();
  state.renderedKeys.clear();
  clearEstimate();
  elements.progressCard.hidden = true;
  elements.batchSummary.hidden = true;
  renderImageList();
}

function renderImageList() {
  elements.imageList.innerHTML = "";
  elements.fileCount.textContent = `${state.files.length} gambar`;
  elements.clearButton.disabled = state.files.length === 0 || state.isProcessing;
  elements.processButton.disabled = state.files.length === 0 || state.isProcessing;
  elements.downloadAllButton.disabled = getSuccessfulResults().length === 0 || state.isProcessing;

  if (state.files.length === 0) {
    elements.imageList.innerHTML = `
      <div class="empty-state">
        <div class="empty-preview"></div>
        <p>Belum ada gambar. Setelah dipilih, preview dan hasil proses akan muncul di sini.</p>
      </div>
    `;
    return;
  }

  let newCount = 0;

  state.files.forEach((file, index) => {
    const fragment = elements.imageTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".image-item");
    const image = fragment.querySelector("img");
    const title = fragment.querySelector("h3");
    const details = fragment.querySelector("p");
    const qualityChip = fragment.querySelector(".quality-chip");
    const resultLine = fragment.querySelector(".result-line");
    const download = fragment.querySelector(".download-button");
    const compare = fragment.querySelector(".compare-button");
    const remove = fragment.querySelector(".remove-button");
    const fileKey = getFileKey(file);
    const result = state.results.get(fileKey);

    item.dataset.index = index;
    item.dataset.key = fileKey;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Pilih ${file.name}`);
    item.classList.toggle("is-selected", fileKey === state.selectedKey);
    if (!state.renderedKeys.has(fileKey)) {
      item.classList.add("is-new");
      item.style.setProperty("--stagger", Math.min(newCount, 8));
      newCount += 1;
    }
    item.addEventListener("click", () => selectFile(fileKey));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFile(fileKey);
      }
    });
    image.src = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(image.src);
    image.alt = `Preview ${file.name}`;
    title.textContent = file.name;
    details.textContent = `${formatBytes(file.size)} - ${file.type || "format tidak dikenal"}`;
    qualityChip.textContent = `Kualitas ${getQualityForFile(file)}%`;

    remove.disabled = state.isProcessing;
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeFile(fileKey);
    });

    if (result?.error) {
      resultLine.textContent = result.error;
      resultLine.classList.add("is-error");
    } else if (result) {
      const difference = file.size - result.blob.size;
      const sizeNote =
        difference >= 0
          ? `hemat ${formatBytes(difference)}`
          : `${formatBytes(-difference)} lebih besar dari asli`;
      const parts = [`${result.width}x${result.height}`, formatBytes(result.blob.size), sizeNote];

      if (result.targetMissed) parts.push("target tidak tercapai");
      if (result.formatFallback) parts.push(`disimpan sebagai ${getExtension(result.blob.type).toUpperCase()} (browser tidak mendukung format pilihan)`);
      if (result.usedQuality) qualityChip.textContent = `Kualitas ${result.usedQuality}% (otomatis)`;

      resultLine.textContent = parts.join(" - ");
      resultLine.classList.add(difference < 0 || result.targetMissed ? "is-error" : "is-done");
      compare.hidden = false;
      compare.addEventListener("click", (event) => {
        event.stopPropagation();
        openCompare(file, result);
      });
      download.href = result.url;
      download.download = result.name;
      download.hidden = false;
      download.textContent = "Unduh";
      download.addEventListener("click", (event) => event.stopPropagation());
    } else {
      resultLine.textContent = "Siap diproses";
    }

    elements.imageList.appendChild(fragment);
  });

  state.renderedKeys = new Set(state.files.map(getFileKey));
}

async function processAllImages() {
  if (state.files.length === 0) return;

  state.isProcessing = true;
  renderImageList();
  elements.progressCard.hidden = false;
  state.results.forEach((result) => {
    if (result.url) URL.revokeObjectURL(result.url);
  });
  state.results.clear();
  elements.batchSummary.hidden = true;

  const baseSettings = readSettings();

  for (let index = 0; index < state.files.length; index += 1) {
    const file = state.files[index];
    updateProgress(index, state.files.length, `Memproses ${file.name}`);

    try {
      const settings = { ...baseSettings, quality: getQualityForFile(file) };
      const result = await processImage(file, settings);
      state.results.set(getFileKey(file), result);
    } catch (error) {
      state.results.set(getFileKey(file), {
        error: "Gagal diproses. Coba gambar lain atau ukuran yang lebih kecil.",
      });
      console.error(error);
    }

    renderImageList();
    await nextFrame();
  }

  updateProgress(state.files.length, state.files.length, "Selesai");
  state.isProcessing = false;
  renderImageList();
  showBatchSummary();
}

function showBatchSummary() {
  let originalTotal = 0;
  let outputTotal = 0;
  let done = 0;

  state.files.forEach((file) => {
    const result = state.results.get(getFileKey(file));
    if (!result?.blob) return;
    originalTotal += file.size;
    outputTotal += result.blob.size;
    done += 1;
  });

  if (done === 0) return;

  const percent = originalTotal > 0 ? Math.round((1 - outputTotal / originalTotal) * 100) : 0;
  const change = percent >= 0 ? `hemat ${percent}%` : `bertambah ${-percent}%`;
  elements.batchSummary.textContent = `${done} gambar: ${formatBytes(originalTotal)} menjadi ${formatBytes(outputTotal)} (${change})`;
  elements.batchSummary.hidden = false;
}

function removeFile(fileKey) {
  if (state.isProcessing) return;

  const result = state.results.get(fileKey);
  if (result?.url) URL.revokeObjectURL(result.url);
  state.results.delete(fileKey);
  state.qualityByFile.delete(fileKey);
  state.files = state.files.filter((file) => getFileKey(file) !== fileKey);

  if (state.selectedKey === fileKey) {
    state.selectedKey = state.files[0] ? getFileKey(state.files[0]) : "";
  }

  if (state.files.length === 0) {
    clearFiles();
    return;
  }

  elements.batchSummary.hidden = true;
  renderImageList();
  syncQualityControl();
  scheduleQualityEstimate();
}

async function processImage(file, settings) {
  const bitmap = await loadBitmap(file);
  const size = calculateSize(bitmap.width, bitmap.height, settings);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: settings.format !== "image/jpeg" });

  canvas.width = size.width;
  canvas.height = size.height;

  if (settings.format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
  }

  drawImageSource(context, bitmap, size.width, size.height);

  if (settings.watermark && settings.watermarkText.trim()) {
    drawWatermark(context, canvas, settings);
  }

  bitmap.close();

  const useTarget = settings.target && settings.format !== "image/png" && settings.targetKb > 0;
  const encoded = useTarget
    ? await encodeToTarget(canvas, settings.format, settings.targetKb * 1024)
    : { blob: await canvasToBlob(canvas, settings.format, settings.quality) };
  const blob = encoded.blob;
  const extension = getExtension(blob.type || settings.format);

  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    usedQuality: encoded.quality,
    targetMissed: encoded.missed,
    formatFallback: blob.type && blob.type !== settings.format,
    width: size.width,
    height: size.height,
    name: `${stripExtension(file.name)}-${size.width}w.${extension}`,
    url: URL.createObjectURL(blob),
  };
}

function calculateSize(width, height, settings) {
  if (!settings.resize) return { width, height };

  const maxWidth = normalizeDimension(settings.width, width);
  const maxHeight = normalizeDimension(settings.height, height);
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function drawWatermark(context, canvas, settings) {
  const text = settings.watermarkText.trim();
  const shortestSide = Math.min(canvas.width, canvas.height);
  const fontSize = Math.max(18, Math.round(shortestSide * 0.045));
  const padding = Math.max(16, Math.round(shortestSide * 0.04));

  context.save();
  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  context.textBaseline = "middle";
  context.globalAlpha = settings.watermarkOpacity / 100;

  const metrics = context.measureText(text);
  const boxWidth = metrics.width + padding;
  const boxHeight = fontSize + padding * 0.65;
  const coordinates = getWatermarkCoordinates(settings.watermarkPosition, canvas, boxWidth, boxHeight, padding);

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  roundRect(context, coordinates.x - boxWidth / 2, coordinates.y - boxHeight / 2, boxWidth, boxHeight, 8);
  context.fill();

  context.fillStyle = "rgba(31, 31, 29, 0.92)";
  context.textAlign = "center";
  context.fillText(text, coordinates.x, coordinates.y + fontSize * 0.04);
  context.restore();
}

function getWatermarkCoordinates(position, canvas, width, height, padding) {
  const left = padding + width / 2;
  const right = canvas.width - padding - width / 2;
  const top = padding + height / 2;
  const bottom = canvas.height - padding - height / 2;

  const coordinates = {
    "top-left": { x: left, y: top },
    "top-right": { x: right, y: top },
    "bottom-left": { x: left, y: bottom },
    "bottom-right": { x: right, y: bottom },
    center: { x: canvas.width / 2, y: canvas.height / 2 },
  };

  return coordinates[position] || coordinates["bottom-right"];
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

// Cari kualitas tertinggi yang hasilnya tidak melebihi target (binary search, maks 7 kali encode).
async function encodeToTarget(canvas, format, targetBytes) {
  let low = 10;
  let high = 95;
  let best = null;
  let smallest = null;

  while (low <= high) {
    const quality = Math.round((low + high) / 2);
    const blob = await canvasToBlob(canvas, format, quality);

    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality };

    if (blob.size <= targetBytes) {
      best = { blob, quality };
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  if (best) return { ...best, missed: false };
  return { ...smallest, missed: true };
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      format,
      format === "image/png" ? undefined : quality / 100,
    );
  });
}

function readSettings(file = getSelectedFile()) {
  return {
    format: elements.formatSelect.value,
    quality: file ? getQualityForFile(file) : Number(elements.qualityRange.value),
    resize: elements.resizeToggle.checked,
    width: Number(elements.widthInput.value),
    height: Number(elements.heightInput.value),
    watermark: elements.watermarkToggle.checked,
    watermarkText: elements.watermarkText.value,
    watermarkPosition: elements.positionSelect.value,
    watermarkOpacity: Number(elements.watermarkOpacity.value),
    target: elements.targetToggle.checked,
    targetKb: Number(elements.targetInput.value),
  };
}

async function loadBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const image = new Image();
  image.src = URL.createObjectURL(file);
  await image.decode();

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    close() {
      URL.revokeObjectURL(image.src);
    },
    image,
  };
}

function drawImageSource(context, bitmap, width, height) {
  context.drawImage(bitmap.image || bitmap, 0, 0, width, height);
}

function resetControls() {
  elements.formatSelect.value = defaults.format;
  elements.qualityRange.value = defaults.quality;
  state.qualityByFile.clear();
  state.files.forEach((file) => state.qualityByFile.set(getFileKey(file), defaults.quality));
  elements.resizeToggle.checked = defaults.resize;
  elements.widthInput.value = defaults.width;
  elements.heightInput.value = defaults.height;
  elements.watermarkToggle.checked = defaults.watermark;
  elements.watermarkText.value = defaults.watermarkText;
  elements.positionSelect.value = defaults.watermarkPosition;
  elements.watermarkOpacity.value = defaults.watermarkOpacity;
  elements.presetSelect.value = defaults.preset;
  elements.targetToggle.checked = defaults.target;
  elements.targetInput.value = defaults.targetKb;
  syncQualityControl();
  renderImageList();
  updateControlState();
}

function applyPreset() {
  const preset = presets[elements.presetSelect.value];
  if (!preset) return;

  elements.formatSelect.value = preset.format;
  elements.qualityRange.value = preset.quality;
  elements.resizeToggle.checked = true;
  elements.widthInput.value = preset.width;
  elements.heightInput.value = preset.height;
  state.files.forEach((file) => state.qualityByFile.set(getFileKey(file), preset.quality));
  renderImageList();
  updateControlState();
}

function markCustomPreset() {
  elements.presetSelect.value = "custom";
  updateControlState();
}

function updateRangeFill(range) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 100;
  const percent = ((Number(range.value) - min) / (max - min)) * 100;
  range.style.setProperty("--fill", `${percent}%`);
}

function updateControlState() {
  updateRangeFill(elements.qualityRange);
  updateRangeFill(elements.watermarkOpacity);
  elements.qualityValue.textContent = `${elements.qualityRange.value}%`;
  elements.opacityValue.textContent = `${elements.watermarkOpacity.value}%`;
  elements.sizeControls.style.display = elements.resizeToggle.checked ? "grid" : "none";
  elements.watermarkControls.hidden = !elements.watermarkToggle.checked;

  const isPng = elements.formatSelect.value === "image/png";
  elements.targetToggle.disabled = isPng;
  elements.targetControls.hidden = !elements.targetToggle.checked || isPng;
  elements.qualityRange.disabled = isPng || elements.targetToggle.checked;
  elements.targetHint.textContent = isPng
    ? "Tidak tersedia untuk PNG karena PNG tidak memakai kualitas."
    : "Kualitas dicari otomatis agar file tidak melebihi batas.";
  scheduleQualityEstimate();
}

function selectFile(fileKey) {
  state.selectedKey = fileKey;
  syncQualityControl();
  renderImageList();
  scheduleQualityEstimate();
}

function syncQualityControl() {
  const selectedFile = getSelectedFile();

  if (!selectedFile) return;

  elements.qualityRange.value = getQualityForFile(selectedFile);
  elements.qualityValue.textContent = `${elements.qualityRange.value}%`;
  updateRangeFill(elements.qualityRange);
}

function updateSelectedQuality() {
  const selectedFile = getSelectedFile();

  if (!selectedFile) return;

  state.qualityByFile.set(getFileKey(selectedFile), Number(elements.qualityRange.value));
  renderImageList();
}

function applySavedTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("imageDeskTheme");
  } catch (error) {
    savedTheme = null;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");

  setTheme(theme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  try {
    localStorage.setItem("imageDeskTheme", nextTheme);
  } catch (error) {
    // Penyimpanan tidak tersedia (mode privasi); tema tetap berlaku untuk sesi ini.
  }
}

function setTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = normalizedTheme;
  elements.themeButton.setAttribute(
    "aria-label",
    normalizedTheme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap",
  );
}

function scheduleQualityEstimate() {
  window.clearTimeout(state.estimateTimer);

  if (state.files.length === 0) {
    clearEstimate();
    return;
  }

  elements.qualityPreview.hidden = false;
  elements.estimateTitle.textContent = "Menghitung preview";
  elements.estimateText.textContent = "Menyiapkan estimasi ukuran...";
  elements.estimateGrid.hidden = true;

  state.estimateRequestId += 1;
  state.estimateTimer = window.setTimeout(() => updateQualityEstimate(state.estimateRequestId), 180);
}

async function updateQualityEstimate(requestId) {
  const sampleFile = getSelectedFile() || state.files[0];

  try {
    const result = await processImage(sampleFile, readSettings(sampleFile));

    if (requestId !== state.estimateRequestId) {
      URL.revokeObjectURL(result.url);
      return;
    }

    if (state.estimateUrl) URL.revokeObjectURL(state.estimateUrl);

    const totalOriginalSize = state.files.reduce((total, file) => total + file.size, 0);
    const estimateRatio = result.blob.size / sampleFile.size;
    const estimatedBatchSize = Math.max(1, Math.round(totalOriginalSize * estimateRatio));

    state.estimateUrl = result.url;
    elements.estimateImage.src = result.url;
    elements.estimateTitle.textContent = shortenName(sampleFile.name, 28);
    elements.estimateText.textContent = "Estimasi berdasarkan gambar yang dipilih";
    elements.estimateGrid.hidden = false;
    elements.estimateSize.textContent = formatBytes(result.blob.size);
    elements.estimateBatch.textContent = formatBytes(estimatedBatchSize);
    elements.estimateDimensions.textContent = `${result.width} x ${result.height}`;
  } catch (error) {
    if (requestId !== state.estimateRequestId) return;

    elements.estimateTitle.textContent = "Preview belum tersedia";
    elements.estimateText.textContent = "Gambar ini belum bisa dibuat estimasinya.";
    elements.estimateGrid.hidden = true;
    console.error(error);
  }
}

function clearEstimate() {
  window.clearTimeout(state.estimateTimer);
  state.estimateRequestId += 1;
  elements.qualityPreview.hidden = true;
  elements.estimateImage.removeAttribute("src");
  elements.estimateGrid.hidden = true;

  if (state.estimateUrl) {
    URL.revokeObjectURL(state.estimateUrl);
    state.estimateUrl = "";
  }
}

function updateProgress(done, total, label) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
}

async function downloadAllResults() {
  const results = getSuccessfulResults();
  if (results.length === 0) return;

  elements.downloadAllButton.disabled = true;

  try {
    const entries = await Promise.all(
      results.map(async (result) => ({
        name: result.name,
        data: new Uint8Array(await result.blob.arrayBuffer()),
      })),
    );
    const zip = createZip(entries);
    const url = URL.createObjectURL(zip);
    const link = document.createElement("a");
    link.href = url;
    link.download = `image-desk-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error(error);
  } finally {
    elements.downloadAllButton.disabled = getSuccessfulResults().length === 0 || state.isProcessing;
  }
}

// Penulis ZIP minimal (metode "store", tanpa kompresi): gambar sudah terkompres,
// jadi kompresi ulang hampir tidak berpengaruh dan tidak perlu library tambahan.
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  const encoder = new TextEncoder();
  const usedNames = new Set();
  const parts = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  entries.forEach((entry) => {
    const name = encoder.encode(uniqueZipName(entry.name, usedNames));
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, name, entry.data);

    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint16(8, 0x0800, true);
    header.setUint16(10, 0, true);
    header.setUint16(12, dosTime, true);
    header.setUint16(14, dosDate, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, size, true);
    header.setUint32(24, size, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);
    central.push(header.buffer, name);

    offset += 30 + name.length + size;
  });

  const centralSize = central.reduce((total, part) => total + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
}

function uniqueZipName(name, usedNames) {
  let candidate = name;
  let counter = 2;
  while (usedNames.has(candidate)) {
    candidate = name.replace(/(\.[^.]+)?$/, `-${counter}$1`);
    counter += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

// Perbandingan sebelum/sesudah
let compareOriginalUrl = "";

function openCompare(file, result) {
  releaseCompare();
  compareOriginalUrl = URL.createObjectURL(file);
  elements.compareBefore.src = compareOriginalUrl;
  elements.compareAfter.src = result.url;
  elements.compareInfo.textContent = `${file.name}: ${formatBytes(file.size)} menjadi ${formatBytes(result.blob.size)}`;
  elements.compareRange.value = 50;
  updateCompareSplit();

  if (typeof elements.compareDialog.showModal === "function") {
    elements.compareDialog.showModal();
  } else {
    elements.compareDialog.setAttribute("open", "");
  }
}

function closeCompare() {
  if (typeof elements.compareDialog.close === "function") {
    elements.compareDialog.close();
  } else {
    elements.compareDialog.removeAttribute("open");
    releaseCompare();
  }
}

function releaseCompare() {
  if (compareOriginalUrl) {
    URL.revokeObjectURL(compareOriginalUrl);
    compareOriginalUrl = "";
  }
}

function updateCompareSplit() {
  const value = Number(elements.compareRange.value);
  elements.compareStage.style.setProperty("--split", `${value}%`);
  updateRangeFill(elements.compareRange);
}

function getSuccessfulResults() {
  return Array.from(state.results.values()).filter((result) => result.url);
}

function getSelectedFile() {
  return state.files.find((file) => getFileKey(file) === state.selectedKey) || null;
}

function getQualityForFile(file) {
  return state.qualityByFile.get(getFileKey(file)) || defaults.quality;
}

function normalizeDimension(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** sizeIndex;

  return `${value.toFixed(value >= 10 || sizeIndex === 0 ? 0 : 1)} ${units[sizeIndex]}`;
}

function stripExtension(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function getExtension(format) {
  const extensions = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };

  return extensions[format] || "png";
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function shortenName(name, maxLength) {
  if (name.length <= maxLength) return name;

  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const baseLength = maxLength - extension.length - 3;

  return `${name.slice(0, Math.max(8, baseLength))}...${extension}`;
}

applySavedTheme();
updateControlState();
