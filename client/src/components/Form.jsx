import { useState, useCallback } from 'react';
import { submitFormData, checkDuplicateSubmission } from '../services/api.js';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

const Form = () => {
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
  });

  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [successData, setSuccessData] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const validateForm = useCallback(() => {
    if (!formData.email.trim()) {
      setErrorMessage('Email is required');
      return false;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMessage('Amount must be greater than 0');
      return false;
    }

    setErrorMessage('');
    return true;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setStatus('error');
      return;
    }

    setIsSubmitting(true);
    setStatus('pending');
    setRetryCount(0);
    setIsDuplicate(false);
    setSuccessData(null);

    try {
      const duplicateCheck = await checkDuplicateSubmission(
        formData.email,
        formData.amount
      );

      if (duplicateCheck.isDuplicate) {
        setIsDuplicate(true);
        setErrorMessage(
          'This submission was already processed recently. Please try again in a few moments.'
        );
        setStatus('error');
        setIsSubmitting(false);
        return;
      }

      // Submit the form
      const result = await submitFormData(formData);

      if (result.success) {
        setStatus('success');
        setSuccessData({
          email: formData.email,
          amount: formData.amount,
          id: result.data.id,
          submittedAt: new Date().toLocaleString(),
        });
        // Reset form
        setFormData({ email: '', amount: '' });
      } else {
        // Handle failure
        if (result.status === 503) {
          setStatus('error');
          setErrorMessage(
            'Service temporarily unavailable. Please try again shortly.'
          );
        } else {
          setStatus('error');
          setErrorMessage(
            result.error || 'Failed to submit form. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (status === 'error' && errorMessage) {
      setErrorMessage('');
    }
  };

  // Reset form to idle state
  const handleReset = () => {
    setFormData({ email: '', amount: '' });
    setStatus('idle');
    setErrorMessage('');
    setRetryCount(0);
    setSuccessData(null);
    setIsDuplicate(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Main container */}
      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors duration-300">
          <div className="px-8 py-10">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                Submit Details
              </h2>
              <p className="text-center text-slate-400 text-sm">
                Secure form submission with automatic retry
              </p>
            </div>

            {/* Status Banner */}
            {status !== 'idle' && (
              <div
                className={`mb-6 p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 ${
                  status === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : status === 'error'
                      ? 'bg-red-500/10 border-red-500/30'
                      : status === 'pending'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {status === 'success' && (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-300 mb-1">
                          Success! 🎉
                        </p>
                        <p className="text-xs text-green-200">
                          Your submission has been processed successfully.
                        </p>
                        {successData && (
                          <div className="mt-3 text-xs bg-green-500/10 rounded p-2 border border-green-500/20">
                            <p className="text-green-300">
                              <strong>Email:</strong> {successData.email}
                            </p>
                            <p className="text-green-300">
                              <strong>Amount:</strong> $
                              {parseFloat(successData.amount).toFixed(2)}
                            </p>
                            <p className="text-green-300">
                              <strong>ID:</strong> {successData.id}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-300 mb-1">
                          {isDuplicate
                            ? 'Duplicate Submission'
                            : 'Submission Failed'}
                        </p>
                        <p className="text-xs text-red-200">{errorMessage}</p>
                      </div>
                    </>
                  )}
                  {status === 'pending' && (
                    <>
                      <ClockIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <p className="text-sm font-semibold text-blue-300 mb-1">
                          Processing...
                        </p>
                        <p className="text-xs text-blue-200">
                          Your submission is being processed
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-blue-400 transition-colors"
                >
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border-2 transition-all duration-300 text-white placeholder-slate-500 focus:outline-none ${
                    isSubmitting
                      ? 'border-slate-600 cursor-not-allowed opacity-60'
                      : 'border-slate-600 hover:border-slate-500 focus:border-blue-500 focus:bg-slate-700'
                  }`}
                  placeholder="your@email.com"
                />
              </div>

              <div className="group">
                <label
                  htmlFor="amount"
                  className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-blue-400 transition-colors"
                >
                  Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 text-lg font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    min="0.01"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-3 rounded-lg bg-slate-700/50 border-2 transition-all duration-300 text-white placeholder-slate-500 focus:outline-none ${
                      isSubmitting
                        ? 'border-slate-600 cursor-not-allowed opacity-60'
                        : 'border-slate-600 hover:border-slate-500 focus:border-blue-500 focus:bg-slate-700'
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || status === 'success'}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSubmitting || status === 'success'
                    ? 'bg-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:scale-95 hover:shadow-lg hover:shadow-blue-500/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : status === 'success' ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Submitted
                  </>
                ) : (
                  'Submit'
                )}
              </button>

              {/* Reset Button - only show after success */}
              {status === 'success' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-300 border border-slate-600 hover:border-slate-500"
                >
                  Submit Another
                </button>
              )}

              {/* Error Reset Button */}
              {status === 'error' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-300 border border-slate-600 hover:border-slate-500"
                >
                  Try Again
                </button>
              )}
            </form>

            {/* Footer info */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                ✓ Secure processing • Automatic retry • No duplicates
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>
    </div>
  );
};

export default Form;
