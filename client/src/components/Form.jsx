import { useState, useCallback, useEffect } from 'react';
import {
  submitFormData,
  checkDuplicateSubmission,
  fetchSubmissions,
} from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  RotateCcw,
  TrendingUpIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
} from 'lucide-react';

const Form = () => {
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
  });

 
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [successData, setSuccessData] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [validationError, setValidationError] = useState('');

  
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    totalRetries: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchSubmissions();
      if (data.submissions) {
        const total = data.submissions.length;
        const success = data.submissions.filter(
          (s) => s.status === 'success'
        ).length;
        const failed = data.submissions.filter(
          (s) => s.status === 'failed'
        ).length;
        const totalRetries = data.submissions.reduce(
          (sum, s) => sum + (s.retryCount || 0),
          0
        );

        setStats({
          total,
          success,
          failed,
          totalRetries,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  
  useEffect(() => {
    fetchStats();
    // Refresh stats every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Validation function
  const validateForm = useCallback(() => {
    if (!formData.email.trim()) {
      setValidationError('Email is required');
      return false;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setValidationError('Amount must be greater than 0');
      return false;
    }

    setValidationError('');
    return true;
  }, [formData]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setStatus('error');
      setErrorMessage('Please fix validation errors');
      return;
    }

    setStatus('pending');
    setRetryCount(0);
    setIsDuplicate(false);
    setSuccessData(null);
    setErrorMessage('');

    try {
      // Check for duplicate first
      const duplicateCheck = await checkDuplicateSubmission(
        formData.email,
        formData.amount
      );

      if (duplicateCheck.isDuplicate) {
        setStatus('error');
        setIsDuplicate(true);
        setErrorMessage(
          'This submission was already processed recently. Please try again in a few moments.'
        );
        return;
      }

     
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
        // Refresh stats
        await fetchStats();
      } else {
        setStatus('error');
        setErrorMessage(
          result.error || 'Failed to submit form. Please try again.'
        );
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationError) {
      setValidationError('');
    }
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  // Reset form to idle state
  const handleReset = () => {
    setFormData({ email: '', amount: '' });
    setStatus('idle');
    setErrorMessage('');
    setValidationError('');
    setRetryCount(0);
    setSuccessData(null);
    setIsDuplicate(false);
  };

  // Retry failed submission with fresh form
  const handleRetry = () => {
    // Keep the form data but reset status to idle
    setStatus('idle');
    setErrorMessage('');
    setValidationError('');
    setRetryCount(0);
    setIsDuplicate(false);
    // User can now click Submit again with same or modified data
  };

  const isSubmitting = status === 'pending' || status === 'retrying';

  // Calculate percentage for success rate
  const successRate =
    stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-between py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors duration-300">
            <div className="px-8 py-10">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  Submit Details
                </h2>
                <p className="text-center text-slate-400 text-sm">
                  Secure form submission with automatic retry
                </p>
              </div>

              {status === 'idle' && (
                <div className="mb-6 p-4 rounded-xl border-2 border-slate-600/30 bg-slate-700/20 text-center">
                  <p className="text-xs text-slate-400">
                    Ready to submit • Fill in the form below
                  </p>
                </div>
              )}

              {status === 'pending' && (
                <div className="mb-6 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 backdrop-blur-sm animate-pulse">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce animation-delay-2000"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce animation-delay-4000"></div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-300">
                        Submitting...
                      </p>
                      <p className="text-xs text-blue-200">
                        Processing your form
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="mb-6 p-4 rounded-xl border-2 border-green-500/30 bg-green-500/10 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-300 mb-1">
                        ✨ Success!
                      </p>
                      <p className="text-xs text-green-200 mb-3">
                        Your submission has been processed successfully.
                      </p>
                      {successData && (
                        <div className="text-xs bg-green-500/20 rounded-lg p-3 border border-green-500/30 space-y-1">
                          <p className="text-green-300">
                            <span className="font-semibold">Email:</span>{' '}
                            {successData.email}
                          </p>
                          <p className="text-green-300">
                            <span className="font-semibold">Amount:</span> $
                            {parseFloat(successData.amount).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="mb-6 p-4 rounded-xl border-2 border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-300 mb-1">
                        {isDuplicate
                          ? '⚠️ Duplicate Submission'
                          : '❌ Submission Failed'}
                      </p>
                      <p className="text-xs text-red-200">
                        {errorMessage ||
                          validationError ||
                          'Something went wrong'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
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
                  {validationError && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ {validationError}
                    </p>
                  )}
                </div>

                {/* Amount Field */}
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || status === 'success'}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                    isSubmitting || status === 'success'
                      ? 'bg-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:scale-95 hover:shadow-lg hover:shadow-blue-500/30'
                  }`}
                >
                  {status === 'pending' && (
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
                  )}
                  {status === 'success' && (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      Submitted ✓
                    </>
                  )}
                  {(status === 'idle' || status === 'error') && (
                    <>{status === 'error' ? 'Try Again' : 'Submit'}</>
                  )}
                </button>

                {/* Secondary Action Buttons */}
                <div className="flex gap-3">
                  {status === 'success' && (
                    <>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-300 border border-slate-600 hover:border-slate-500"
                      >
                        ➕ Submit Another
                      </button>
                    </>
                  )}

                  {status === 'error' && (
                    <>
                      {!isDuplicate && (
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="flex-1 py-2 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 transition-colors duration-300 border border-yellow-500/50 flex items-center justify-center gap-2"
                          title="Retry the same submission"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 py-2 px-4 rounded-lg font-medium text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-300 border border-slate-600 hover:border-slate-500"
                      >
                        {isDuplicate ? '⏭️ Skip' : '↻ New Submit'}
                      </button>
                    </>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    State: {status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  ✓ Secure processing • Automatic retry • No duplicates
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-full max-w-sm flex-col gap-6 ml-8">
          {/* Stats Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Analytics</h3>
            <button
              onClick={fetchStats}
              disabled={loadingStats}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              title="Refresh stats"
            >
              <RefreshCwIcon
                className={`h-5 w-5 text-cyan-400 ${loadingStats ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Total Submissions Card */}
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-slate-400 text-sm font-semibold">
                Total Submissions
              </h4>
              <TrendingUpIcon className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-blue-400 mb-2">
              {stats.total}
            </p>
            <p className="text-xs text-slate-500">All submissions received</p>
          </div>

          {/* Success Card */}
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-slate-400 text-sm font-semibold">
                Successful
              </h4>
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-4xl font-bold text-green-400 mb-2">
              {stats.success}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{successRate}% success rate</span>
              <span className="text-green-400">✓</span>
            </div>
          </div>

          {/* Failed Card */}
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-slate-400 text-sm font-semibold">Failed</h4>
              <AlertTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-4xl font-bold text-red-400 mb-2">
              {stats.failed}
            </p>
            <p className="text-xs text-slate-500">All failed submissions</p>
          </div>

          {/* Total Retries Card */}
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-slate-400 text-sm font-semibold">
                Retry Attempts
              </h4>
              <RotateCcw className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-4xl font-bold text-yellow-400 mb-2">
              {stats.totalRetries}
            </p>
            <p className="text-xs text-slate-500">
              Total automatic retries performed
            </p>
          </div>

          {/* Success Rate Progress */}
          <div className="bg-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
            <h4 className="text-slate-400 text-sm font-semibold mb-4">
              Success Rate
            </h4>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
            <p className="text-2xl font-bold text-green-400 mt-4">
              {successRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>
  );
};

export default Form;
