import { useState } from 'react';

const Form = () => {
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
  });

  const [status, setStatus] = useState('idle'); // it can be idle, pending, success , error or retrying
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const validateForm = () => {};

  const submitWithRetry = async (data, retryCount = 2) => {
    try {
    } catch (error) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  };

  const handleChange = (e) => {
    const { name, value } = e.target.value;
    console.log([name], value)
    // setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Submit Your Details
          </h2>

          {/* Status Banner */}
          {status !== 'idle' && status !== 'pending' && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                status === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : status === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : status === 'retrying'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center">
                {status === 'success' && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                    <span className="text-sm text-green-700">
                      Form submitted successfully!
                    </span>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-sm text-red-700">{errorMessage}</span>
                  </>
                )}
                {status === 'retrying' && (
                  <>
                    <ClockIcon className="h-5 w-5 text-yellow-400 mr-2 animate-spin" />
                    <span className="text-sm text-yellow-700">
                      Retrying... Attempt {retryCount} of 3
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  ${status === 'error' && !formData.email ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="you@example.com"
              />
            </div>

            {/* Amount Field */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Amount
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                disabled={isSubmitting}
                min="0.01"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  ${status === 'error' && !formData.amount ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="0.00"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all
                ${
                  isSubmitting
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'
                }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                </span>
              ) : (
                'Submit'
              )}
            </button>

            {/* Retry Counter */}
            {status === 'retrying' && (
              <div className="mt-4 text-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(retryCount / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Form;
