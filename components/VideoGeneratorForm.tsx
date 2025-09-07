import React, { useState, useCallback, useEffect } from 'react';
import type { GeneratorOptions, ImageFile, Character } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { useLocalization } from '../i18n';
import { generateReferenceImage } from '../services/storyCreatorService';

interface VideoGeneratorFormProps {
  isGenerating: boolean;
  onSubmit: (options: GeneratorOptions) => void;
  hasActiveVideoApiKey: boolean;
  onManageKeysClick: () => void;
  initialPrompt?: string;
  characters: Character[];
  allVideoApiKeys: string[];
  activeVideoApiKey: string | null;
  onVideoKeyUpdate: (key: string) => void;
}

// FIX: Add `className` to props to allow for style overrides.
const Label: React.FC<{ htmlFor?: string; children: React.ReactNode; className?: string; }> = ({ htmlFor, children, className }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-300 mb-2 ${className || ''}`}>
    {children}
  </label>
);

const RadioButton: React.FC<{ id: string; name: string; value: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, name, value, label, checked, onChange }) => (
    <div className="flex items-center">
        <input
            id={id}
            name={name}
            type="radio"
            value={value}
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-brand-primary bg-base-300 border-gray-500 focus:ring-brand-secondary"
        />
        <label htmlFor={id} className="ml-3 block text-sm font-medium text-gray-300">
            {label}
        </label>
    </div>
);

export const VideoGeneratorForm: React.FC<VideoGeneratorFormProps> = ({ isGenerating, onSubmit, hasActiveVideoApiKey, onManageKeysClick, initialPrompt = '', characters, allVideoApiKeys, activeVideoApiKey, onVideoKeyUpdate }) => {
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [aspectRatio, setAspectRatio] = useState<GeneratorOptions['aspectRatio']>('16:9');
  const [enableSound, setEnableSound] = useState<boolean>(true);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  
  // State for the new reference image generator
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<ImageFile | null>(null);
  const [imageGenAspectRatio, setImageGenAspectRatio] = useState<string>('1:1');

  const { t } = useLocalization();
  
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);


  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setImageFile({
          base64,
          mimeType: file.type,
          previewUrl: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const removeImage = () => {
    if (imageFile) {
        URL.revokeObjectURL(imageFile.previewUrl);
        setImageFile(null);
    }
  };

  const augmentPromptWithCharacterDNA = (currentPrompt: string): string => {
    let augmented = currentPrompt;
    for (const char of characters) {
        if (currentPrompt.includes(char.consistency_key)) {
            const dna = `[Character DNA for ${char.consistency_key}: A ${char.material} ${char.modelName}. Design Language: ${char.designLanguage}. Key Visual Features: ${char.keyFeatures.join(', ')}. Details: ${char.physical_details}. Size: ${char.scale_and_size}. Personality: ${char.character_personality}]`;
            augmented = `${dna}\n\n${augmented}`;
            // Assuming only one character is the focus of a prompt
            break; 
        }
    }
    return augmented;
  };

  const handleGenerateReferenceImage = async () => {
    if (!prompt.trim() || !activeVideoApiKey) {
        alert(t(activeVideoApiKey ? 'alertEnterPrompt' : 'alertSetVideoApiKey'));
        return;
    }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
        const augmentedPrompt = augmentPromptWithCharacterDNA(prompt);
        const imageData = await generateReferenceImage({
            allKeys: allVideoApiKeys,
            activeKey: activeVideoApiKey,
            onKeyUpdate: onVideoKeyUpdate
        }, augmentedPrompt, imageGenAspectRatio);
        
        setGeneratedImage({
            base64: imageData.base64,
            mimeType: imageData.mimeType,
            previewUrl: `data:${imageData.mimeType};base64,${imageData.base64}`
        });

    } catch(e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Failed to generate image.');
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleAddGeneratedImage = () => {
    if (generatedImage) {
        // Revoke old object URL if it exists
        if (imageFile) {
            URL.revokeObjectURL(imageFile.previewUrl);
        }
        setImageFile(generatedImage);
        setGeneratedImage(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) {
      alert(t('alertEnterPrompt'));
      return;
    }
    if (!hasActiveVideoApiKey) {
        alert(t('alertSetVideoApiKey'));
        onManageKeysClick();
        return;
    }

    let finalPrompt = augmentPromptWithCharacterDNA(prompt);

    // Add letterboxing/pillarboxing instruction if aspect ratio is not 16:9
    if (aspectRatio !== '16:9') {
        finalPrompt += `\n\n---
Technical Instruction: The primary visual content MUST be framed in a ${aspectRatio} aspect ratio. The final video output MUST be 16:9. Any empty space in the 16:9 frame should be filled with pure black, creating a letterbox or pillarbox effect.`;
    }

    const options: GeneratorOptions = {
      prompt: finalPrompt,
      aspectRatio,
      enableSound,
      resolution,
    };

    if (imageFile) {
      options.image = {
        base64: imageFile.base64,
        mimeType: imageFile.mimeType,
      };
    }
    onSubmit(options);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <Label htmlFor="image-upload">{t('referenceImageLabel') as string}</Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md min-h-[150px]">
            {!imageFile ? (
                <div className="space-y-1 text-center flex flex-col justify-center">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <div className="flex text-sm text-gray-400">
                    <label htmlFor="image-upload" className="relative cursor-pointer bg-base-200 rounded-md font-medium text-brand-light hover:text-brand-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-base-200 focus-within:ring-brand-secondary">
                        <span>{t('uploadFile') as string}</span>
                        <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                    <p className="pl-1 rtl:pr-1 rtl:pl-0">{t('dragAndDrop') as string}</p>
                    </div>
                    <p className="text-xs text-gray-500">{t('fileTypes') as string}</p>
                </div>
            ) : (
                <div className="relative">
                    <img src={imageFile.previewUrl} alt="Image preview" className="mx-auto h-32 w-auto rounded-lg" />
                    <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 rtl:-left-2 rtl:-right-auto p-1 bg-gray-800 rounded-full text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
            )}
        </div>
      </fieldset>
      
      <div className="flex flex-col md:flex-row gap-6">
        <fieldset className="flex-grow md:w-1/2">
            <Label htmlFor="prompt">{t('promptLabel') as string}</Label>
            <textarea
            id="prompt"
            rows={16}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('promptPlaceholder') as string}
            className="block w-full bg-base-300 border-base-300 rounded-lg shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-200 placeholder-gray-500"
            />
            <p className="mt-2 text-xs text-gray-400">{t('promptHint') as string}</p>
        </fieldset>

        <fieldset className="md:w-1/2 bg-base-300/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-2">{t('videoGenerator.referenceImageGeneratorTitle') as string}</h3>
            <div className="space-y-3">
                 <div className="flex items-center gap-2">
                    <Label htmlFor="image-gen-aspect-ratio" className="!mb-0">{t('aspectRatioLabel') as string}</Label>
                    <select
                        id="image-gen-aspect-ratio"
                        value={imageGenAspectRatio}
                        onChange={e => setImageGenAspectRatio(e.target.value)}
                        className="bg-base-100/50 border border-gray-500 rounded-md p-1 text-xs text-gray-200"
                    >
                        {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>

                <div className="aspect-video bg-base-300 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600">
                    {isGeneratingImage && <div className="text-gray-400 text-sm">Generating...</div>}
                    {generatedImage && <img src={generatedImage.previewUrl} alt="Generated preview" className="w-full h-full object-contain rounded-lg"/>}
                </div>
                
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleGenerateReferenceImage}
                        disabled={isGeneratingImage || !prompt.trim() || !activeVideoApiKey}
                        className="w-full flex-grow flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-base-300 disabled:cursor-not-allowed disabled:text-gray-500"
                    >
                        {/* FIX: Cast ternary result to string to satisfy ReactNode type. */}
                        {(isGeneratingImage ? t('videoGenerator.generatingImageButton') : t('videoGenerator.generateImageButton')) as string}
                    </button>
                    {generatedImage && (
                         <button
                            type="button"
                            onClick={handleAddGeneratedImage}
                            className="w-full flex-grow flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                            {t('videoGenerator.addImageButton') as string}
                        </button>
                    )}
                </div>
            </div>
        </fieldset>
      </div>

      <fieldset>
          <legend className="block text-sm font-medium text-gray-300 mb-2">{t('generationSettings') as string}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-2 border-t border-base-300">
              <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">{t('aspectRatioLabel') as string}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(['16:9', '9:16', '1:1', '4:3', '3:4'] as const).map(ar => (
                          <RadioButton key={ar} id={`ar-${ar}`} name="aspectRatio" value={ar} label={ar} checked={aspectRatio === ar} onChange={(e) => setAspectRatio(e.target.value as GeneratorOptions['aspectRatio'])} />
                      ))}
                  </div>
              </div>
              <div className="space-y-6">
                 <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3">{t('resolutionLabel') as string}</h3>
                      <div className="flex gap-4">
                          <RadioButton id="res1080p" name="resolution" value="1080p" label="1080p" checked={resolution === '1080p'} onChange={(e) => setResolution(e.target.value as '720p' | '1080p')} />
                          <RadioButton id="res720p" name="resolution" value="720p" label="720p" checked={resolution === '720p'} onChange={(e) => setResolution(e.target.value as '720p' | '1080p')} />
                      </div>
                  </div>
                  <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3">{t('soundLabel') as string}</h3>
                      <div className="flex items-center">
                        <input
                            id="enableSound"
                            name="enableSound"
                            type="checkbox"
                            checked={enableSound}
                            onChange={(e) => setEnableSound(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-base-300 text-brand-primary focus:ring-brand-secondary"
                        />
                        <label htmlFor="enableSound" className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-gray-300">{t('enableSound') as string}</label>
                      </div>
                  </div>
              </div>
          </div>
      </fieldset>


      <div>
        {!hasActiveVideoApiKey && (
             <div className="text-center bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-3 rounded-lg mb-4 text-sm flex items-center justify-center gap-2">
                <KeyIcon className="h-5 w-5" />
                <span>{t('videoKeyMissingWarning') as string}</span>
            </div>
        )}
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim() || !hasActiveVideoApiKey}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-secondary disabled:bg-base-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors"
        >
          {(isGenerating ? t('generatingButton') : t('generateButton')) as string}
        </button>
      </div>
    </form>
  );
};