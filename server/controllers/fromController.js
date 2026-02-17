import Submission from "../models/submissionModel.js";


const simulateExternalAPI = async () => {
  const random = Math.random();

  if (random < 0.5) {
    // 40-45% success
    return { status: 'success', statusCode: 200 }
  } else if (random < 0.6) {
    // 25% temporary failure
    return { status: 'error', statusCode: 503, message: 'Service temporarily unavailable' };
  } else {
    // 30-35 % delayed success 
    const delay = Math.random() * 5000 + 5000; // 5- 10 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
    return { status: 'success', statusCode: 200 }
  }
}

export const checkDuplicate = async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        error: 'Email and amount are required'
      });
    }

    // checking for duplicate
    const recentSubmission = await Submission.findOne({
      email: email.toLowerCase(),
      amount: parseFloat(amount),
      submittedAt: {
        $gte: new Date(Date.now() - 30000) // Last 30 seconds
      }
    })

    if (recentSubmission) {
      return res.json({
        isDuplicate: true,
        existingId: recentSubmission._id,
        message: 'Duplicate submission detected'
      })
    }
    res.json({ isDuplicate: false });
  } catch (error) {
    console.error('Duplicate check error:', error);
    res.status(500).json({ error: 'Error checking duplicate' });
  }
}

export const submitForm = async (req, res) => {
  try {
    const { email, amount, idempotencyKey } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        error: 'Email and amount are required'
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check for idempotency - if same key, return existing submission
    if (idempotencyKey) {
      const existingSubmission = await Submission.findOne({ idempotencyKey });
      if (existingSubmission) {
        return res.status(200).json({
          message: 'Submission already processed',
          id: existingSubmission._id,
          isDuplicate: true,
          status: existingSubmission.status
        });
      }
    }

    // Creating submission record
    const submission = new Submission({
      email: email.toLowerCase(),
      amount: parseFloat(amount),
      idempotencyKey: idempotencyKey || null,
      status: 'pending'
    });

    await submission.save();

    // Simulating external API call with retries
    let retries = 0;
    const maxRetries = 3;
    let apiResult = null;

    while (retries < maxRetries) {
      try {
        apiResult = await simulateExternalAPI();

        if (apiResult.statusCode === 200) {
          // Success
          submission.status = 'success';
          submission.processedAt = new Date();
          await submission.save();

          return res.status(200).json({
            message: 'Form submitted successfully',
            id: submission._id,
            status: 'success',
            data: {
              email: submission.email,
              amount: submission.amount,
              submittedAt: submission.submittedAt
            }
          });
        } else if (apiResult.statusCode === 503) {
          // if Temporary failure - retry
          retries++;
          submission.retryCount = retries;

          if (retries >= maxRetries) {
            // if Max retries reached
            submission.status = 'failed';
            submission.errorMessage = 'Max retries reached. Service unavailable.';
            await submission.save();

            return res.status(503).json({
              message: 'Service temporarily unavailable',
              id: submission._id,
              status: 'failed',
              retryCount: retries,
              error: 'Max retries reached'
            });
          }

          // Wait before retrying (exponential backoff)
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retries) * 1000)
          );
        }
      } catch (err) {
        console.error(`API call attempt ${retries + 1} failed:`, err.message);
        retries++;

        if (retries < maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retries) * 1000)
          );
        }
      }
    }

    // Final failure
    submission.status = 'failed';
    submission.errorMessage = 'Failed after maximum retries';
    await submission.save();

    res.status(503).json({
      message: 'Submission failed after retries',
      id: submission._id,
      status: 'failed',
      retryCount: retries,
      error: 'Unable to process submission'
    });
  } catch (error) {
    console.error('Form submission error:', error);

    res.status(500).json({
      error: 'Error processing submission',
      details: error.message
    });
  }
};

export const getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ submittedAt: -1 }).limit(50);

    res.json({
      total: submissions.length,
      submissions: submissions.map(sub => ({
        id: sub._id,
        email: sub.email,
        amount: sub.amount,
        status: sub.status,
        retryCount: sub.retryCount,
        submittedAt: sub.submittedAt,
        processedAt: sub.processedAt
      }))
    });
  } catch (error) {
    console.error('Error in fetchingg submission:', error);
    res.status(500).json({ error: 'Error Fetching Submission' });
  }
}
