import React, { useState, useCallback, useEffect } from 'react';
import type { GeneratorOptions, ImageFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { useLocalization } from '../i18n';

interface VideoGeneratorFormProps {
  isGenerating: boolean;
  onSubmit: (options: GeneratorOptions) => void;
  hasActiveVideoApiKey: boolean;
  onManageKeysClick: () => void;
  initialPrompt?: string;
}

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-2">
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

export const VideoGeneratorForm: React.FC<VideoGeneratorFormProps> = ({ isGenerating, onSubmit, hasActiveVideoApiKey, onManageKeysClick, initialPrompt = '' }) => {
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [aspectRatio, setAspectRatio] = useState<GeneratorOptions['aspectRatio']>('16:9');
  const [enableSound, setEnableSound] = useState<boolean>(true);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        {/* FIX: Cast result of t() to string */}
        <Label htmlFor="prompt">{t('promptLabel') as string}</Label>
        <textarea
          id="prompt"
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('promptPlaceholder') as string}
          className="block w-full bg-base-300 border-base-300 rounded-lg shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-200 placeholder-gray-500"
        />
         {/* FIX: Cast result of t() to string */}
         <p className="mt-2 text-xs text-gray-400">{t('promptHint') as string}</p>
      </fieldset>

      <fieldset>
        {/* FIX: Cast result of t() to string */}
        <Label htmlFor="image-upload">{t('referenceImageLabel') as string}</Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
            {!imageFile ? (
                <div className="space-y-1 text-center">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <div className="flex text-sm text-gray-400">
                    <label htmlFor="image-upload" className="relative cursor-pointer bg-base-200 rounded-md font-medium text-brand-light hover:text-brand-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-base-200 focus-within:ring-brand-secondary">
                        {/* FIX: Cast result of t() to string */}
                        <span>{t('uploadFile') as string}</span>
                        <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                    {/* FIX: Cast result of t() to string */}
                    <p className="pl-1 rtl:pr-1 rtl:pl-0">{t('dragAndDrop') as string}</p>
                    </div>
                    {/* FIX: Cast result of t() to string */}
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

      <fieldset>
          {/* FIX: Cast result of t() to string */}
          <legend className="block text-sm font-medium text-gray-300 mb-2">{t('generationSettings') as string}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-2 border-t border-base-300">
              <div>
                  {/* FIX: Cast result of t() to string */}
                  <h3 className="text-sm font-medium text-gray-300 mb-3">{t('aspectRatioLabel') as string}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(['16:9', '9:16', '1:1', '4:3', '3:4'] as const).map(ar => (
                          <RadioButton key={ar} id={`ar-${ar}`} name="aspectRatio" value={ar} label={ar} checked={aspectRatio === ar} onChange={(e) => setAspectRatio(e.target.value as GeneratorOptions['aspectRatio'])} />
                      ))}
                  </div>
              </div>
              <div className="space-y-6">
                 <div>
                      {/* FIX: Cast result of t() to string */}
                      <h3 className="text-sm font-medium text-gray-300 mb-3">{t('resolutionLabel') as string}</h3>
                      <div className="flex gap-4">
                          <RadioButton id="res1080p" name="resolution" value="1080p" label="1080p" checked={resolution === '1080p'} onChange={(e) => setResolution(e.target.value as '720p' | '1080p')} />
                          <RadioButton id="res720p" name="resolution" value="720p" label="720p" checked={resolution === '720p'} onChange={(e) => setResolution(e.target.value as '720p' | '1080p')} />
                      </div>
                  </div>
                  <div>
                      {/* FIX: Cast result of t() to string */}
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
                        {/* FIX: Cast result of t() to string */}
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
                {/* FIX: Cast result of t() to string */}
                <span>{t('videoKeyMissingWarning') as string}</span>
            </div>
        )}
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim() || !hasActiveVideoApiKey}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-secondary disabled:bg-base-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors"
        >
          {/* FIX: Cast result of t() to string */}
          {(isGenerating ? t('generatingButton') : t('generateButton')) as string}
        </button>
      </div>
    </form>
  );
};