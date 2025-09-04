import React, { useState } from 'react';
import type { PublishingKitData } from '../../types';
import { useLocalization } from '../../i18n';
import { generateThumbnail, createImageWithOverlay } from '../../services/storyCreatorService';

interface PublishingKitViewProps {
    kitData: PublishingKitData;
    activeApiKey: string | null;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return <button onClick={handleCopy} className="text-xs font-semibold py-1 px-3 rounded-lg bg-base-300 hover:bg-gray-700">{copied ? 'Copied!' : 'Copy'}</button>;
};

export const PublishingKitView: React.FC<PublishingKitViewProps> = ({ kitData, activeApiKey }) => {
    const { t } = useLocalization();
    const [generatingThumb, setGeneratingThumb] = useState<number | null>(null);
    const [thumbImageUrls, setThumbImageUrls] = useState<(string | null)[]>(Array(kitData.thumbnail_concepts.length).fill(null));

    const handleGenerateThumbnail = async (prompt: string, ctaText: string, index: number) => {
        if (!activeApiKey) return;
        setGeneratingThumb(index);
        try {
            const imageData = await generateThumbnail(activeApiKey, prompt);
            const finalImage = await createImageWithOverlay(imageData, ctaText);
            setThumbImageUrls(urls => urls.map((url, i) => i === index ? finalImage : url));
        } catch (e) {
            alert(`Failed to generate thumbnail: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            setGeneratingThumb(null);
        }
    };
    
    return (
        <div className="p-6 space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-2">YouTube Titles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">Bahasa Indonesia</h4><CopyButton textToCopy={kitData.youtube_title_id} /></div>
                        <p>{kitData.youtube_title_id}</p>
                    </div>
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">English</h4><CopyButton textToCopy={kitData.youtube_title_en} /></div>
                        <p>{kitData.youtube_title_en}</p>
                    </div>
                </div>
            </div>
            
            <div className="border-t border-base-300"></div>

            <div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-2">YouTube Descriptions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300"><div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">Bahasa Indonesia</h4><CopyButton textToCopy={kitData.youtube_description_id} /></div><pre className="whitespace-pre-wrap text-sm">{kitData.youtube_description_id}</pre></div>
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300"><div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">English</h4><CopyButton textToCopy={kitData.youtube_description_en} /></div><pre className="whitespace-pre-wrap text-sm">{kitData.youtube_description_en}</pre></div>
                </div>
            </div>

            <div className="border-t border-base-300"></div>
            
            <div>
                 <h3 className="text-2xl font-bold text-cyan-300 mb-2">YouTube Tags</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">Bahasa Indonesia</h4><CopyButton textToCopy={kitData.youtube_tags_id.join(', ')} /></div>
                        <div className="flex flex-wrap gap-2">{kitData.youtube_tags_id.map(tag => <span key={tag} className="bg-base-300 text-cyan-200 text-sm font-medium px-3 py-1 rounded-full">{tag}</span>)}</div>
                    </div>
                    <div className="bg-base-300/50 p-4 rounded-lg border border-base-300">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-amber-400">English</h4><CopyButton textToCopy={kitData.youtube_tags_en.join(', ')} /></div>
                        <div className="flex flex-wrap gap-2">{kitData.youtube_tags_en.map(tag => <span key={tag} className="bg-base-300 text-cyan-200 text-sm font-medium px-3 py-1 rounded-full">{tag}</span>)}</div>
                    </div>
                </div>
            </div>

            <div className="border-t border-base-300"></div>

            <div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-2">Thumbnail Ideas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {kitData.thumbnail_concepts.map((concept, index) => (
                        <div key={index} className="bg-base-300/50 p-4 rounded-lg border border-base-300 flex flex-col">
                             <h4 className="font-bold text-amber-400 flex-shrink-0">{concept.concept_title}</h4>
                             <p className="text-sm text-gray-400 mt-1 mb-3 flex-shrink-0">{concept.concept_description}</p>
                            <div className="aspect-video bg-base-300 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 flex-shrink-0">
                                {thumbImageUrls[index] ? <img src={thumbImageUrls[index] as string} alt="Generated thumbnail" className="w-full h-full object-cover rounded-lg"/> : generatingThumb === index ? 'Generating...' : '...'}
                            </div>
                            
                            <div className="mt-3 flex-grow flex flex-col">
                                <pre className="flex-grow p-2 text-xs bg-base-300 rounded whitespace-pre-wrap font-mono overflow-auto">{concept.image_prompt}</pre>
                                <div className="mt-2">
                                    <CopyButton textToCopy={concept.image_prompt} />
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-3 space-y-2">
                                <button disabled={generatingThumb !== null} onClick={() => handleGenerateThumbnail(concept.image_prompt, concept.cta_overlay_text, index)} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50 flex-shrink-0">
                                    {generatingThumb === index ? "Generating..." : "Generate Thumbnail"}
                                </button>
                                {thumbImageUrls[index] && <a href={thumbImageUrls[index] as string} download={`thumbnail_${index + 1}.png`} className="block text-center w-full bg-brand-primary hover:bg-brand-dark text-white font-semibold py-2 rounded-lg flex-shrink-0">Download</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};