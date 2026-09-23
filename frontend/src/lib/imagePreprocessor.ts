/**
 * Client-Side Receipt Image Preprocessor
 * Converts receipt photos to high-contrast grayscale to maximize OCR recognition accuracy.
 */

export async function preprocessReceiptImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(typeof imageSource === "string" ? imageSource : URL.createObjectURL(imageSource));
          return;
        }

        // Limit dimensions for fast client-side processing while retaining text sharpness
        const maxDim = 1800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw original scaled image
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Contrast adjustment factor (e.g. 1.35)
        const contrast = 35; // -100 to 100
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          // Standard luminosity weights for grayscale
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Apply contrast enhancement
          gray = factor * (gray - 128) + 128;
          gray = Math.max(0, Math.min(255, gray));

          // Soft binarization to clean paper shadows
          if (gray > 200) {
            gray = 255;
          } else if (gray < 75) {
            gray = 0;
          }

          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (err) {
        // Fallback to original image if canvas manipulation fails
        console.warn("Image preprocessing failed, using original:", err);
        resolve(typeof imageSource === "string" ? imageSource : URL.createObjectURL(imageSource));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load receipt image for processing"));
    };

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(imageSource);
    }
  });
}
