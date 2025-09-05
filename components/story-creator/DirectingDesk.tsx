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

// Data for the dropdowns
const sceneSetOptions = [
    { value: 'standard_cinematic', labelKey: 'storyCreator.directingOptions.sceneSet.standard_cinematic' },
    { value: 'epic_destruction', labelKey: 'storyCreator.directingOptions.sceneSet.epic_destruction' },
    { value: 'drifting_precision', labelKey: 'storyCreator.directingOptions.sceneSet.drifting_precision' },
];

const locationSetOptions = {
    standard: [
        { value: 'natural_outdoor', labelKey: 'storyCreator.directingOptions.locationSet.natural_outdoor' },
        { value: 'kids_bedroom', labelKey: 'storyCreator.directingOptions.locationSet.kids_bedroom' },
    ],
    custom: { value: 'custom_location', labelKey: 'storyCreator.directingOptions.locationSet.custom_location' }
};

const weatherSetOptions = [
    { value: 'sunny', labelKey: 'storyCreator.directingOptions.weatherSet.sunny' },
    { value: 'cloudy', labelKey: 'storyCreator.directingOptions.weatherSet.cloudy' },
    { value: 'rainy', labelKey: 'storyCreator.directingOptions.weatherSet.rainy' },
];

const cameraStyleOptions = {
    standard: [
        { value: 'standard_cinematic', labelKey: 'storyCreator.directingOptions.cameraStyleSet.standard_cinematic' },
        { value: 'fpv_drone_dive', labelKey: 'storyCreator.directingOptions.cameraStyleSet.fpv_drone_dive' },
    ]
};

const narratorLanguageOptions = [
    { value: 'no_narrator', labelKey: 'storyCreator.directingOptions.narratorLanguageSet.no_narrator' },
    { value: 'id', labelKey: 'storyCreator.directingOptions.narratorLanguageSet.id' },
    { value: 'en', labelKey: 'storyCreator.directingOptions.narratorLanguageSet.en' },
    { value: 'custom_language', labelKey: 'storyCreator.directingOptions.narratorLanguageSet.custom_language' },
];


export const DirectingDesk: React.FC<DirectingDeskProps> = ({ settings, setSettings }) => {
    const { t } = useLocalization();

    const handleChange = (field: keyof DirectingSettings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-base-200 rounded-xl border border-base-300">
            <div className="p-4">
                {/* FIX: Cast result of t() to string */}
                <h2 className="text-xl font-bold">{t('storyCreator.directingDesk') as string}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                {/* FIX: Cast result of t() to string */}
                <p className="text-sm text-gray-400">{t('storyCreator.deskDescription') as string}</p>
                
                <SelectInput label={t('storyCreator.sceneSet') as string} value={settings.sceneStyleSet} onChange={e => handleChange('sceneStyleSet', e.target.value)}>
                    {sceneSetOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey) as string}</option>
                    ))}
                </SelectInput>

                <SelectInput label={t('storyCreator.locationSet') as string} value={settings.locationSet} onChange={e => handleChange('locationSet', e.target.value)}>
                    <optgroup label={t('storyCreator.directingOptions.locationSet.standardLandGroup') as string}>
                       {locationSetOptions.standard.map(opt => (
                            <option key={opt.value} value={opt.value}>{t(opt.labelKey) as string}</option>
                       ))}
                    </optgroup>
                    <option value={locationSetOptions.custom.value}>{t(locationSetOptions.custom.labelKey) as string}</option>
                </SelectInput>
                 {settings.locationSet === 'custom_location' && (
                    <input type="text" value={settings.customLocation} onChange={e => handleChange('customLocation', e.target.value)} placeholder={t('storyCreator.customLocationPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm mt-2 text-gray-200" />
                )}

                <SelectInput label={t('storyCreator.weatherSet') as string} value={settings.weatherSet} onChange={e => handleChange('weatherSet', e.target.value)}>
                    {weatherSetOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey) as string}</option>
                    ))}
                </SelectInput>

                <SelectInput label={t('storyCreator.cameraStyleSet') as string} value={settings.cameraStyleSet} onChange={e => handleChange('cameraStyleSet', e.target.value)}>
                     <optgroup label={t('storyCreator.directingOptions.cameraStyleSet.standardGroup') as string}>
                        {cameraStyleOptions.standard.map(opt => (
                            <option key={opt.value} value={opt.value}>{t(opt.labelKey) as string}</option>
                        ))}
                    </optgroup>
                </SelectInput>

                <SelectInput label={t('storyCreator.narratorLanguageSet') as string} value={settings.narratorLanguageSet} onChange={e => handleChange('narratorLanguageSet', e.target.value)}>
                    {narratorLanguageOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey) as string}</option>
                    ))}
                </SelectInput>
                {settings.narratorLanguageSet === 'custom_language' && (
                    <input type="text" value={settings.customNarratorLanguage} onChange={e => handleChange('customNarratorLanguage', e.target.value)} placeholder={t('storyCreator.customLanguagePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm mt-2 text-gray-200" />
                )}
            </div>
        </div>
    );
};