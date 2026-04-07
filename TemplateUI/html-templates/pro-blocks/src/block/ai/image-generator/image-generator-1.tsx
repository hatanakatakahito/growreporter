import { useState } from 'react';
import {
  ArrowUpward,
  ColourPalette3,
  Download1,
  Gallery,
  Microphone1,
  Paperclip2,
  Phone,
} from '@tailgrids/icons';

export default function ImageGenerator1() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('Midjourney 7');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState([
    'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-3.jpg',
  ]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      // In real app, update images with new generated ones
      setImages([
        'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-1.jpg',
        'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-2.jpg',
        'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/gl-3.jpg',
      ]);
      setIsGenerating(false);
    }, 2000);
  };

  const handleDownload = (imageSrc: string) => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'generated-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-background-soft-100 flex h-screen flex-col pt-16">
      <div className="mx-auto w-full max-w-[830px] flex-1 overflow-y-auto">
        <div className="h-full space-y-6 p-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div key={index} className="group relative">
                <img
                  src={image}
                  className="w-full rounded-2xl"
                  alt={`Generated image ${index + 1}`}
                />
                <button
                  onClick={() => handleDownload(image)}
                  className="bg-background-50 border-base-50 text-text-100 absolute right-5 bottom-5 inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 py-2 text-xs font-medium opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
                >
                  <Download1 className="size-4.5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* <!-- Input Area --> */}
      <div className="w-full p-4 pt-6 pb-12.5">
        <div className="mx-auto max-w-[800px]">
          <div className="bg-background-50 rounded-2xl p-3">
            {/* <!-- Chat Input --> */}
            <div className="border-base-50 relative overflow-hidden rounded-2xl border">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-background-50 text-title-50 placeholder:text-text-200 block h-30 w-full resize-none border-0 px-5 py-4.5 focus:ring-0 sm:leading-6"
                placeholder="Ask me anything..."
              ></textarea>
            </div>
            {/* <!-- Bottom Controls --> */}
            <div className="flex flex-col items-center justify-between gap-4 px-2 pt-3 pb-2 sm:flex-row">
              {/* <!-- Left Controls --> */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="bg-background-50 border-base-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors">
                  <Paperclip2 className="size-5" />
                  Attach
                </button>
                <button className="bg-background-50 border-base-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors">
                  <ColourPalette3 className="size-5" />
                  Style
                </button>
                <button className="bg-background-50 border-base-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors">
                  <Phone className="size-5" />
                  9:16
                </button>
                <button className="bg-background-50 border-base-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors">
                  <Gallery className="size-5" />3 Image
                </button>
              </div>

              {/* <!-- Right Controls --> */}
              <div className="flex items-center gap-2.5">
                <div>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="text-title-50 h-9 cursor-pointer border-0 bg-transparent py-0 text-sm focus:ring-0"
                  >
                    <option value="Midjourney 7">Midjourney 7</option>
                    <option value="Grok">Grok</option>
                    <option value="Open AI">Open AI</option>
                  </select>
                </div>
                <button className="hover:bg-background-soft-200 text-text-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                  <Microphone1 className="size-5" />
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={`text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    isGenerating || !prompt.trim()
                      ? 'bg-background-soft-300 cursor-not-allowed'
                      : 'hover:bg-foreground-soft-500 bg-foreground-soft-500'
                  }`}
                >
                  {isGenerating ? (
                    <svg
                      className="animate-spin"
                      width="21"
                      height="20"
                      viewBox="0 0 21 20"
                      fill="none"
                    >
                      <circle
                        cx="10.5"
                        cy="10"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="20 20"
                        strokeDashoffset="20"
                      />
                    </svg>
                  ) : (
                    <ArrowUpward className="size-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
