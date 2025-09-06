import React from 'react';
import type { DirectingSettings } from '../../types';
import { useLocalization } from '../../i18n';

interface DirectingDeskProps {
    settings: DirectingSettings;
    setSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
}

const SelectInput: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm text-gray-200 focus:ring-brand-primary focus:border-brand-primary">
            {children}
        </select>
    </div>
);

const CustomInput: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}> = ({ value, onChange, placeholder }) => (
     <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-base-100/50 border border-gray-500 rounded-lg p-2 text-sm mt-2 text-gray-200 placeholder-gray-400/80" />
);


export const DirectingDesk: React.FC<DirectingDeskProps> = ({ settings, setSettings }) => {
    const { t } = useLocalization();

    const handleChange = (field: keyof DirectingSettings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };
    
    // Dynamically get options from i18n
    const sceneSetOptions = t('storyCreator.directingOptions.sceneSet') as { [key: string]: string };
    const locationSetOptions = t('storyCreator.directingOptions.locationSet') as { [key: string]: string };
    const weatherSetOptions = t('storyCreator.directingOptions.weatherSet') as { [key: string]: string };
    const cameraStyleSetOptions = t('storyCreator.directingOptions.cameraStyleSet') as { [key: string]: string };
    const narratorLanguageSetOptions = t('storyCreator.directingOptions.narratorLanguageSet') as { [key: string]: string };
    const timeOfDayOptions = t('storyCreator.directingOptions.timeOfDay') as { [key: string]: string };
    const artStyleOptions = t('storyCreator.directingOptions.artStyle') as { [key: string]: string };
    const soundtrackMoodOptions = t('storyCreator.directingOptions.soundtrackMood') as { [key: string]: string };
    const pacingOptions = t('storyCreator.directingOptions.pacing') as { [key: string]: string };

    const renderOptions = (options: { [key: string]: string }, excludeKeys: string[] = []) => {
        return Object.entries(options)
            .filter(([key]) => !excludeKeys.includes(key))
            .map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ));
    };

    return (
        <div className="bg-base-200 rounded-xl border border-base-300">
            <div className="p-4">
                <h2 className="text-xl font-bold">{t('storyCreator.directingDesk') as string}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                <p className="text-sm text-gray-400">{t('storyCreator.deskDescription') as string}</p>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectInput label={t('storyCreator.sceneSet') as string} value={settings.sceneStyleSet} onChange={e => handleChange('sceneStyleSet', e.target.value)}>
                        {renderOptions(sceneSetOptions)}
                    </SelectInput>
                    {settings.sceneStyleSet === 'custom_scene' && (
                        <CustomInput value={settings.customSceneStyle} onChange={e => handleChange('customSceneStyle', e.target.value)} placeholder={t('storyCreator.customSceneStylePlaceholder') as string} />
                    )}

                    <SelectInput label={t('storyCreator.locationSet') as string} value={settings.locationSet} onChange={e => handleChange('locationSet', e.target.value)}>
                        <optgroup label={locationSetOptions.standardLandGroup}>
                           {renderOptions(locationSetOptions, ['standardLandGroup', 'custom_location'])}
                        </optgroup>
                        <option value="custom_location">{locationSetOptions.custom_location}</option>
                    </SelectInput>
                    {settings.locationSet === 'custom_location' && (
                        <CustomInput value={settings.customLocation} onChange={e => handleChange('customLocation', e.target.value)} placeholder={t('storyCreator.customLocationPlaceholder') as string} />
                    )}

                    <SelectInput label={t('storyCreator.weatherSet') as string} value={settings.weatherSet} onChange={e => handleChange('weatherSet', e.target.value)}>
                        {renderOptions(weatherSetOptions)}
                    </SelectInput>
                    {settings.weatherSet === 'custom_weather' && (
                        <CustomInput value={settings.customWeather} onChange={e => handleChange('customWeather', e.target.value)} placeholder={t('storyCreator.customWeatherPlaceholder') as string} />
                    )}

                    <SelectInput label={t('storyCreator.cameraStyleSet') as string} value={settings.cameraStyleSet} onChange={e => handleChange('cameraStyleSet', e.target.value)}>
                        <optgroup label={cameraStyleSetOptions.standardGroup}>
                             {renderOptions(cameraStyleSetOptions, ['standardGroup', 'custom_camera'])}
                        </optgroup>
                        <option value="custom_camera">{cameraStyleSetOptions.custom_camera}</option>
                    </SelectInput>
                    {settings.cameraStyleSet === 'custom_camera' && (
                        <CustomInput value={settings.customCameraStyle} onChange={e => handleChange('customCameraStyle', e.target.value)} placeholder={t('storyCreator.customCameraStylePlaceholder') as string} />
                    )}

                    <SelectInput label={t('storyCreator.narratorLanguageSet') as string} value={settings.narratorLanguageSet} onChange={e => handleChange('narratorLanguageSet', e.target.value)}>
                        {renderOptions(narratorLanguageSetOptions)}
                    </SelectInput>
                    {settings.narratorLanguageSet === 'custom_language' && (
                        <CustomInput value={settings.customNarratorLanguage} onChange={e => handleChange('customNarratorLanguage', e.target.value)} placeholder={t('storyCreator.customLanguagePlaceholder') as string} />
                    )}
                    
                    <SelectInput label={t('storyCreator.timeOfDay') as string} value={settings.timeOfDay} onChange={e => handleChange('timeOfDay', e.target.value)}>
                        {renderOptions(timeOfDayOptions)}
                    </SelectInput>
                    
                    <SelectInput label={t('storyCreator.artStyle') as string} value={settings.artStyle} onChange={e => handleChange('artStyle', e.target.value)}>
                        {renderOptions(artStyleOptions)}
                    </SelectInput>
                    
                     <SelectInput label={t('storyCreator.soundtrackMood') as string} value={settings.soundtrackMood} onChange={e => handleChange('soundtrackMood', e.target.value)}>
                        {renderOptions(soundtrackMoodOptions)}
                    </SelectInput>
                    
                    <SelectInput label={t('storyCreator.pacing') as string} value={settings.pacing} onChange={e => handleChange('pacing', e.target.value)}>
                        {renderOptions(pacingOptions)}
                    </SelectInput>
                </div>
            </div>
        </div>
    );
};
