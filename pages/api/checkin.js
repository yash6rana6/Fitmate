import formidable from 'formidable';
import fs from 'fs';
import sharp from 'sharp';

import dbConnect from '../../lib/db';
import User from '../../models/User';
import WeeklyPlan from '../../models/WeeklyPlan';
import CheckIn from '../../models/CheckIn';
import { requireTelegramUser } from '../../lib/telegramAuth';
import { generateJSON, textPart, imagePart } from '../../lib/geminiClient';
import { buildAdaptivePlanPrompt } from '../../lib/prompts';
import { notify } from '../../lib/notify';

// We need the raw multipart body, so disable Next's default JSON parser.
export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempPhotoPath = null;

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    const user = await User.findOne({ telegram_id: tgUser.telegram_id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.onboarding_complete) {
      return res.status(400).json({ error: 'Complete onboarding first' });
    }

    const { fields, files } = await parseForm(req);

    const weight_kg = Number(firstValue(fields.weight_kg));
    const adherence_rating = Number(firstValue(fields.adherence_rating));
    const note = firstValue(fields.note) || '';
    const strugglesRaw = firstValue(fields.struggles);
    let struggles = [];
    if (strugglesRaw) {
      try {
        struggles = JSON.parse(strugglesRaw);
        if (!Array.isArray(struggles)) struggles = [];
      } catch (e) {
        struggles = String(strugglesRaw).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const measurementsRaw = firstValue(fields.measurements);
    let measurements = undefined;
    if (measurementsRaw) {
      try {
        measurements = JSON.parse(measurementsRaw);
      } catch (e) {
        measurements = undefined;
      }
    }

    if (!weight_kg || !adherence_rating) {
      return res.status(400).json({ error: 'weight_kg and adherence_rating are required' });
    }

    const photoFile = files.photo ? firstValue(files.photo) : null;
    if (!photoFile) {
      return res.status(400).json({ error: 'Progress photo is required' });
    }
    tempPhotoPath = photoFile.filepath;

    const currentWeek = user.current_week;
    const previousPlan = await WeeklyPlan.findOne({ user_id: user._id, week_number: currentWeek });
    if (!previousPlan) {
      return res.status(400).json({ error: 'No active plan found for current week' });
    }

    const alreadyChecked = await CheckIn.findOne({ user_id: user._id, week_number: currentWeek });
    if (alreadyChecked) {
      return res.status(400).json({ error: 'Check-in for this week already submitted' });
    }

    // Read full-res photo into memory (never written anywhere but this temp upload,
    // which we clean up in `finally`), send to Gemini for vision analysis.
    const fullResBuffer = fs.readFileSync(tempPhotoPath);
    const base64Full = fullResBuffer.toString('base64');
    const mimeType = photoFile.mimetype || 'image/jpeg';

    const startWeight = user.weight_kg;
    const prompt = buildAdaptivePlanPrompt({
      previousTargets: previousPlan.targets,
      startWeight,
      weight: weight_kg,
      measurements,
      adherenceRating: adherence_rating,
      struggles,
      note,
    });

    const resultJson = await generateJSON([
      {
        role: 'user',
        parts: [textPart(prompt), imagePart(base64Full, mimeType)],
      },
    ]);

    // Build a small compressed thumbnail for UI display only; discard full-res.
    const thumbBuffer = await sharp(fullResBuffer)
      .resize(240, 240, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();
    const thumbDataUri = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;

    const nextWeekNumber = currentWeek + 1;

    const checkIn = await CheckIn.create({
      user_id: user._id,
      week_number: currentWeek,
      weight_kg,
      measurements,
      adherence_rating,
      struggles,
      note,
      photo_url: thumbDataUri,
    });

    const nextPlan = await WeeklyPlan.findOneAndUpdate(
      { user_id: user._id, week_number: nextWeekNumber },
      {
        user_id: user._id,
        week_number: nextWeekNumber,
        targets: resultJson.targets,
        days: resultJson.days,
        coach_note: previousPlan.coach_note,
        feedback: resultJson.feedback,
      },
      { upsert: true, new: true }
    );

    user.weight_kg = weight_kg;
    user.current_week = nextWeekNumber;
    if (measurements) user.measurements = measurements;
    await user.save();

    await notify(user._id, {
      type: 'feedback',
      title: `Week ${nextWeekNumber} plan is ready! 💪`,
      message: resultJson.feedback?.summary || 'Your coach has reviewed your check-in and updated your plan.',
    });

    return res.status(200).json({ checkIn, nextPlan, user });
  } catch (err) {
    console.error('[checkin] error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  } finally {
    // Always discard the raw upload — never persist full-resolution photos.
    if (tempPhotoPath) {
      fs.unlink(tempPhotoPath, () => {});
    }
  }
}
