import React, { useState, useEffect } from 'react';
import type { Character } from '../../types';
import { useLocalization } from '../../i18n';
import { PencilSquareIcon } from '../icons/PencilSquareIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CharacterWorkshopModal } from './CharacterWorkshopModal'; 

interface CharacterGarageProps {
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    activeApiKey: string | null;
    allStoryApiKeys: string[];
    onStoryKeyUpdate: (key: string) => void;
}

const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

export const CharacterGarage: React.FC<CharacterGarageProps> = ({ characters, setCharacters, activeApiKey, allStoryApiKeys, onStoryKeyUpdate }) => {
    const { t } = useLocalization();
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (characters.length > 0 && currentIndex >= characters.length) {
            setCurrentIndex(Math.max(0, characters.length - 1));
        } else if (characters.length === 0) {
            setCurrentIndex(0);
        }
    }, [characters, currentIndex]);
    
    const handleDelete = (id: string) => {
        setCharacters(chars => chars.filter(c => c.id !== id));
    };
    
    const handleEdit = (character: Character) => {
        setEditingCharacter(character);
        setIsWorkshopOpen(true);
    };

    const handleAddNew = () => {
        setEditingCharacter(null);
        setIsWorkshopOpen(true);
    };

    const handleSaveCharacter = (character: Character) => {
        if (editingCharacter) {
            setCharacters(chars => chars.map(c => c.id === character.id ? character : c));
        } else {
            const newChars = [...characters, character];
            setCharacters(newChars);
            setCurrentIndex(newChars.length - 1); // Go to the newly added character
        }
        setIsWorkshopOpen(false);
    };

    const goToPrevious = () => {
        const isFirst = currentIndex === 0;
        const newIndex = isFirst ? characters.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLast = currentIndex === characters.length - 1;
        const newIndex = isLast ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };
    
    const currentCharacter = characters.length > 0 ? characters[currentIndex] : null;

    return (
        <div className="bg-base-200 rounded-xl border border-base-300">
            <div className="p-4">
                {/* FIX: Cast result of t() to string */}
                <h2 className="text-xl font-bold">{t('storyCreator.characterGarage') as string}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                {/* FIX: Cast result of t() to string */}
                <p className="text-sm text-gray-400">{t('storyCreator.garageDescription') as string}</p>
                <button 
                    onClick={handleAddNew}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-indigo-500"
                >
                    {/* FIX: Cast result of t() to string */}
                    {t('storyCreator.openCharacterWorkshop') as string}
                </button>
                <div className="mt-4 min-h-[100px] flex items-center justify-center">
                    {characters.length === 0 ? (
                        /* FIX: Cast result of t() to string */
                        <p className="text-gray-500 italic text-center">{t('storyCreator.garageEmpty') as string}</p>
                    ) : (
                        <div className="w-full">
                            <div className="relative flex items-center justify-center">
                                {characters.length > 1 && (
                                    <button onClick={goToPrevious} className="absolute left-0 z-10 p-2 bg-base-300/50 rounded-full hover:bg-base-300 transition-colors" aria-label="Previous character">
                                        <ChevronLeftIcon />
                                    </button>
                                )}
                                
                                {currentCharacter && (
                                    <div className="bg-base-300 p-3 rounded-lg w-full max-w-xs text-center flex-grow">
                                        <p className="font-bold text-brand-light truncate">{currentCharacter.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{currentCharacter.modelName}</p>
                                        <div className="flex justify-center gap-4 mt-2">
                                            <button onClick={() => handleEdit(currentCharacter)} className="text-gray-400 hover:text-white p-1" aria-label={`Edit ${currentCharacter.name}`}>
                                                <PencilSquareIcon />
                                            </button>
                                            <button onClick={() => handleDelete(currentCharacter.id)} className="text-gray-400 hover:text-red-400 p-1" aria-label={`Delete ${currentCharacter.name}`}>
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {characters.length > 1 && (
                                     <button onClick={goToNext} className="absolute right-0 z-10 p-2 bg-base-300/50 rounded-full hover:bg-base-300 transition-colors" aria-label="Next character">
                                        <ChevronRightIcon />
                                    </button>
                                )}
                            </div>
                            
                             {characters.length > 1 && (
                                <div className="text-center text-xs text-gray-500 mt-2" aria-live="polite">
                                    {currentIndex + 1} / {characters.length}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isWorkshopOpen && (
                <CharacterWorkshopModal
                    isOpen={isWorkshopOpen}
                    onClose={() => setIsWorkshopOpen(false)}
                    onSave={handleSaveCharacter}
                    initialCharacter={editingCharacter}
                    activeApiKey={activeApiKey}
                    allStoryApiKeys={allStoryApiKeys}
                    onStoryKeyUpdate={onStoryKeyUpdate}
                />
            )}
        </div>
    );
};