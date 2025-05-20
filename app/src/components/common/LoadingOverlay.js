// src/components/common/LoadingOverlay.js
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ message = "Loading...", progress = 0, isVisible = true }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="flex flex-col items-center">
                    <LoadingSpinner size={10} />
                    <p className="mt-4 text-white font-medium text-lg">{message}</p>
                    {progress > 0 && (
                        <div className="w-full mt-4">
                            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="mt-2 text-right text-gray-400 text-sm">{progress}%</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;