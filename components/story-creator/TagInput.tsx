import React, { useState } from 'react';

interface TagInputProps {
    label: string;
    description?: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder: string;
}

export const TagInput: React.FC<TagInputProps> = ({ label, description, tags, onTagsChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                 onTagsChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
            {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-base-300 rounded-lg border border-gray-600 min-h-[44px]">
                {tags.map((tag, index) => (
                    <span key={index} className="bg-indigo-600 text-white text-sm font-medium px-2.5 py-1 rounded-full flex items-center gap-2">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="font-bold text-md leading-none hover:text-gray-300">&times;</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow bg-transparent focus:outline-none p-1 text-sm text-gray-200 placeholder-gray-500"
                />
            </div>
        </div>
    );
};
