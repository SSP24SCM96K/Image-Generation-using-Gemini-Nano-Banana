
import { useMemo, useState } from "react";
import { GoogleGenAI } from "@google/genai";

/* ================= Helpers ================= */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBase64Image(base64, filename = "generated.png") {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);

  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/* ================= App ================= */

export default function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [prompt, setPrompt] = useState(
    `Using the uploaded image as the sole reference, realistically modify the subject's appearance to show the results of a successful hair transplant, 1 year post-surgery.

Add dense, natural-looking hair to the balding areas on the top and crown of the head.`
  );
  const [feedback, setFeedback] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate(isRegenerate = false) {
    try {
      setError("");
      setLoading(true);

      if (!file) throw new Error("Please upload an image.");
      if (!prompt.trim()) throw new Error("Prompt is required.");

      const imageBase64 = await fileToBase64(file);
      const finalPrompt =
        isRegenerate && feedback
          ? `${prompt}\n\nUser feedback:\n${feedback}`
          : prompt;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              { text: finalPrompt },
              {
                inlineData: {
                  mimeType: file.type || "image/png",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        config: { responseModalities: ["IMAGE"] },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      let output = null;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i].inlineData?.data) {
          output = parts[i].inlineData.data;
          break;
        }
      }

      if (!output) throw new Error("No image generated.");

      setGeneratedImage(output);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  function resetAll() {
    setFile(null);
    setPreview("");
    setGeneratedImage("");
    setFeedback("");
    setError("");

    // Optional: reset prompt to default
    setPrompt(
      `Using the uploaded image as the sole reference, realistically modify the subject's appearance to show the results of a successful hair transplant, 1 year post-surgery.

Add dense, natural-looking hair to the balding areas on the top and crown of the head.`
    );
  }

  /* ================= JSX RETURN (INSIDE FUNCTION) ================= */

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>AI Image Generator tool</h1>
          <p style={styles.subtitle}>
            Upload a photo, describe the image, and generate a realistic result.
          </p>
        </header>

        <div style={styles.grid}>
          {/* LEFT CARD */}
          <div style={styles.card}>
            <h3 style={styles.stepTitle}>1️⃣ Upload Photo</h3>


            <input
              id="file-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                setFile(f);
                setGeneratedImage("");
                setFeedback("");
                if (preview) URL.revokeObjectURL(preview);
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />

            <label htmlFor="file-upload" style={styles.uploadBtn}>
              📁 Browse
            </label>



            {preview && <img src={preview} style={styles.image} />}

            <h3 style={styles.stepTitle}>2️⃣ Describe Hairstyle</h3>

            <textarea
              style={styles.textarea}
              rows={12}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <button
              style={styles.primaryBtn}
              onClick={() => generate(false)}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Image"}
            </button>

            {error && <p style={styles.error}>{error}</p>}
          </div>

          {/* RIGHT CARD */}
          <div style={styles.card}>
            <h3 style={styles.stepTitle}>3️⃣ Generated Result</h3>


            {!generatedImage ? (
              <div style={styles.placeholder}>
                Generated image will appear here
              </div>
            ) : (
              <>
                <img
                  src={`data:image/png;base64,${generatedImage}`}
                  style={styles.image}
                />

                <button
                  style={styles.secondaryBtn}
                  onClick={() =>
                    downloadBase64Image(generatedImage, "image.png")
                  }
                >
                  Download
                </button>

                <button
                  style={styles.resetBtn}
                  onClick={resetAll}
                >
                  🔄 Start Over
                </button>


                <h4>Refine & Regenerate</h4>
                <textarea
                  style={styles.textarea}
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Example: higher hairline, reduce temple density"
                />

                <button
                  style={styles.primaryBtn}
                  onClick={() => generate(true)}
                  disabled={loading}
                >
                  {loading ? "Regenerating..." : "Regenerate"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Styles ================= */

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "32px",
    boxSizing: "border-box",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",   // dark slate (very visible)
    marginBottom: 6,
  },
  container: {
    width: "100%",
    maxWidth: 1600,
    margin: "0 auto"
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    opacity: 0.7,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 32,
  },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 20px 40px rgba(0,0,0,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  textarea: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    marginTop: 6,
  },
  uploadBtn: {
    display: "inline-block",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    width: "fit-content",
    transition: "all 0.2s ease",
  },
  image: {
    width: "100%",
    borderRadius: 14,
  },
  placeholder: {
    height: 280,
    border: "2px dashed #cbd5e1",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: 14,
    borderRadius: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#313235ff",
    border: "none",
    padding: 12,
    borderRadius: 12,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    fontWeight: 500,
  },
  resetBtn: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#0f172a",
  },
};
