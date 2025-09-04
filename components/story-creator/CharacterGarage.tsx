import React, { useState } from 'react';
import type { Character } from '../../types';
import { useLocalization } from '../../i18n';
import { PencilSquareIcon } from '../icons/PencilSquareIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CharacterWorkshopModal } from './CharacterWorkshopModal'; 

interface CharacterGarageProps {
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    activeApiKey: string | null;
}

export const CharacterGarage: React.FC<CharacterGarageProps> = ({ characters, setCharacters, activeApiKey }) => {
    const { t } = useLocalization();
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    
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
            // Update existing character
            setCharacters(chars => chars.map(c => c.id === character.id ? character : c));
        } else {
            // Add new character
            setCharacters(chars => [...chars, character]);
        }
        setIsWorkshopOpen(false);
    };

    return (
        <div className="bg-base-200 rounded-xl border border-base-300">
            <div className="p-4">
                <h2 className="text-xl font-bold">{t('storyCreator.characterGarage')}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                <p className="text-sm text-gray-400">{t('storyCreator.garageDescription')}</p>
                <button 
                    onClick={handleAddNew}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-indigo-500"
                >
                    {t('storyCreator.openCharacterWorkshop')}
                </button>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mt-4">
                    {characters.length === 0 ? (
                        <p className="text-gray-500 italic text-sm">{t('storyCreator.garageEmpty')}</p>
                    ) : (
                        characters.map(char => (
                            <div key={char.id} className="bg-base-300 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex-grow">
                                    <p className="font-bold text-brand-light">{char.name}</p>
                                    <p className="text-xs text-gray-400">{char.modelName}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(char)} className="text-gray-400 hover:text-white p-1">
                                        <PencilSquareIcon />
                                    </button>
                                    <button onClick={() => handleDelete(char.id)} className="text-gray-400 hover:text-red-400 p-1">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))
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
                />
            )}
        </div>
    );
};
