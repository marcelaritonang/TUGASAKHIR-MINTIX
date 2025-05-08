// src/components/admin/AdminNavbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminNavbar = ({ pendingCount = 0 }) => {
    const location = useLocation();

    // Check if route is active
    const isActive = (path) => {
        return location.pathname === path
            ? "bg-gray-700 text-white border-b-2 border-yellow-500"
            : "text-gray-300 hover:bg-gray-700 hover:text-white";
    };

    return (
        <nav className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="flex flex-wrap">
                <Link
                    to="/admin/approval"
                    className={`px-4 py-3 text-sm font-medium transition-colors ${isActive('/admin/approval')}`}
                >
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Approval</span>
                        {pendingCount > 0 && (
                            <span className="ml-2 bg-yellow-600 text-white text-xs rounded-full px-2 py-0.5">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                </Link>

                <Link
                    to="/admin/approved"
                    className={`px-4 py-3 text-sm font-medium transition-colors ${isActive('/admin/approved')}`}
                >
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Approved Concerts</span>
                    </div>
                </Link>

                <Link
                    to="/admin/rejected"
                    className={`px-4 py-3 text-sm font-medium transition-colors ${isActive('/admin/rejected')}`}
                >
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Rejected Concerts</span>
                    </div>
                </Link>

                <Link
                    to="/admin/settings"
                    className={`px-4 py-3 text-sm font-medium transition-colors ${isActive('/admin/settings')}`}
                >
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                    </div>
                </Link>
            </div>
        </nav>
    );
};

export default AdminNavbar;