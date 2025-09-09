import React from 'react';
import { useLocalization } from '../i18n';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
    const { t } = useLocalization();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-md border border-base-300 transform transition-all p-6">
                <h3 className="text-xl font-bold text-amber-400 mb-4">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                        {/* FIX: Cast result of t() to string */}
                        {t('closeButton') as string}
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                        {t('confirmButton') as string}
                    </button>
                </div>
            </div>
        </div>
    );
};
