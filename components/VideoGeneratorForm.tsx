// FIX: Implemented the full VideoGeneratorForm component to resolve module not found and other related errors.
import React, { useState, useEffect, useCallback, DragEvent } from 'react';
import type { GeneratorOptions, ImageFile, Character, VideoGeneratorState } from '../types';
import { useLocalization } from '../i18n';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { generateReferenceImage } from '../services/storyCreatorService';
import { FailoverParams } from '../services/geminiService';

interface VideoGeneratorFormProps {
  isGenerating: boolean;
  onSubmit: (options: GeneratorOptions) => void;
  hasActiveVideoApiKey: boolean;
  onManageKeysClick: () => void;
  generatorState: VideoGeneratorState;
  onStateChange: React.Dispatch<React.SetStateAction<VideoGeneratorState>>;
  characters: Character[];
  // For reference image generation failover
  allVideoApiKeys: string[];
  activeVideoApiKey: string | null;
  onVideoKeyUpdate: (key: string) => void;
}

const MAX_IMAGE_SIZE_MB = 10;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

export const VideoGeneratorForm: React.FC<VideoGeneratorFormProps> = ({
  isGenerating,
  onSubmit,
  hasActiveVideoApiKey,
  onManageKeysClick,
  generatorState,
  onStateChange,
  characters,
  allVideoApiKeys,
  activeVideoApiKey,
  onVideoKeyUpdate,
}) => {
  const { t } = useLocalization();
  const { prompt, imageFile, aspectRatio, enableSound, resolution } = generatorState;

  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Reference Image Generator State (remains local as it's a transient step)
  const [refImgAspectRatio, setRefImgAspectRatio] = useState<GeneratorOptions['aspectRatio']>('16:9');
  const [isGeneratingRefImg, setIsGeneratingRefImg] = useState(false);
  const [generatedRefImg, setGeneratedRefImg] = useState<ImageFile | null>(null);

  useEffect(() => {
    if (imageFile) {
        const dataUrl = `data:${imageFile.mimeType};base64,${imageFile.base64}`;
        setImagePreviewUrl(dataUrl);
    } else {
        setImagePreviewUrl(null);
    }
  }, [imageFile]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      alert(t('alertEnterPrompt') as string);
      return;
    }
    if (!hasActiveVideoApiKey) {
      onManageKeysClick();
      return;
    }

    const options: GeneratorOptions = {
      prompt,
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

  const handleFileValidation = (file: File): boolean => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}. Please use PNG, JPG, or GIF.`);
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };
  
  const processFile = (file: File) => {
    if (!handleFileValidation(file)) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      onStateChange(prev => ({
          ...prev,
          imageFile: { base64, mimeType: file.type }
      }));
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleRemoveImage = () => {
      onStateChange(prev => ({...prev, imageFile: null}));
  };

  const handleGenerateReferenceImage = async () => {
    if (!prompt.trim()) {
      alert(t('alertEnterPrompt') as string);
      return;
    }
    if (!activeVideoApiKey) {
      onManageKeysClick();
      return;
    }
    setIsGeneratingRefImg(true);
    if(generatedRefImg) URL.revokeObjectURL(generatedRefImg.previewUrl);
    setGeneratedRefImg(null);
    try {
        const failoverParams: FailoverParams = {
            allKeys: allVideoApiKeys,
            activeKey: activeVideoApiKey,
            onKeyUpdate: onVideoKeyUpdate
        };
        const result = await generateReferenceImage(failoverParams, prompt, refImgAspectRatio);
        const previewUrl = `data:${result.mimeType};base64,${result.base64}`;
        setGeneratedRefImg({ ...result, previewUrl });
    } catch(e) {
        console.error("Reference image generation failed:", e);
        alert(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
        setIsGeneratingRefImg(false);
    }
  };
  
  const handleAddGeneratedImage = () => {
    if (generatedRefImg) {
        onStateChange(prev => ({
            ...prev,
            imageFile: { base64: generatedRefImg.base64, mimeType: generatedRefImg.mimeType }
        }));
        URL.revokeObjectURL(generatedRefImg.previewUrl);
        setGeneratedRefImg(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Prompt Section */}
      <div className="space-y-2">
        <label htmlFor="prompt" className="block text-lg font-semibold text-gray-200">{t('promptLabel') as string}</label>
        <textarea
          id="prompt"
          rows={12}
          value={prompt}
          onChange={(e) => onStateChange(prev => ({ ...prev, prompt: e.target.value }))}
          placeholder={t('promptPlaceholder') as string}
          className="w-full bg-base-300 border-gray-600 rounded-lg p-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary text-gray-200 placeholder-gray-500"
        ></textarea>
        <p className="text-sm text-gray-500">{t('promptHint') as string}</p>
      </div>

      {/* Reference Image Generator */}
      <div className="bg-base-300/50 p-4 rounded-lg border border-base-300 space-y-3">
          <h3 className="text-md font-semibold text-gray-300">{t('videoGenerator.referenceImageGeneratorTitle') as string}</h3>
          <p className="text-xs text-gray-400">{t('videoGenerator.referenceImageGeneratorDescription') as string}</p>
          
          <div className="flex justify-between items-center">
              <select value={refImgAspectRatio} onChange={(e) => setRefImgAspectRatio(e.target.value as GeneratorOptions['aspectRatio'])} className="bg-base-300 border border-gray-600 rounded-lg p-2 text-sm text-gray-200">
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
              </select>
              <button type="button" onClick={handleGenerateReferenceImage} disabled={isGeneratingRefImg || !activeVideoApiKey || !prompt.trim()} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {isGeneratingRefImg ? t('videoGenerator.generatingImageButton') as string : t('videoGenerator.generateImageButton') as string}
              </button>
          </div>
            {generatedRefImg && (
              <div className="mt-3 text-center space-y-3">
                  <img src={generatedRefImg.previewUrl} alt="Generated reference" className="max-w-xs mx-auto rounded-lg shadow-md" />
                  <button type="button" onClick={handleAddGeneratedImage} className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                      {t('videoGenerator.addImageButton') as string}
                  </button>
              </div>
          )}
      </div>
      
       {/* Reference Image Upload Section */}
      <div>
        <label className="block text-lg font-semibold text-gray-200">{t('referenceImageLabel') as string}</label>
        <div className="mt-1">
            {imageFile && imagePreviewUrl ? (
                <div className="relative group w-full max-w-sm">
                  <img src={imagePreviewUrl} alt="Reference preview" className="w-full h-auto rounded-lg shadow-md" />
                  <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
            ) : (
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                htmlFor="file-upload"
                className={`relative block w-full border-2 ${isDragging ? 'border-brand-primary' : 'border-gray-600'} border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-gray-500 transition-colors`}
              >
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={SUPPORTED_IMAGE_TYPES.join(',')} />
                <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                <span className="mt-2 block text-sm font-medium text-gray-400">{t('uploadFile') as string} <span className="text-brand-light">{t('dragAndDrop') as string}</span></span>
                <span className="mt-1 block text-xs text-gray-600">{t('fileTypes') as string}</span>
              </label>
            )}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-200">{t('generationSettings') as string}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          {!imageFile && (
            <div>
              <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-400">{t('aspectRatioLabel') as string}</label>
              <select id="aspect-ratio" value={aspectRatio} onChange={(e) => onStateChange(prev => ({...prev, aspectRatio: e.target.value as GeneratorOptions['aspectRatio']}))} className="mt-1 block w-full bg-base-300 border-gray-600 rounded-lg p-2 shadow-sm focus:ring-brand-primary focus:border-brand-primary text-gray-200">
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
                <option>4:3</option>
                <option>3:4</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="resolution" className="block text-sm font-medium text-gray-400">{t('resolutionLabel') as string}</label>
            <select id="resolution" value={resolution} onChange={(e) => onStateChange(prev => ({...prev, resolution: e.target.value as GeneratorOptions['resolution']}))} className="mt-1 block w-full bg-base-300 border-gray-600 rounded-lg p-2 shadow-sm focus:ring-brand-primary focus:border-brand-primary text-gray-200">
              <option>720p</option>
              <option>1080p</option>
            </select>
          </div>

          <div className="flex items-center pb-1">
            <input
              id="enable-sound"
              type="checkbox"
              checked={enableSound}
              onChange={(e) => onStateChange(prev => ({...prev, enableSound: e.target.checked}))}
              className="h-4 w-4 text-brand-primary bg-base-300 border-gray-500 rounded focus:ring-brand-secondary"
            />
            <label htmlFor="enable-sound" className="ml-2 block text-sm font-medium text-gray-300">{t('enableSound') as string}</label>
          </div>
        </div>
      </div>
      
      {!hasActiveVideoApiKey && (
        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-4 rounded-lg text-center">
          <p className="font-bold">{t('videoKeyMissingWarning') as string}</p>
          <button type="button" onClick={onManageKeysClick} className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-700 hover:bg-yellow-600">
            {t('manageVideoApiKeys') as string}
          </button>
        </div>
      )}

      <div className="border-t border-base-300 pt-6 text-center">
        <button
          type="submit"
          disabled={isGenerating || !hasActiveVideoApiKey}
          className="w-full font-bold py-4 px-10 text-xl rounded-xl shadow-lg bg-brand-primary hover:bg-brand-dark disabled:bg-base-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {(isGenerating ? t('generatingButton') : t('generateButton')) as string}
        </button>
      </div>
    </form>
  );
};
