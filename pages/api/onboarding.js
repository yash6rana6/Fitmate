import dbConnect from '../../lib/db';
import User from '../../models/User';
import WeeklyPlan from '../../models/WeeklyPlan';
import { requireTelegramUser } from '../../lib/telegramAuth';
import { generateJSON, textPart } from '../../lib/geminiClient';
import { buildWeek1Prompt } from '../../lib/prompts';
import { notify } from '../../lib/notify';

function validateProfile(body) {
  const required = [
    'gender',
    'age',
    'height_cm',
    'weight_kg',
    'goal',
    'workout_location',
    'diet_type',
    'activity_level',
  ];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '');
  return missing;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    const missing = validateProfile(req.body || {});
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const {
      name,
      gender,
      age,
      height_cm,
      weight_kg,
      goal,
      workout_location,
      equipment,
      diet_type,
      activity_level,
      budget_tier,
      region,
      medical_flags,
      measurements,
    } = req.body;

    let user = await User.findOne({ telegram_id: tgUser.telegram_id });
    if (!user) {
      user = new User({ telegram_id: tgUser.telegram_id });
    }

    user.name = name || tgUser.first_name || user.name || 'Friend';
    user.gender = gender;
    user.age = age;
    user.height_cm = height_cm;
    user.weight_kg = weight_kg;
    user.goal = goal;
    user.workout_location = workout_location;
    user.equipment = Array.isArray(equipment) ? equipment : [];
    user.diet_type = diet_type;
    user.activity_level = activity_level;
    if (budget_tier) user.budget_tier = budget_tier;
    if (region) user.region = region;
    if (Array.isArray(medical_flags)) user.medical_flags = medical_flags;
    if (measurements) user.measurements = measurements;

    await user.save();

    // Generate Week 1 plan
    const prompt = buildWeek1Prompt(user);
    const planJson = await generateJSON([{ role: 'user', parts: [textPart(prompt)] }]);

    const weeklyPlan = await WeeklyPlan.findOneAndUpdate(
      { user_id: user._id, week_number: 1 },
      {
        user_id: user._id,
        week_number: 1,
        targets: planJson.targets,
        days: planJson.days,
        coach_note: planJson.coach_note || '',
        feedback: null,
      },
      { upsert: true, new: true }
    );

    user.onboarding_complete = true;
    user.current_week = 1;
    await user.save();

    await notify(user._id, {
      type: 'plan_ready',
      title: 'Your Week 1 plan is ready! 🎉',
      message: planJson.coach_note || 'Open your dashboard to see today\'s workout and meals.',
    });

    return res.status(200).json({ user, plan: weeklyPlan });
  } catch (err) {
    console.error('[onboarding] error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
