import React from 'react';
import { useLocalization } from '../i18n';
import { XCircleIcon } from './icons/XCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { RocketIcon } from './icons/RocketIcon';
import { CameraReelsIcon } from './icons/CameraReelsIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';

interface TutorialModalProps {
    onClose: () => void;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="border-t border-base-300 pt-4 mt-4">
        <h3 className="text-xl font-bold text-amber-300 flex items-center gap-3">
            {icon}
            {title}
        </h3>
        <div className="mt-3 text-gray-300/90 text-sm space-y-2 prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
            {children}
        </div>
    </div>
);

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
    const { t } = useLocalization();
    const tutorial = t('tutorial') as any;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-3xl border border-base-300 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-base-300 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100">{tutorial.title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <p className="text-gray-400">{tutorial.intro}</p>
                    
                    <Section title={tutorial.setup.title} icon={<KeyIcon className="h-6 w-6 text-amber-300" />}>
                        <p dangerouslySetInnerHTML={{ __html: tutorial.setup.body }} />
                    </Section>

                    <Section title={tutorial.story.title} icon={<PencilSquareIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{tutorial.story.intro}</p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: tutorial.story.step1 }} />
                            <li dangerouslySetInnerHTML={{ __html: tutorial.story.step2 }} />
                            <li dangerouslySetInnerHTML={{ __html: tutorial.story.step3 }} />
                            <li dangerouslySetInnerHTML={{ __html: tutorial.story.step4 }} />
                        </ul>
                    </Section>

                    <Section title={tutorial.storyboard.title} icon={<CameraReelsIcon className="h-8 w-8 text-amber-300" />}>
                        <p>{tutorial.storyboard.intro}</p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: tutorial.storyboard.step1 }} />
                            <li dangerouslySetInnerHTML={{ __html: tutorial.storyboard.step2 }} />
                        </ul>
                    </Section>

                     <Section title={tutorial.video.title} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>}>
                        <p dangerouslySetInnerHTML={{ __html: tutorial.video.body }} />
                    </Section>

                    <Section title={tutorial.publishing.title} icon={<RocketIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{tutorial.publishing.intro}</p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: tutorial.publishing.step1 }} />
                            <li dangerouslySetInnerHTML={{ __html: tutorial.publishing.step2 }} />
                        </ul>
                    </Section>
                </div>

                <div className="flex-shrink-0 p-4 mt-auto border-t border-base-300 text-right">
                    <button onClick={onClose} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                        {tutorial.closeButton}
                    </button>
                </div>
            </div>
        </div>
    );
};
