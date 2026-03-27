import React, { useState } from 'react';

interface ConfirmRegistrationModalProps {
    isOpen: boolean;
    entryFee: number;
    walletBalance: number;
    tournamentTitle: string;
    slot: number;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}

const ConfirmRegistrationModal: React.FC<ConfirmRegistrationModalProps> = ({
    isOpen,
    entryFee,
    walletBalance,
    tournamentTitle,
    slot,
    onConfirm,
    onCancel,
    isProcessing,
}) => {
    const [agreed, setAgreed] = useState(false);

    if (!isOpen) return null;

    const balanceAfter = walletBalance - entryFee;
    const isInsufficient = walletBalance < entryFee;
    const canConfirm = agreed && !isInsufficient && !isProcessing;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={!isProcessing ? onCancel : undefined}
        >
            <div
                className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary-orange/10 border border-primary-orange/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-bold">Confirm Registration</h3>
                            <p className="text-gray-400 text-xs">{tournamentTitle}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Payment Summary Card */}
                    <div className="bg-dark-700/50 border border-white/10 rounded-xl overflow-hidden">
                        {/* Row: Entry Fee */}
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <span className="text-gray-300 text-sm">Entry Fee</span>
                            <span className="text-primary-orange font-bold text-base">₹{entryFee}</span>
                        </div>

                        <div className="border-t border-white/5" />

                        {/* Row: Wallet Balance */}
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <span className="text-gray-300 text-sm">Current Wallet Balance</span>
                            <span className={`font-bold text-base ${isInsufficient ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{walletBalance.toLocaleString()}
                            </span>
                        </div>

                        <div className="border-t border-white/5" />

                        {/* Row: Amount to Deduct */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-primary-orange/5">
                            <span className="text-gray-300 text-sm font-medium">Amount to Deduct</span>
                            <span className="text-white font-bold text-base">- ₹{entryFee}</span>
                        </div>

                        <div className="border-t border-white/5" />

                        {/* Row: Balance After */}
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <span className="text-gray-300 text-sm">Balance After Registration</span>
                            <span className={`font-bold text-base ${isInsufficient ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{isInsufficient ? '—' : balanceAfter.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Slot Info */}
                    <div className="flex items-center gap-2 px-1">
                        <svg className="w-4 h-4 text-primary-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-400 text-xs">
                            You will be assigned to <strong className="text-white">Slot-{slot}</strong>. This action cannot be undone.
                        </span>
                    </div>

                    {/* Insufficient Balance Error */}
                    {isInsufficient && (
                        <div className="flex gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                                <p className="text-red-400 text-sm font-semibold">Insufficient Balance</p>
                                <p className="text-red-400/80 text-xs mt-0.5">
                                    You need ₹{entryFee} but have ₹{walletBalance.toLocaleString()}. Please top up your wallet first.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* T&C Checkbox */}
                    {!isInsufficient && (
                        <label className="flex items-start gap-3 cursor-pointer group px-1">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                disabled={isProcessing}
                                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-dark-700 text-primary-orange focus:ring-primary-orange focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                                I agree to the{' '}
                                <span className="text-primary-orange hover:underline cursor-pointer">Terms & Conditions</span>
                                {' '}and confirm that ₹{entryFee} will be deducted from my wallet.
                            </span>
                        </label>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!canConfirm}
                            className="flex-1 gradient-orange text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Confirm & Pay ₹{entryFee}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRegistrationModal;
