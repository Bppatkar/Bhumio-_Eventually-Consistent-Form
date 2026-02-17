import Submission from "../models/submissionModel.js";

const simulateExternalAPI = async () => {
  const random = Math.random();

  if (random < 0.30) {
    // 30% immediate success
    return { status: 'success', statusCode: 200 };
  } else if (random < 0.70) {
    // 40% temporary failure (503) - triggers auto-retry
    return { status: 'error', statusCode: 503, message: 'Service temporarily unavailable' };
  } else {

    const delay = Math.random() * 5000 + 5000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { status: 'success', statusCode: 200 };
  }
};

//  CHECK IF EMAIL ALREADY EXISTS 
export const checkDuplicate = async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        error: 'Email and amount are required'
      });
    }

    // Check if THIS EXACT EMAIL+AMOUNT combination exists ANYWHERE in database

    const existingSubmission = await Submission.findOne({
      email: email.toLowerCase(),
      amount: parseFloat(amount),
      status: 'success' // Only check successful submissions
    });

    if (existingSubmission) {
      return res.json({
        isDuplicate: true,
        existingId: existingSubmission._id,
        message: 'This email and amount combination has already been submitted successfully',
        previousSubmission: {
          submittedAt: existingSubmission.submittedAt,
          processedAt: existingSubmission.processedAt
        }
      });
    }

    res.json({ isDuplicate: false });
  } catch (error) {
    console.error('Duplicate check error:', error);
    res.status(500).json({ error: 'Error checking duplicate' });
  }
};

export const submitForm = async (req, res) => {
  try {
    const { email, amount, idempotencyKey } = req.body;

    // Validation
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

    // checking duplicate before submit and Prevent same email+amount from ever being submitted twice
    const existingSuccess = await Submission.findOne({
      email: email.toLowerCase(),
      amount: parseFloat(amount),
      status: 'success'
    });

    if (existingSuccess) {
      return res.status(400).json({
        isDuplicate: true,
        message: 'This email and amount combination has already been submitted',
        error: 'Duplicate submission'
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

    // Creating new  submission record
    const submission = new Submission({
      email: email.toLowerCase(),
      amount: parseFloat(amount),
      idempotencyKey: idempotencyKey || null,
      status: 'pending'
    });

    await submission.save();

    // Simulate external API call with retries
    let retries = 0;
    const maxRetries = 3;
    let apiResult = null;

    while (retries < maxRetries) {
      try {
        apiResult = await simulateExternalAPI();
        console.log(`Attempt ${retries + 1}: ${apiResult.statusCode}`);

        if (apiResult.statusCode === 200) {
          // Success [hahahah]
          submission.status = 'success';
          submission.processedAt = new Date();
          await submission.save();

          console.log(`✓ Success for submission ${submission._id}`);

          return res.status(200).json({
            message: 'Form submitted successfully',
            id: submission._id,
            status: 'success',
            data: {
              email: submission.email,
              amount: submission.amount,
              submittedAt: submission.submittedAt,
              processedAt: submission.processedAt
            }
          });
        } else if (apiResult.statusCode === 503) {
          // Temporary failure - retry
          retries++;
          submission.retryCount = retries;
          console.log(`Got 503, retry attempt: ${retries}`);

          if (retries >= maxRetries) {
            // Max retries reached............
            submission.status = 'failed';
            submission.errorMessage = 'Max retries reached. Service unavailable.';
            await submission.save();

            console.log(`Max retries reached for submission ${submission._id}`);

            return res.status(503).json({
              message: 'Service temporarily unavailable',
              id: submission._id,
              status: 'failed',
              retryCount: retries,
              error: 'Max retries reached'
            });
          }

          // Waiting before retrying (exponential backoff)
          const waitTime = Math.pow(2, retries) * 1000;
          console.log(`Waiting ${waitTime}ms before retry ${retries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (err) {
        console.error(`API call attempt ${retries + 1} failed:`, err.message);
        retries++;

        if (retries < maxRetries) {
          const waitTime = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Final failure
    submission.status = 'failed';
    submission.errorMessage = 'Failed after maximum retries';
    await submission.save();

    console.log(`Final failure for submission ${submission._id}`);

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
    const submissions = await Submission.find().sort({ submittedAt: -1 }).limit(100);

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
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
};