const Anthropic = require('@anthropic-ai/sdk');
const { betaZodOutputFormat } = require('@anthropic-ai/sdk/helpers/beta/zod');
const { z } = require('zod');
const ApiError = require('../utils/ApiError');

const MODEL = 'claude-opus-5-5';
const MAX_ACTIVITIES = 30;

const ExtractedSchedule = z.object({
  activities: z.array(
    z.object({
      activity: z.string(),
      hours: z.number(),
      value: z.enum(['high', 'low']),
      energy: z.enum(['energizing', 'draining', 'unsure']),
    })
  ),
});

const SYSTEM_PROMPT = `You turn a founder's description of their typical workday into activities for a DRIP Matrix, from the book "Buy Back Your Time" by Dan Martell.

For each distinct activity in their day:
- activity: a short name of 2-4 words in Title Case, e.g. "Client Calls", "Email & Messages".
- hours: time spent on it per day. Work it out from the times or durations they give; if they give none, make a reasonable estimate.
- value: "high" if the activity directly makes money or grows the business (sales, billable client work, product, strategy, hiring key people); "low" if it doesn't (email, scheduling, admin, bookkeeping, routine support). Use their Buyback Rate as a guide: work someone could be hired to do for less than that rate is "low".
- energy: "energizing" or "draining" only when their words say how it feels (love, enjoy, hate, dread, tiring, boring, and so on). If they don't say, use "unsure" so the app can ask them.

Leave out sleep and meals. Merge repeated mentions of the same activity into one entry with the combined time. If the message doesn't describe a day, return an empty list.`;

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(503, 'Reading your day needs an ANTHROPIC_API_KEY on the server. Add your activities by hand for now.');
  }
  client ??= new Anthropic();
  return client;
}

const roundToHalf = (n) => Math.round(n * 2) / 2;

// Tidy what the model returns so it always fits the app's rules.
function normalize(activities) {
  const seen = new Set();
  return activities
    .map((a) => ({
      activity: a.activity.trim().slice(0, 60),
      hours: Math.min(12, Math.max(0.5, roundToHalf(Number(a.hours) || 0.5))),
      value: a.value,
      energy: a.energy === 'unsure' ? null : a.energy,
    }))
    .filter((a) => {
      const key = a.activity.toLowerCase();
      if (!a.activity || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ACTIVITIES);
}

async function extractSchedule(text, { buybackRate, currency }) {
  const rate = buybackRate ? `${currency || 'USD'} ${buybackRate}/hour` : 'not set yet';

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(ExtractedSchedule) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `My Buyback Rate: ${rate}\n\nMy typical day:\n<day>\n${text}\n</day>`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ApiError(503, 'The server has an invalid ANTHROPIC_API_KEY. Add your activities by hand for now.');
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ApiError(503, 'Too many requests right now. Try again in a minute.');
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error', err.status, err.message);
      throw new ApiError(502, "We couldn't read your day right now. Try again, or add activities by hand.");
    }
    // The SDK throws when the reply doesn't match the schema.
    console.error('Could not parse extracted schedule', err);
    throw new ApiError(422, "We couldn't pull activities from that. Try describing your day in a bit more detail.");
  }

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new ApiError(422, "We couldn't pull activities from that. Try describing your day in a bit more detail.");
  }

  return normalize(response.parsed_output.activities);
}

module.exports = { extractSchedule };
