export function formatPrice(value, currency = "HTG") {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

export function timeAgo(iso, lang = "ht") {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const L = {
    ht: { now: "kounye a", min: "min", hr: "è", day: "jou", mo: "mwa", yr: "an" },
    fr: { now: "à l'instant", min: "min", hr: "h", day: "j", mo: "mois", yr: "ans" },
  }[lang] || { now: "now", min: "m", hr: "h", day: "d", mo: "mo", yr: "y" };
  if (s < 60) return L.now;
  if (s < 3600) return `${Math.floor(s / 60)} ${L.min}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${L.hr}`;
  if (s < 2592000) return `${Math.floor(s / 86400)} ${L.day}`;
  if (s < 31536000) return `${Math.floor(s / 2592000)} ${L.mo}`;
  return `${Math.floor(s / 31536000)} ${L.yr}`;
}

export async function compressImage(file, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
